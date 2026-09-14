import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../utils/api';
import FooterLogos from '../components/FooterLogos';

// ── Exam Rules with Distinct Badges and High Contrast ──
const examRules = [
    {
        num: '01',
        title: 'Stay in fullscreen',
        desc: 'Keep the exam in fullscreen mode. Do not minimize or resize the browser..',
        type: 'required',
    },
    {
        num: '02',
        title: 'Stay on the exam',
        desc: 'Do not switch tabs, windows, or applications during the exam.',
        type: 'required',
    },
    {
        num: '03',
        title: 'Submission is final',
        desc: 'Once submitted, your answers cannot be changed.',
        type: 'required',
    },
    {
        num: '04',
        title: 'Navigate freely',
        desc: 'You can move between questions and change your answers at any time.',
        type: 'note',
    },
    {
        num: '05',
        title: 'Submit when finished',
        desc: 'Submit your exam once you have answered all the questions you want to attempt.',
        type: 'note',
    },
    {
        num: '06',
        title: 'Auto-submit on timeout',
        desc: 'Your exam will be submitted automatically when the timer reaches zero.',
        type: 'note',
    },
    {
        num: '07',
        title: 'No negative marking',
        desc: 'Unanswered questions simply score zero. There is no penalty for incorrect answers — attempt every question!',
        type: 'note',
    },
];

