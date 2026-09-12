import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminFetch } from '../utils/api';

export default function WeightagePreset() {
    const [exam, setExam] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [rules, setRules] = useState({}); // { [topicId]: { easy: 0, medium: 0, hard: 0, student_easy: 0, student_medium: 0, student_hard: 0 } }
    const [selectedSubjectId, setSelectedSubjectId] = useState('all');
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch active exam
            const examRes = await adminFetch('/admin/exam');
            const activeExam = examRes.exam;
            setExam(activeExam);

            if (!activeExam) {
                setError('No exam found. Please configure an exam in Exam Config first.');
                setLoading(false);
                return;
            }

            // 2. Fetch subjects and topics
            const subjRes = await adminFetch('/admin/subjects');
            setSubjects(subjRes.subjects || []);

            // 3. Check if any shift already has paper generated (locked state)
            const shiftsRes = await adminFetch(`/admin/shifts?exam_id=${activeExam.id}`);
            const locked = (shiftsRes.shifts || []).some((s) => s.paper_generated);
            setIsLocked(locked);

            // 4. Fetch existing weightage rules
            const weightageRes = await adminFetch(`/admin/weightage/${activeExam.id}`);
            const rulesMap = {};
            (weightageRes.rules || []).forEach((r) => {
                rulesMap[r.topic_id] = {
                    easy: r.easy_count || 0,
                    medium: r.medium_count || 0,
                    hard: r.hard_count || 0,
                    student_easy: r.student_easy_count || 0,
                    student_medium: r.student_medium_count || 0,
                    student_hard: r.student_hard_count || 0,
                };
            });
            setRules(rulesMap);

            // 5. Run validation check
            await checkValidation(activeExam.id);
        } catch (err) {
            setError(err.message || 'Failed to load weightage data');
        } finally {
            setLoading(false);
        }
    }

    async function checkValidation(examId) {
        try {
            const val = await adminFetch(`/admin/weightage/${examId}/validate?num_shifts=1`);
            setValidation(val);
        } catch (err) {
            console.error('Validation check failed:', err);
        }
    }

    // Flatten all topics for easy lookup & mapping
    const allTopics = useMemo(() => {
        const list = [];
        subjects.forEach((s) => {
            (s.topics || []).forEach((t) => {
                list.push({ ...t, subject_id: s.id, subject_name: s.name });
            });
        });
        return list;
    }, [subjects]);

    // Filtered topics according to subject tab
    const displayedTopics = useMemo(() => {
        if (selectedSubjectId === 'all') return allTopics;
        return allTopics.filter((t) => t.subject_id === parseInt(selectedSubjectId, 10));
    }, [allTopics, selectedSubjectId]);

    // Calculate totals across ALL topics (even those not currently shown)
    const totals = useMemo(() => {
        let easy = 0;
        let medium = 0;
        let hard = 0;
        let student_easy = 0;
        let student_medium = 0;
        let student_hard = 0;
        Object.values(rules).forEach((r) => {
            easy += Number(r.easy || 0);
            medium += Number(r.medium || 0);
            hard += Number(r.hard || 0);
            student_easy += Number(r.student_easy || 0);
            student_medium += Number(r.student_medium || 0);
            student_hard += Number(r.student_hard || 0);
        });
        const grandTotal = easy + medium + hard;
        const studentGrandTotal = student_easy + student_medium + student_hard;
        const target = exam?.questions_per_shift || 75;
        const studentTarget = exam?.questions_per_candidate || 30;
        const diff = grandTotal - target;
        const studentDiff = studentGrandTotal - studentTarget;
        return { easy, medium, hard, grandTotal, target, diff, student_easy, student_medium, student_hard, studentGrandTotal, studentTarget, studentDiff };
    }, [rules, exam]);

    function handleCountChange(topicId, difficulty, value) {
        if (isLocked) return;
        const cleanVal = Math.max(0, parseInt(value, 10) || 0);
        setRules((prev) => ({
            ...prev,
            [topicId]: {
                ...(prev[topicId] || { easy: 0, medium: 0, hard: 0, student_easy: 0, student_medium: 0, student_hard: 0 }),
                [difficulty]: cleanVal,
            },
        }));
    }

    function handleQuickStep(topicId, difficulty, delta) {
        if (isLocked) return;
        const current = rules[topicId]?.[difficulty] || 0;
        const next = Math.max(0, current + delta);
        handleCountChange(topicId, difficulty, next);
    }

    // Quick distribution helpers
    function handleDistributeEqually() {
        if (isLocked || allTopics.length === 0) return;
        const target = exam?.questions_per_shift || 75;
        const perTopic = Math.floor(target / allTopics.length);
        const easyPerTopic = Math.floor(perTopic * 0.33);
        const mediumPerTopic = Math.floor(perTopic * 0.44);
        const hardPerTopic = perTopic - (easyPerTopic + mediumPerTopic);

        const newRules = {};
        allTopics.forEach((t) => {
            newRules[t.id] = {
                easy: easyPerTopic,
                medium: mediumPerTopic,
                hard: hardPerTopic,
                student_easy: Math.floor(easyPerTopic * 0.4),
                student_medium: Math.floor(mediumPerTopic * 0.4),
                student_hard: Math.floor(hardPerTopic * 0.4),
            };
        });

        // Distribute any remainder into the first topics medium pool
        let currentTotal = (easyPerTopic + mediumPerTopic + hardPerTopic) * allTopics.length;
        let remainder = target - currentTotal;
        let idx = 0;
        while (remainder > 0 && idx < allTopics.length) {
            newRules[allTopics[idx].id].medium += 1;
            remainder--;
            idx++;
        }

        setRules(newRules);
    }

    function handleResetZero() {
        if (isLocked) return;
        const newRules = {};
        allTopics.forEach((t) => {
            newRules[t.id] = { easy: 0, medium: 0, hard: 0, student_easy: 0, student_medium: 0, student_hard: 0 };
        });
        setRules(newRules);
    }

    async function handleSave() {
        if (!exam) return;
        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const rulesPayload = allTopics.map((t) => ({
                topic_id: t.id,
                easy_count: rules[t.id]?.easy || 0,
                medium_count: rules[t.id]?.medium || 0,
                hard_count: rules[t.id]?.hard || 0,
                student_easy_count: rules[t.id]?.student_easy || 0,
                student_medium_count: rules[t.id]?.student_medium || 0,
                student_hard_count: rules[t.id]?.student_hard || 0,
            }));

            await adminFetch(`/admin/weightage/${exam.id}`, {
                method: 'PUT',
                body: JSON.stringify({ rules: rulesPayload }),
            });

            setSuccessMessage('Weightage preset saved successfully!');
            await checkValidation(exam.id);
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err) {
            setError(err.message || 'Failed to save weightage rules');
        } finally {
            setSaving(false);
        }
    }

    return (
        <AdminLayout
            title="Weightage Preset"
            subtitle="Configure question distribution per topic and difficulty for the exam blueprint"
            actions={
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || isLocked || !exam}
                        className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition flex items-center space-x-2 shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {saving ? 'sync' : 'save'}
                        </span>
                        <span>{saving ? 'Saving...' : 'Save Weightage'}</span>
                    </button>
                </div>
            }
        >
            {/* Banner notifications */}
            {isLocked && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start space-x-3">
                    <span className="material-symbols-outlined text-amber-400 mt-0.5">lock</span>
                    <div className="text-xs">
                        <strong className="block text-amber-200 font-semibold mb-0.5">Weightage Rules Locked</strong>
                        Question papers have already been generated for one or more shifts in this exam.
                        Weightage configuration cannot be modified unless papers are regenerated in the Paper Generator.
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold ml-4">✕</button>
                </div>
            )}

            {successMessage && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-white font-bold ml-4">✕</button>
                </div>
            )}

            {/* Overview / Grand Total Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                <div className="bg-[#180d0d] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Target Total</span>
                    <div className="text-2xl font-black text-white mt-1">
                        {totals.target} <span className="text-xs font-medium text-gray-500">Qs</span>
                    </div>
                </div>

                <div className={`border rounded-xl p-4 flex flex-col justify-between transition ${
                    totals.diff === 0 
                        ? 'bg-green-500/10 border-green-500/40 text-green-400' 
                        : 'bg-red-500/10 border-red-500/40 text-red-400'
                }`}>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold tracking-wider uppercase">Configured</span>
                        <span className="material-symbols-outlined text-[16px]">
                            {totals.diff === 0 ? 'check_circle' : 'warning'}
                        </span>
                    </div>
                    <div className="text-2xl font-black mt-1">
                        {totals.grandTotal} <span className="text-xs font-semibold">/ {totals.target}</span>
                    </div>
                    <span className="text-[10px] font-semibold mt-0.5">
                        {totals.diff === 0 
                            ? '✓ Perfect 75 Match' 
                            : totals.diff > 0 
                                ? `+${totals.diff} Qs Over limit` 
                                : `${Math.abs(totals.diff)} Qs Remaining`}
                    </span>
                </div>

                <div className="bg-[#180d0d] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-bold tracking-wider text-green-400 uppercase">Easy Pool</span>
                    <div className="text-2xl font-black text-white mt-1">
                        {totals.easy}
                    </div>
                    <span className="text-[10px] text-gray-400">
                        {totals.grandTotal > 0 ? `${Math.round((totals.easy / totals.grandTotal) * 100)}% of total` : '0%'}
                    </span>
                </div>

                <div className="bg-[#180d0d] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-bold tracking-wider text-amber-400 uppercase">Medium Pool</span>
                    <div className="text-2xl font-black text-white mt-1">
                        {totals.medium}
                    </div>
                    <span className="text-[10px] text-gray-400">
                        {totals.grandTotal > 0 ? `${Math.round((totals.medium / totals.grandTotal) * 100)}% of total` : '0%'}
                    </span>
                </div>

                <div className="bg-[#180d0d] border border-white/10 rounded-xl p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-bold tracking-wider text-red-400 uppercase">Hard Pool</span>
                    <div className="text-2xl font-black text-white mt-1">
                        {totals.hard}
                    </div>
                    <span className="text-[10px] text-gray-400">
                        {totals.grandTotal > 0 ? `${Math.round((totals.hard / totals.grandTotal) * 100)}% of total` : '0%'}
                    </span>
                </div>
            </div>

            {/* Controls Bar: Subject Filter & Quick Preset Buttons */}
            <div className="bg-[#140b0b] border border-white/10 rounded-xl p-3 mb-6 flex flex-col lg:flex-row items-center justify-between gap-4">
                {/* Subject Selector Tabs */}
                <div className="flex items-center space-x-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
                    <button
                        onClick={() => setSelectedSubjectId('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                            selectedSubjectId === 'all'
                                ? 'bg-orange-600 text-white shadow-md'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        All Subjects ({allTopics.length} Topics)
                    </button>
                    {subjects.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedSubjectId(s.id.toString())}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                selectedSubjectId === s.id.toString()
                                    ? 'bg-orange-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {s.name} ({s.topics?.length || 0})
                        </button>
                    ))}
                </div>

                {/* Quick helpers */}
                {!isLocked && (
                    <div className="flex items-center space-x-2 w-full lg:w-auto justify-end">
                        <button
                            onClick={handleDistributeEqually}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition flex items-center space-x-1"
                            title="Distribute 75 questions evenly across all syllabus topics"
                        >
                            <span className="material-symbols-outlined text-[15px]">balance</span>
                            <span>Equal Distribution</span>
                        </button>
                        <button
                            onClick={handleResetZero}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 transition flex items-center space-x-1"
                        >
                            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                            <span>Reset All</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Weightage Grid Table */}
            <div className="bg-[#140b0b] border border-white/10 rounded-xl overflow-hidden shadow-xl mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-4 font-bold">Subject / Topic</th>
                                <th className="py-3 px-4 font-bold text-center text-green-400">Easy (Shift / Student)</th>
                                <th className="py-3 px-4 font-bold text-center text-amber-400">Medium (Shift / Student)</th>
                                <th className="py-3 px-4 font-bold text-center text-red-400">Hard (Shift / Student)</th>
                                <th className="py-3 px-4 font-bold text-center w-28 text-white">Row Totals</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {displayedTopics.map((topic) => {
                                const tRule = rules[topic.id] || { easy: 0, medium: 0, hard: 0 };
                                const rowTotal = (tRule.easy || 0) + (tRule.medium || 0) + (tRule.hard || 0);

                                return (
                                    <tr key={topic.id} className="hover:bg-white/[0.02] transition">
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-white text-sm">{topic.name}</div>
                                            <div className="text-[11px] text-gray-500 flex items-center space-x-2 mt-0.5">
                                                <span>{topic.subject_name}</span>
                                                {topic.code && <span>• {topic.code}</span>}
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <div className="flex flex-col space-y-2 items-center">
                                                <div className="inline-flex items-center bg-[#0d0707] border border-green-500/30 rounded-lg p-0.5">
                                                    <span className="text-[9px] text-gray-500 uppercase px-2 font-bold w-12 text-left">Shift</span>
                                                    <button onClick={() => handleQuickStep(topic.id, 'easy', -1)} disabled={isLocked || tRule.easy <= 0} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">-</button>
                                                    <input type="number" min="0" max="75" disabled={isLocked} value={tRule.easy} onChange={(e) => handleCountChange(topic.id, 'easy', e.target.value)} className="w-8 text-center bg-transparent text-green-400 font-bold text-xs focus:outline-none" />
                                                    <button onClick={() => handleQuickStep(topic.id, 'easy', 1)} disabled={isLocked} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">+</button>
                                                </div>
                                                <div className="inline-flex items-center bg-[#0d0707] border border-green-500/30 rounded-lg p-0.5">
                                                    <span className="text-[9px] text-gray-500 uppercase px-2 font-bold w-12 text-left">Student</span>
                                                    <button onClick={() => handleQuickStep(topic.id, 'student_easy', -1)} disabled={isLocked || tRule.student_easy <= 0} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">-</button>
                                                    <input type="number" min="0" max="75" disabled={isLocked} value={tRule.student_easy} onChange={(e) => handleCountChange(topic.id, 'student_easy', e.target.value)} className="w-8 text-center bg-transparent text-green-400 font-bold text-xs focus:outline-none" />
                                                    <button onClick={() => handleQuickStep(topic.id, 'student_easy', 1)} disabled={isLocked} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">+</button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <div className="flex flex-col space-y-2 items-center">
                                                <div className="inline-flex items-center bg-[#0d0707] border border-amber-500/30 rounded-lg p-0.5">
                                                    <span className="text-[9px] text-gray-500 uppercase px-2 font-bold w-12 text-left">Shift</span>
                                                    <button onClick={() => handleQuickStep(topic.id, 'medium', -1)} disabled={isLocked || tRule.medium <= 0} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">-</button>
                                                    <input type="number" min="0" max="75" disabled={isLocked} value={tRule.medium} onChange={(e) => handleCountChange(topic.id, 'medium', e.target.value)} className="w-8 text-center bg-transparent text-amber-400 font-bold text-xs focus:outline-none" />
                                                    <button onClick={() => handleQuickStep(topic.id, 'medium', 1)} disabled={isLocked} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">+</button>
                                                </div>
                                                <div className="inline-flex items-center bg-[#0d0707] border border-amber-500/30 rounded-lg p-0.5">
                                                    <span className="text-[9px] text-gray-500 uppercase px-2 font-bold w-12 text-left">Student</span>
                                                    <button onClick={() => handleQuickStep(topic.id, 'student_medium', -1)} disabled={isLocked || tRule.student_medium <= 0} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">-</button>
                                                    <input type="number" min="0" max="75" disabled={isLocked} value={tRule.student_medium} onChange={(e) => handleCountChange(topic.id, 'student_medium', e.target.value)} className="w-8 text-center bg-transparent text-amber-400 font-bold text-xs focus:outline-none" />
                                                    <button onClick={() => handleQuickStep(topic.id, 'student_medium', 1)} disabled={isLocked} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">+</button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <div className="flex flex-col space-y-2 items-center">
                                                <div className="inline-flex items-center bg-[#0d0707] border border-red-500/30 rounded-lg p-0.5">
                                                    <span className="text-[9px] text-gray-500 uppercase px-2 font-bold w-12 text-left">Shift</span>
                                                    <button onClick={() => handleQuickStep(topic.id, 'hard', -1)} disabled={isLocked || tRule.hard <= 0} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">-</button>
                                                    <input type="number" min="0" max="75" disabled={isLocked} value={tRule.hard} onChange={(e) => handleCountChange(topic.id, 'hard', e.target.value)} className="w-8 text-center bg-transparent text-red-400 font-bold text-xs focus:outline-none" />
                                                    <button onClick={() => handleQuickStep(topic.id, 'hard', 1)} disabled={isLocked} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">+</button>
                                                </div>
                                                <div className="inline-flex items-center bg-[#0d0707] border border-red-500/30 rounded-lg p-0.5">
                                                    <span className="text-[9px] text-gray-500 uppercase px-2 font-bold w-12 text-left">Student</span>
                                                    <button onClick={() => handleQuickStep(topic.id, 'student_hard', -1)} disabled={isLocked || tRule.student_hard <= 0} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">-</button>
                                                    <input type="number" min="0" max="75" disabled={isLocked} value={tRule.student_hard} onChange={(e) => handleCountChange(topic.id, 'student_hard', e.target.value)} className="w-8 text-center bg-transparent text-red-400 font-bold text-xs focus:outline-none" />
                                                    <button onClick={() => handleQuickStep(topic.id, 'student_hard', 1)} disabled={isLocked} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30">+</button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-300">
                                            <div className="text-xs">{rowTotal} <span className="text-[10px] text-gray-500 font-normal">Shift</span></div>
                                            <div className="text-xs mt-1 text-blue-300">{(tRule.student_easy || 0) + (tRule.student_medium || 0) + (tRule.student_hard || 0)} <span className="text-[10px] text-gray-500 font-normal">Student</span></div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {displayedTopics.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-gray-500">
                                        No topics found for this subject.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Validation Panel (Shortfall Alerts) */}
            <div className="bg-[#140b0b] border border-white/10 rounded-xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <span className="material-symbols-outlined text-orange-400 text-[20px]">fact_check</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Question Bank Availability & Validation</h3>
                    </div>
                    {validation && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            validation.valid ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                            {validation.valid ? '✓ Ready for Paper Generation' : '⚠ Action Needed'}
                        </span>
                    )}
                </div>

                {validation?.shortfalls?.length > 0 ? (
                    <div className="space-y-2">
                        <div className="text-xs text-red-300 font-semibold mb-2">
                            The following topics do not have enough questions in the question bank to satisfy this weightage:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {validation.shortfalls.map((sf, idx) => (
                                <div key={idx} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs">
                                    <div className="font-bold text-white">{sf.topic_name}</div>
                                    <div className="text-gray-400 text-[11px]">{sf.subject_name} • <span className="capitalize text-red-300 font-semibold">{sf.difficulty}</span></div>
                                    <div className="mt-2 text-[11px] flex items-center justify-between text-gray-300">
                                        <span>Needed: <strong className="text-white">{sf.perShiftNeeded}</strong></span>
                                        <span>In Bank: <strong className="text-red-400">{sf.availableInBank}</strong></span>
                                        <span className="text-red-300 font-bold">Short: {sf.shortfall}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 flex items-center space-x-2 py-2">
                        <span className="material-symbols-outlined text-green-400 text-[18px]">verified</span>
                        <span>Question bank has sufficient depth for all configured weightage rules (at 1 shift).</span>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
