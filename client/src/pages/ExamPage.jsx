import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import KaTeXRenderer from '../components/KaTeXRenderer';
import { API_URL, candidateFetch } from '../utils/api';
import useContestProctoring from '../hooks/useContestProctoring';
import FooterLogos from '../components/FooterLogos';

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

    // ─── Section Definitions (fixed order: Maths 1-15, Aptitude 16-22, English 23-27, C Prog 28-30) ───
    const SECTIONS = [
        { label: 'Mathematics',   short: 'Math',  start: 0,  end: 14, color: '#2A9D8F', bg: 'rgba(42,157,143,0.15)', border: 'rgba(42,157,143,0.45)', count: 15 },
        { label: 'Aptitude',      short: 'Apt',   start: 15, end: 21, color: '#E9C46A', bg: 'rgba(233,196,106,0.15)', border: 'rgba(233,196,106,0.45)', count: 7  },
        { label: 'English',       short: 'Eng',   start: 22, end: 26, color: '#F4A261', bg: 'rgba(244,162,97,0.15)',  border: 'rgba(244,162,97,0.45)',  count: 5  },
        { label: 'C Programming', short: 'C Prog',start: 27, end: 29, color: '#A8DADC', bg: 'rgba(168,218,220,0.15)', border: 'rgba(168,218,220,0.45)', count: 3  },
    ];

    // Which section the current question belongs to
    const activeSection = SECTIONS.findIndex(s => currentIndex >= s.start && currentIndex <= s.end);
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

    // Track visited questions for 4-tier navigation
    const [visited, setVisited] = useState(() => {
        const initial = new Set();
        if (session?.questions?.[0]?.question_id) {
            initial.add(session.questions[0].question_id);
        }
        return initial;
    });

    // Initialise from absolute deadline
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

    // Update visited set on question change
    const currentQ = questions[currentIndex];
    useEffect(() => {
        if (currentQ?.question_id) {
            setVisited((prev) => {
                if (prev.has(currentQ.question_id)) return prev;
                const next = new Set(prev);
                next.add(currentQ.question_id);
                return next;
            });
        }
    }, [currentIndex, currentQ?.question_id]);

    // Server-authoritative timer re-sync
    const handleTimeReSync = useCallback(async () => {
        if (isSyncingRef.current || isSubmitted || !session?.jwt) return;
        isSyncingRef.current = true;
        try {
            const res = await candidateFetch('/exam/time-check');
            if (res.ok) {
                const data = await res.json();
                if (data.isSubmitted) {
                    cleanupProctoring();
                    setSubmitResult({ score: data.score, total_marks: data.totalMarks });
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

    // Proctoring Hook
    const {
        showWarning,
        warningTitle,
        warningMessage,
        warningButtonText,
        warningAction,
        violationCount,
        maxViolations,
        isViolation,
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

    // Server re-sync on mount
    useEffect(() => {
        if (session?.jwt) {
            handleTimeReSync();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // WebSocket initialization
    useEffect(() => {
        if (!session?.jwt) return;

        const socket = io(API_URL, {
            transports: ['websocket', 'polling'],
            auth: { token: session.jwt },
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

        socket.on('extra_time_granted', () => {
            handleTimeReSync();
        });

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

        function handleVisibilityChange() {
            if (document.hidden) {
                socket.emit('tab_inactive', { sessionId: session.sessionId });
            } else {
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

    // Periodic heartbeat fallback re-sync
    useEffect(() => {
        if (isSubmitted || !session?.jwt) return;
        const syncInterval = setInterval(() => {
            handleTimeReSync();
        }, 30000);
        return () => clearInterval(syncInterval);
    }, [isSubmitted, session?.jwt, handleTimeReSync]);

    // Local countdown ticker
    useEffect(() => {
        if (isPaused || isSubmitted) return;

        timerRef.current = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
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

    // Timer status tiers
    const isWarning = timeRemaining <= 600 && timeRemaining > 300; // <= 10m
    const isCritical = timeRemaining <= 300; // <= 5m
    const isPulsing = timeRemaining <= 60;   // <= 1m

    // Summary counts
    const summary = useMemo(() => {
        let answered = 0;
        let marked = 0;
        questions.forEach((q) => {
            if (answers[q.question_id]) answered++;
            if (marks[q.question_id]) marked++;
        });
        const total = questions.length || 30;
        const unanswered = total - answered;
        return { answered, unanswered, marked, total };
    }, [questions, answers, marks]);

    // Handle Option Selection
    async function handleSelectOption(opt) {
        if (!currentQ || isSubmitted || isPaused) return;

        const currentAnswer = answers[currentQ.question_id];
        const nextAnswer = currentAnswer === opt ? null : opt;

        setAnswers((prev) => ({
            ...prev,
            [currentQ.question_id]: nextAnswer,
        }));

        if (socketRef.current?.connected) {
            socketRef.current.emit('answer_sync', {
                candidateId: session.candidateId,
                questionId: currentQ.question_id,
                selectedOpt: nextAnswer,
            });
        }

        try {
            await candidateFetch('/exam/answer', {
                method: 'POST',
                body: JSON.stringify({ questionId: currentQ.question_id, selectedOpt: nextAnswer }),
            });
        } catch (err) {
            console.error('Answer REST sync error:', err);
        }
    }

    // Handle Mark for Review Toggle
    async function handleToggleMark() {
        if (!currentQ || isSubmitted || isPaused) return;

        const nextMark = !marks[currentQ.question_id];

        setMarks((prev) => ({
            ...prev,
            [currentQ.question_id]: nextMark,
        }));

        if (socketRef.current?.connected) {
            socketRef.current.emit('mark_sync', {
                candidateId: session.candidateId,
                questionId: currentQ.question_id,
                isMarked: nextMark,
            });
        }

        try {
            await candidateFetch('/exam/mark', {
                method: 'POST',
                body: JSON.stringify({ questionId: currentQ.question_id, isMarked: nextMark }),
            });
        } catch (err) {
            console.error('Mark REST sync error:', err);
        }
    }

    // Final Exam Submit
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
            if (err.message && err.message.includes('already been submitted')) {
                cleanupProctoring();
                setIsSubmitted(true);
                setShowSubmitModal(false);
                sessionStorage.removeItem('examSession');
            } else {
                setError(err.message || 'Failed to submit exam. Please notify your invigilator.');
                setIsSubmitting(false);
            }
        }
    }

    // Keyboard Navigation
    useEffect(() => {
        if (isSubmitted || isPaused || showSubmitModal) return;

        function handleKeyDown(e) {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
                return;
            }

            const key = e.key.toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(key)) {
                e.preventDefault();
                handleSelectOption(key.toLowerCase());
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setCurrentIndex((prev) => Math.max(0, prev - 1));
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
            } else if (key === 'M') {
                e.preventDefault();
                handleToggleMark();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSubmitted, isPaused, showSubmitModal, currentQ, answers, marks, questions.length]);

    // ═══════════════════════════════════════════════
    //  COMPLETED SCREEN
    // ═══════════════════════════════════════════════
    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-[#122027] text-white flex items-center justify-center p-6 font-sans selection:bg-[#E76F51] selection:text-white relative overflow-hidden bg-tech-grid">
                {/* Ambient glow */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#2A9D8F]/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-[#E76F51]/15 rounded-full blur-3xl" />
                </div>

                <div className="max-w-md w-full bg-[#1B313B]/90 backdrop-blur-xl border border-[rgba(42,157,143,0.35)] rounded-2xl p-8 sm:p-10 text-center shadow-2xl space-y-6 relative overflow-hidden z-10">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2A9D8F] via-[#E9C46A] to-[#E76F51]" />

                    {/* Animated Checkmark */}
                    <div className="w-20 h-20 rounded-2xl bg-[#2A9D8F]/15 border border-[#2A9D8F]/40 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(42,157,143,0.25)]">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M5 13l4 4L19 7"
                                stroke="#2A9D8F"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray="24"
                                style={{ animation: 'check-draw 0.6s ease-out both' }}
                            />
                        </svg>
                    </div>

                    <div className="space-y-2">
                        <span className="inline-block px-4 py-1.5 bg-[#2A9D8F]/15 text-[#2A9D8F] border border-[#2A9D8F]/30 rounded-full text-xs font-mono font-bold tracking-[0.2em] uppercase">
                            SUBMISSION COMPLETE
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                            Exam Submitted
                        </h1>
                        <p className="text-sm text-[#9CB6BF] leading-relaxed max-w-xs mx-auto">
                            Thank you! Your responses have been submitted successfully.
                        </p>
                    </div>

                    <div className="w-24 h-[1px] bg-[rgba(42,157,143,0.3)] mx-auto" />

                    <div className="text-sm font-mono text-[#9CB6BF] space-y-1.5">
                        <div className="font-bold text-white uppercase text-base">AAC Entrance Test • 2026</div>
                        <div>
                            {session?.candidateName || 'Candidate'} {session?.rollNo ? `(${session.rollNo})` : ''}
                        </div>
                        <div className="text-xs text-[#9CB6BF]/80">
                            {session?.branch || 'Dept'} • {session?.shiftName || 'Standard Session'}
                        </div>
                    </div>

                    <div className="py-4 px-5 bg-[#122027]/80 border border-[rgba(42,157,143,0.25)] rounded-xl text-sm font-mono text-[#9CB6BF]">
                        Your exam is complete.
                        <div className="font-bold text-white mt-0.5">Thank you for participating. All the best!</div>
                    </div>

                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 bg-[#162932] hover:bg-[#264653] text-white font-bold text-sm uppercase tracking-widest rounded-xl border border-[rgba(42,157,143,0.3)] transition-colors duration-150 cursor-pointer"
                    >
                        Return to Portal
                    </button>
                </div>

                {/* Bottom Right Footer Logos */}
                <div className="absolute bottom-4 right-6 flex items-center gap-3 z-20">
                    <FooterLogos size="small" />
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════
    //  ACTIVE EXAM VIEW
    // ═══════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#122027] text-white flex flex-col font-sans selection:bg-[#E76F51] selection:text-white select-none relative bg-tech-grid">

            {/* ═══ Vibrant Ambient Glow Background ═══ */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-32 left-1/4 w-[30rem] h-[30rem] bg-[#264653]/35 rounded-full blur-3xl" />
                <div className="absolute top-1/2 -right-20 w-[28rem] h-[28rem] bg-[#E76F51]/12 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-[#2A9D8F]/20 rounded-full blur-3xl" />
            </div>

            {/* ── Proctoring Warning Overlay ── */}
            <AnimatePresence>
                {showWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <div
                            className={`bg-[#1B313B] border-2 rounded-2xl max-w-md w-full p-8 shadow-2xl text-center space-y-5 relative overflow-hidden ${isViolation ? 'border-[#E76F51]' : 'border-[#E9C46A]'
                                }`}
                        >
                            <div className={`absolute top-0 left-0 right-0 h-1 ${isViolation ? 'bg-[#E76F51]' : 'bg-[#E9C46A]'}`} />
                            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center font-mono font-bold text-2xl ${isViolation ? 'bg-[#E76F51]/20 text-[#E76F51]' : 'bg-[#E9C46A]/20 text-[#E9C46A]'
                                }`}>
                                ⚠
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                {warningTitle || (isViolation ? 'Security Violation Detected' : 'Fullscreen Required')}
                            </h2>
                            <p className="text-sm text-[#9CB6BF] leading-relaxed">{warningMessage}</p>
                            {isViolation && violationCount > 0 && (
                                <div className="inline-block px-4 py-2 bg-[#E76F51]/15 border border-[#E76F51]/30 rounded-lg text-sm font-mono text-[#E76F51] font-bold">
                                    Violations: {violationCount}
                                </div>
                            )}
                            <button
                                onClick={warningAction}
                                className={`w-full py-4 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-colors duration-150 cursor-pointer shadow-lg ${isViolation
                                    ? 'bg-[#E76F51] hover:bg-[#F4A261]'
                                    : 'bg-[#E76F51] hover:bg-[#F4A261]'
                                    }`}
                            >
                                {warningButtonText}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Sticky Top Header ── */}
            <header className="sticky top-0 z-30 bg-[#162932]/90 backdrop-blur-md border-b border-[rgba(42,157,143,0.25)] px-4 sm:px-8 py-3 flex items-center justify-between shadow-lg">
                {/* Left: Brand + Candidate Info */}
                <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold tracking-widest px-2.5 py-1.5 bg-gradient-to-r from-[#E76F51] to-[#F4A261] text-white rounded-md flex items-center gap-1.5 shadow-[0_0_12px_rgba(231,111,81,0.3)]">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>AAC</span>
                    </span>
                    <div className="hidden md:block">
                        <div className="text-xs font-bold text-white tracking-wide uppercase flex items-center space-x-1.5 font-mono">
                            <span>{session?.candidateName || 'Candidate'}</span>
                            <span className="text-[#9CB6BF]">({session?.rollNo || 'ID'})</span>
                        </div>
                        <div className="text-[10px] text-[#9CB6BF] font-mono">
                            {session?.branch || 'Dept'} • {session?.shiftName || 'Shift'}
                        </div>
                    </div>
                </div>

                {/* Center: Question Position + current section */}
                <div className="flex items-center gap-2">
                    <div className="font-mono text-xs font-bold tracking-wider text-white uppercase px-3 py-1.5 bg-[#1B313B] rounded-lg border border-[rgba(42,157,143,0.3)]">
                        Q<span className="text-[#E9C46A] font-extrabold">{currentIndex + 1}</span> <span className="text-[#9CB6BF] font-normal">/ {summary.total}</span>
                    </div>
                    {activeSection >= 0 && (
                        <div
                            className="hidden sm:inline-block font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-lg border"
                            style={{ color: SECTIONS[activeSection].color, background: SECTIONS[activeSection].bg, borderColor: SECTIONS[activeSection].border }}
                        >
                            {SECTIONS[activeSection].label}
                        </div>
                    )}
                </div>

                {/* Right: Timer + Submit */}
                <div className="flex items-center space-x-3">
                    {/* Timer */}
                    <div className={`flex flex-col items-end px-4 py-1.5 rounded-lg border transition-colors duration-300 ${isCritical
                        ? 'bg-[#E76F51]/20 border-[#E76F51]/50 text-[#E76F51] animate-pulse-critical'
                        : isWarning
                            ? 'bg-[#E9C46A]/20 border-[#E9C46A]/50 text-[#E9C46A]'
                            : 'bg-[#1B313B] border-[rgba(42,157,143,0.3)] text-white'
                        }`}>
                        <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-[#9CB6BF]">
                            Time Left
                        </span>
                        <span className="font-mono font-extrabold text-base sm:text-lg leading-tight">
                            {timerDisplay}
                        </span>
                    </div>

                    {/* Mobile Grid Toggle */}
                    <button
                        onClick={() => setShowMobileDrawer(!showMobileDrawer)}
                        className="xl:hidden px-3 py-2 rounded-lg bg-[#1B313B] border border-[rgba(42,157,143,0.3)] text-white text-xs font-mono font-bold hover:bg-[#264653] transition cursor-pointer"
                        title="Toggle Navigator"
                    >
                        Grid
                    </button>

                    {/* Submit Button (Header) */}
                    <button
                        onClick={() => setShowSubmitModal(true)}
                        className="hidden sm:inline-flex px-5 py-2 bg-[#E76F51] hover:bg-[#F4A261] text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-md transition-colors duration-150 cursor-pointer"
                    >
                        Submit Exam
                    </button>
                </div>
            </header>

            {/* ── Section Tab Bar ── */}
            <div className="sticky top-[57px] z-20 bg-[#162932]/95 backdrop-blur-sm border-b border-[rgba(42,157,143,0.2)] px-4 sm:px-8 shadow-md">
                <div className="max-w-7xl mx-auto flex items-stretch gap-0 overflow-x-auto scrollbar-hide">
                    {SECTIONS.map((sec, si) => {
                        const isActive = si === activeSection;
                        const sectionAnswered = questions.slice(sec.start, sec.end + 1).filter(q => answers[q?.question_id]).length;
                        return (
                            <button
                                key={sec.label}
                                onClick={() => setCurrentIndex(sec.start)}
                                className={`relative flex flex-col items-center justify-center px-4 sm:px-6 py-2 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer border-b-2 ${
                                    isActive
                                        ? 'border-b-2 text-white'
                                        : 'border-b-2 border-transparent text-[#9CB6BF] hover:text-white hover:bg-[#1B313B]/60'
                                }`}
                                style={isActive ? { borderBottomColor: sec.color, color: sec.color } : {}}
                            >
                                <span className="hidden sm:inline">{sec.label}</span>
                                <span className="sm:hidden">{sec.short}</span>
                                <span
                                    className="text-[9px] mt-0.5 font-normal"
                                    style={{ color: isActive ? sec.color : '#6B8A95' }}
                                >
                                    {sectionAnswered}/{sec.count}
                                </span>
                                {isActive && (
                                    <span
                                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                                        style={{ background: sec.color }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Paused Banner ── */}
            {isPaused && (
                <div className="bg-[#E9C46A] text-[#122027] px-4 py-2 text-center text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center space-x-2 border-b border-[#E9C46A]/80">
                    <span className="w-2 h-2 rounded-full bg-[#122027] animate-ping" />
                    <span>PAUSED • Shift Temporarily Suspended by Invigilator — Timer Frozen</span>
                </div>
            )}

            {/* ── Main Exam Grid (with pb-32 so bottom dock never overlaps content) ── */}
            <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-32 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start relative z-10">

                {/* ── Left: Question Card ── */}
                <main className="xl:col-span-8 flex flex-col space-y-5">
                    <AnimatePresence mode="wait">
                        {currentQ ? (
                            <div
                                key={currentQ.question_id}
                                className="bg-[#1B313B]/90 backdrop-blur-xl border border-[rgba(42,157,143,0.3)] rounded-2xl p-6 sm:p-9 shadow-2xl flex flex-col justify-between min-h-[500px]"
                            >
                                <div>
                                    {/* Question Header */}
                                    <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 mb-6 border-b border-[rgba(42,157,143,0.25)]">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xl sm:text-2xl font-extrabold text-white">
                                                Q{currentQ.position || currentIndex + 1}
                                            </span>
                                            {currentQ.subject_name && (
                                                <span className="text-xs font-mono text-[#2A9D8F] bg-[#2A9D8F]/15 px-3 py-1 rounded-lg border border-[#2A9D8F]/30 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F]" />
                                                    <span>{currentQ.subject_name}</span>
                                                    {currentQ.topic_name ? <span className="text-[#9CB6BF]">• {currentQ.topic_name}</span> : null}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2 text-xs font-mono">
                                            {currentQ.marks !== undefined && (
                                                <span className="px-2.5 py-1 bg-[#162932] border border-[rgba(42,157,143,0.25)] rounded-md text-[#9CB6BF] font-semibold">
                                                    +{currentQ.marks || 1} / -{currentQ.negative_marks || 0}
                                                </span>
                                            )}
                                            {marks[currentQ.question_id] && (
                                                <span className="px-2.5 py-1 rounded-md bg-[#E9C46A]/20 text-[#E9C46A] border border-[#E9C46A]/50 font-bold">
                                                    ★ Marked
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Question Body */}
                                    <div className="text-lg sm:text-[20px] text-white font-normal leading-[1.7] mb-8">
                                        <KaTeXRenderer text={currentQ.body} />
                                    </div>

                                    {/* Optional Image */}
                                    {currentQ.image_url && (
                                        <div className="mb-8 flex justify-center">
                                            <img
                                                src={currentQ.image_url.startsWith('http') ? currentQ.image_url : `${API_URL}${currentQ.image_url}`}
                                                alt="Question illustration"
                                                className="max-h-72 rounded-xl border border-[rgba(42,157,143,0.3)] object-contain bg-[#122027] p-3 shadow-md"
                                            />
                                        </div>
                                    )}

                                    {/* MCQ Options */}
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
                                                    className={`w-full min-h-[58px] p-4 rounded-xl border-2 transition-colors duration-150 flex items-start space-x-3.5 cursor-pointer text-left ${isSelected
                                                        ? 'bg-[#2A9D8F]/20 border-[#2A9D8F] text-white shadow-[0_0_15px_rgba(42,157,143,0.25)]'
                                                        : 'bg-[#122027]/70 border-[rgba(42,157,143,0.2)] text-[#9CB6BF] hover:bg-[#162932] hover:border-[rgba(42,157,143,0.4)]'
                                                        }`}
                                                >
                                                    {/* Option Badge */}
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 mt-0.5 border-2 transition-colors duration-150 ${isSelected
                                                        ? 'bg-[#2A9D8F] text-white border-[#2A9D8F]'
                                                        : 'border-[rgba(42,157,143,0.3)] bg-[#1B313B] text-[#9CB6BF]'
                                                        }`}>
                                                        {opt}
                                                    </div>

                                                    {/* Option Text */}
                                                    <div className="flex-1 text-base leading-relaxed text-white">
                                                        <KaTeXRenderer text={optText || ''} />
                                                    </div>

                                                    {/* Checkmark when selected */}
                                                    {isSelected && (
                                                        <span className="w-6 h-6 rounded-full bg-[#2A9D8F] text-white flex items-center justify-center font-bold text-xs font-mono mt-0.5 shrink-0">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Keyboard Hints */}
                                    <div className="mt-6 flex items-center justify-between text-[11px] font-mono text-[#9CB6BF] pt-3 border-t border-[rgba(42,157,143,0.25)]">
                                        <div className="flex items-center space-x-2">
                                            <span>Keys:</span>
                                            {['A', 'B', 'C', 'D'].map((k) => (
                                                <span key={k} className="px-1.5 py-0.5 bg-[#162932] border border-[rgba(42,157,143,0.3)] rounded text-white font-bold text-[10px]">
                                                    {k}
                                                </span>
                                            ))}
                                            <span>to answer</span>
                                        </div>
                                        <div className="hidden sm:flex items-center space-x-3">
                                            <span>[← / →] Navigate</span>
                                            <span className="text-[rgba(42,157,143,0.4)]">•</span>
                                            <span>[M] Mark</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-24 text-center text-[#9CB6BF] font-mono bg-[#1B313B]/80 border border-[rgba(42,157,143,0.25)] rounded-2xl">
                                No questions loaded in this assessment session.
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Mobile Submit in content flow */}
                    <div className="sm:hidden">
                        <button
                            onClick={() => setShowSubmitModal(true)}
                            className="w-full py-3.5 bg-[#E76F51] hover:bg-[#F4A261] text-white font-bold text-sm uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
                        >
                            <span>Submit Examination</span>
                        </button>
                    </div>
                </main>

                {/* ── Right: Question Navigator Sidebar ── */}
                <aside className="hidden xl:flex xl:col-span-4 flex-col space-y-4">
                    <div className="bg-[#1B313B]/90 backdrop-blur-xl border border-[rgba(42,157,143,0.3)] rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
                        <div>
                            {/* Header */}
                            <div className="flex items-baseline justify-between pb-3 mb-4 border-b border-[rgba(42,157,143,0.25)]">
                                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-widest">
                                    Navigator
                                </h2>
                                <span className="text-sm font-mono text-[#E9C46A] font-bold">
                                    {summary.answered} / {summary.total}
                                </span>
                            </div>

                            {/* Legend */}
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#9CB6BF] mb-4 pb-3 border-b border-[rgba(42,157,143,0.25)]">
                                <div className="flex items-center space-x-2">
                                    <span className="w-3.5 h-3.5 rounded bg-[#2A9D8F] shrink-0" />
                                    <span>Attempted ({summary.answered})</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="w-3.5 h-3.5 rounded bg-[#E9C46A] shrink-0" />
                                    <span>Marked ({summary.marked})</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="w-3.5 h-3.5 rounded bg-[#264653] shrink-0" />
                                    <span>Visited</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="w-3.5 h-3.5 rounded bg-[#122027] border border-[rgba(42,157,143,0.3)] shrink-0" />
                                    <span>Unvisited ({summary.unanswered})</span>
                                </div>
                            </div>

                            {/* Section-Grouped Question Grid */}
                            <div className="max-h-[46vh] overflow-y-auto pr-1 space-y-4">
                                {SECTIONS.map((sec, si) => {
                                    const secQuestions = questions.slice(sec.start, sec.end + 1);
                                    const secAnswered = secQuestions.filter(q => answers[q?.question_id]).length;
                                    const isCurrentSection = si === activeSection;
                                    return (
                                        <div key={sec.label}>
                                            {/* Section Label */}
                                            <div
                                                className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest mb-2 px-1"
                                                style={{ color: sec.color }}
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <span
                                                        className="w-1.5 h-1.5 rounded-full inline-block"
                                                        style={{ background: sec.color }}
                                                    />
                                                    {sec.label}
                                                </span>
                                                <span style={{ color: isCurrentSection ? sec.color : '#6B8A95' }}>
                                                    {secAnswered}/{sec.count}
                                                </span>
                                            </div>
                                            {/* Grid for this section */}
                                            <div className="grid grid-cols-5 gap-2">
                                                {secQuestions.map((q, i) => {
                                                    const idx = sec.start + i;
                                                    const isAnswered = Boolean(answers[q.question_id]);
                                                    const isMarked = Boolean(marks[q.question_id]);
                                                    const isVisited = visited.has(q.question_id);
                                                    const isCurrent = idx === currentIndex;

                                                    let cellClasses = 'bg-[#122027]/80 text-[#9CB6BF] border-[rgba(42,157,143,0.2)] hover:bg-[#162932] hover:text-white';
                                                    if (isMarked) {
                                                        cellClasses = 'bg-[#E9C46A] text-[#122027] border-[#E9C46A] font-extrabold shadow-sm';
                                                    } else if (isAnswered) {
                                                        cellClasses = 'bg-[#2A9D8F] text-white border-[#2A9D8F] font-bold shadow-sm';
                                                    } else if (isVisited) {
                                                        cellClasses = 'bg-[#264653] text-white border-[rgba(42,157,143,0.35)] font-medium';
                                                    }

                                                    const formattedNum = (idx + 1).toString().padStart(2, '0');
                                                    return (
                                                        <button
                                                            key={q.question_id || idx}
                                                            onClick={() => setCurrentIndex(idx)}
                                                            className={`h-10 rounded-lg border text-xs flex items-center justify-center font-mono font-bold transition-colors duration-150 cursor-pointer ${cellClasses} ${
                                                                isCurrent ? 'ring-2 ring-[#E76F51] !border-[#E76F51] font-extrabold shadow-[0_0_12px_rgba(231,111,81,0.5)]' : ''
                                                            }`}
                                                        >
                                                            {formattedNum}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submit in Sidebar */}
                        <div className="pt-5 mt-6 border-t border-[rgba(42,157,143,0.25)]">
                            <button
                                onClick={() => setShowSubmitModal(true)}
                                className="w-full py-3.5 bg-[#E76F51] hover:bg-[#F4A261] text-white font-bold text-sm uppercase tracking-widest rounded-xl shadow-lg transition-colors duration-150 cursor-pointer flex items-center justify-center space-x-2"
                            >
                                <span>Submit Examination</span>
                            </button>
                        </div>
                    </div>
                </aside>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ── FIXED BOTTOM CONTROL DOCK (NEXT & PREVIOUS ALWAYS VISIBLE) ── */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#162932]/95 backdrop-blur-xl border-t border-[rgba(42,157,143,0.3)] px-4 sm:px-8 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">

                    {/* Previous Button */}
                    <button
                        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        id="exam-prev-btn"
                        className="px-5 py-2.5 rounded-xl border border-[rgba(42,157,143,0.3)] bg-[#1B313B] hover:bg-[#264653] text-sm font-bold text-white uppercase tracking-wider transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-2 select-none"
                    >
                        <span>←</span>
                        <span className="hidden sm:inline">Previous</span>
                        <span className="hidden sm:inline-block text-[10px] font-mono text-[#9CB6BF] bg-[#122027] px-1.5 py-0.5 rounded border border-[rgba(42,157,143,0.3)]">[←]</span>
                    </button>

                    {/* Center: Section indicator + Mark + Progress */}
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <button
                            onClick={handleToggleMark}
                            id="exam-mark-btn"
                            className={`px-4 sm:px-5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer flex items-center space-x-2 select-none ${marks[currentQ?.question_id]
                                ? 'bg-[#E9C46A]/20 text-[#E9C46A] border-[#E9C46A]/60 shadow-[0_0_12px_rgba(233,196,106,0.3)]'
                                : 'bg-[#1B313B] border-[rgba(42,157,143,0.3)] text-[#9CB6BF] hover:bg-[#264653] hover:text-white'
                                }`}
                        >
                            <span>{marks[currentQ?.question_id] ? '★ Marked' : '☆ Mark'}</span>
                            <span className="hidden sm:inline-block text-[10px] font-mono text-[#9CB6BF] bg-[#122027] px-1.5 py-0.5 rounded border border-[rgba(42,157,143,0.3)]">[M]</span>
                        </button>

                        <div className="hidden md:flex items-center space-x-2 font-mono text-xs text-[#9CB6BF] px-3.5 py-2 bg-[#122027]/90 rounded-xl border border-[rgba(42,157,143,0.25)]">
                            {activeSection >= 0 && (
                                <span
                                    className="font-bold uppercase tracking-wide"
                                    style={{ color: SECTIONS[activeSection].color }}
                                >
                                    {SECTIONS[activeSection].label}
                                </span>
                            )}
                            <span className="text-[rgba(42,157,143,0.4)]">•</span>
                            <span className="font-bold text-white">Q{currentIndex + 1} / {summary.total}</span>
                            <span className="text-[rgba(42,157,143,0.4)]">•</span>
                            <span className="text-[#2A9D8F] font-bold">{summary.answered} Ans</span>
                            {summary.marked > 0 && (
                                <>
                                    <span className="text-[rgba(42,157,143,0.4)]">•</span>
                                    <span className="text-[#E9C46A] font-bold">{summary.marked} ★</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Next Button — shows 'Next Section' label when at end of a section */}
                    <div className="flex items-center gap-3">
                        {(() => {
                            const isLastInSection = activeSection >= 0 && currentIndex === SECTIONS[activeSection].end;
                            const nextSec = isLastInSection && activeSection < SECTIONS.length - 1 ? SECTIONS[activeSection + 1] : null;
                            const isLastQ = currentIndex === questions.length - 1;
                            return (
                                <button
                                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                                    disabled={isLastQ}
                                    id="exam-next-btn"
                                    className="px-5 sm:px-6 py-2.5 rounded-xl bg-[#E76F51] hover:bg-[#F4A261] text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex flex-col items-center justify-center shadow-[0_0_20px_rgba(231,111,81,0.35)] select-none leading-tight"
                                >
                                    {nextSec ? (
                                        <>
                                            <span className="text-[9px] opacity-80 font-normal normal-case tracking-normal">
                                                Next: {nextSec.label}
                                            </span>
                                            <span className="flex items-center gap-1">Next →</span>
                                        </>
                                    ) : (
                                        <span className="flex items-center gap-1">Next →</span>
                                    )}
                                </button>
                            );
                        })()}
                        <div className="hidden sm:flex items-center pl-2 border-l border-[rgba(42,157,143,0.3)]">
                            <FooterLogos size="small" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mobile Drawer ── */}
            <AnimatePresence>
                {showMobileDrawer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="xl:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end"
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-[#1B313B] border-t border-[rgba(42,157,143,0.3)] rounded-t-2xl max-h-[80vh] flex flex-col p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-[rgba(42,157,143,0.25)]">
                                <div>
                                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest">
                                        Question Navigator
                                    </h3>
                                    <div className="text-xs font-mono text-[#E9C46A] mt-0.5">
                                        {summary.answered} / {summary.total} Attempted
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowMobileDrawer(false)}
                                    className="px-3 py-1.5 text-xs font-mono border border-[rgba(42,157,143,0.3)] rounded-lg text-white font-bold hover:bg-[#264653] transition cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>

                            {/* Section-grouped mobile grid */}
                            <div className="overflow-y-auto py-4 space-y-5">
                                {SECTIONS.map((sec, si) => {
                                    const secQuestions = questions.slice(sec.start, sec.end + 1);
                                    const secAnswered = secQuestions.filter(q => answers[q?.question_id]).length;
                                    return (
                                        <div key={sec.label}>
                                            <div
                                                className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest mb-2"
                                                style={{ color: sec.color }}
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: sec.color }} />
                                                    {sec.label}
                                                </span>
                                                <span>{secAnswered}/{sec.count}</span>
                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {secQuestions.map((q, i) => {
                                                    const idx = sec.start + i;
                                                    const isAnswered = Boolean(answers[q.question_id]);
                                                    const isMarked = Boolean(marks[q.question_id]);
                                                    const isVisited = visited.has(q.question_id);
                                                    const isCurrent = idx === currentIndex;

                                                    let cellClasses = 'bg-[#122027] text-[#9CB6BF] border-[rgba(42,157,143,0.2)]';
                                                    if (isMarked) {
                                                        cellClasses = 'bg-[#E9C46A] text-[#122027] border-[#E9C46A] font-extrabold shadow-sm';
                                                    } else if (isAnswered) {
                                                        cellClasses = 'bg-[#2A9D8F] text-white border-[#2A9D8F] font-bold shadow-sm';
                                                    } else if (isVisited) {
                                                        cellClasses = 'bg-[#264653] text-white border-[rgba(42,157,143,0.3)] font-medium shadow-sm';
                                                    }

                                                    const formattedNum = (idx + 1).toString().padStart(2, '0');
                                                    return (
                                                        <button
                                                            key={q.question_id || idx}
                                                            onClick={() => {
                                                                setCurrentIndex(idx);
                                                                setShowMobileDrawer(false);
                                                            }}
                                                            className={`h-11 rounded-lg border text-sm flex items-center justify-center font-mono font-bold transition-colors duration-150 cursor-pointer ${cellClasses} ${isCurrent ? 'ring-2 ring-[#E76F51] !border-[#E76F51] font-extrabold' : ''}`}
                                                        >
                                                            {formattedNum}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Submit Confirmation Modal ── */}
            <AnimatePresence>
                {showSubmitModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#1B313B] border border-[rgba(42,157,143,0.35)] rounded-2xl max-w-md w-full p-8 shadow-2xl space-y-6 relative overflow-hidden"
                        >
                            {/* Top accent */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2A9D8F] via-[#E9C46A] to-[#E76F51]" />

                            <div>
                                <div className="inline-block px-3.5 py-1 bg-[#E76F51]/15 text-[#E76F51] border border-[#E76F51]/30 rounded-full text-xs font-mono font-bold tracking-[0.2em] uppercase mb-2">
                                    Final Confirmation
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                    Ready to Submit?
                                </h3>
                            </div>

                            {/* Summary text */}
                            <div className="text-sm text-[#9CB6BF] leading-relaxed">
                                {summary.unanswered > 0 ? (
                                    <div>
                                        You have attempted <strong className="text-white font-bold">{summary.answered}</strong> of{' '}
                                        <strong className="text-white font-bold">{summary.total}</strong> questions.
                                        <div className="mt-1 text-[#E76F51] font-semibold font-mono text-xs">
                                            {summary.unanswered} questions remain unanswered.
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <strong className="text-[#2A9D8F] font-bold">{summary.total} / {summary.total}</strong> questions attempted. All questions answered!
                                    </div>
                                )}
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-3 text-center text-sm font-mono">
                                <div className="p-4 bg-[#2A9D8F]/15 border border-[#2A9D8F]/35 rounded-xl">
                                    <span className="text-xs text-[#9CB6BF] font-bold uppercase block">Attempted</span>
                                    <div className="text-2xl font-extrabold text-[#2A9D8F] mt-1">{summary.answered}</div>
                                </div>
                                <div className="p-4 bg-[#E9C46A]/15 border border-[#E9C46A]/35 rounded-xl">
                                    <span className="text-xs text-[#9CB6BF] font-bold uppercase block">Marked</span>
                                    <div className="text-2xl font-extrabold text-[#E9C46A] mt-1">{summary.marked}</div>
                                </div>
                                <div className="p-4 bg-[#122027] border border-[rgba(42,157,143,0.25)] rounded-xl">
                                    <span className="text-xs text-[#9CB6BF] font-bold uppercase block">Remaining</span>
                                    <div className="text-2xl font-extrabold text-white mt-1">{summary.unanswered}</div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 rounded-xl bg-[#E76F51]/15 border border-[#E76F51]/30 text-[#E76F51] text-sm font-mono font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="flex items-center justify-end space-x-3 pt-2">
                                <button
                                    onClick={() => setShowSubmitModal(false)}
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 bg-[#162932] hover:bg-[#264653] border border-[rgba(42,157,143,0.3)] text-sm font-bold uppercase tracking-wider text-[#9CB6BF] hover:text-white rounded-xl transition-colors duration-150 cursor-pointer"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={handleFinalSubmit}
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 bg-[#E76F51] hover:bg-[#F4A261] text-white text-sm font-bold uppercase tracking-widest rounded-xl shadow-lg transition-colors duration-150 cursor-pointer disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    <span>{isSubmitting ? 'Submitting...' : 'Submit Exam'}</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