export default function CandidateLogin() {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shakeError, setShakeError] = useState(false);
    const [verifiedSession, setVerifiedSession] = useState(() => {
        try {
            const cached = sessionStorage.getItem('examSession');
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });
    const navigate = useNavigate();

    function handleTokenChange(e) {
        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        setToken(val);
        setError(null);
    }

    function triggerShake() {
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
    }

    async function enterFullscreenAndNavigate() {
        try {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (fsErr) {
            console.warn('Fullscreen request skipped or blocked:', fsErr);
        }
        navigate('/exam');
    }

    async function handleBeginExam(e) {
        if (e) e.preventDefault();

        // If candidate is already verified, immediately launch exam
        if (verifiedSession && verifiedSession.jwt) {
            await enterFullscreenAndNavigate();
            return;
        }

        const cleanToken = token.trim();
        if (!cleanToken) {
            setError('Please enter your examination access token to begin.');
            triggerShake();
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/exam/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: cleanToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to verify token. Please contact your coordinator.');
            }

            const sessionData = {
                jwt: data.token || data.jwt,
                candidateId: data.candidate?.id,
                candidateName: data.candidate?.name,
                rollNo: data.candidate?.roll_no,
                branch: data.candidate?.branch,
                section: data.candidate?.section,
                shiftId: data.candidate?.shift_id,
                shiftName: data.candidate?.shift_name,
                sessionId: data.session?.id,
                questions: data.questions || [],
                endTime: data.session?.endTime,
                timeRemainingSec: data.session?.timeRemainingSec,
                isPaused: data.session?.isPaused || false,
                token: cleanToken,
            };

            sessionStorage.setItem('examSession', JSON.stringify(sessionData));
            setVerifiedSession(sessionData);

            await enterFullscreenAndNavigate();
        } catch (err) {
            setError(err.message || 'An unexpected error occurred. Please try again.');
            triggerShake();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#122027] text-white flex flex-col font-sans selection:bg-[#E76F51] selection:text-white relative overflow-x-hidden bg-tech-grid">

            {/* ═══ Vibrant Ambient Background Glow Elements ═══ */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-32 left-1/4 w-[30rem] h-[30rem] bg-[#264653]/35 rounded-full blur-3xl" />
                <div className="absolute top-1/3 -right-20 w-[30rem] h-[30rem] bg-[#E76F51]/15 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 left-10 w-96 h-96 bg-[#2A9D8F]/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#E9C46A]/12 rounded-full blur-3xl" />
            </div>

            {/* ═══ Header ═══ */}
            <header className="w-full border-b border-[rgba(42,157,143,0.25)] bg-[#162932]/90 backdrop-blur-md px-6 sm:px-12 py-4 sticky top-0 z-30 shadow-lg">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <span className="font-mono text-xs font-bold tracking-widest px-3 py-2 bg-gradient-to-r from-[#E76F51] to-[#F4A261] text-white rounded-lg flex items-center gap-2 shadow-[0_0_12px_rgba(231,111,81,0.3)]">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            <span>AAC</span>
                        </span>
                        <div className="hidden sm:block">
                            <div className="text-sm font-bold text-white tracking-wide">Entrance Examination</div>
                            <div className="text-[11px] font-mono text-[#9CB6BF] uppercase tracking-wider">Candidate Portal • 2026</div>
                        </div>
                    </div>
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(42,157,143,0.3)] bg-[#1B313B] hover:bg-[#264653] text-sm font-semibold text-white transition-colors duration-150"
                    >
                        <span>←</span>
                        <span>Back to Home</span>
                    </Link>
                </div>
            </header>

            {/* ═══ Title Section ═══ */}
            <div className="max-w-6xl mx-auto w-full px-6 sm:px-12 pt-8 pb-4 relative z-10">
                <div className="text-center">
                    {/* <span className="inline-block px-4 py-1.5 bg-[#2A9D8F]/15 border border-[#2A9D8F]/30 text-[#2A9D8F] font-mono text-xs font-bold rounded-full tracking-[0.2em] uppercase mb-3 shadow-[0_0_12px_rgba(42,157,143,0.2)]">
                        Secure Candidate Access
                    </span> */}
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                        Before you begin
                    </h1>
                    <p className="text-sm sm:text-base text-[#9CB6BF] mt-2.5 max-w-xl mx-auto leading-relaxed">
                        Please review the rules below, then enter your access token to start.                    </p>
                </div>
            </div>

            {/* ═══ Main Content ═══ */}
            <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-12 py-6 pb-16 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* ── Left Column: Rules List with Always Visible Numbers ── */}
                    <div className="lg:col-span-7 space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-[rgba(42,157,143,0.25)]">
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#E9C46A] shadow-[0_0_10px_rgba(233,196,106,0.8)]" />
                                <span>Examination Rules ({examRules.length})</span>
                            </h2>
                            {/* <span className="text-xs font-mono text-[#9CB6BF]">Strict Proctoring Enabled</span> */}
                        </div>

                        {examRules.map((rule) => {
                            // High contrast, vibrant badge configurations mapped to 5-color palette
                            const badgeConfig = {
                                required: {
                                    badgeBg: 'bg-[#E76F51]/20 text-[#E76F51] border-[#E76F51]/50 shadow-[0_0_12px_rgba(231,111,81,0.25)]',
                                    borderAccent: 'border-l-4 border-l-[#E76F51]',
                                    titleColor: 'text-white',
                                },
                                note: {
                                    badgeBg: 'bg-[#F4A261]/20 text-[#F4A261] border-[#F4A261]/50 shadow-[0_0_12px_rgba(244,162,97,0.25)]',
                                    borderAccent: 'border-l-4 border-l-[#F4A261]',
                                    titleColor: 'text-white',
                                },
                                positive: {
                                    badgeBg: 'bg-[#2A9D8F]/20 text-[#2A9D8F] border-[#2A9D8F]/50 shadow-[0_0_12px_rgba(42,157,143,0.25)]',
                                    borderAccent: 'border-l-4 border-l-[#2A9D8F]',
                                    titleColor: 'text-white',
                                },
                            };
                            const cfg = badgeConfig[rule.type];

                            return (
                                <div
                                    key={rule.num}
                                    className={`flex items-start gap-4 p-4.5 sm:p-5 rounded-xl bg-[#1B313B]/90 backdrop-blur-md border border-[rgba(42,157,143,0.25)] ${cfg.borderAccent} shadow-md transition-colors duration-150`}
                                >
                                    {/* Number Badge - Always Visible, High Contrast */}
                                    <div
                                        className={`w-11 h-11 rounded-xl border flex items-center justify-center font-mono font-extrabold text-base shrink-0 select-none ${cfg.badgeBg}`}
                                    >
                                        {rule.num}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className={`text-base font-bold ${cfg.titleColor} leading-snug mb-1`}>
                                                {rule.title}
                                            </h3>
                                            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-[#162932] text-[#9CB6BF] border border-[rgba(42,157,143,0.25)]">
                                                {rule.type}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[#9CB6BF] leading-relaxed">
                                            {rule.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Right Column: Access Token & Begin Exam (ALWAYS VISIBLE) ── */}
                    <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
                        <div className="bg-[#1B313B]/90 backdrop-blur-xl border border-[rgba(42,157,143,0.35)] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                            {/* Top decorative gradient bar */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E76F51] via-[#F4A261] to-[#2A9D8F]" />

                            <div className="text-center mb-6">
                                <span className="inline-block px-3.5 py-1 bg-[#2A9D8F]/15 border border-[#2A9D8F]/30 rounded-full text-[11px] font-mono font-bold tracking-[0.15em] text-[#2A9D8F] uppercase mb-2">
                                    START YOUR EXAM
                                </span>
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    Enter Access Token
                                </h2>
                                <p className="text-xs text-[#9CB6BF] mt-1">
                                    Enter the token provided to you.
                                </p>
                            </div>

                            {/* Error Alert */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-5 overflow-hidden"
                                    >
                                        <div className="p-3.5 rounded-xl bg-[#E76F51]/15 border border-[#E76F51]/40 text-[#E76F51] text-xs flex items-start space-x-2.5">
                                            <span className="font-bold text-base leading-none bg-[#E76F51] text-white w-5 h-5 rounded flex items-center justify-center shrink-0">!</span>
                                            <div className="flex-1 leading-relaxed font-medium">{error}</div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Verified Candidate Banner if already stored */}
                            {verifiedSession?.candidateName && (
                                <div className="mb-5 p-4 rounded-xl bg-[#2A9D8F]/15 border border-[#2A9D8F]/40 text-left">
                                    <div className="flex items-center justify-between text-xs font-mono text-[#2A9D8F] font-bold mb-1">
                                        <span>TOKEN VERIFIED</span>
                                        <span>✓</span>
                                    </div>
                                    <div className="text-base font-bold text-white uppercase font-mono">
                                        {verifiedSession.candidateName}
                                    </div>
                                    <div className="text-xs font-mono text-[#9CB6BF] mt-0.5">
                                        Roll No: <span className="text-white font-semibold">{verifiedSession.rollNo}</span> • Sec {verifiedSession.section || 'A'}
                                    </div>
                                </div>
                            )}

                            {/* Token Entry Form */}
                            <form onSubmit={handleBeginExam} className="space-y-5">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[11px] font-mono font-bold text-[#9CB6BF] uppercase tracking-wider">
                                            Access Token
                                        </label>
                                        <span className="text-[10px] font-mono text-[#9CB6BF]/70">Case-insensitive</span>
                                    </div>

                                    <div className={shakeError ? 'animate-shake' : ''}>
                                        <input
                                            type="text"
                                            autoFocus={!verifiedSession}
                                            autoComplete="off"
                                            spellCheck="false"
                                            placeholder="XXXX - XXXX - XXXX"
                                            value={token}
                                            onChange={handleTokenChange}
                                            className="w-full px-4 py-4 bg-[#122027]/90 border-2 border-[rgba(42,157,143,0.35)] focus:border-[#2A9D8F] rounded-xl text-center font-mono font-bold text-xl text-[#E9C46A] tracking-[0.15em] placeholder:text-[#9CB6BF]/40 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/20 transition-colors"
                                        />
                                    </div>
                                    <p className="text-[11px] font-mono text-[#9CB6BF] text-center mt-2">
                                        Your token can only be used once
                                    </p>
                                </div>

                                {/* Rules Agreement Note */}
                                <div className="p-3 bg-[#122027]/70 border border-[rgba(42,157,143,0.25)] rounded-xl text-xs text-[#9CB6BF] flex items-start gap-2.5">
                                    <span className="text-[#E9C46A] font-bold text-sm">ℹ</span>
                                    <span>
                                        By clicking <strong className="text-white">Start Exam</strong>, you agree to the examination rules and monitoring requirements.
                                    </span>
                                </div>

                                {/* ── BEGIN EXAM BUTTON (ALWAYS VISIBLE ALL THE TIME) ── */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    id="begin-exam-btn"
                                    className="w-full py-4 bg-[#E76F51] hover:bg-[#F4A261] text-white font-bold text-base uppercase tracking-widest rounded-xl shadow-[0_0_25px_rgba(231,111,81,0.35)] transition-colors duration-150 flex items-center justify-center space-x-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Verifying &amp; Launching...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Start Exam</span>
                                            <span>→</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Reset token link if candidate wants to change */}
                            {verifiedSession && (
                                <div className="mt-4 text-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            sessionStorage.removeItem('examSession');
                                            setVerifiedSession(null);
                                            setToken('');
                                        }}
                                        className="text-xs font-mono text-[#9CB6BF] hover:text-[#E9C46A] underline underline-offset-4 cursor-pointer transition-colors"
                                    >
                                        Clear Session &amp; Enter Different Token
                                    </button>
                                </div>
                            )}

                            <div className="mt-6 pt-4 border-t border-[rgba(42,157,143,0.25)] text-center text-xs text-[#9CB6BF] space-y-1">
                                <div>Fullscreen mode is required for this exam.</div>
                                <div className="font-mono text-[10px] text-[#9CB6BF]">Advanced Academic Center</div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            {/* ═══ Footer ═══ */}
            <footer className="w-full border-t border-[rgba(42,157,143,0.2)] bg-[#0E1A20] px-6 py-4 relative z-10">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#9CB6BF]">
                    <div>AAC First Year Examination Portal • 2026</div>
                    <FooterLogos />
                </div>
            </footer>
        </div>
    );
}
