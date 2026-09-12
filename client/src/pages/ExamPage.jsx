import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import KaTeXRenderer from '../components/KaTeXRenderer';
import { API_URL, candidateFetch } from '../utils/api';
import useContestProctoring from '../hooks/useContestProctoring';

export default function ExamPage() {
    const navigate = useNavigate();
    const [session, setSession] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem('examSession') || 'null');
        } catch {
            return null;
        }
    });

    const [questions, setQuestions] = useState(() => session?.questions || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState(() => {
        const initial = {};
        (session?.questions || []).forEach((q) => {
            initial[q.question_id] = q.selected_opt || null;
        });
        return initial;
    });
    const [marks, setMarks] = useState(() => {
        const initial = {};
        (session?.questions || []).forEach((q) => {
            initial[q.question_id] = Boolean(q.is_marked);
        });
        return initial;
    });

    // Initialise from absolute deadline so a page refresh never resets the clock
    const [timeRemaining, setTimeRemaining] = useState(() => {
        if (session?.endTime) {
            const delta = Math.floor((new Date(session.endTime).getTime() - Date.now()) / 1000);
            return Math.max(0, delta);
        }
        return session?.timeRemainingSec || 3600;
    });
    const [isPaused, setIsPaused] = useState(false);
    const [showMobileDrawer, setShowMobileDrawer] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitResult, setSubmitResult] = useState(null);
    const [error, setError] = useState(null);

    const socketRef = useRef(null);
    const timerRef = useRef(null);
    const timeRemainingRef = useRef(timeRemaining);
    timeRemainingRef.current = timeRemaining;

    // Safety guard
    useEffect(() => {
        if (!session || !session.jwt || !session.candidateId) {
            navigate('/login');
        }
    }, [session, navigate]);

    const isSyncingRef = useRef(false);
    const isExpiredRef = useRef(false);

    // Server-authoritative timer re-sync (BUG-01, BUG-02, BUG-03)
    const handleTimeReSync = useCallback(async () => {
        if (isSyncingRef.current || isSubmitted || !session?.jwt) return;
        isSyncingRef.current = true;
        try {
            const res = await candidateFetch('/exam/time-check');
            if (res.ok) {
                const data = await res.json();
                if (data.isSubmitted) {
                    cleanupProctoring();
                    setSubmitResult({ score: data.score });
                    setIsSubmitted(true);
                    sessionStorage.removeItem('examSession');
                    return;
                }
                if (typeof data.timeRemainingSec === 'number') {
                    setTimeRemaining(data.timeRemainingSec);
                }
                if (typeof data.isPaused === 'boolean') {
                    setIsPaused(data.isPaused);
                }
            }
        } catch (err) {
            console.warn('Time re-sync failed:', err);
        } finally {
            isSyncingRef.current = false;
        }
    }, [isSubmitted, session?.jwt]);

    // Proctoring Hook (BUG-04)
    const {
        showWarning,
        warningMessage,
        warningButtonText,
        warningAction,
        violationCount,
        cleanupProctoring,
    } = useContestProctoring('exam', {
        contestEnded: isSubmitted,
        teamName: session?.candidateName || session?.rollNo || 'Unknown',
        backendUrl: API_URL,
        onDisqualify: () => {
            sessionStorage.removeItem('examSession');
            navigate('/login');
        },
    });

    // Server re-sync on mount: catches page-refresh without visibilitychange firing
    useEffect(() => {
        if (session?.jwt) {
            handleTimeReSync();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — run once on mount

    // WebSocket initialization
    useEffect(() => {
        if (!session?.jwt) return;

        const socket = io(API_URL, {
            transports: ['websocket', 'polling'],
            auth: { token: session.jwt },  // Required: server reads JWT from handshake.auth.token
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('register', {
                role: 'candidate',
                candidateId: session.candidateId,
                shiftId: session.shiftId,
                sessionId: session.sessionId,
                jwt: session.jwt,
            });
            socket.emit('join_shift_room', { shiftId: session.shiftId });
        });

        socket.on('shift_paused', () => {
            setIsPaused(true);
        });

        socket.on('shift_resumed', () => {
            setIsPaused(false);
            handleTimeReSync();
        });

        // extra_time_granted: always re-sync from server; never apply client-side addition
        socket.on('extra_time_granted', () => {
            handleTimeReSync();
        });

        // time_sync from server (tab_active response) — always server-computed
        socket.on('time_sync', ({ timeRemainingSec }) => {
            if (typeof timeRemainingSec === 'number') {
                setTimeRemaining(timeRemainingSec);
            }
        });

        socket.on('shift_ended', () => {
            isExpiredRef.current = true;
            handleFinalSubmit();
        });

        socket.on('force_logout', ({ message }) => {
            alert(message || 'You have logged in from another device. This session has been terminated.');
            sessionStorage.removeItem('examSession');
            navigate('/login');
        });

        // Admin force-reopen handler (previously unhandled)
        socket.on('session_reopened', ({ timeRemainingSec }) => {
            isExpiredRef.current = false;
            setIsSubmitted(false);
            setSubmitResult(null);
            setError(null);
            if (typeof timeRemainingSec === 'number') {
                setTimeRemaining(timeRemainingSec);
            }
            handleTimeReSync();
        });

        // Consolidated visibility handler (replaces the duplicate second useEffect)
        function handleVisibilityChange() {
            if (document.hidden) {
                // Tab switched away: notify server (no client time passed — server computes from end_time)
                socket.emit('tab_inactive', {
                    sessionId: session.sessionId,
                });
            } else {
                // Tab regained focus: notify server and immediately re-sync authoritative time
                socket.emit('tab_active', { sessionId: session.sessionId });
                handleTimeReSync();
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            socket.disconnect();
        };
    }, [session, navigate, handleTimeReSync]);

    // Periodic server-authoritative sync (heartbeat fallback against dropped socket packets)
    useEffect(() => {
        if (isSubmitted || !session?.jwt) return;
        const syncInterval = setInterval(() => {
            handleTimeReSync();
        }, 30000);
        return () => clearInterval(syncInterval);
    }, [isSubmitted, session?.jwt, handleTimeReSync]);

    // Local countdown ticker — pure display only; server remains the authority
    useEffect(() => {
        if (isPaused || isSubmitted) return;

        timerRef.current = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    // Guard: only trigger auto-submit once
                    if (!isExpiredRef.current) {
                        isExpiredRef.current = true;
                        handleFinalSubmit();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [isPaused, isSubmitted]);

    // Format timer display mm:ss
    const timerDisplay = useMemo(() => {
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, [timeRemaining]);

    const isUrgent = timeRemaining < 300; // < 5 minutes

    // Summary counts for navigator & submit modal
    const summary = useMemo(() => {
        let answered = 0;
        let marked = 0;
        questions.forEach((q) => {
            if (answers[q.question_id]) answered++;
            if (marks[q.question_id]) marked++;
        });
        const total = questions.length || 75;
        const unanswered = total - answered;
        return { answered, unanswered, marked, total };
    }, [questions, answers, marks]);

    const currentQ = questions[currentIndex];

    // Handle Option Selection
    async function handleSelectOption(opt) {
        if (!currentQ || isSubmitted || isPaused) return;

        const currentAnswer = answers[currentQ.question_id];
        // If clicking the already selected option, unselect (null)
        const nextAnswer = currentAnswer === opt ? null : opt;

        // Optimistic UI update
        setAnswers((prev) => ({
            ...prev,
            [currentQ.question_id]: nextAnswer,
        }));

        // Socket.IO sync
        if (socketRef.current?.connected) {
            socketRef.current.emit('answer_sync', {
                candidateId: session.candidateId,
                questionId: currentQ.question_id,
                selectedOpt: nextAnswer,
            });
        }

        // REST fallback (with 401 interception)
        try {
            await candidateFetch('/exam/answer', {
                method: 'POST',
                body: JSON.stringify({
                    questionId: currentQ.question_id,
                    selectedOpt: nextAnswer,
                }),
            });
        } catch (err) {
            console.error('Answer REST sync error:', err);
        }
    }

    // Handle Mark for Review Toggle
    async function handleToggleMark() {
        if (!currentQ || isSubmitted || isPaused) return;

        const nextMark = !marks[currentQ.question_id];

        // Optimistic UI update
        setMarks((prev) => ({
            ...prev,
            [currentQ.question_id]: nextMark,
        }));

        // Socket.IO sync
        if (socketRef.current?.connected) {
            socketRef.current.emit('mark_sync', {
                candidateId: session.candidateId,
                questionId: currentQ.question_id,
                isMarked: nextMark,
            });
        }

        // REST fallback (with 401 interception)
        try {
            await candidateFetch('/exam/mark', {
                method: 'POST',
                body: JSON.stringify({ questionId: currentQ.question_id, isMarked: nextMark }),
            });
        } catch (err) {
            console.error('Mark REST sync error:', err);
        }
    }

    // Final Exam Submit (Idempotent & Graceful)
    async function handleFinalSubmit() {
        if (isSubmitting || isSubmitted) return;
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await candidateFetch('/exam/submit', {
                method: 'POST',
            });

            const data = await res.json();
            if (!res.ok && !data.isAlreadySubmitted) {
                throw new Error(data.error || 'Submission failed.');
            }

            cleanupProctoring();
            setSubmitResult(data.result || data);
            setIsSubmitted(true);
            setShowSubmitModal(false);
            sessionStorage.removeItem('examSession');
        } catch (err) {
            // If already submitted in DB (e.g. via admin auto-submit), gracefully finalize
            if (err.message && err.message.includes('already been submitted')) {
                cleanupProctoring();
                setIsSubmitted(true);
                setShowSubmitModal(false);
                sessionStorage.removeItem('examSession');
            } else {
                setError(err.message || 'Failed to submit exam. Please notify invigilator.');
                setIsSubmitting(false);
            }
        }
    }

    // Completed Screen
    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-[#0d0707] text-[#fbe9e7] flex items-center justify-center p-4 font-sans selection:bg-orange-500 selection:text-white">
                <div className="max-w-md w-full bg-[#140b0b] border border-green-500/40 rounded-2xl p-8 text-center shadow-2xl space-y-6 relative overflow-hidden">
                    <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/40 text-green-400 flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
                        <span className="material-symbols-outlined text-4xl">task_alt</span>
                    </div>

                    <div>
                        <h2 className="text-2xl font-black text-white">Examination Submitted</h2>
                        <p className="text-xs text-gray-400 mt-1">
                            Your responses have been successfully evaluated and securely persisted.
                        </p>
                    </div>

                    <div className="p-4 bg-[#180d0d] border border-white/10 rounded-xl text-left text-xs space-y-2 font-mono">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Candidate:</span>
                            <span className="text-white font-bold">{session?.candidateName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Roll Number:</span>
                            <span className="text-orange-400 font-bold">{session?.rollNo}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Branch & Sec:</span>
                            <span className="text-gray-300">{session?.branch} - {session?.section}</span>
                        </div>
                        {submitResult?.score !== undefined && (
                            <div className="flex justify-between pt-2 border-t border-white/10 text-sm">
                                <span className="text-gray-300 font-bold">Total Score:</span>
                                <span className="text-green-400 font-black">{submitResult.score} / {summary.total}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
                    >
                        Return to Portal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0707] text-[#fbe9e7] flex flex-col font-sans selection:bg-orange-500 selection:text-white select-none">
            {/* Proctoring Security Warning Overlay */}
            {showWarning && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#1c0a0a] border border-red-500/50 rounded-2xl max-w-md w-full p-8 shadow-2xl text-center space-y-5">
                        <span className="material-symbols-outlined text-5xl text-red-400">security</span>
                        <h2 className="text-xl font-black text-white">Security Violation Detected</h2>
                        <p className="text-sm text-gray-300 leading-relaxed">{warningMessage}</p>
                        {violationCount > 0 && (
                            <div className="inline-block px-3 py-1 bg-red-900/40 border border-red-500/30 rounded-full text-xs font-mono text-red-300">
                                Violations: {violationCount} / 10
                            </div>
                        )}
                        <button
                            onClick={warningAction}
                            className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition cursor-pointer"
                        >
                            {warningButtonText}
                        </button>
                    </div>
                </div>
            )}

            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-[#140b0b]/95 backdrop-blur-md border-b border-white/10 px-4 lg:px-6 py-2.5 flex items-center justify-between">
                {/* Candidate Info */}
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-white text-base shadow-md shadow-orange-600/20">
                        G
                    </div>
                    <div>
                        <div className="text-xs font-black text-white tracking-wide uppercase flex items-center space-x-1.5">
                            <span>{session?.candidateName || 'Candidate'}</span>
                            <span className="text-orange-400 font-mono text-[11px] font-bold">({session?.rollNo})</span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                            {session?.branch}-{session?.section} • {session?.shiftName || 'Shift'}
                        </div>
                    </div>
                </div>

                {/* Center / Right: Countdown Timer & Submit Button */}
                <div className="flex items-center space-x-3">
                    {/* Timer */}
                    <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border font-mono font-black text-base sm:text-lg transition ${
                        isUrgent
                            ? 'bg-red-500/15 border-red-500/50 text-red-400 animate-pulse'
                            : 'bg-white/5 border-white/10 text-white'
                    }`}>
                        <span className="material-symbols-outlined text-[18px]">timer</span>
                        <span>{timerDisplay}</span>
                    </div>

                    {/* Mobile Drawer Toggle */}
                    <button
                        onClick={() => setShowMobileDrawer(!showMobileDrawer)}
                        className="xl:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white flex items-center"
                        title="Toggle Navigator"
                    >
                        <span className="material-symbols-outlined text-[20px]">grid_view</span>
                    </button>

                    {/* Submit Button */}
                    <button
                        onClick={() => setShowSubmitModal(true)}
                        className="hidden sm:flex px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-orange-600/20 transition items-center space-x-1"
                    >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        <span>Submit</span>
                    </button>
                </div>
            </header>

            {/* Shift Paused Overlay Banner */}
            {isPaused && (
                <div className="bg-amber-600/90 text-black px-4 py-2 text-center text-xs font-black tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg">
                    <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                    <span>Shift Paused by Invigilator — Timer Frozen</span>
                </div>
            )}

            {/* Main Exam Grid */}
            <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Area: Active Question Card */}
                <main className="xl:col-span-8 flex flex-col justify-between space-y-6">
                    {currentQ ? (
                        <div className="bg-[#140b0b] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl flex flex-col justify-between flex-1">
                            <div>
                                {/* Question Metadata Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-white/5 text-xs">
                                    <div className="flex items-center space-x-2">
                                        <span className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-black text-xs">
                                            Q {currentQ.position} / {summary.total}
                                        </span>
                                        <span className="text-gray-300 font-semibold">{currentQ.subject_name}</span>
                                        <span className="text-gray-500">• {currentQ.topic_name}</span>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                            currentQ.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                            currentQ.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                            {currentQ.difficulty}
                                        </span>
                                        {marks[currentQ.question_id] && (
                                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold flex items-center space-x-1">
                                                <span className="material-symbols-outlined text-[12px]">bookmark</span>
                                                <span>Marked</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Question Body with KaTeX */}
                                <div className="text-base sm:text-lg text-white font-normal leading-relaxed mb-6">
                                    <KaTeXRenderer text={currentQ.body} />
                                </div>

                                {/* Optional Illustration Image */}
                                {currentQ.image_url && (
                                    <div className="mb-6 flex justify-center">
                                        <img
                                            src={currentQ.image_url.startsWith('http') ? currentQ.image_url : `${API_URL}${currentQ.image_url}`}
                                            alt="Question illustration"
                                            className="max-h-64 rounded-xl border border-white/10 shadow-lg object-contain"
                                        />
                                    </div>
                                )}

                                {/* MCQ 4 Options */}
                                <div className="space-y-3">
                                    {['A', 'B', 'C', 'D'].map((opt) => {
                                        const optKey = opt.toLowerCase();
                                        const optText = currentQ[`option_${optKey}`];
                                        const isSelected = answers[currentQ.question_id] === optKey;

                                        return (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => handleSelectOption(optKey)}
                                                disabled={isPaused}
                                                className={`w-full min-h-[48px] p-4 rounded-xl border text-left text-sm sm:text-base flex items-start space-x-3 transition active:scale-[0.99] ${
                                                    isSelected
                                                        ? 'bg-orange-600/15 border-orange-500 text-white shadow-lg shadow-orange-600/10'
                                                        : 'bg-[#180d0d] border-white/10 text-gray-300 hover:border-white/25 hover:bg-white/[0.02]'
                                                }`}
                                            >
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border ${
                                                    isSelected
                                                        ? 'bg-orange-600 text-white border-orange-500'
                                                        : 'border-white/20 text-gray-400'
                                                }`}>
                                                    {opt}
                                                </div>
                                                <div className="flex-1 leading-relaxed">
                                                    <KaTeXRenderer text={optText || ''} />
                                                    {currentQ[`opt_${optKey}_image_url`] && (
                                                        <div className="mt-3">
                                                            <img
                                                                src={currentQ[`opt_${optKey}_image_url`].startsWith('http') ? currentQ[`opt_${optKey}_image_url`] : `${API_URL}${currentQ[`opt_${optKey}_image_url`]}`}
                                                                alt={`Option ${opt} image`}
                                                                className="max-h-32 rounded-lg border border-white/10 shadow-sm object-contain"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Bottom Question Controls */}
                            <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/5 gap-2">
                                <button
                                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={currentIndex === 0}
                                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition flex items-center space-x-1.5 disabled:opacity-30"
                                >
                                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                    <span>Previous</span>
                                </button>

                                <button
                                    onClick={handleToggleMark}
                                    className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition flex items-center space-x-1.5 ${
                                        marks[currentQ.question_id]
                                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        {marks[currentQ.question_id] ? 'bookmark_added' : 'bookmark_add'}
                                    </span>
                                    <span>{marks[currentQ.question_id] ? 'Marked' : 'Mark for Review'}</span>
                                </button>

                                <button
                                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                                    disabled={currentIndex === questions.length - 1}
                                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition flex items-center space-x-1.5 disabled:opacity-30"
                                >
                                    <span>Next</span>
                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-24 text-center text-gray-500">
                            No questions available.
                        </div>
                    )}

                    {/* Mobile Bottom Submit Button */}
                    <div className="sm:hidden">
                        <button
                            onClick={() => setShowSubmitModal(true)}
                            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/20 flex items-center justify-center space-x-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">send</span>
                            <span>Submit Examination</span>
                        </button>
                    </div>
                </main>

                {/* Right Area: Desktop Question Navigator (Hidden on mobile) */}
                <aside className="hidden xl:flex xl:col-span-4 flex-col space-y-4">
                    <div className="bg-[#140b0b] border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-full">
                        <div>
                            {/* Navigator Header */}
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                                    Question Navigator
                                </h3>
                                <span className="text-[11px] text-gray-400 font-mono">
                                    {summary.answered} / {summary.total} Answered
                                </span>
                            </div>

                            {/* Legend */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 mb-4 pb-3 border-b border-white/5">
                                <div className="flex items-center space-x-1.5">
                                    <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
                                    <span>Answered ({summary.answered})</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                    <span className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/50" />
                                    <span>Review ({summary.marked})</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                    <span className="w-3 h-3 rounded bg-[#180d0d] border border-white/10" />
                                    <span>Unanswered ({summary.unanswered})</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                    <span className="w-3 h-3 rounded border-2 border-orange-500" />
                                    <span>Current</span>
                                </div>
                            </div>

                            {/* 75-Cell Grid */}
                            <div className="grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                                {questions.map((q, idx) => {
                                    const isAnswered = Boolean(answers[q.question_id]);
                                    const isMarked = Boolean(marks[q.question_id]);
                                    const isCurrent = idx === currentIndex;

                                    let cellStyle = 'bg-[#180d0d] border-white/10 text-gray-400 hover:border-white/30';
                                    if (isMarked) {
                                        cellStyle = 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold';
                                    } else if (isAnswered) {
                                        cellStyle = 'bg-green-600/20 border-green-500 text-green-400 font-bold';
                                    }

                                    return (
                                        <button
                                            key={q.question_id || idx}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`h-9 rounded-lg border text-xs flex items-center justify-center font-mono transition ${cellStyle} ${
                                                isCurrent ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-[#140b0b] !border-orange-500 !text-white' : ''
                                            }`}
                                        >
                                            {q.position || idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submit Button in Sidebar */}
                        <div className="pt-4 mt-4 border-t border-white/5">
                            <button
                                onClick={() => setShowSubmitModal(true)}
                                className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/25 transition flex items-center justify-center space-x-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span>
                                <span>Submit Exam</span>
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Mobile Bottom Drawer Navigator */}
            {showMobileDrawer && (
                <div className="xl:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
                    <div className="bg-[#140b0b] border-t border-white/15 rounded-t-2xl max-h-[80vh] flex flex-col p-5 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                    Question Navigator
                                </h3>
                                <div className="text-xs text-gray-400 mt-0.5">
                                    {summary.answered} / {summary.total} Answered
                                </div>
                            </div>
                            <button
                                onClick={() => setShowMobileDrawer(false)}
                                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                            >
                                <span className="material-symbols-outlined text-[24px]">close</span>
                            </button>
                        </div>

                        {/* Mobile Grid */}
                        <div className="grid grid-cols-5 gap-2 overflow-y-auto py-4">
                            {questions.map((q, idx) => {
                                const isAnswered = Boolean(answers[q.question_id]);
                                const isMarked = Boolean(marks[q.question_id]);
                                const isCurrent = idx === currentIndex;

                                let cellStyle = 'bg-[#180d0d] border-white/10 text-gray-400';
                                if (isMarked) {
                                    cellStyle = 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold';
                                } else if (isAnswered) {
                                    cellStyle = 'bg-green-600/20 border-green-500 text-green-400 font-bold';
                                }

                                return (
                                    <button
                                        key={q.question_id || idx}
                                        onClick={() => {
                                            setCurrentIndex(idx);
                                            setShowMobileDrawer(false);
                                        }}
                                        className={`h-10 rounded-lg border text-xs flex items-center justify-center font-mono ${cellStyle} ${
                                            isCurrent ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-[#140b0b] !border-orange-500 !text-white' : ''
                                        }`}
                                    >
                                        {q.position || idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Confirmation Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#140b0b] border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
                        <div className="flex items-center space-x-3 text-orange-400">
                            <span className="material-symbols-outlined text-[28px]">assignment_turned_in</span>
                            <h3 className="text-base font-bold text-white">Confirm Exam Submission</h3>
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed">
                            Are you sure you want to finish and submit your exam? You cannot modify your answers once submitted.
                        </p>

                        {/* Summary breakdown */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                                <span className="text-[10px] text-green-400 font-bold uppercase block">Answered</span>
                                <div className="text-xl font-black text-white mt-1">{summary.answered}</div>
                            </div>
                            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                <span className="text-[10px] text-purple-400 font-bold uppercase block">Marked</span>
                                <div className="text-xl font-black text-white mt-1">{summary.marked}</div>
                            </div>
                            <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                <span className="text-[10px] text-gray-400 font-bold uppercase block">Unanswered</span>
                                <div className="text-xl font-black text-gray-300 mt-1">{summary.unanswered}</div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center justify-end space-x-3 pt-2">
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 rounded-lg transition"
                            >
                                Continue Exam
                            </button>
                            <button
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
                                className="px-5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-orange-600/25 transition flex items-center space-x-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    {isSubmitting ? 'sync' : 'done_all'}
                                </span>
                                <span>{isSubmitting ? 'Submitting...' : 'Yes, Submit Now'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
