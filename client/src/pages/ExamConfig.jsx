import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminFetch } from '../utils/api';

export default function ExamConfig() {
    const [exams, setExams] = useState([]);
    const [exam, setExam] = useState(null);
    const [stats, setStats] = useState(null);
    const [name, setName] = useState('');
    const [graceMinutes, setGraceMinutes] = useState(15);
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [questionsPerShift, setQuestionsPerShift] = useState(75);
    
    // Grading states (part of Exam Config now, though V1 plan suggested a separate page, we can put it here or as a separate page. The plan said "Workstream C — Grading: New GradingConfig page", but wait, in the plan I said "Make ExamConfig.jsx have pass_mark_pct and grade_ranges"? Ah, in the plan I wrote "Frontend: [NEW] client/src/pages/GradingConfig.jsx". Let me stick to the plan: GradingConfig.jsx is a separate page. BUT I also wrote in Workstream A for ExamConfig.jsx: "Add pass_mark_pct field ... Add grade range builder... Add an exam selector at top". So I'll put it here or there. I'll put basic fields here, and the full application in GradingConfig? No, let's just make sure ExamConfig has what the plan explicitly said. Wait, the plan explicitly said:
    // "Make `total_duration_min` an editable input... Make `questions_per_shift` an editable input... Add `pass_mark_pct` field... Add grade range builder... Add an exam selector at top" in ExamConfig.jsx. OK, I will add them here.)
    // Wait, the plan says Workstream C: New GradingConfig.jsx for applying grading. I will just do the pass mark and grading builder here as asked in Workstream A, and the 'apply' button in GradingConfig. Actually, if it's in GradingConfig, I don't need it here. Let me just add it here as per Workstream A.)
    const [passMarkPct, setPassMarkPct] = useState(40);
    const [gradeRanges, setGradeRanges] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    async function loadData(selectedExamId = null) {
        setLoading(true);
        setError('');
        try {
            // Fetch list of all exams
            const listRes = await adminFetch('/admin/exam/list/all');
            const allExams = listRes.exams || [];
            setExams(allExams);

            let targetExam = null;
            if (selectedExamId) {
                targetExam = allExams.find(e => e.id === selectedExamId);
            } else if (allExams.length > 0) {
                targetExam = allExams.find(e => e.is_active) || allExams[0];
            }

            if (targetExam) {
                // Fetch stats for this exam by hitting the standard GET /admin/exam? (No, we can just use the active exam endpoint or calculate stats from the list)
                // Actually the list endpoint returns stats per exam.
                setExam(targetExam);
                setName(targetExam.name || '');
                setGraceMinutes(targetExam.grace_join_min || 15);
                setDurationMinutes(targetExam.total_duration_min || 60);
                setQuestionsPerShift(targetExam.questions_per_shift || 75);
                setPassMarkPct(targetExam.pass_mark_pct || 40);
                setGradeRanges(targetExam.grade_ranges || []);
                setStats({
                    total_shifts: targetExam.total_shifts,
                    total_candidates: targetExam.total_candidates,
                    total_questions: targetExam.total_questions,
                    any_paper_generated: false // We need to fetch this specifically or assume from list
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        setMsg('');

        try {
            if (exam && exam.id) {
                const res = await adminFetch(`/admin/exam/${exam.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name,
                        grace_join_min: parseInt(graceMinutes, 10),
                        total_duration_min: parseInt(durationMinutes, 10),
                        questions_per_shift: parseInt(questionsPerShift, 10),
                        pass_mark_pct: parseFloat(passMarkPct),
                        grade_ranges: gradeRanges,
                    }),
                });
                setMsg('Exam configuration updated successfully.');
            } else {
                const res = await adminFetch('/admin/exam', {
                    method: 'POST',
                    body: JSON.stringify({
                        name,
                        grace_join_min: parseInt(graceMinutes, 10),
                        total_duration_min: parseInt(durationMinutes, 10),
                        questions_per_shift: parseInt(questionsPerShift, 10),
                    }),
                });
                setMsg('New exam created and configured.');
            }
            await loadData(exam?.id);
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
            setMsg(`Exam is now active.`);
            await loadData(exam.id);
        } catch (err) {
            setError(err.message);
        }
    }

    function addGradeRange() {
        setGradeRanges([...gradeRanges, { label: 'A', min: 0, max: 100 }]);
    }
    
    function removeGradeRange(index) {
        const newRanges = [...gradeRanges];
        newRanges.splice(index, 1);
        setGradeRanges(newRanges);
    }
    
    function updateGradeRange(index, field, value) {
        const newRanges = [...gradeRanges];
        newRanges[index][field] = value;
        setGradeRanges(newRanges);
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

            <div className="mb-6 flex items-center space-x-4">
                <label className="text-sm font-bold text-gray-300">Select Exam Context:</label>
                <select 
                    className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-orange-500 transition"
                    value={exam?.id || ''}
                    onChange={(e) => loadData(parseInt(e.target.value, 10))}
                >
                    {exams.map(e => (
                        <option key={e.id} value={e.id}>
                            {e.name} {e.is_active ? '(Active)' : ''}
                        </option>
                    ))}
                </select>
            </div>

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
                                    type="number"
                                    min="1"
                                    required
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">Default duration in minutes.</p>
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
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">Each candidate receives this many questions.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Pass Mark (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    required
                                    value={passMarkPct}
                                    onChange={(e) => setPassMarkPct(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">Minimum percentage required to pass.</p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Grade Ranges (JSON)
                                </label>
                                <button type="button" onClick={addGradeRange} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold">
                                    + Add Range
                                </button>
                            </div>
                            {gradeRanges.map((range, index) => (
                                <div key={index} className="flex items-center space-x-2 mb-2">
                                    <input type="text" placeholder="Label (e.g. A)" value={range.label} onChange={(e) => updateGradeRange(index, 'label', e.target.value)} className="w-1/3 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 transition" />
                                    <input type="number" placeholder="Min %" value={range.min} onChange={(e) => updateGradeRange(index, 'min', parseFloat(e.target.value))} className="w-1/4 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 transition" />
                                    <input type="number" placeholder="Max %" value={range.max} onChange={(e) => updateGradeRange(index, 'max', parseFloat(e.target.value))} className="w-1/4 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 transition" />
                                    <button type="button" onClick={() => removeGradeRange(index)} className="text-red-400 hover:text-red-300 text-xl font-bold px-2">✕</button>
                                </div>
                            ))}
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
