import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminFetch } from '../utils/api';

export default function ExamConfig() {
    const [exam, setExam] = useState(null);
    const [stats, setStats] = useState(null);
    const [name, setName] = useState('');
    const [graceMinutes, setGraceMinutes] = useState(15);
    const [questionsPerCandidate, setQuestionsPerCandidate] = useState(30);
    const [questionsPerShift, setQuestionsPerShift] = useState(75);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    async function loadExam() {
        setLoading(true);
        setError('');
        try {
            const data = await adminFetch('/admin/exam');
            if (data.exam) {
                setExam(data.exam);
                setName(data.exam.name || '');
                setGraceMinutes(data.exam.grace_join_min || 15);
                setQuestionsPerCandidate(data.exam.questions_per_candidate || 30);
                setQuestionsPerShift(data.exam.questions_per_shift || 75);
                setStats(data.stats);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadExam();
    }, []);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        setMsg('');

        try {
            if (exam && exam.id) {
                // Update existing
                const res = await adminFetch(`/admin/exam/${exam.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name,
                        grace_join_min: parseInt(graceMinutes, 10),
                        questions_per_shift: parseInt(questionsPerShift, 10),
                        questions_per_candidate: parseInt(questionsPerCandidate, 10),
                    }),
                });
                setExam(res.exam);
                setMsg('Exam configuration updated successfully.');
            } else {
                // Create new
                const res = await adminFetch('/admin/exam', {
                    method: 'POST',
                    body: JSON.stringify({
                        name,
                        grace_join_min: parseInt(graceMinutes, 10),
                        total_duration_min: 60,
                        questions_per_shift: parseInt(questionsPerShift, 10) || 75,
                        questions_per_candidate: parseInt(questionsPerCandidate, 10) || 30,
                    }),
                });
                setExam(res.exam);
                setMsg('New exam created and configured.');
            }
            await loadExam();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleToggleActivate() {
        if (!exam) return;
        setError('');
        try {
            const res = await adminFetch(`/admin/exam/${exam.id}/activate`, { method: 'POST' });
            setExam(res.exam);
            setMsg(`Exam is now active.`);
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <AdminLayout
            title="Exam Settings & Parameters"
            subtitle="Configure active examination parameters, duration rules, and security join windows"
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Card (2 cols) */}
                <div className="lg:col-span-2 bg-[#140b0b] border border-white/10 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                        <div>
                            <h2 className="text-base font-bold text-white">General Parameters</h2>
                            <p className="text-xs text-gray-400">Settings apply across all shifts and candidate devices</p>
                        </div>

                        {exam && (
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if(window.confirm('Are you sure you want to create a new exam? This will start a fresh configuration.')) {
                                            setExam(null);
                                            setName('');
                                            setGraceMinutes(15);
                                            setStats(null);
                                        }
                                    }}
                                    className="px-3 py-1 rounded-full text-xs font-bold transition flex items-center space-x-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30"
                                >
                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                    <span>Create New Exam</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleToggleActivate}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
                                        exam.is_active
                                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                            : 'bg-white/10 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${exam.is_active ? 'bg-green-400' : 'bg-gray-500'}`} />
                                    <span>{exam.is_active ? 'Active Exam' : 'Set as Active'}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Examination Title / Name
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. GATE Computer Science Aptitude Assessment 2026"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Grace Join Window (Minutes)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    required
                                    value={graceMinutes}
                                    onChange={(e) => setGraceMinutes(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Candidates can join up to N minutes after the shift has started.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Exam Duration Per Shift
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    value="60 Minutes"
                                    className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-2.5 text-gray-400 text-sm cursor-not-allowed"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">Fixed standard duration.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Questions Per Shift Pool
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={questionsPerShift}
                                    onChange={(e) => setQuestionsPerShift(e.target.value)}
                                    disabled={stats?.any_paper_generated}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition disabled:text-gray-500 disabled:cursor-not-allowed"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">Total questions in each shift's pool (e.g. 75).</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Questions Per Candidate
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={questionsPerCandidate}
                                    onChange={(e) => setQuestionsPerCandidate(e.target.value)}
                                    disabled={stats?.any_paper_generated}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition disabled:text-gray-500 disabled:cursor-not-allowed"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">Each student gets this many questions (e.g. 30).</p>
                            </div>
                        </div>

                        {stats?.any_paper_generated && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-3">
                                <span className="material-symbols-outlined text-red-400 text-lg">lock</span>
                                <div>
                                    <p className="text-red-300 text-xs font-bold">Exam Locked</p>
                                    <p className="text-red-400/80 text-[11px] mt-0.5">Configuration cannot be saved because question papers have already been generated.</p>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-white/10 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving || stats?.any_paper_generated}
                                className={`px-6 py-2.5 rounded-lg text-xs font-bold transition shadow-lg flex items-center space-x-2 ${
                                    stats?.any_paper_generated 
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Readiness & Stats Card (1 col) */}
                <div className="space-y-6">
                    <div className="bg-[#140b0b] border border-white/10 rounded-xl p-6 shadow-xl">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Exam Readiness Status</h3>

                        <div className="space-y-4 text-xs">
                            <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5">
                                <span className="text-gray-300">Exam Configured</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${exam ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                    {exam ? 'Ready' : 'Pending'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5">
                                <span className="text-gray-300">Shifts Created</span>
                                <span className="font-bold text-white">{stats?.total_shifts || 0} Shift(s)</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5">
                                <span className="text-gray-300">Questions in Bank</span>
                                <span className="font-bold text-white">{stats?.total_questions || 0} Qs</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5">
                                <span className="text-gray-300">Registered Candidates</span>
                                <span className="font-bold text-white">{stats?.total_candidates || 0} Candidates</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5">
                                <span className="text-gray-300">Papers Generated</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${stats?.any_paper_generated ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                    {stats?.any_paper_generated ? 'Generated' : 'Not Generated'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
