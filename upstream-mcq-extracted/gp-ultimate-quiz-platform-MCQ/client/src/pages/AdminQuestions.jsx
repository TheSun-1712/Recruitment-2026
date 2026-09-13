
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// DSA partial scoring requires exact TC counts per slot
const DSA_REQUIRED_TC = { 0: 3, 1: 2, 2: 2, 3: 3, 4: 3 };

const ROUND_CONFIG = {
    rapidfire: { label: "Rapid Fire", color: "orange", minPool: 15 },
    cascade: { label: "Coding Cascade", color: "blue", minPool: 15 },
    dsa: { label: "DSA Challenge", color: "purple", minPool: 5 },
};

const EMPTY_FORM = {
    title: "",
    description: "",
    avg_time: 180,
    base_points: 10,
    time_limit: 2.0,
    sequence_order: 0,
    test_cases: [{ input: "", expected_output: "", is_hidden: true }],
};



export default function AdminQuestions() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = localStorage.getItem("adminToken");

    const [activeRound, setActiveRound] = useState(searchParams.get("round") || "rapidfire");
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null); // null = creating new
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        if (!token) navigate("/admin/login");
    }, [token, navigate]);

    // Fetch questions for the active round
    const fetchQuestions = useCallback(async (round) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/questions/${round}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (res.ok) setQuestions(data);
            else setError(data.error || "Failed to load questions");
        } catch {
            setError("Network error loading questions");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchQuestions(activeRound);
        setExpandedId(null);
        setShowForm(false);
        setError("");
    }, [activeRound, fetchQuestions]);

    // Fetch test cases when expanding a card and opening edit
    async function fetchTestCases(questionId) {
        const res = await fetch(
            `${import.meta.env.VITE_API_URL}/admin/questions/${questionId}/testcases`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.ok ? await res.json() : [];
    }

    function showSuccess(msg) {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(""), 3000);
    }

    // Open create form
    function openCreate() {
        setEditingId(null);
        setForm({
            ...EMPTY_FORM,
            description: "",
            base_points: activeRound === "cascade" ? 12 : activeRound === "dsa" ? 100 : 10,
            test_cases: activeRound === "dsa"
                ? [
                    { input: "", expected_output: "", is_hidden: true },
                    { input: "", expected_output: "", is_hidden: true },
                    { input: "", expected_output: "", is_hidden: true },
                ]
                : [{ input: "", expected_output: "", is_hidden: true }],
        });
        setShowForm(true);
        setError("");
    }

    // Open edit form — fetch TCs for that question
    async function openEdit(q) {
        const tcs = await fetchTestCases(q.id);
        setEditingId(q.id);
        setForm({
            description: q.description || "",
            title: q.title,
            avg_time: q.avg_time || 180,
            base_points: q.base_points || 10,
            time_limit: q.time_limit || 2.0,
            sequence_order: q.sequence_order || 0,
            test_cases: tcs.length > 0
                ? tcs.map(tc => ({ input: tc.input, expected_output: tc.expected_output, is_hidden: tc.is_hidden }))
                : [{ input: "", expected_output: "", is_hidden: true }],
        });
        setShowForm(true);
        setError("");
    }

    // Save (create or update)
    async function handleSave() {
        setError("");
        setSaving(true);

        // Frontend validation
        if (!form.title.trim() || !form.description.trim()) {
            setError("Title and Problem Statement (Markdown) are required.");
            setSaving(false);
            return;
        }
        if (form.test_cases.some(tc => !tc.input.trim() || !tc.expected_output.trim())) {
            setError("All test cases must have both Input and Expected Output filled in.");
            setSaving(false);
            return;
        }

        const body = {
            round: activeRound,
            title: form.title,
            description: form.description,
            avg_time: Number(form.avg_time),
            base_points: Number(form.base_points),
            time_limit: activeRound === "dsa" ? Number(form.time_limit) : null,
            sequence_order: Number(form.sequence_order),
            test_cases: form.test_cases,
            // token removed from body — sent via Authorization header
        };

        try {
            const url = editingId
                ? `${import.meta.env.VITE_API_URL}/admin/questions/${editingId}`
                : `${import.meta.env.VITE_API_URL}/admin/questions`;
            const method = editingId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (res.ok) {
                showSuccess(editingId ? "Question updated!" : "Question created!");
                setShowForm(false);
                setExpandedId(null);
                await fetchQuestions(activeRound);
            } else {
                setError(data.error || "Save failed");
            }
        } catch {
            setError("Network error saving question");
        } finally {
            setSaving(false);
        }
    }

    // Delete
    async function handleDelete(q) {
        if (!confirm(`Delete "${q.title}"? This will also delete all its test cases and cannot be undone.`)) return;
        setError("");
        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/questions/${q.id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    // body empty — token moved to header
                }
            );
            const data = await res.json();
            if (res.ok) {
                showSuccess("Question deleted.");
                setExpandedId(null);
                await fetchQuestions(activeRound);
            } else {
                setError(data.error || "Delete failed");
            }
        } catch {
            setError("Network error deleting question");
        }
    }

    // Test case helpers
    function addTestCase() {
        setForm(f => ({ ...f, test_cases: [...f.test_cases, { input: "", expected_output: "", is_hidden: true }] }));
    }
    function removeTestCase(idx) {
        setForm(f => ({ ...f, test_cases: f.test_cases.filter((_, i) => i !== idx) }));
    }
    function updateTestCase(idx, field, value) {
        setForm(f => ({
            ...f,
            test_cases: f.test_cases.map((tc, i) => i === idx ? { ...tc, [field]: value } : tc),
        }));
    }




    // Check for sequence_order conflicts in cascade
    function hasCascadeConflict(q) {
        if (activeRound !== "cascade") return false;
        return questions.filter(other => other.sequence_order === q.sequence_order).length > 1;
    }

    // Check DSA TC count warning for an existing question
    function dsaTcWarning(q) {
        if (activeRound !== "dsa") return null;
        const required = DSA_REQUIRED_TC[q.sequence_order];
        const actual = Number(q.tc_count);
        if (required !== undefined && actual !== required)
            return `⚠ Slot ${q.sequence_order} needs ${required} TCs, has ${actual}`;
        return null;
    }

    const poolCount = questions.length;
    const config = ROUND_CONFIG[activeRound];

    return (
        <div className="min-h-screen bg-[#111] text-white font-sans">
            {/* Header */}
            <header className="flex flex-col gap-4 border-b border-white/10 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={() => navigate("/admin/dashboard")}
                        className="text-gray-500 hover:text-white text-sm transition"
                    >
                        ← Dashboard
                    </button>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-orange-500">
                        Question Manager
                    </h1>
                </div>
                <button
                    onClick={() => { localStorage.removeItem("adminToken"); navigate("/admin/login"); }}
                    className="text-xs text-gray-500 hover:text-white uppercase font-bold"
                >
                    Logout
                </button>
            </header>

            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Round Tabs */}
                <div className="mb-8 flex flex-wrap gap-2">
                    {Object.entries(ROUND_CONFIG).map(([key, cfg]) => (
                        <button
                            key={key}
                            onClick={() => { setActiveRound(key); setShowForm(false); }}
                            className={`px-5 py-2 rounded-lg text-sm font-bold uppercase transition border ${activeRound === key
                                ? "bg-orange-600 border-orange-500 text-white"
                                : "bg-[#1a1a1a] border-white/10 text-gray-400 hover:text-white hover:border-white/30"
                                }`}
                        >
                            {cfg.label}
                        </button>
                    ))}
                </div>

                {/* Status bar */}
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`text-sm font-semibold ${poolCount < config.minPool ? "text-red-400" : "text-green-400"}`}>
                            {poolCount} question{poolCount !== 1 ? "s" : ""} in pool
                            {poolCount < config.minPool && ` — ⚠ minimum ${config.minPool} required`}
                        </span>
                        {activeRound === "dsa" && (
                            <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded">
                                ⚠ DSA partial scoring is hardcoded — TC counts per question must match exactly
                            </span>
                        )}
                    </div>
                    <button
                        onClick={openCreate}
                        className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-500 sm:w-auto"
                    >
                        + Add Question
                    </button>
                </div>

                {/* Global error / success messages */}
                {error && (
                    <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div className="mb-4 p-3 bg-green-900/40 border border-green-500/50 rounded-lg text-green-300 text-sm">
                        ✓ {successMsg}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="text-center text-gray-500 py-16">Loading questions…</div>
                )}

                {/* Question Card Grid */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                        {questions.map((q) => {
                            const isExpanded = expandedId === q.id;
                            const conflict = hasCascadeConflict(q);
                            const dsaWarn = dsaTcWarning(q);

                            return (
                                <div
                                    key={q.id}
                                    className={`bg-[#1a1a1a] border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${isExpanded
                                        ? "border-orange-500/60 shadow-lg shadow-orange-500/10"
                                        : conflict
                                            ? "border-red-500/50"
                                            : "border-white/10 hover:border-white/30"
                                        }`}
                                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                                >
                                    {/* Card Header */}
                                    <div className="p-4">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    {activeRound !== "rapidfire" && (
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                            #{q.sequence_order}
                                                        </span>
                                                    )}
                                                    {conflict && (
                                                        <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                                                            ORDER CONFLICT
                                                        </span>
                                                    )}
                                                    {dsaWarn && (
                                                        <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                                                            TC MISMATCH
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-semibold text-white text-sm leading-snug truncate">
                                                    {q.title}
                                                </h3>
                                            </div>
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                {q.tc_count} TC{q.tc_count !== 1 ? "s" : ""}
                                            </span>
                                        </div>

                                        {/* Metadata row */}
                                        <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-gray-500">
                                            {activeRound === "rapidfire" && (
                                                <span>avg {q.avg_time}s</span>
                                            )}
                                            {(activeRound === "cascade" || activeRound === "dsa") && (
                                                <span>{q.base_points} pts</span>
                                            )}
                                            {activeRound === "dsa" && q.time_limit && (
                                                <span>TL: {q.time_limit}s</span>
                                            )}
                                            {dsaWarn && <span className="text-yellow-500">{dsaWarn}</span>}
                                        </div>
                                    </div>

                                    {/* Expanded section */}
                                    {isExpanded && (
                                        <div
                                            className="border-t border-white/10 bg-[#141414] p-4"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {/* Description preview */}
                                            <div className="text-xs text-gray-400 mb-4 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                                                {q.description.slice(0, 600)}{q.description.length > 600 ? "…" : ""}
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { openEdit(q); setExpandedId(null); }}
                                                    className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(q)}
                                                    className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition"
                                                >
                                                    🗑 Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {!loading && questions.length === 0 && (
                            <div className="col-span-full text-center text-gray-600 py-20">
                                No questions yet for {config.label}. Click "+ Add Question" to get started.
                            </div>
                        )}
                    </div>
                )}

                {/* Create / Edit Form */}
                {showForm && (
                    <div className="mb-8 rounded-xl border border-white/10 bg-[#1a1a1a] p-4 sm:p-6">
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-lg font-bold uppercase tracking-wide text-orange-400">
                                {editingId ? `Edit Question #${editingId}` : `New ${config.label} Question`}
                            </h2>
                            <button
                                onClick={() => { setShowForm(false); setError(""); }}
                                className="text-gray-500 hover:text-white text-xs uppercase font-bold"
                            >
                                ✕ Cancel
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Title *</label>
                                <input
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                                    placeholder="Question title"
                                />
                            </div>


                            {/* ── SECTION A: Problem Statement ── */}
                            <div>
                                <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">
                                    Problem Statement (Markdown) *
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={15}
                                    className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 resize-y font-mono"
                                    placeholder="Paste full Markdown problem description here, including Examples and Constraints headers..."
                                />
                            </div>


                            {/* Round-specific fields */}
                            <div className="flex flex-wrap gap-4">
                                {activeRound === "rapidfire" && (
                                    <div className="flex-1 min-w-[120px]">
                                        <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Avg Time (seconds)</label>
                                        <input
                                            type="number"
                                            value={form.avg_time}
                                            onChange={e => setForm(f => ({ ...f, avg_time: e.target.value }))}
                                            className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                                        />
                                    </div>
                                )}
                                {(activeRound === "cascade" || activeRound === "dsa") && (
                                    <>
                                        <div className="flex-1 min-w-[120px]">
                                            <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Base Points</label>
                                            <input
                                                type="number"
                                                value={form.base_points}
                                                onChange={e => setForm(f => ({ ...f, base_points: e.target.value }))}
                                                className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-[120px]">
                                            <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">
                                                Sequence Order
                                                {activeRound === "cascade" && <span className="normal-case text-gray-600"> (0–14)</span>}
                                                {activeRound === "dsa" && <span className="normal-case text-gray-600"> (0–4)</span>}
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={activeRound === "dsa" ? 4 : 14}
                                                value={form.sequence_order}
                                                onChange={e => setForm(f => ({ ...f, sequence_order: e.target.value }))}
                                                className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                                            />
                                            {/* DSA: show required TC count for this slot */}
                                            {activeRound === "dsa" && DSA_REQUIRED_TC[form.sequence_order] !== undefined && (
                                                <p className="text-[11px] text-yellow-400 mt-1">
                                                    This slot requires exactly {DSA_REQUIRED_TC[form.sequence_order]} test case(s)
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                                {activeRound === "dsa" && (
                                    <div className="flex-1 min-w-[120px]">
                                        <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Time Limit (seconds)</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={form.time_limit}
                                            onChange={e => setForm(f => ({ ...f, time_limit: e.target.value }))}
                                            className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Test Cases */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs text-gray-400 uppercase font-semibold">
                                        Test Cases
                                        {activeRound === "dsa" && DSA_REQUIRED_TC[Number(form.sequence_order)] && (
                                            <span className={`ml-2 ${form.test_cases.length === DSA_REQUIRED_TC[Number(form.sequence_order)] ? "text-green-400" : "text-red-400"}`}>
                                                ({form.test_cases.length} / {DSA_REQUIRED_TC[Number(form.sequence_order)]} required)
                                            </span>
                                        )}
                                    </label>
                                    <button
                                        onClick={addTestCase}
                                        className="text-xs text-green-400 hover:text-green-300 font-bold transition"
                                    >
                                        + Add Test Case
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {form.test_cases.map((tc, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-[#111] border border-white/10 rounded-lg p-3"
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[11px] text-gray-500 uppercase font-semibold">Test Case {idx + 1}</span>
                                                <div className="flex items-center gap-3">
                                                    {(activeRound === "cascade" || activeRound === "dsa") && (
                                                        <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={tc.is_hidden}
                                                                onChange={e => updateTestCase(idx, "is_hidden", e.target.checked)}
                                                                className="accent-orange-500"
                                                            />
                                                            Hidden
                                                        </label>
                                                    )}
                                                    {form.test_cases.length > 1 && (
                                                        <button
                                                            onClick={() => removeTestCase(idx)}
                                                            className="text-red-500 hover:text-red-400 text-xs"
                                                        >
                                                            🗑
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label className="block text-[10px] text-gray-600 mb-1">Input</label>
                                                    <textarea
                                                        value={tc.input}
                                                        onChange={e => updateTestCase(idx, "input", e.target.value)}
                                                        rows={3}
                                                        className="w-full bg-[#0d0d0d] border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/40 resize-y"
                                                        placeholder="stdin input..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-600 mb-1">Expected Output</label>
                                                    <textarea
                                                        value={tc.expected_output}
                                                        onChange={e => updateTestCase(idx, "expected_output", e.target.value)}
                                                        rows={3}
                                                        className="w-full bg-[#0d0d0d] border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500/40 resize-y"
                                                        placeholder="expected stdout..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Error in form */}
                            {error && (
                                <div className="p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Save button */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition"
                                >
                                    {saving ? "Saving…" : editingId ? "Update Question" : "Create Question"}
                                </button>
                                <button
                                    onClick={() => { setShowForm(false); setError(""); }}
                                    className="px-6 py-2.5 bg-[#111] border border-white/10 hover:border-white/30 text-white text-sm font-bold rounded-lg transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
