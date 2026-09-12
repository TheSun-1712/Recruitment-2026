import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/api';

export default function CandidateLogin() {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Auto-capitalize and format candidate token input
    function handleTokenChange(e) {
        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        setToken(val);
        setError(null);
    }

    async function handleJoin(e) {
        e.preventDefault();
        const cleanToken = token.trim();
        if (!cleanToken) {
            setError('Please enter your exam access token.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/exam/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: cleanToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to join exam.');
            }

            // Store complete session in sessionStorage
            // Server response uses nested objects: data.candidate.* and data.session.*
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
            navigate('/exam');
        } catch (err) {
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0d0707] text-[#fbe9e7] flex flex-col justify-between font-sans selection:bg-orange-500 selection:text-white px-4 py-8">
            {/* Header */}
            <header className="max-w-md mx-auto w-full text-center">
                <div className="inline-flex items-center space-x-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-orange-600/30">
                        G
                    </div>
                    <span className="font-black tracking-wider uppercase text-lg text-white">G-Prime</span>
                </div>
                <h1 className="text-xs font-bold text-orange-400 tracking-widest uppercase">
                    MCQ Examination Portal
                </h1>
            </header>

            {/* Main Token Entry Card */}
            <main className="max-w-md mx-auto w-full">
                <div className="bg-[#140b0b] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
                    {/* Top ambient glow */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-orange-600/15 blur-2xl rounded-full pointer-events-none" />

                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-white tracking-tight">Candidate Verification</h2>
                        <p className="text-xs text-gray-400 mt-1">
                            Enter the unique access token printed on your exam pass
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2.5">
                            <span className="material-symbols-outlined text-[18px] text-red-400 mt-0.5">error</span>
                            <div className="flex-1 leading-relaxed">{error}</div>
                        </div>
                    )}

                    <form onSubmit={handleJoin} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Access Token
                            </label>
                            <input
                                type="text"
                                required
                                autoFocus
                                autoComplete="off"
                                spellCheck="false"
                                placeholder="CSE-A-0042-A1B2C3"
                                value={token}
                                onChange={handleTokenChange}
                                className="w-full px-4 py-3.5 bg-[#180d0d] border border-white/15 focus:border-orange-500 rounded-xl text-center font-mono font-black text-lg sm:text-xl text-orange-400 tracking-widest placeholder:text-gray-700 placeholder:font-normal placeholder:tracking-normal focus:outline-none transition shadow-inner"
                            />
                            <p className="text-[10px] text-gray-500 text-center mt-2">
                                Format: <span className="font-mono text-gray-400">BRANCH-SEC-ROLL-KEY</span>
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !token.trim()}
                            className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-[20px]">
                                {loading ? 'sync' : 'arrow_forward'}
                            </span>
                            <span>{loading ? 'Validating Token...' : 'Enter Examination'}</span>
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-white/5 text-center text-[11px] text-gray-500 space-y-1">
                        <div>Do not refresh or switch tabs during the exam.</div>
                        <div>Tokens are strictly single-device and single-use.</div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="max-w-md mx-auto w-full text-center text-[11px] text-gray-600">
                G-Prime LAN Local Examination System • Version 2.0
            </footer>
        </div>
    );
}
