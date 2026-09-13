import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import AdminLayout from '../components/AdminLayout';
import { adminFetch, API_URL } from '../utils/api';

function playDisqualificationBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.5);
    } catch (_) { /* non-critical */ }
}

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalCandidates: 0,
        activeSessions: 0,
        runningShifts: 0,
        totalQuestions: 0,
        submissionsToday: 0,
    });
    const [shifts, setShifts] = useState([]);
    const [selectedShiftId, setSelectedShiftId] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMsg, setActionMsg] = useState('');

    // Reopen modal state
    const [reopenTarget, setReopenTarget] = useState(null);
    const [reopening, setReopening] = useState(false);

    // Extra time modal state
    const [extraTimeTarget, setExtraTimeTarget] = useState(null);
    const [extraMinutes, setExtraMinutes] = useState(10);

    const selectedShiftIdRef = useRef(selectedShiftId);
    useEffect(() => {
        selectedShiftIdRef.current = selectedShiftId;
    }, [selectedShiftId]);

    const loadData = useCallback(async () => {
        try {
            const [statsRes, shiftsRes] = await Promise.all([
                adminFetch('/admin/dashboard-stats'),
                adminFetch('/admin/shifts'),
            ]);
            setStats(statsRes);
            setShifts(shiftsRes.shifts || []);

            // Auto-select first active or first shift if none selected (using ref so no dependency)
            if (!selectedShiftIdRef.current && shiftsRes.shifts && shiftsRes.shifts.length > 0) {
                const active = shiftsRes.shifts.find((s) => s.is_active);
                const chosen = active ? active.id : shiftsRes.shifts[0].id;
                setSelectedShiftId(chosen);
                selectedShiftIdRef.current = chosen;
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadShiftCandidates = useCallback(async () => {
        if (!selectedShiftIdRef.current) return;
        try {
            const res = await adminFetch(`/admin/shifts/${selectedShiftIdRef.current}/candidates`);
            setCandidates(res.candidates || []);
        } catch (err) {
            console.error('Failed to load shift candidates:', err);
        }
    }, [selectedShiftId]);

    useEffect(() => {
        loadData();
        const timer = setInterval(loadData, 6000);
        return () => clearInterval(timer);
    }, [loadData]);

    useEffect(() => {
        loadShiftCandidates();
        const timer = setInterval(loadShiftCandidates, 4000);
        return () => clearInterval(timer);
    }, [loadShiftCandidates]);

    // Socket.IO admin connection for real-time alerts and state sync (BUG-12)
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        const socket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            socket.emit('join_admin_room');
        });

        // Real-time reactions to shift events
        socket.on('shift_started', () => {
            loadData();
            loadShiftCandidates();
        });
        socket.on('shift_paused', () => {
            loadData();
            loadShiftCandidates();
        });
        socket.on('shift_resumed', () => {
            loadData();
            loadShiftCandidates();
        });
        socket.on('shift_ended', () => {
            loadData();
            loadShiftCandidates();
        });
        socket.on('extra_time_granted', () => {
            loadData();
            loadShiftCandidates();
        });

        // Real-time disqualification alert
        socket.on('disqualification_event', (data) => {
            playDisqualificationBeep();
            setActionMsg(`⚠️ SECURITY ALERT: Disqualification reported for ${data.teamName} (${data.round}) — ${data.violations} violations`);
            loadData();
            loadShiftCandidates();
        });

        return () => socket.disconnect();
    }, [loadData, loadShiftCandidates]);

    async function handleShiftAction(shiftId, action) {
        try {
            setActionMsg('');
            await adminFetch(`/admin/shifts/${shiftId}/${action}`, { method: 'POST' });
            setActionMsg(`Shift ${action} successful`);
            await loadData();
            await loadShiftCandidates();
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleAddExtraTime() {
        if (!extraTimeTarget) return;
        try {
            await adminFetch(`/admin/shifts/${extraTimeTarget}/extra-time`, {
                method: 'POST',
                body: JSON.stringify({ extra_minutes: extraMinutes }),
            });
            setExtraTimeTarget(null);
            setActionMsg(`Added ${extraMinutes} minutes to shift`);
            await loadData();
            await loadShiftCandidates();
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleReopenSession() {
        if (!reopenTarget) return;
        setReopening(true);
        try {
            await adminFetch(`/admin/sessions/${reopenTarget.session_id}/reopen`, {
                method: 'POST',
            });
            setActionMsg(`Session for ${reopenTarget.name} reopened successfully.`);
            setReopenTarget(null);
            await loadShiftCandidates();
            await loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setReopening(false);
        }
    }

    function formatTimeRemaining(sec) {
        if (sec === null || sec === undefined) return '--:--';
        if (sec <= 0) return '00:00';
        const mins = Math.floor(sec / 60);
        const s = sec % 60;
        return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    return (
        <AdminLayout
            title="Live Shift & Session Monitor"
            subtitle="Real-time exam supervisor dashboard with instant session overrides"
            actions={
                <button
                    onClick={() => {
                        setLoading(true);
                        loadData();
                        loadShiftCandidates();
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-white/10 transition"
                >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>Refresh Now</span>
                </button>
            }
        >
            {/* Feedback Notifications */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="material-symbols-outlined text-red-400">error</span>
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-white text-xs">Dismiss</button>
                </div>
            )}
            {actionMsg && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-200 text-sm flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="material-symbols-outlined text-green-400">check_circle</span>
                        <span>{actionMsg}</span>
                    </div>
                    <button onClick={() => setActionMsg('')} className="text-green-400 hover:text-white text-xs">Dismiss</button>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                <div className="p-4 bg-[#140b0b] border border-white/10 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase mb-1">
                        <span>Active Sessions</span>
                        <span className="material-symbols-outlined text-green-400 text-[18px]">sensors</span>
                    </div>
                    <div className="text-2xl font-black text-green-400 tracking-tight">{stats.activeSessions}</div>
                    <div className="text-[11px] text-gray-500 mt-1">Live candidates testing right now</div>
                </div>

                <div className="p-4 bg-[#140b0b] border border-white/10 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase mb-1">
                        <span>Running Shifts</span>
                        <span className="material-symbols-outlined text-orange-400 text-[18px]">timer</span>
                    </div>
                    <div className="text-2xl font-black text-orange-400 tracking-tight">{stats.runningShifts}</div>
                    <div className="text-[11px] text-gray-500 mt-1">Active exam slots in progress</div>
                </div>

                <div className="p-4 bg-[#140b0b] border border-white/10 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase mb-1">
                        <span>Submissions Today</span>
                        <span className="material-symbols-outlined text-blue-400 text-[18px]">task_alt</span>
                    </div>
                    <div className="text-2xl font-black text-blue-400 tracking-tight">{stats.submissionsToday}</div>
                    <div className="text-[11px] text-gray-500 mt-1">Finished papers recorded</div>
                </div>

                <div className="p-4 bg-[#140b0b] border border-white/10 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase mb-1">
                        <span>Total Candidates</span>
                        <span className="material-symbols-outlined text-purple-400 text-[18px]">groups</span>
                    </div>
                    <div className="text-2xl font-black text-purple-300 tracking-tight">{stats.totalCandidates}</div>
                    <div className="text-[11px] text-gray-500 mt-1">Spot & batch registered</div>
                </div>

                <div className="p-4 bg-[#140b0b] border border-white/10 rounded-xl shadow-lg col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase mb-1">
                        <span>Bank Questions</span>
                        <span className="material-symbols-outlined text-amber-400 text-[18px]">quiz</span>
                    </div>
                    <div className="text-2xl font-black text-amber-300 tracking-tight">{stats.totalQuestions}</div>
                    <div className="text-[11px] text-gray-500 mt-1">Available across syllabus</div>
                </div>
            </div>

            {/* Shift Cards & Quick Controls */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Exam Shifts Control</h2>
                </div>

                {shifts.length === 0 ? (
                    <div className="p-8 bg-[#140b0b] border border-white/10 rounded-xl text-center text-gray-400">
                        No shifts configured yet. Go to <span className="text-orange-400 font-semibold">Shifts</span> tab to create one.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {shifts.map((s) => {
                            const isSelected = s.id === selectedShiftId;
                            return (
                                <div
                                    key={s.id}
                                    onClick={() => setSelectedShiftId(s.id)}
                                    className={`p-5 rounded-xl border transition cursor-pointer ${
                                        isSelected
                                            ? 'bg-[#1c0f0f] border-orange-500/60 shadow-xl shadow-orange-950/20'
                                            : 'bg-[#140b0b] border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-white text-base tracking-tight">{s.name}</h3>
                                        <span
                                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
                                                s.ended_at
                                                    ? 'bg-gray-800 text-gray-400'
                                                    : s.is_paused
                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                    : s.is_active
                                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30 animate-pulse'
                                                    : 'bg-white/10 text-gray-300'
                                            }`}
                                        >
                                            {s.ended_at ? 'Ended' : s.is_paused ? 'Paused' : s.is_active ? 'Active' : 'Not Started'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 my-3 text-center text-xs">
                                        <div className="bg-black/30 p-2 rounded-lg">
                                            <div className="text-gray-400 text-[10px] uppercase">Registered</div>
                                            <div className="font-bold text-white mt-0.5">{s.candidate_count}</div>
                                        </div>
                                        <div className="bg-black/30 p-2 rounded-lg">
                                            <div className="text-gray-400 text-[10px] uppercase">Testing</div>
                                            <div className="font-bold text-green-400 mt-0.5">{s.active_sessions_count}</div>
                                        </div>
                                        <div className="bg-black/30 p-2 rounded-lg">
                                            <div className="text-gray-400 text-[10px] uppercase">Submitted</div>
                                            <div className="font-bold text-blue-400 mt-0.5">{s.submitted_count}</div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                                        {!s.is_active && !s.ended_at && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShiftAction(s.id, 'start');
                                                }}
                                                className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold transition"
                                            >
                                                Start Shift
                                            </button>
                                        )}

                                        {s.ended_at && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShiftAction(s.id, 'start');
                                                }}
                                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition"
                                                title="Restart this ended shift"
                                            >
                                                Restart Shift
                                            </button>
                                        )}

                                        {s.is_active && !s.is_paused && !s.ended_at && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShiftAction(s.id, 'pause');
                                                }}
                                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition"
                                            >
                                                Pause
                                            </button>
                                        )}

                                        {s.is_paused && !s.ended_at && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShiftAction(s.id, 'resume');
                                                }}
                                                className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold transition"
                                            >
                                                Resume
                                            </button>
                                        )}

                                        {s.is_active && !s.ended_at && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExtraTimeTarget(s.id);
                                                }}
                                                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold transition"
                                            >
                                                + Time
                                            </button>
                                        )}

                                        {s.is_active && !s.ended_at && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`Force end '${s.name}'? This will auto-submit all unsubmitted papers.`)) {
                                                        handleShiftAction(s.id, 'end');
                                                    }
                                                }}
                                                className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs font-semibold transition"
                                            >
                                                End
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Shift Candidates & Live Session Monitor */}
            <div className="bg-[#140b0b] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                <div className="p-4 lg:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-base text-white">Live Candidate Sessions</h3>
                        <p className="text-xs text-gray-400">
                            Viewing candidates in shift:{' '}
                            <span className="text-orange-400 font-semibold">
                                {shifts.find((s) => s.id === selectedShiftId)?.name || 'None selected'}
                            </span>
                        </p>
                    </div>

                    <div className="text-xs text-gray-400 font-medium">
                        Showing {candidates.length} candidate(s)
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-black/40 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                            <tr>
                                <th className="px-4 py-3">Roll No</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Branch/Sec</th>
                                <th className="px-4 py-3">Token</th>
                                <th className="px-4 py-3">Progress</th>
                                <th className="px-4 py-3">Tab Status</th>
                                <th className="px-4 py-3">Time Left</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {candidates.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                                        No candidates assigned to this shift.
                                    </td>
                                </tr>
                            ) : (
                                candidates.map((c) => {
                                    return (
                                        <tr key={c.candidate_id} className="hover:bg-white/[0.02] transition">
                                            <td className="px-4 py-3 font-mono font-bold text-white">{c.roll_no}</td>
                                            <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                                            <td className="px-4 py-3 text-gray-400">{c.branch}-{c.section}</td>
                                            <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{c.token}</td>
                                            <td className="px-4 py-3">
                                                {c.session_id ? (
                                                    <div>
                                                        <span className="font-bold text-white">{c.answered_count}</span>
                                                        <span className="text-gray-500"> / 75</span>
                                                        {c.marked_count > 0 && (
                                                            <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[9px] font-bold">
                                                                {c.marked_count} marked
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 italic">Not joined</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {c.session_id ? (
                                                    <div className="flex items-center space-x-1.5">
                                                        <span
                                                            className={`w-2 h-2 rounded-full ${
                                                                c.tab_is_active ? 'bg-green-400 animate-pulse' : 'bg-amber-400'
                                                            }`}
                                                        />
                                                        <span className={c.tab_is_active ? 'text-green-400' : 'text-amber-400'}>
                                                            {c.tab_is_active ? 'Active' : 'Tab Hidden'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono font-bold text-white">
                                                {c.session_id ? formatTimeRemaining(c.time_remaining_sec) : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {c.is_submitted ? (
                                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                                                        Score: {c.score}
                                                    </span>
                                                ) : c.session_id ? (
                                                    <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-300 text-[10px] font-bold">
                                                        In-Progress
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400 text-[10px]">
                                                        Waiting
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {c.session_id && (
                                                    <button
                                                        onClick={() => setReopenTarget(c)}
                                                        className="px-2.5 py-1 bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white border border-orange-500/30 rounded text-[11px] font-semibold transition"
                                                        title="Force reopen/resume session timer"
                                                    >
                                                        Reopen
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reopen Session Modal */}
            {reopenTarget && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#180d0d] border border-white/20 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center space-x-3 text-orange-400 mb-3">
                            <span className="material-symbols-outlined text-2xl">restart_alt</span>
                            <h3 className="text-lg font-bold text-white">Admin Session Reopen</h3>
                        </div>

                        <p className="text-xs text-gray-300 mb-4 leading-relaxed">
                            Are you sure you want to reopen the exam session for{' '}
                            <strong className="text-white">{reopenTarget.name}</strong> ({reopenTarget.roll_no})?
                        </p>

                        <div className="bg-black/40 p-3 rounded-lg border border-white/5 text-xs space-y-1 mb-5 text-gray-400">
                            <div>Answered Questions: <strong className="text-white">{reopenTarget.answered_count} / 75</strong></div>
                            <div>Saved Time Remaining: <strong className="text-white">{formatTimeRemaining(reopenTarget.time_remaining_sec)}</strong></div>
                            <div>Current Status: <strong className="text-white">{reopenTarget.is_submitted ? 'Submitted' : 'In-Progress'}</strong></div>
                        </div>

                        <p className="text-[11px] text-amber-400 mb-6 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                            Reopening will restore their countdown from the saved snapshot and broadcast a live resumption event to their browser.
                        </p>

                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setReopenTarget(null)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReopenSession}
                                disabled={reopening}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-orange-600/30"
                            >
                                {reopening ? 'Reopening...' : 'Confirm Reopen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Extra Time Modal */}
            {extraTimeTarget && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#180d0d] border border-white/20 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-base font-bold text-white mb-2">Grant Extra Time to Shift</h3>
                        <p className="text-xs text-gray-400 mb-4">
                            Extend countdown timers for all active candidates in this shift simultaneously.
                        </p>

                        <div className="flex space-x-2 mb-6">
                            {[5, 10, 15, 30].map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setExtraMinutes(m)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                                        extraMinutes === m
                                            ? 'bg-orange-600 border-orange-500 text-white'
                                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                    }`}
                                >
                                    +{m}m
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setExtraTimeTarget(null)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddExtraTime}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold"
                            >
                                Add {extraMinutes} Min
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
