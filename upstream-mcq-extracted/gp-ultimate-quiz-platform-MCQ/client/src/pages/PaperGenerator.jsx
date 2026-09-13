import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
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
    const [generatedResult, setGeneratedResult] = useState(null);
    const [error, setError] = useState(null);
    const [confirmation, setConfirmation] = useState(null);

    useEffect(() => { loadInitialData(); }, []);

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

    const targetQuestions = Number(exam?.questions_per_shift || 75);
    const mismatch = weightageSummary.total !== targetQuestions;
    const hasShortfalls = (validation?.shortfalls?.length || 0) > 0;
    const ready = selectedShiftIds.length > 0 && !hasShortfalls && (!mismatch || overrideMismatch);

    return (
        <AdminLayout title="Paper Generator" subtitle="Create papers for the exact shifts you select">
            {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex justify-between gap-4"><span>{error}</span><button onClick={() => setError(null)}>✕</button></div>}
            {confirmation && <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-[#180d0d] border border-amber-500/40 rounded-2xl p-6 max-w-md w-full space-y-4"><h3 className="text-base font-bold text-white">Confirm paper generation</h3><p className="text-xs text-gray-300 leading-relaxed">{confirmation.message}</p><div className="flex justify-end gap-3"><button onClick={() => setConfirmation(null)} className="px-4 py-2 rounded-lg bg-white/5 text-xs text-gray-300">Cancel</button><button onClick={() => { const isMismatch = confirmation.type === 'mismatch'; if (isMismatch) setOverrideMismatch(true); handleGenerate(confirmation.type === 'regenerate', isMismatch || overrideMismatch); }} className="px-4 py-2 rounded-lg bg-amber-600 text-xs font-bold text-white">{confirmation.type === 'mismatch' ? 'Use weightage total' : 'Regenerate papers'}</button></div></div></div>}

            {generatedResult && <div className="mb-6 p-5 bg-green-500/10 border border-green-500/30 rounded-2xl"><div className="flex justify-between gap-4"><div><h3 className="font-bold text-white">Paper generation successful</h3><p className="text-xs text-green-300 mt-1">{generatedResult.message} · {generatedResult.effectivePaperSize} questions per shift{generatedResult.allowedReuse ? ' · reuse enabled' : ''}</p></div><button onClick={() => setGeneratedResult(null)} className="text-xs text-gray-400">Dismiss</button></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">{generatedResult.shifts?.map((shift) => <div key={shift.shift_id} className="rounded-xl bg-black/20 p-3 text-xs"><b className="text-white">{shift.shift_name}</b><div className="text-gray-300 mt-2">{shift.question_count} questions · {shift.breakdown.easy} easy · {shift.breakdown.medium} medium · {shift.breakdown.hard} hard</div></div>)}</div></div>}

            <div className="space-y-6">
                <section className="bg-[#140b0b] border border-white/10 rounded-2xl p-6"><div className="flex justify-between gap-4 items-start"><div><h2 className="text-sm font-bold text-white uppercase">1. Weightage total</h2><p className="text-xs text-gray-400 mt-1">Target: {targetQuestions} questions per shift</p></div><a href="/admin/weightage" className="text-xs text-orange-400">Edit Weightage →</a></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs"><Stat label="Configured" value={`${weightageSummary.total} / ${targetQuestions}`} tone={mismatch ? 'amber' : 'green'} /><Stat label="Easy" value={weightageSummary.easy} /><Stat label="Medium" value={weightageSummary.medium} /><Stat label="Hard" value={weightageSummary.hard} /></div>{mismatch && <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">Weightage total is {weightageSummary.total}, not {targetQuestions}. Enable the option below to generate papers with {weightageSummary.total} questions each.</div>}</section>

                <section className="bg-[#140b0b] border border-white/10 rounded-2xl p-6"><h2 className="text-sm font-bold text-white uppercase">2. Select shifts</h2><p className="text-xs text-gray-400 mt-1">Only checked shifts will receive or regenerate a paper.</p>{loading ? <p className="text-xs text-gray-400 mt-4">Loading shifts…</p> : shifts.length === 0 ? <p className="text-xs text-amber-300 mt-4">No shifts found. Create a shift first.</p> : <div className="mt-4 space-y-2">{shifts.map((shift) => <label key={shift.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-[#180d0d] cursor-pointer"><input type="checkbox" checked={selectedShiftIds.includes(shift.id)} onChange={() => toggleShift(shift.id)} className="accent-orange-500" /><span className="flex-1 text-sm text-white font-semibold">{shift.name}</span>{shift.paper_generated && <span className="text-[10px] px-2 py-1 rounded bg-amber-500/15 text-amber-300">Paper generated</span>}<span className="text-[10px] text-gray-500">{shift.scheduled_start ? new Date(shift.scheduled_start).toLocaleString() : 'No scheduled time'}</span></label>)}</div>}</section>

                <section className="bg-[#140b0b] border border-white/10 rounded-2xl p-6"><h2 className="text-sm font-bold text-white uppercase">3. Flexibility options</h2><div className="mt-4 space-y-3 text-xs"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={allowReuse} onChange={(e) => setAllowReuse(e.target.checked)} className="mt-0.5 accent-orange-500" /><span><b className="text-white">Allow question reuse across shifts</b><span className="block text-gray-400 mt-1">Use this when the bank is too small for non-overlapping papers. A question can still appear only once in a shift.</span></span></label>{mismatch && <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={overrideMismatch} onChange={(e) => setOverrideMismatch(e.target.checked)} className="mt-0.5 accent-orange-500" /><span><b className="text-white">Proceed with weightage total as paper size</b><span className="block text-gray-400 mt-1">Generate {weightageSummary.total} questions per selected shift instead of the configured target.</span></span></label>}</div></section>

                <section className="bg-[#140b0b] border border-white/10 rounded-2xl p-6"><div className="flex justify-between items-center gap-4"><div><h2 className="text-sm font-bold text-white uppercase">4. Pool validation</h2><p className="text-xs text-gray-400 mt-1">{allowReuse ? 'Reuse mode checks the pool needed for one shift.' : `Strict mode checks ${selectedShiftIds.length} non-overlapping paper(s).`}</p></div><button onClick={() => runValidation()} disabled={validating || !selectedShiftIds.length} className="px-3 py-2 rounded-lg bg-white/5 text-xs text-gray-200 disabled:opacity-50">{validating ? 'Checking…' : 'Refresh'}</button></div>{hasShortfalls ? <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200">The bank is short for: {validation.shortfalls.map((s) => `${s.topic_name} (${s.difficulty}: need ${s.totalNeededForShifts}, have ${s.availableInBank})`).join('; ')}. Add questions or enable reuse.</div> : validation && <div className="mt-4 text-xs text-green-300">Pool has enough questions for the selected configuration.</div>}</section>

                <button onClick={() => handleGenerate()} disabled={!ready || generating} className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed">{generating ? 'Generating papers…' : `Generate papers for ${selectedShiftIds.length} selected shift${selectedShiftIds.length === 1 ? '' : 's'}`}</button>
            </div>
        </AdminLayout>
    );
}

function Stat({ label, value, tone = 'default' }) {
    const styles = tone === 'green' ? 'border-green-500/30 bg-green-500/10' : tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/10 bg-[#180d0d]';
    return <div className={`p-3 rounded-xl border ${styles}`}><span className="text-[10px] uppercase text-gray-400">{label}</span><div className="text-lg font-bold text-white mt-1">{value}</div></div>;
}
