import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import KaTeXRenderer from '../components/KaTeXRenderer';
import { adminFetch } from '../utils/api';

export default function PaperGenerator() {
    const [exam, setExam] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [weightage, setWeightage] = useState(null);
    const [selectedShiftIds, setSelectedShiftIds] = useState([]);
    const [allowReuse, setAllowReuse] = useState(false);
    const [overrideMismatch, setOverrideMismatch] = useState(false);
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [generatedResult, setGeneratedResult] = useState(null);
    const [error, setError] = useState(null);
    const [actionSuccess, setActionSuccess] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);

    // Preview state
    const [previewModal, setPreviewModal] = useState(null); // { shiftId, shiftName } or null
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);
    const [searchFilter, setSearchFilter] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');

    useEffect(() => { loadInitialData(); }, []);

    async function openShiftPreview(shiftId, shiftName) {
        setPreviewModal({ shiftId, shiftName });
        setPreviewLoading(true);
        setPreviewError(null);
        setPreviewData(null);
        setSearchFilter('');
        setDifficultyFilter('all');
        setSubjectFilter('all');
        try {
            const data = await adminFetch(`/admin/shifts/${shiftId}/questions`);
            setPreviewData(data);
        } catch (err) {
            setPreviewError(err.message || 'Failed to load questions for this shift');
        } finally {
            setPreviewLoading(false);
        }
    }

    async function loadInitialData() {
        setLoading(true);
        setError(null);
        try {
            const examRes = await adminFetch('/admin/exam');
            const activeExam = examRes.exam;
            setExam(activeExam);
            if (!activeExam) {
                setError('No active exam found. Please set up an exam in Exam Config.');
                return;
            }
            const [shiftsRes, weightageRes] = await Promise.all([
                adminFetch(`/admin/shifts?exam_id=${activeExam.id}`),
                adminFetch(`/admin/weightage/${activeExam.id}`),
            ]);
            const shiftList = shiftsRes.shifts || [];
            setShifts(shiftList);
            setWeightage(weightageRes);
            if (shiftList.length) setSelectedShiftIds([shiftList[0].id]);
        } catch (err) {
            setError(err.message || 'Failed to load paper generation details');
        } finally {
            setLoading(false);
        }
    }

    const runValidation = useCallback(async (examId = exam?.id, ids = selectedShiftIds, reuse = allowReuse) => {
        if (!examId || ids.length === 0) {
            setValidation(null);
            return;
        }
        setValidating(true);
        try {
            const params = new URLSearchParams({ num_shifts: String(ids.length), allow_overlap: String(reuse) });
            setValidation(await adminFetch(`/admin/weightage/${examId}/validate?${params}`));
        } catch (err) {
            setError(err.message || 'Validation request failed');
        } finally {
            setValidating(false);
        }
    }, [allowReuse, exam?.id, selectedShiftIds]);

    useEffect(() => {
        if (exam && selectedShiftIds.length) runValidation();
        else setValidation(null);
    }, [exam, selectedShiftIds, runValidation]);

    function toggleShift(id) {
        setGeneratedResult(null);
        setSelectedShiftIds((current) => current.includes(id)
            ? current.filter((shiftId) => shiftId !== id)
            : [...current, id]);
    }

    const weightageSummary = useMemo(() => {
        const totals = (weightage?.rules || []).reduce((sum, rule) => ({
            easy: sum.easy + Number(rule.easy_count || 0),
            medium: sum.medium + Number(rule.medium_count || 0),
            hard: sum.hard + Number(rule.hard_count || 0),
        }), { easy: 0, medium: 0, hard: 0 });
        return { ...totals, total: totals.easy + totals.medium + totals.hard };
    }, [weightage]);

    async function handleGenerate(force = false, mismatchOverride = overrideMismatch) {
        if (!exam || selectedShiftIds.length === 0) return;
        setGenerating(true);
        setError(null);
        setConfirmation(null);
        try {
            const res = await adminFetch(`/admin/generate/${exam.id}${force ? '?force=true' : ''}`, {
                method: 'POST',
                body: JSON.stringify({ shift_ids: selectedShiftIds, allow_question_reuse: allowReuse, override_mismatch: mismatchOverride, force }),
            });
            setGeneratedResult(res);
            const updatedShifts = await adminFetch(`/admin/shifts?exam_id=${exam.id}`);
            setShifts(updatedShifts.shifts || []);
        } catch (err) {
            const message = err.message || 'Failed to generate question papers';
            if (message.includes('already exist')) {
                setConfirmation({ type: 'regenerate', message: 'Papers already exist for one or more selected shifts. Regenerating replaces their assigned questions.' });
            } else if (message.includes('differs from target')) {
                setConfirmation({ type: 'mismatch', message: `The weightage total differs from the exam target. Continue with ${weightageSummary.total} questions per selected shift?` });
            } else setError(message);
        } finally {
            setGenerating(false);
        }
    }

    async function handleDeletePapers(shiftIds) {
        if (!exam || !shiftIds || shiftIds.length === 0) return;
        setDeleting(true);
        setError(null);
        setDeleteConfirmation(null);
        try {
            const res = await adminFetch(`/admin/generate/${exam.id}/papers`, {
                method: 'DELETE',
                body: JSON.stringify({ shift_ids: shiftIds }),
            });
            setActionSuccess(res.message || 'Question papers deleted successfully. Exam configuration is unlocked.');
            const updatedShifts = await adminFetch(`/admin/shifts?exam_id=${exam.id}`);
            setShifts(updatedShifts.shifts || []);
            setGeneratedResult(null);
            setTimeout(() => setActionSuccess(null), 5000);
        } catch (err) {
            setError(err.message || 'Failed to delete question papers');
        } finally {
            setDeleting(false);
        }
    }

    const selectedGeneratedShiftIds = useMemo(() => {
        return selectedShiftIds.filter((id) => shifts.find((s) => s.id === id)?.paper_generated);
    }, [selectedShiftIds, shifts]);

    const filteredPreviewQuestions = useMemo(() => {
        if (!previewData?.questions) return [];
        return previewData.questions.filter((q) => {
            if (difficultyFilter !== 'all' && q.difficulty?.toLowerCase() !== difficultyFilter.toLowerCase()) {
                return false;
            }
            if (subjectFilter !== 'all' && q.subject_name !== subjectFilter) {
                return false;
            }
            if (searchFilter.trim()) {
                const term = searchFilter.toLowerCase().trim();
                const bodyMatch = (q.body || '').toLowerCase().includes(term);
                const topicMatch = (q.topic_name || '').toLowerCase().includes(term);
                const subjectMatch = (q.subject_name || '').toLowerCase().includes(term);
                const optMatch = [q.option_a, q.option_b, q.option_c, q.option_d].some((opt) => (opt || '').toLowerCase().includes(term));
                const expMatch = (q.explanation || '').toLowerCase().includes(term);
                if (!bodyMatch && !topicMatch && !subjectMatch && !optMatch && !expMatch) {
                    return false;
                }
            }
            return true;
        });
    }, [previewData, difficultyFilter, subjectFilter, searchFilter]);

    const availableSubjects = useMemo(() => {
        if (!previewData?.questions) return [];
        const set = new Set();
        previewData.questions.forEach((q) => {
            if (q.subject_name) set.add(q.subject_name);
        });
        return Array.from(set);
    }, [previewData]);

    const targetQuestions = Number(exam?.questions_per_shift || 75);
    const mismatch = weightageSummary.total !== targetQuestions;
    const hasShortfalls = (validation?.shortfalls?.length || 0) > 0;
    const ready = selectedShiftIds.length > 0 && !hasShortfalls && (!mismatch || overrideMismatch);

    return (
        <AdminLayout title="Paper Generator" subtitle="Create or manage papers for the exact shifts you select">
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex justify-between gap-4">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {actionSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-200 text-xs flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-400 text-base">check_circle</span>
                        <span>{actionSuccess}</span>
                    </div>
                    <button onClick={() => setActionSuccess(null)}>✕</button>
                </div>
            )}

            {confirmation && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#180d0d] border border-amber-500/40 rounded-2xl p-6 max-w-md w-full space-y-4">
                        <h3 className="text-base font-bold text-white">Confirm paper generation</h3>
                        <p className="text-xs text-gray-300 leading-relaxed">{confirmation.message}</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmation(null)} className="px-4 py-2 rounded-lg bg-white/5 text-xs text-gray-300">
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const isMismatch = confirmation.type === 'mismatch';
                                    if (isMismatch) setOverrideMismatch(true);
                                    handleGenerate(confirmation.type === 'regenerate', isMismatch || overrideMismatch);
                                }}
                                className="px-4 py-2 rounded-lg bg-amber-600 text-xs font-bold text-white"
                            >
                                {confirmation.type === 'mismatch' ? 'Use weightage total' : 'Regenerate papers'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirmation && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#180d0d] border border-red-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <div className="flex items-center gap-2 text-red-400">
                            <span className="material-symbols-outlined text-xl">warning</span>
                            <h3 className="text-base font-bold text-white">Delete Generated Papers</h3>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            {deleteConfirmation.type === 'single'
                                ? `Are you sure you want to delete the question paper for '${deleteConfirmation.shift.name}'? This will remove all assigned questions and unlock the exam configuration.`
                                : `Are you sure you want to delete question papers for ${deleteConfirmation.shiftIds.length} shift(s)? This will remove assigned questions and unlock the exam configuration.`}
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                disabled={deleting}
                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const ids = deleteConfirmation.type === 'single'
                                        ? [deleteConfirmation.shift.id]
                                        : deleteConfirmation.shiftIds;
                                    handleDeletePapers(ids);
                                }}
                                disabled={deleting}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition flex items-center gap-1.5"
                            >
                                {deleting ? 'Deleting...' : 'Delete & Unlock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {generatedResult && (
                <div className="mb-6 p-5 bg-green-500/10 border border-green-500/30 rounded-2xl">
                    <div className="flex justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-white">Paper generation successful</h3>
                            <p className="text-xs text-green-300 mt-1">
                                {generatedResult.message} · {generatedResult.effectivePaperSize} questions per shift{generatedResult.allowedReuse ? ' · reuse enabled' : ''}
                            </p>
                        </div>
                        <button onClick={() => setGeneratedResult(null)} className="text-xs text-gray-400">
                            Dismiss
                        </button>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                        {generatedResult.shifts?.map((shift) => (
                            <div key={shift.shift_id} className="rounded-xl bg-black/20 p-3 text-xs flex flex-col justify-between">
                                <div>
                                    <b className="text-white text-sm">{shift.shift_name}</b>
                                    <div className="text-gray-300 mt-1">
                                        {shift.question_count} questions · {shift.breakdown.easy} easy · {shift.breakdown.medium} medium · {shift.breakdown.hard} hard
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => openShiftPreview(shift.shift_id, shift.shift_name)}
                                    className="mt-3 w-full py-1.5 px-3 rounded-lg bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/40 text-orange-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                                >
                                    <span className="material-symbols-outlined text-[15px]">visibility</span>
                                    <span>Preview Questions</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <section className="bg-[#140b0b] border border-white/10 rounded-2xl p-6">
                    <div className="flex justify-between gap-4 items-start">
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase">1. Weightage total</h2>
                            <p className="text-xs text-gray-400 mt-1">Target: {targetQuestions} questions per shift</p>
                        </div>
                        <a href="/admin/weightage" className="text-xs text-orange-400">Edit Weightage →</a>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
                        <Stat label="Configured" value={`${weightageSummary.total} / ${targetQuestions}`} tone={mismatch ? 'amber' : 'green'} />
                        <Stat label="Easy" value={weightageSummary.easy} />
                        <Stat label="Medium" value={weightageSummary.medium} />
                        <Stat label="Hard" value={weightageSummary.hard} />
                    </div>
                    {mismatch && (
                        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                            Weightage total is {weightageSummary.total}, not {targetQuestions}. Enable the option below to generate papers with {weightageSummary.total} questions each.
                        </div>
                    )}
                </section>

                <section className="bg-[#140b0b] border border-white/10 rounded-2xl p-6">
                    <div className="flex justify-between items-center gap-4">
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase">2. Select shifts</h2>
                            <p className="text-xs text-gray-400 mt-1">Only checked shifts will receive or regenerate a paper.</p>
                        </div>
                        {selectedGeneratedShiftIds.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmation({ type: 'selected', shiftIds: selectedGeneratedShiftIds })}
                                className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs text-red-300 font-semibold transition flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                                <span>Delete Selected Papers ({selectedGeneratedShiftIds.length})</span>
                            </button>
                        )}
                    </div>
                    {loading ? (
                        <p className="text-xs text-gray-400 mt-4">Loading shifts…</p>
                    ) : shifts.length === 0 ? (
                        <p className="text-xs text-amber-300 mt-4">No shifts found. Create a shift first.</p>
                    ) : (
                        <div className="mt-4 space-y-2">
                            {shifts.map((shift) => (
                                <div
                                    key={shift.id}
                                    className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-[#180d0d]"
                                >
                                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedShiftIds.includes(shift.id)}
                                            onChange={() => toggleShift(shift.id)}
                                            className="accent-orange-500"
                                        />
                                        <span className="flex-1 text-sm text-white font-semibold">{shift.name}</span>
                                        {shift.paper_generated && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-medium">
                                                Paper generated
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-500">
                                            {shift.scheduled_start ? new Date(shift.scheduled_start).toLocaleString() : 'No scheduled time'}
                                        </span>
                                    </label>
                                    {shift.paper_generated && (
                                        <div className="flex items-center gap-2 ml-3">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openShiftPreview(shift.id, shift.name);
                                                }}
                                                className="px-2.5 py-1 text-xs text-orange-400 hover:text-white hover:bg-orange-500/20 border border-orange-500/30 rounded-lg transition flex items-center gap-1 font-semibold"
                                                title="Preview questions generated for this shift"
                                            >
                                                <span className="material-symbols-outlined text-[15px]">visibility</span>
                                                <span>Preview Paper</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteConfirmation({ type: 'single', shift });
                                                }}
                                                className="px-2.5 py-1 text-xs text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 rounded-lg transition flex items-center gap-1 font-semibold"
                                                title="Delete question paper for this shift to unlock exam configuration"
                                            >
                                                <span className="material-symbols-outlined text-[15px]">delete</span>
                                                <span>Delete Paper</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="bg-[#140b0b] border border-white/10 rounded-2xl p-6">
                    <h2 className="text-sm font-bold text-white uppercase">3. Flexibility options</h2>
                    <div className="mt-4 space-y-3 text-xs">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={allowReuse}
                                onChange={(e) => setAllowReuse(e.target.checked)}
                                className="mt-0.5 accent-orange-500"
                            />
                            <span>
                                <b className="text-white">Allow question reuse across shifts</b>
                                <span className="block text-gray-400 mt-1">
                                    Use this when the bank is too small for non-overlapping papers. A question can still appear only once in a shift.
                                </span>
                            </span>
                        </label>
                        {mismatch && (
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={overrideMismatch}
                                    onChange={(e) => setOverrideMismatch(e.target.checked)}
                                    className="mt-0.5 accent-orange-500"
                                />
                                <span>
                                    <b className="text-white">Proceed with weightage total as paper size</b>
                                    <span className="block text-gray-400 mt-1">
                                        Generate {weightageSummary.total} questions per selected shift instead of the configured target.
                                    </span>
                                </span>
                            </label>
                        )}
                    </div>
                </section>

                <section className="bg-[#140b0b] border border-white/10 rounded-2xl p-6">
                    <div className="flex justify-between items-center gap-4">
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase">4. Pool validation</h2>
                            <p className="text-xs text-gray-400 mt-1">
                                {allowReuse ? 'Reuse mode checks the pool needed for one shift.' : `Strict mode checks ${selectedShiftIds.length} non-overlapping paper(s).`}
                            </p>
                        </div>
                        <button
                            onClick={() => runValidation()}
                            disabled={validating || !selectedShiftIds.length}
                            className="px-3 py-2 rounded-lg bg-white/5 text-xs text-gray-200 disabled:opacity-50"
                        >
                            {validating ? 'Checking…' : 'Refresh'}
                        </button>
                    </div>
                    {hasShortfalls ? (
                        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200">
                            The bank is short for: {validation.shortfalls.map((s) => `${s.topic_name} (${s.difficulty}: need ${s.totalNeededForShifts}, have ${s.availableInBank})`).join('; ')}. Add questions or enable reuse.
                        </div>
                    ) : validation && (
                        <div className="mt-4 text-xs text-green-300">
                            Pool has enough questions for the selected configuration.
                        </div>
                    )}
                </section>

                <button
                    onClick={() => handleGenerate()}
                    disabled={!ready || generating}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {generating ? 'Generating papers…' : `Generate papers for ${selectedShiftIds.length} selected shift${selectedShiftIds.length === 1 ? '' : 's'}`}
                </button>
            </div>

            {/* Question Paper Preview Modal */}
            {previewModal && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
                    <div className="bg-[#120808] border border-white/15 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#180d0d] flex items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-400 text-xl">description</span>
                                    <h3 className="text-base font-bold text-white">
                                        Question Paper Preview — <span className="text-orange-400">{previewModal.shiftName}</span>
                                    </h3>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-gray-200 font-semibold">
                                        {previewData?.totalQuestions || 0} Questions
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-gray-200 font-semibold font-mono">
                                        {previewData?.totalMarks || 0} Total Marks
                                    </span>
                                    {previewData?.breakdown && (
                                        <>
                                            <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/30 text-[11px] font-medium">
                                                {previewData.breakdown.easy} Easy
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-medium">
                                                {previewData.breakdown.medium} Medium
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 text-[11px] font-medium">
                                                {previewData.breakdown.hard} Hard
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewModal(null)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition"
                                title="Close preview"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Toolbar: Search and Filter */}
                        <div className="p-3 sm:px-5 sm:py-3 border-b border-white/10 bg-[#150a0a] flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-md bg-[#1d0f0f] border border-white/10 rounded-lg px-2.5 py-1.5">
                                <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
                                <input
                                    type="text"
                                    placeholder="Search questions, topics, options, explanation..."
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    className="bg-transparent text-white placeholder-gray-500 focus:outline-none w-full text-xs"
                                />
                                {searchFilter && (
                                    <button onClick={() => setSearchFilter('')} className="text-gray-400 hover:text-white">
                                        <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Difficulty Filter Pills */}
                                <div className="flex items-center bg-[#1d0f0f] border border-white/10 rounded-lg p-0.5 text-[11px]">
                                    {['all', 'easy', 'medium', 'hard'].map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setDifficultyFilter(d)}
                                            className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                                                difficultyFilter === d
                                                    ? 'bg-orange-600 text-white shadow-sm'
                                                    : 'text-gray-400 hover:text-gray-200'
                                            }`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>

                                {/* Subject Filter Dropdown */}
                                {availableSubjects.length > 1 && (
                                    <select
                                        value={subjectFilter}
                                        onChange={(e) => setSubjectFilter(e.target.value)}
                                        className="bg-[#1d0f0f] border border-white/10 text-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                                    >
                                        <option value="all">All Subjects</option>
                                        {availableSubjects.map((sub) => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Questions Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                            {previewLoading ? (
                                <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
                                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs">Loading generated question paper...</span>
                                </div>
                            ) : previewError ? (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-center justify-between">
                                    <span>{previewError}</span>
                                    <button
                                        onClick={() => openShiftPreview(previewModal.shiftId, previewModal.shiftName)}
                                        className="underline text-red-300 hover:text-white"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : filteredPreviewQuestions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                                    <span className="material-symbols-outlined text-4xl text-gray-500">find_in_page</span>
                                    <p className="text-sm font-semibold text-gray-300">No questions match the current filter.</p>
                                    <p className="text-xs text-gray-500">Try changing your search query or difficulty filter.</p>
                                </div>
                            ) : (
                                filteredPreviewQuestions.map((q, idx) => (
                                    <div
                                        key={q.shift_question_id || q.id || idx}
                                        className="p-4 rounded-xl border border-white/10 bg-[#190d0d] space-y-3 shadow-sm hover:border-white/20 transition"
                                    >
                                        {/* Question Card Top Bar */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold text-xs">
                                                    Q{idx + 1}
                                                </span>
                                                {q.subject_name && (
                                                    <span className="text-[11px] text-gray-400 font-medium">
                                                        {q.subject_name} {q.topic_name ? `› ${q.topic_name}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                                    q.difficulty === 'easy'
                                                        ? 'bg-green-500/15 text-green-300 border-green-500/30'
                                                        : q.difficulty === 'medium'
                                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                        : 'bg-red-500/15 text-red-300 border-red-500/30'
                                                }`}>
                                                    {q.difficulty}
                                                </span>
                                                <span className="text-[11px] text-gray-400 font-mono">
                                                    +{q.marks} / -{q.negative_marks} marks
                                                </span>
                                            </div>
                                        </div>

                                        {/* Question Body with KaTeX */}
                                        <div className="text-white text-sm leading-relaxed py-1">
                                            <KaTeXRenderer content={q.body} />
                                        </div>

                                        {/* Optional Question Diagram / Image */}
                                        {q.image_url && (
                                            <div className="my-2">
                                                <img
                                                    src={q.image_url}
                                                    alt="Question Diagram"
                                                    className="max-h-56 max-w-full rounded-lg border border-white/10 object-contain bg-black/40 p-1"
                                                />
                                            </div>
                                        )}

                                        {/* Options Grid (A, B, C, D) */}
                                        <div className="grid sm:grid-cols-2 gap-2 pt-1">
                                            {['a', 'b', 'c', 'd'].map((optKey) => {
                                                const optText = q[`option_${optKey}`];
                                                if (!optText) return null;
                                                const isCorrect = (q.correct_opt || '').toLowerCase() === optKey;
                                                return (
                                                    <div
                                                        key={optKey}
                                                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition ${
                                                            isCorrect
                                                                ? 'bg-emerald-500/15 border-emerald-500/50 text-white ring-1 ring-emerald-500/30'
                                                                : 'bg-black/25 border-white/5 text-gray-300'
                                                        }`}
                                                    >
                                                        <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                                            isCorrect ? 'bg-emerald-500 text-black' : 'bg-white/10 text-gray-400'
                                                        }`}>
                                                            {optKey.toUpperCase()}
                                                        </span>
                                                        <div className="flex-1 leading-snug">
                                                            <KaTeXRenderer content={optText} />
                                                        </div>
                                                        {isCorrect && (
                                                            <span className="text-[10px] font-bold text-emerald-400 shrink-0 flex items-center gap-0.5">
                                                                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                                                Correct
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Explanation (if provided) */}
                                        {q.explanation && (
                                            <div className="mt-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90 space-y-1">
                                                <div className="flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                                                    <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                                                    <span>Explanation</span>
                                                </div>
                                                <div className="leading-relaxed">
                                                    <KaTeXRenderer content={q.explanation} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modal Sticky Footer */}
                        <div className="p-3 sm:px-5 border-t border-white/10 bg-[#180d0d] flex items-center justify-between text-xs">
                            <span className="text-gray-400">
                                Showing <b className="text-white">{filteredPreviewQuestions.length}</b> of <b className="text-white">{previewData?.questions?.length || 0}</b> questions
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewModal(null)}
                                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

function Stat({ label, value, tone = 'default' }) {
    const styles = tone === 'green' ? 'border-green-500/30 bg-green-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/10 bg-[#180d0d]';
    return (
        <div className={`p-3 rounded-xl border ${styles}`}>
            <span className="text-[10px] uppercase text-gray-400">{label}</span>
            <div className="text-lg font-bold text-white mt-1">{value}</div>
        </div>
    );
}
