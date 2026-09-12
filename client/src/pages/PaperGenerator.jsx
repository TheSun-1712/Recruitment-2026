import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminFetch } from '../utils/api';

export default function PaperGenerator() {
    const [exam, setExam] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [weightage, setWeightage] = useState(null);
    const [numShifts, setNumShifts] = useState(1);
    const [validation, setValidation] = useState(null);
    const [validating, setValidating] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState(null);
    const [error, setError] = useState(null);
    const [warningPrompt, setWarningPrompt] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch active exam
            const examRes = await adminFetch('/admin/exam');
            const activeExam = examRes.exam;
            setExam(activeExam);

            if (!activeExam) {
                setError('No active exam found. Please set up an exam in Exam Config.');
                setLoading(false);
                return;
            }

            // 2. Fetch shifts for this exam
            const shiftsRes = await adminFetch(`/admin/shifts?exam_id=${activeExam.id}`);
            const shiftList = shiftsRes.shifts || [];
            setShifts(shiftList);
            if (shiftList.length > 0) {
                setNumShifts(Math.min(shiftList.length, 1));
            }

            // 3. Fetch current weightage rules
            const weightageRes = await adminFetch(`/admin/weightage/${activeExam.id}`);
            setWeightage(weightageRes);

            // 4. Initial validation for 1 shift
            await runValidation(activeExam.id, 1);
        } catch (err) {
            setError(err.message || 'Failed to load paper generation details');
        } finally {
            setLoading(false);
        }
    }

    async function runValidation(examId, shiftsCount) {
        setValidating(true);
        setError(null);
        try {
            const count = parseInt(shiftsCount, 10) || 1;
            const res = await adminFetch(`/admin/weightage/${examId}/validate?num_shifts=${count}`);
            setValidation(res);
        } catch (err) {
            setError(err.message || 'Validation request failed');
        } finally {
            setValidating(false);
        }
    }

    function handleShiftsChange(val) {
        const num = Math.max(1, Math.min(shifts.length || 1, parseInt(val, 10) || 1));
        setNumShifts(num);
        if (exam) {
            runValidation(exam.id, num);
        }
    }

    async function handleGenerate(force = false) {
        if (!exam) return;
        setGenerating(true);
        setError(null);
        setWarningPrompt(null);

        try {
            const res = await adminFetch(`/admin/generate/${exam.id}${force ? '?force=true' : ''}`, {
                method: 'POST',
                body: JSON.stringify({ num_shifts: numShifts, force }),
            });

            setGeneratedResult(res);
            // Refresh shifts list to see updated paper_generated flags
            const updatedShifts = await adminFetch(`/admin/shifts?exam_id=${exam.id}`);
            setShifts(updatedShifts.shifts || []);
        } catch (err) {
            // Check if server returned a 409 conflict needing force confirmation
            if (err.message && err.message.includes('already exist')) {
                setWarningPrompt(
                    'Question papers have already been generated for one or more target shifts. Overwriting will replace all previously assigned questions for these shifts. Are you sure you want to regenerate?'
                );
            } else {
                setError(err.message || 'Failed to generate question papers');
            }
        } finally {
            setGenerating(false);
        }
    }

    // Compute weightage recap stats
    const weightageSummary = React.useMemo(() => {
        if (!weightage?.rules) return { total: 0, easy: 0, medium: 0, hard: 0 };
        let total = 0, easy = 0, medium = 0, hard = 0;
        weightage.rules.forEach((r) => {
            easy += r.easy_count || 0;
            medium += r.medium_count || 0;
            hard += r.hard_count || 0;
        });
        total = easy + medium + hard;
        return { total, easy, medium, hard };
    }, [weightage]);

    const targetQuestions = exam?.questions_per_shift || 75;
    const isWeightageMatch = weightageSummary.total === targetQuestions;
    const hasShortfalls = (validation?.shortfalls?.length || 0) > 0;
    const isReadyToGenerate = isWeightageMatch && !hasShortfalls && shifts.length >= numShifts;

    return (
        <AdminLayout
            title="Paper Generator"
            subtitle="Automated non-overlapping question paper generation partitioned across shifts"
        >
            {/* Error Banner */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold ml-4">✕</button>
                </div>
            )}

            {/* Warning Confirmation Modal (Regenerate overwrite) */}
            {warningPrompt && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#180d0d] border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center space-x-3 text-amber-400">
                            <span className="material-symbols-outlined text-[28px]">warning</span>
                            <h3 className="text-base font-bold text-white">Regenerate Question Papers?</h3>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            {warningPrompt}
                        </p>
                        <div className="flex items-center justify-end space-x-3 pt-2">
                            <button
                                onClick={() => setWarningPrompt(null)}
                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleGenerate(true)}
                                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition flex items-center space-x-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">sync</span>
                                <span>Force Regenerate</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generated Success Card */}
            {generatedResult && (
                <div className="mb-8 p-6 bg-gradient-to-br from-green-950/40 via-[#120a0a] to-[#120a0a] border border-green-500/40 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400">
                                <span className="material-symbols-outlined text-[24px]">verified</span>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Paper Generation Successful!</h3>
                                <p className="text-xs text-green-400/90">{generatedResult.message}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setGeneratedResult(null)}
                            className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 bg-white/5 rounded-lg"
                        >
                            Dismiss
                        </button>
                    </div>

                    {/* Accordion breakdown per shift */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {generatedResult.shifts?.map((s) => (
                            <div key={s.shift_id} className="bg-[#180d0d] border border-white/10 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-white text-sm">{s.shift_name}</span>
                                    <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 text-[10px] font-black uppercase">
                                        Locked & Ready
                                    </span>
                                </div>
                                <div className="text-2xl font-black text-white mb-3">
                                    {s.question_count} <span className="text-xs font-normal text-gray-400">Total Questions</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <div className="text-[10px] text-green-400 font-bold uppercase">Easy</div>
                                        <div className="font-black text-white mt-0.5">{s.breakdown?.easy || 0}</div>
                                    </div>
                                    <div className="p-2 bg-amber-500/10 rounded-lg">
                                        <div className="text-[10px] text-amber-400 font-bold uppercase">Med</div>
                                        <div className="font-black text-white mt-0.5">{s.breakdown?.medium || 0}</div>
                                    </div>
                                    <div className="p-2 bg-red-500/10 rounded-lg">
                                        <div className="text-[10px] text-red-400 font-bold uppercase">Hard</div>
                                        <div className="font-black text-white mt-0.5">{s.breakdown?.hard || 0}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Multi-Step Wizard Cards */}
            <div className="space-y-6">
                {/* Step 1: Weightage Overview */}
                <div className="bg-[#140b0b] border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <span className="w-7 h-7 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-400 text-xs font-black flex items-center justify-center">
                                1
                            </span>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Weightage Preset Summary</h2>
                        </div>
                        <a
                            href="/admin/weightage"
                            className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center space-x-1"
                        >
                            <span>Edit Weightage</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </a>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className={`p-3 rounded-xl border ${
                            isWeightageMatch ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                        }`}>
                            <span className="text-[10px] font-bold uppercase text-gray-400 block">Total Qs / Shift</span>
                            <div className="text-xl font-black text-white mt-1">
                                {weightageSummary.total} / {targetQuestions}
                            </div>
                            <span className={`text-[10px] font-semibold mt-0.5 block ${
                                isWeightageMatch ? 'text-green-400' : 'text-red-400'
                            }`}>
                                {isWeightageMatch ? '✓ Exact target match' : `Diff: ${weightageSummary.total - targetQuestions}`}
                            </span>
                        </div>

                        <div className="p-3 bg-[#180d0d] rounded-xl border border-white/10">
                            <span className="text-[10px] font-bold uppercase text-green-400 block">Easy Pool</span>
                            <div className="text-xl font-black text-white mt-1">{weightageSummary.easy}</div>
                            <span className="text-[10px] text-gray-500">Per Shift</span>
                        </div>

                        <div className="p-3 bg-[#180d0d] rounded-xl border border-white/10">
                            <span className="text-[10px] font-bold uppercase text-amber-400 block">Medium Pool</span>
                            <div className="text-xl font-black text-white mt-1">{weightageSummary.medium}</div>
                            <span className="text-[10px] text-gray-500">Per Shift</span>
                        </div>

                        <div className="p-3 bg-[#180d0d] rounded-xl border border-white/10">
                            <span className="text-[10px] font-bold uppercase text-red-400 block">Hard Pool</span>
                            <div className="text-xl font-black text-white mt-1">{weightageSummary.hard}</div>
                            <span className="text-[10px] text-gray-500">Per Shift</span>
                        </div>
                    </div>
                </div>

                {/* Step 2: Shift Configuration */}
                <div className="bg-[#140b0b] border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center space-x-3 mb-4">
                        <span className="w-7 h-7 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-400 text-xs font-black flex items-center justify-center">
                            2
                        </span>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Number of Shifts to Generate</h2>
                    </div>

                    <div className="max-w-md space-y-3">
                        <label className="block text-xs font-semibold text-gray-300">
                            Target Shifts Count (1 to {shifts.length || 1})
                        </label>
                        <div className="flex items-center space-x-3">
                            <input
                                type="number"
                                min="1"
                                max={shifts.length || 1}
                                value={numShifts}
                                onChange={(e) => handleShiftsChange(e.target.value)}
                                className="w-28 px-3 py-2 bg-[#180d0d] border border-white/10 rounded-xl text-white font-bold text-base focus:outline-none focus:border-orange-500"
                            />
                            <div className="text-xs text-gray-400">
                                Total shifts registered: <strong className="text-white">{shifts.length}</strong>
                            </div>
                        </div>
                        {shifts.length === 0 && (
                            <p className="text-xs text-amber-400">
                                ⚠ No shifts found. Please create shifts in Shift Manager first before generating papers.
                            </p>
                        )}
                    </div>
                </div>

                {/* Step 3: Question Bank Availability & Overlap Preview */}
                <div className="bg-[#140b0b] border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <span className="w-7 h-7 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-400 text-xs font-black flex items-center justify-center">
                                3
                            </span>
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Pool Depth & Partition Validation</h2>
                        </div>
                        <button
                            onClick={() => exam && runValidation(exam.id, numShifts)}
                            disabled={validating || !exam}
                            className="text-xs text-gray-400 hover:text-white font-medium flex items-center space-x-1"
                        >
                            <span className="material-symbols-outlined text-[14px]">
                                {validating ? 'sync' : 'refresh'}
                            </span>
                            <span>Re-validate</span>
                        </button>
                    </div>

                    <div className="p-4 bg-[#180d0d] border border-white/10 rounded-xl mb-4">
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-400">Unique Questions Required Across {numShifts} Shift(s):</span>
                            <strong className="text-white font-bold text-sm">
                                {targetQuestions * numShifts} Questions
                            </strong>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Zero Overlap Guarantee:</span>
                            <span className="text-green-400 font-semibold flex items-center space-x-1">
                                <span className="material-symbols-outlined text-[14px]">shield</span>
                                <span>Strict Partitioning via UNIQUE(question_id)</span>
                            </span>
                        </div>
                    </div>

                    {hasShortfalls ? (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
                            <div className="flex items-center space-x-2 text-red-400 text-xs font-bold">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                <span>Question Bank Shortfall ({validation.shortfalls.length} Topic Pools Deficient)</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {validation.shortfalls.map((sf, idx) => (
                                    <div key={idx} className="p-2.5 bg-[#180d0d] border border-red-500/20 rounded-lg text-xs">
                                        <div className="font-bold text-white">{sf.topic_name}</div>
                                        <div className="text-gray-400 text-[11px] capitalize">{sf.difficulty} difficulty</div>
                                        <div className="text-[11px] text-gray-300 mt-1 flex justify-between">
                                            <span>Needed: {sf.totalNeededForShifts}</span>
                                            <span>Bank: {sf.availableInBank}</span>
                                            <span className="text-red-400 font-bold">Deficit: {sf.shortfall}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center space-x-3 text-green-400 text-xs">
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            <div>
                                <span className="font-bold">Pool Depth Verified!</span>
                                <p className="text-green-300/80 text-[11px] mt-0.5">
                                    The question bank has sufficient unique questions across all topics to generate {numShifts} non-overlapping papers.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 4: Trigger Generation Action */}
                <div className="bg-[#140b0b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Step 4: Execute Generation</h3>
                        <p className="text-xs text-gray-400 mt-1">
                            Generates random non-overlapping papers and locks them to shifts.
                        </p>
                    </div>

                    <button
                        onClick={() => handleGenerate(false)}
                        disabled={generating || !isReadyToGenerate}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            {generating ? 'sync' : 'auto_awesome'}
                        </span>
                        <span>{generating ? 'Generating Papers...' : `Generate Papers for ${numShifts} Shift(s)`}</span>
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
