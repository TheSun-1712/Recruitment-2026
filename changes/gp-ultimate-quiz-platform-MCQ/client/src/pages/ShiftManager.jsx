import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import AdminLayout from '../components/AdminLayout';
import { adminFetch, API_URL } from '../utils/api';

export default function ShiftManager() {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newShiftName, setNewShiftName] = useState('');
    const [scheduledStart, setScheduledStart] = useState('');
    const [accessCloseAt, setAccessCloseAt] = useState('');
    const [durationOverrideMin, setDurationOverrideMin] = useState('');
    
    const [showEditModal, setShowEditModal] = useState(false);
    const [editShiftId, setEditShiftId] = useState(null);
    const [editShiftName, setEditShiftName] = useState('');
    const [editScheduledStart, setEditScheduledStart] = useState('');
    const [editAccessCloseAt, setEditAccessCloseAt] = useState('');
    const [editDurationOverrideMin, setEditDurationOverrideMin] = useState('');

    const [extraTimeShiftId, setExtraTimeShiftId] = useState(null);
    const [extraMinutes, setExtraMinutes] = useState(10);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    async function loadShifts() {
        setLoading(true);
        setError('');
        try {
            const data = await adminFetch('/admin/shifts');
            setShifts(data.shifts || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadShifts();

        const token = localStorage.getItem('adminToken');
        if (!token) return;

        const socket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            socket.emit('join_admin_room');
        });

        socket.on('shift_started', () => loadShifts());
        socket.on('shift_paused', () => loadShifts());
        socket.on('shift_resumed', () => loadShifts());
        socket.on('shift_ended', () => loadShifts());
        socket.on('extra_time_granted', () => loadShifts());

        return () => socket.disconnect();
    }, []);

    async function handleCreateShift(e) {
        e.preventDefault();
        setError('');
        setMsg('');
        try {
            await adminFetch('/admin/shifts', {
                method: 'POST',
                body: JSON.stringify({
                    name: newShiftName,
                    scheduled_start: scheduledStart || null,
                    access_close_at: accessCloseAt || null,
                    duration_override_min: durationOverrideMin || null,
                }),
            });
            setNewShiftName('');
            setScheduledStart('');
            setAccessCloseAt('');
            setDurationOverrideMin('');
            setShowCreateModal(false);
            setMsg('Shift created successfully.');
            await loadShifts();
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleEditShift(e) {
        e.preventDefault();
        setError('');
        setMsg('');
        try {
            await adminFetch(`/admin/shifts/${editShiftId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: editShiftName,
                    scheduled_start: editScheduledStart || null,
                    access_close_at: editAccessCloseAt || null,
                    duration_override_min: editDurationOverrideMin || null,
                }),
            });
            setShowEditModal(false);
            setMsg('Shift updated successfully.');
            await loadShifts();
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleDeleteShift(id) {
        if (!window.confirm('Are you sure you want to delete this shift? This cannot be undone.')) return;
        setError('');
        setMsg('');
        try {
            await adminFetch(`/admin/shifts/${id}`, { method: 'DELETE' });
            setMsg('Shift deleted successfully.');
            await loadShifts();
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleShiftAction(shiftId, action) {
        setError('');
        setMsg('');
        try {
            await adminFetch(`/admin/shifts/${shiftId}/${action}`, { method: 'POST' });
            setMsg(`Shift ${action} succeeded.`);
            await loadShifts();
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleAddExtraTime() {
        if (!extraTimeShiftId) return;
        setError('');
        setMsg('');
        try {
            await adminFetch(`/admin/shifts/${extraTimeShiftId}/extra-time`, {
                method: 'POST',
                body: JSON.stringify({ extra_minutes: extraMinutes }),
            });
            setExtraTimeShiftId(null);
            setMsg(`Added ${extraMinutes} minutes to shift.`);
            await loadShifts();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <AdminLayout
            title="Shift Management"
            subtitle="Create and control examination shift windows, candidate allocations, and life-cycle events"
            actions={
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-orange-600/30"
                >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    <span>Add New Shift</span>
                </button>
            }
        >
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-red-400 text-xs">Dismiss</button>
                </div>
            )}
            {msg && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-200 text-sm flex items-center justify-between">
                    <span>{msg}</span>
                    <button onClick={() => setMsg('')} className="text-green-400 text-xs">Dismiss</button>
                </div>
            )}

            <div className="bg-[#140b0b] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-black/40 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                            <tr>
                                <th className="px-5 py-3.5">Shift Name</th>
                                <th className="px-5 py-3.5">Status</th>
                                <th className="px-5 py-3.5">Start / Access Window</th>
                                <th className="px-5 py-3.5">Duration</th>
                                <th className="px-5 py-3.5">Candidates</th>
                                <th className="px-5 py-3.5">Paper State</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {shifts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-5 py-8 text-center text-gray-500">
                                        No shifts created yet. Click "Add New Shift" above.
                                    </td>
                                </tr>
                            ) : (
                                shifts.map((s) => (
                                    <tr key={s.id} className="hover:bg-white/[0.02] transition">
                                        <td className="px-5 py-4 font-bold text-white text-sm">{s.name}</td>
                                        <td className="px-5 py-4">
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
                                        </td>
                                        <td className="px-5 py-4 text-gray-400">
                                            <div className="flex flex-col space-y-1 text-xs">
                                                <div className="text-white">
                                                    {s.scheduled_start
                                                        ? new Date(s.scheduled_start).toLocaleString()
                                                        : <span className="italic text-gray-500">Manual Start</span>}
                                                </div>
                                                {s.access_close_at && (
                                                    <div className="text-amber-400 text-[10px]">
                                                        Closes: {new Date(s.access_close_at).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 font-bold text-gray-300">
                                            {s.duration_override_min ? `${s.duration_override_min}m` : 'Exam Default'}
                                            {s.extra_time_min > 0 && <span className="ml-1 text-orange-400 text-[10px]">(+{s.extra_time_min}m)</span>}
                                        </td>
                                        <td className="px-5 py-4 font-bold text-white">
                                            <a href="/admin/results" className="hover:text-orange-400 underline decoration-white/20 underline-offset-2">
                                                {s.candidate_count}
                                            </a>
                                            <span className="text-gray-500 text-[10px] font-normal ml-1">
                                                ({s.active_sessions_count} testing)
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    s.paper_generated
                                                        ? 'bg-green-500/20 text-green-300'
                                                        : 'bg-amber-500/20 text-amber-300'
                                                }`}
                                            >
                                                {s.paper_generated ? 'Locked' : 'Not Generated'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                                                {!s.is_active && !s.ended_at && !s.paper_generated && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setEditShiftId(s.id);
                                                                setEditShiftName(s.name);
                                                                setEditScheduledStart(s.scheduled_start ? s.scheduled_start.slice(0, 16) : '');
                                                                setEditAccessCloseAt(s.access_close_at ? s.access_close_at.slice(0, 16) : '');
                                                                setEditDurationOverrideMin(s.duration_override_min || '');
                                                                setShowEditModal(true);
                                                            }}
                                                            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold"
                                                        >
                                                            Edit
                                                        </button>
                                                        {s.candidate_count === 0 && (
                                                            <button
                                                                onClick={() => handleDeleteShift(s.id)}
                                                                className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded text-xs font-semibold"
                                                            >
                                                                Del
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {!s.is_active && !s.ended_at && (
                                                    <button
                                                        onClick={() => handleShiftAction(s.id, 'start')}
                                                        className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold"
                                                    >
                                                        Start
                                                    </button>
                                                )}
                                                {s.ended_at && (
                                                    <button
                                                        onClick={() => handleShiftAction(s.id, 'start')}
                                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
                                                        title="Restart this ended shift"
                                                    >
                                                        Restart
                                                    </button>
                                                )}
                                                {s.is_active && !s.is_paused && !s.ended_at && (
                                                    <button
                                                        onClick={() => handleShiftAction(s.id, 'pause')}
                                                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold"
                                                    >
                                                        Pause
                                                    </button>
                                                )}
                                                {s.is_paused && !s.ended_at && (
                                                    <button
                                                        onClick={() => handleShiftAction(s.id, 'resume')}
                                                        className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold"
                                                    >
                                                        Resume
                                                    </button>
                                                )}
                                                {s.is_active && !s.ended_at && (
                                                    <button
                                                        onClick={() => setExtraTimeShiftId(s.id)}
                                                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold"
                                                    >
                                                        + Time
                                                    </button>
                                                )}
                                                {s.is_active && !s.ended_at && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`Force end '${s.name}'? Unsubmitted papers will be auto-submitted.`)) {
                                                                handleShiftAction(s.id, 'end');
                                                            }
                                                        }}
                                                        className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs font-semibold"
                                                    >
                                                        End
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Shift Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#180d0d] border border-white/20 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-base font-bold text-white mb-4">Create New Shift</h3>
                        <form onSubmit={handleCreateShift} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Shift Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newShiftName}
                                    onChange={(e) => setNewShiftName(e.target.value)}
                                    placeholder="e.g. Shift 1 - Morning Batch"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                                    Scheduled Start (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={scheduledStart}
                                    onChange={(e) => setScheduledStart(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                                    Access Close Time (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={accessCloseAt}
                                    onChange={(e) => setAccessCloseAt(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Candidates cannot join after this time.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                                    Duration Override (Optional)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={durationOverrideMin}
                                    onChange={(e) => setDurationOverrideMin(e.target.value)}
                                    placeholder="Leave blank for exam default"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-600/30"
                                >
                                    Create Shift
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Shift Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#180d0d] border border-white/20 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-base font-bold text-white mb-4">Edit Shift</h3>
                        <form onSubmit={handleEditShift} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Shift Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editShiftName}
                                    onChange={(e) => setEditShiftName(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                                    Scheduled Start (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editScheduledStart}
                                    onChange={(e) => setEditScheduledStart(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                                    Access Close Time (Optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editAccessCloseAt}
                                    onChange={(e) => setEditAccessCloseAt(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                                    Duration Override (Optional)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editDurationOverrideMin}
                                    onChange={(e) => setEditDurationOverrideMin(e.target.value)}
                                    placeholder="Leave blank for exam default"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-600/30"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Extra Time Modal */}
            {extraTimeShiftId && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#180d0d] border border-white/20 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-base font-bold text-white mb-2">Grant Extra Time to Shift</h3>
                        <div className="flex space-x-2 mb-6 mt-4">
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
                                onClick={() => setExtraTimeShiftId(null)}
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
