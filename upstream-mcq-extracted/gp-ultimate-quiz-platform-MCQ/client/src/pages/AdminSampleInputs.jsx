import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_API_URL;

const ROUNDS = [
    { key: "rapidfire", label: "Rapid Fire" },
    { key: "cascade", label: "Coding Cascade" },
    { key: "dsa", label: "DSA Challenge" },
];

export default function AdminSampleInputs() {
    const navigate = useNavigate();
    const token = localStorage.getItem("adminToken");

    const [activeRound, setActiveRound] = useState("rapidfire");
    const [questions, setQuestions] = useState([]);
    const [inputs, setInputs] = useState({}); // { [questionId]: string }
    const [saveStatus, setSaveStatus] = useState({}); // { [questionId]: 'saving' | 'saved' | 'error' | null }
    const [loading, setLoading] = useState(false);
    const [isSavingAll, setIsSavingAll] = useState(false);

    useEffect(() => {
        if (!token) navigate("/admin/login");
    }, [token, navigate]);

    const fetchQuestions = useCallback(async (round) => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/admin/questions/${round}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setQuestions(data);
                // seed inputs from current sample_input values
                const seed = {};
                data.forEach(q => { seed[q.id] = q.sample_input || ""; });
                setInputs(seed);
                setSaveStatus({});
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchQuestions(activeRound);
    }, [activeRound, fetchQuestions]);

    async function saveOne(questionId) {
        setSaveStatus(s => ({ ...s, [questionId]: "saving" }));
        try {
            const res = await fetch(`${BACKEND_URL}/admin/questions/${questionId}/sample-input`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ sample_input: inputs[questionId] ?? "" }),
            });
            const data = await res.json();
            setSaveStatus(s => ({ ...s, [questionId]: res.ok ? "saved" : "error" }));
            if (!res.ok) console.error("Save failed:", data.error);
        } catch (e) {
            setSaveStatus(s => ({ ...s, [questionId]: "error" }));
        }
        // Auto-clear success status after 3s
        setTimeout(() => {
            setSaveStatus(s => ({ ...s, [questionId]: null }));
        }, 3000);
    }

    async function saveAll() {
        setIsSavingAll(true);
        await Promise.all(questions.map(q => saveOne(q.id)));
        setIsSavingAll(false);
    }

    const statusIcon = (qId) => {
        const s = saveStatus[qId];
        if (s === "saving") return <span className="text-yellow-400 text-xs font-bold">Saving…</span>;
        if (s === "saved") return <span className="text-green-400 text-xs font-bold">✓ Saved</span>;
        if (s === "error") return <span className="text-red-400 text-xs font-bold">✗ Error</span>;
        return null;
    };

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
                        Sample Inputs
                    </h1>
                    <span className="text-xs text-gray-600 uppercase font-semibold border border-white/10 rounded px-2 py-0.5">
                        Temp Tool
                    </span>
                </div>
                <button
                    onClick={() => { localStorage.removeItem("adminToken"); navigate("/admin/login"); }}
                    className="text-xs text-gray-500 hover:text-white uppercase font-bold"
                >
                    Logout
                </button>
            </header>

            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Round Tabs */}
                <div className="mb-6 flex flex-wrap gap-2">

                    {ROUNDS.map(r => (
                        <button
                            key={r.key}
                            onClick={() => setActiveRound(r.key)}
                            className={`px-5 py-2 rounded-lg text-sm font-bold uppercase transition border ${activeRound === r.key
                                ? "bg-orange-600 border-orange-500 text-white"
                                : "bg-[#1a1a1a] border-white/10 text-gray-400 hover:text-white hover:border-white/30"
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* Info banner */}
                <div className="mb-5 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-300 text-xs leading-relaxed">
                    <strong>Note:</strong> Set the "Sample Input" that contestants will see pre-filled in their Custom Input box when they open each question.
                    Use the same format as the problem's stdin (e.g. <code className="bg-black/30 px-1 rounded">3\n1 2 3</code> for multi-line).
                    Click <strong>Save</strong> per row, or <strong>Save All</strong> to bulk-save.
                </div>

                {/* Save All */}
                {!loading && questions.length > 0 && (
                    <div className="mb-4 flex justify-stretch sm:justify-end">
                        <button
                            onClick={saveAll}
                            disabled={isSavingAll}
                            className="w-full rounded-lg bg-green-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-700 sm:w-auto"
                        >
                            {isSavingAll ? "Saving All…" : "💾 Save All"}
                        </button>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="text-center text-gray-500 py-20">Loading questions…</div>
                )}

                {/* Question rows */}
                {!loading && (
                    <div className="space-y-3">
                        {questions.map((q, i) => (
                            <div
                                key={q.id}
                                className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-4 lg:flex-row lg:items-start"
                            >
                                {/* Left: question info */}
                                <div className="w-full shrink-0 lg:w-64">
                                    <div className="text-[10px] text-gray-600 uppercase font-bold mb-0.5">
                                        {activeRound !== "rapidfire" ? `#${q.sequence_order} · ` : ""}ID {q.id}
                                    </div>
                                    <div className="text-sm font-semibold text-white leading-snug">
                                        {q.title}
                                    </div>
                                </div>

                                {/* Right: textarea + save */}
                                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start">                                    <textarea
                                    value={inputs[q.id] ?? ""}
                                    onChange={e => setInputs(s => ({ ...s, [q.id]: e.target.value }))}
                                    rows={3}
                                    placeholder="Paste sample stdin here…"
                                    className="flex-1 bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500/50 resize-y"
                                />
                                    <div className="flex flex-row items-center justify-between gap-3 pt-1 sm:flex-col sm:items-end">                                        <button
                                        onClick={() => saveOne(q.id)}
                                        disabled={saveStatus[q.id] === "saving"}
                                        className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition whitespace-nowrap"
                                    >
                                        Save
                                    </button>
                                        {statusIcon(q.id)}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {questions.length === 0 && (
                            <div className="text-center text-gray-600 py-20">
                                No questions found for this round.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
