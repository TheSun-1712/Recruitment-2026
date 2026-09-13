import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminFetch } from '../utils/api';

export default function GradingConfig() {
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [passMarkPct, setPassMarkPct] = useState(50);
    const [gradeRanges, setGradeRanges] = useState([
        { label: 'A', min: 90, max: 100 },
        { label: 'B', min: 80, max: 89.99 },
        { label: 'C', min: 70, max: 79.99 },
    ]);
    const [previewScore, setPreviewScore] = useState('');
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadExams();
    }, []);

    useEffect(() => {
        if (selectedExamId) {
            loadGradingConfig(selectedExamId);
        }
    }, [selectedExamId]);

    async function loadExams() {
        try {
            const data = await adminFetch('/admin/exam/list/all');
            setExams(data.exams || []);
            if (data.exams && data.exams.length > 0) {
                const active = data.exams.find(e => e.is_active) || data.exams[0];
                setSelectedExamId(active.id);
            }
        } catch (err) {
            console.error('Failed to load exams', err);
            setError(err.message);
        }
    }

    async function loadGradingConfig(examId) {
        setLoading(true);
        setError('');
        setMsg('');
        try {
            const data = await adminFetch(`/admin/grading/${examId}`);
            setPassMarkPct(data.grading.pass_mark_pct || 50);
            setGradeRanges(data.grading.grade_ranges || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleAddGrade() {
        setGradeRanges([...gradeRanges, { label: 'New', min: 0, max: 0 }]);
    }

    function handleUpdateGrade(index, field, value) {
        const updated = [...gradeRanges];
        updated[index][field] = value;
        setGradeRanges(updated);
    }

    function handleRemoveGrade(index) {
        setGradeRanges(gradeRanges.filter((_, i) => i !== index));
    }

    async function handleSaveConfig(e) {
        e.preventDefault();
        setError('');
        setMsg('');
        try {
            await adminFetch(`/admin/grading/${selectedExamId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    pass_mark_pct: passMarkPct,
                    grade_ranges: gradeRanges
                })
            });
            setMsg('Grading configuration saved successfully.');
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleApplyGrading() {
        if (!window.confirm('Apply this grading logic to all existing results for this exam?')) return;
        setError('');
        setMsg('');
        try {
            const data = await adminFetch(`/admin/grading/${selectedExamId}/apply`, {
                method: 'POST'
            });
            setMsg(data.message);
        } catch (err) {
            setError(err.message);
        }
    }

    // Preview Calculator
    const previewNum = parseFloat(previewScore);
    let previewPassFail = '';
    let previewGrade = 'N/A';
    if (!isNaN(previewNum)) {
        previewPassFail = previewNum >= passMarkPct ? 'Pass' : 'Fail';
        for (const range of gradeRanges) {
            if (previewNum >= range.min && previewNum <= range.max) {
                previewGrade = range.label;
                break;
            }
        }
    }

    return (
        <AdminLayout
            title="Grading Logic"
            subtitle="Define pass/fail criteria and grade boundary scales"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-[#140b0b] border border-white/10 rounded-xl p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Grading Configuration</h3>
                            <select
                                value={selectedExamId}
                                onChange={(e) => setSelectedExamId(e.target.value)}
                                className="bg-black border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-orange-500"
                            >
                                {exams.map(ex => (
                                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                                ))}
                            </select>
                        </div>

                        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-200 text-sm">{error}</div>}
                        {msg && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded text-green-200 text-sm">{msg}</div>}

                        {loading ? (
                            <div className="text-gray-400 py-4">Loading grading config...</div>
                        ) : (
                            <form onSubmit={handleSaveConfig} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Passing Threshold (%)</label>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={passMarkPct}
                                            onChange={(e) => setPassMarkPct(parseFloat(e.target.value))}
                                            className="w-32 bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 font-mono text-xl"
                                        />
                                        <span className="text-gray-500">%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Scores equal to or above this percentage will be marked as "Pass".</p>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs font-bold text-gray-400 uppercase">Grade Scale</label>
                                        <button
                                            type="button"
                                            onClick={handleAddGrade}
                                            className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-bold transition"
                                        >
                                            + Add Range
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {gradeRanges.map((range, idx) => (
                                            <div key={idx} className="flex items-center space-x-3 bg-black/30 p-3 rounded-lg border border-white/5">
                                                <input
                                                    type="text"
                                                    value={range.label}
                                                    onChange={(e) => handleUpdateGrade(idx, 'label', e.target.value)}
                                                    placeholder="Grade Label (e.g. A)"
                                                    className="w-24 bg-black border border-white/10 rounded p-2 text-white font-bold text-center"
                                                />
                                                <span className="text-gray-500">Min %</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={range.min}
                                                    onChange={(e) => handleUpdateGrade(idx, 'min', parseFloat(e.target.value))}
                                                    className="w-20 bg-black border border-white/10 rounded p-2 text-white font-mono text-center"
                                                />
                                                <span className="text-gray-500">Max %</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={range.max}
                                                    onChange={(e) => handleUpdateGrade(idx, 'max', parseFloat(e.target.value))}
                                                    className="w-20 bg-black border border-white/10 rounded p-2 text-white font-mono text-center"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveGrade(idx)}
                                                    className="text-red-400 hover:text-red-300 ml-auto"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                        {gradeRanges.length === 0 && (
                                            <p className="text-gray-500 text-sm py-2">No grade ranges defined.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/10 flex justify-end">
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold shadow-lg shadow-orange-600/30 transition"
                                    >
                                        Save Configuration
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="bg-[#140b0b] border border-orange-500/30 rounded-xl p-6 shadow-xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Apply to Results</h3>
                                <p className="text-gray-400 text-sm">
                                    Recalculate pass/fail and grades for all existing results in this exam using the currently saved configuration.
                                </p>
                            </div>
                            <button
                                onClick={handleApplyGrading}
                                className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg shadow-green-600/30 transition whitespace-nowrap ml-4"
                            >
                                Apply Grading
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#140b0b] border border-white/10 rounded-xl p-6 shadow-xl sticky top-6">
                        <h3 className="text-lg font-bold text-white mb-4">Preview Calculator</h3>
                        <p className="text-gray-400 text-sm mb-4">Enter a hypothetical percentage score to see what grade it receives.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Test Score (%)</label>
                                <input
                                    type="number"
                                    value={previewScore}
                                    onChange={(e) => setPreviewScore(e.target.value)}
                                    placeholder="e.g. 75.5"
                                    className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 font-mono text-xl"
                                />
                            </div>

                            <div className="bg-black/50 p-4 rounded-lg border border-white/5 space-y-4">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase mb-1">Status</div>
                                    <div className={`text-xl font-bold ${previewPassFail === 'Pass' ? 'text-green-400' : previewPassFail === 'Fail' ? 'text-red-400' : 'text-gray-600'}`}>
                                        {previewPassFail || '--'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase mb-1">Grade</div>
                                    <div className="text-3xl font-black text-white">
                                        {previewGrade}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
