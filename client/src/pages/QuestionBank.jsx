import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import KaTeXRenderer from '../components/KaTeXRenderer';
import { adminFetch, API_URL } from '../utils/api';

export default function QuestionBank() {
    const [questions, setQuestions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [counts, setCounts] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state (Add / Edit)
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        subject_id: '',
        topic_id: '',
        difficulty: 'easy',
        body: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_opt: 'a',
        explanation: '',
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Bulk Import Modal state
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkJsonText, setBulkJsonText] = useState('');
    const [bulkStatus, setBulkStatus] = useState(null);

    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    // Cloud Sync state
    const [syncPending, setSyncPending] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);

    // Load Syllabus Tree (Subjects + Topics)
    const loadSyllabus = useCallback(async () => {
        try {
            const data = await adminFetch('/admin/subjects');
            setSubjects(data.subjects || []);
        } catch (err) {
            console.error('Error loading syllabus:', err);
        }
    }, []);

    // Load Question Counts
    const loadCounts = useCallback(async () => {
        try {
            const data = await adminFetch('/admin/questions/count-by-topic');
            setCounts(data.counts || []);
        } catch (err) {
            console.error('Error loading counts:', err);
        }
    }, []);

    // Load Questions with filters
    const loadQuestions = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
            });
            if (selectedSubjectId) params.append('subject_id', selectedSubjectId);
            if (selectedTopicId) params.append('topic_id', selectedTopicId);
            if (selectedDifficulty) params.append('difficulty', selectedDifficulty);
            if (searchQuery) params.append('search', searchQuery);

            const data = await adminFetch(`/admin/questions?${params.toString()}`);
            setQuestions(data.questions || []);
            setTotal(data.pagination?.total || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [page, selectedSubjectId, selectedTopicId, selectedDifficulty, searchQuery]);

    useEffect(() => {
        loadSyllabus();
        loadCounts();
        loadSyncStatus();
    }, [loadSyllabus, loadCounts]);

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    async function loadSyncStatus() {
        try {
            const data = await adminFetch('/admin/sync-questions/status');
            setSyncPending(data.pending || 0);
        } catch {
            setSyncPending(0);
        }
    }

    async function handleSync() {
        setSyncing(true);
        setSyncResult(null);
        setError('');
        try {
            const data = await adminFetch('/admin/sync-questions', { method: 'POST' });
            setSyncResult(data);
            setSyncPending(0);
            await loadSyllabus();
            await loadCounts();
            await loadQuestions();
        } catch (err) {
            setError('Sync failed: ' + err.message);
        } finally {
            setSyncing(false);
        }
    }

    // Update active topics when subject changes
    useEffect(() => {
        if (selectedSubjectId) {
            const subj = subjects.find((s) => s.id === parseInt(selectedSubjectId, 10));
            setTopics(subj ? subj.topics || [] : []);
        } else {
            const allTopics = subjects.flatMap((s) => s.topics || []);
            setTopics(allTopics);
        }
    }, [selectedSubjectId, subjects]);

    // Open Add Modal
    function handleOpenAdd() {
        setEditingId(null);
        const defaultSubj = subjects[0];
        const defaultTopic = defaultSubj?.topics?.[0];
        setFormData({
            subject_id: defaultSubj ? defaultSubj.id.toString() : '',
            topic_id: defaultTopic ? defaultTopic.id.toString() : '',
            difficulty: 'easy',
            body: '',
            option_a: '',
            option_b: '',
            option_c: '',
            option_d: '',
            correct_opt: 'a',
            explanation: '',
        });
        setImageFile(null);
        setImagePreview(null);
        setShowModal(true);
    }

    // Open Edit Modal
    function handleOpenEdit(q) {
        setEditingId(q.id);
        setFormData({
            subject_id: q.subject_id?.toString() || '',
            topic_id: q.topic_id?.toString() || '',
            difficulty: q.difficulty || 'easy',
            body: q.body || '',
            option_a: q.option_a || '',
            option_b: q.option_b || '',
            option_c: q.option_c || '',
            option_d: q.option_d || '',
            correct_opt: q.correct_opt || 'a',
            explanation: q.explanation || '',
        });
        setImageFile(null);
        setImagePreview(q.image_url ? (q.image_url.startsWith('http') ? q.image_url : `${API_URL}${q.image_url}`) : null);
        setShowModal(true);
    }

    async function handleSaveQuestion(e) {
        e.preventDefault();
        setError('');
        setMsg('');

        try {
            const form = new FormData();
            form.append('topic_id', formData.topic_id);
            form.append('difficulty', formData.difficulty);
            form.append('body', formData.body);
            form.append('option_a', formData.option_a);
            form.append('option_b', formData.option_b);
            form.append('option_c', formData.option_c);
            form.append('option_d', formData.option_d);
            form.append('correct_opt', formData.correct_opt);
            if (formData.explanation) form.append('explanation', formData.explanation);
            if (imageFile) form.append('image', imageFile);

            if (editingId) {
                await adminFetch(`/admin/questions/${editingId}`, {
                    method: 'PUT',
                    body: form,
                });
                setMsg('Question updated successfully.');
            } else {
                await adminFetch('/admin/questions', {
                    method: 'POST',
                    body: form,
                });
                setMsg('New question added to bank.');
            }

            setShowModal(false);
            await loadQuestions();
            await loadCounts();
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleDeleteQuestion(id) {
        if (!window.confirm(`Delete question ID ${id}?`)) return;
        try {
            await adminFetch(`/admin/questions/${id}`, { method: 'DELETE' });
            setMsg(`Question ${id} removed.`);
            await loadQuestions();
            await loadCounts();
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleBulkImport(e) {
        e.preventDefault();
        setBulkStatus(null);
        setError('');

        try {
            const parsed = JSON.parse(bulkJsonText);
            if (!Array.isArray(parsed)) {
                throw new Error('Import data must be a JSON array of questions');
            }

            const res = await adminFetch('/admin/questions/bulk', {
                method: 'POST',
                body: JSON.stringify({ questions: parsed }),
            });

            setBulkStatus(res);
            setMsg(`Imported ${res.importedCount} questions.`);
            setBulkJsonText('');
            await loadQuestions();
            await loadCounts();
        } catch (err) {
            setError(err.message);
        }
    }

    // Modal topic options based on modal subject selection
    const modalTopics = subjects.find((s) => s.id === parseInt(formData.subject_id, 10))?.topics || [];

    return (
        <AdminLayout
            title="Question Bank & LaTeX Studio"
            subtitle="Author and organize mathematical questions with real-time KaTeX rendering and image uploads"
            actions={
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold border border-white/10 transition flex items-center space-x-1.5"
                    >
                        <span className="material-symbols-outlined text-[16px]">upload_file</span>
                        <span>Bulk JSON</span>
                    </button>
                    <button
                        onClick={handleOpenAdd}
                        className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-orange-600/30"
                    >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        <span>Add Question</span>
                    </button>
                </div>
            }
        >
            {/* Feedback Notifications */}
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

            {/* Cloud Sync Panel */}
            <div className="mb-6 p-4 bg-[#140b0b] border border-white/10 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-400 text-[22px]">cloud_sync</span>
                    <div>
                        <p className="text-xs font-bold text-white">Cloud Question Sync</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            {syncPending > 0
                                ? <span className="text-amber-400 font-semibold">{syncPending} question{syncPending !== 1 ? 's' : ''} pending sync from portal</span>
                                : <span className="text-green-400">All cloud questions synced ✓</span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {syncResult && (
                        <span className="text-green-400 text-xs font-semibold">
                            ✓ {syncResult.synced} synced{syncResult.failed > 0 ? `, ${syncResult.failed} failed` : ''}
                        </span>
                    )}
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="px-4 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[15px]">{syncing ? 'hourglass_empty' : 'sync'}</span>
                        <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                </div>
            </div>


            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3.5 bg-[#140b0b] border border-white/10 rounded-xl">
                    <div className="text-gray-400 text-[10px] uppercase font-bold">Total in Bank</div>
                    <div className="text-xl font-black text-white mt-0.5">{total}</div>
                </div>
                <div className="p-3.5 bg-[#140b0b] border border-white/10 rounded-xl">
                    <div className="text-green-400 text-[10px] uppercase font-bold">Easy Questions</div>
                    <div className="text-xl font-black text-green-300 mt-0.5">
                        {counts.reduce((acc, c) => acc + (c.easy_count || 0), 0)}
                    </div>
                </div>
                <div className="p-3.5 bg-[#140b0b] border border-white/10 rounded-xl">
                    <div className="text-amber-400 text-[10px] uppercase font-bold">Medium Questions</div>
                    <div className="text-xl font-black text-amber-300 mt-0.5">
                        {counts.reduce((acc, c) => acc + (c.medium_count || 0), 0)}
                    </div>
                </div>
                <div className="p-3.5 bg-[#140b0b] border border-white/10 rounded-xl">
                    <div className="text-red-400 text-[10px] uppercase font-bold">Hard Questions</div>
                    <div className="text-xl font-black text-red-300 mt-0.5">
                        {counts.reduce((acc, c) => acc + (c.hard_count || 0), 0)}
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-[#140b0b] border border-white/10 rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Subject</label>
                    <select
                        value={selectedSubjectId}
                        onChange={(e) => {
                            setSelectedSubjectId(e.target.value);
                            setSelectedTopicId('');
                            setPage(1);
                        }}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-orange-500"
                    >
                        <option value="">All Subjects</option>
                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Topic</label>
                    <select
                        value={selectedTopicId}
                        onChange={(e) => {
                            setSelectedTopicId(e.target.value);
                            setPage(1);
                        }}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-orange-500"
                    >
                        <option value="">All Topics</option>
                        {topics.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Difficulty</label>
                    <select
                        value={selectedDifficulty}
                        onChange={(e) => {
                            setSelectedDifficulty(e.target.value);
                            setPage(1);
                        }}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-orange-500"
                    >
                        <option value="">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Search Keywords</label>
                    <input
                        type="text"
                        placeholder="Search question text..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-orange-500"
                    />
                </div>
            </div>

            {/* Questions Table */}
            <div className="bg-[#140b0b] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-black/40 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Question Preview</th>
                                <th className="px-4 py-3">Topic / Subject</th>
                                <th className="px-4 py-3">Difficulty</th>
                                <th className="px-4 py-3">Ans</th>
                                <th className="px-4 py-3">Image</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {questions.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                        No questions found matching the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                questions.map((q) => (
                                    <tr key={q.id} className="hover:bg-white/[0.02] transition">
                                        <td className="px-4 py-3 font-mono text-gray-400">#{q.id}</td>
                                        <td className="px-4 py-3 max-w-md">
                                            <div className="line-clamp-2 text-white text-xs font-normal">
                                                <KaTeXRenderer content={q.body} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-white">{q.topic_name}</div>
                                            <div className="text-[10px] text-gray-500">{q.subject_name}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                                                    q.difficulty === 'easy'
                                                        ? 'bg-green-500/20 text-green-300'
                                                        : q.difficulty === 'medium'
                                                        ? 'bg-amber-500/20 text-amber-300'
                                                        : 'bg-red-500/20 text-red-300'
                                                }`}
                                            >
                                                {q.difficulty}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="w-5 h-5 rounded-full bg-orange-600/30 border border-orange-500/50 text-orange-300 flex items-center justify-center font-bold uppercase text-[11px]">
                                                {q.correct_opt}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {q.image_url ? (
                                                <span className="material-symbols-outlined text-green-400 text-[18px]">image</span>
                                            ) : (
                                                <span className="text-gray-600">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                                <button
                                                    onClick={() => handleOpenEdit(q)}
                                                    className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                                    title="Edit question"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteQuestion(q.id)}
                                                    className="p-1 hover:bg-red-500/10 rounded text-gray-400 hover:text-red-400"
                                                    title="Delete question"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                    <div>Total {total} questions</div>
                    <div className="flex space-x-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 bg-black/40 rounded text-white font-bold">Page {page}</span>
                        <button
                            disabled={page * 20 >= total}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Add / Edit Question Modal (TWO-PANE LIVE KATEX PREVIEW STUDIO) */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#140b0b] border border-white/20 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
                            <div className="flex items-center space-x-2">
                                <span className="material-symbols-outlined text-orange-400">functions</span>
                                <h3 className="font-bold text-white text-base">
                                    {editingId ? `Edit Question #${editingId}` : 'LaTeX Question Authoring Studio'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-white p-1 rounded-lg"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modal Body: Two-Pane Split Layout */}
                        <form onSubmit={handleSaveQuestion} className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
                            {/* Left Pane: Input Controls */}
                            <div className="lg:w-1/2 p-6 border-b lg:border-b-0 lg:border-r border-white/10 space-y-4 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Subject</label>
                                        <select
                                            required
                                            value={formData.subject_id}
                                            onChange={(e) => {
                                                const newSubjId = e.target.value;
                                                const s = subjects.find((subj) => subj.id === parseInt(newSubjId, 10));
                                                setFormData({
                                                    ...formData,
                                                    subject_id: newSubjId,
                                                    topic_id: s?.topics?.[0]?.id?.toString() || '',
                                                });
                                            }}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-orange-500"
                                        >
                                            {subjects.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Topic</label>
                                        <select
                                            required
                                            value={formData.topic_id}
                                            onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-orange-500"
                                        >
                                            {modalTopics.map((t) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <label className="text-[10px] font-bold uppercase text-gray-400">Difficulty:</label>
                                    {['easy', 'medium', 'hard'].map((diff) => (
                                        <label key={diff} className="flex items-center space-x-1 text-xs text-gray-300 capitalize cursor-pointer">
                                            <input
                                                type="radio"
                                                name="difficulty"
                                                value={diff}
                                                checked={formData.difficulty === diff}
                                                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                                className="text-orange-600 focus:ring-orange-500"
                                            />
                                            <span>{diff}</span>
                                        </label>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                                        Question Body (Supports KaTeX: $inline$ & $$block$$)
                                    </label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={formData.body}
                                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                        placeholder="Evaluate $\int_0^1 x^2\,dx$ or matrix $$\begin{pmatrix}1 & 2 \\ 3 & 4\end{pmatrix}$$"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-xs font-mono focus:outline-none focus:border-orange-500 leading-relaxed"
                                    />
                                </div>

                                {/* Options A-D */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold uppercase text-gray-400">Options</label>
                                    {['a', 'b', 'c', 'd'].map((opt) => (
                                        <div key={opt} className="flex items-center space-x-2">
                                            <label className="flex items-center space-x-1 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="correct_opt"
                                                    value={opt}
                                                    checked={formData.correct_opt === opt}
                                                    onChange={(e) => setFormData({ ...formData, correct_opt: e.target.value })}
                                                    className="text-orange-600 focus:ring-orange-500"
                                                />
                                                <span className="font-bold text-xs uppercase text-orange-400">{opt})</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData[`option_${opt}`]}
                                                onChange={(e) => setFormData({ ...formData, [`option_${opt}`]: e.target.value })}
                                                placeholder={`Option ${opt.toUpperCase()} (LaTeX supported)`}
                                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Image Upload */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                                        Optional Image (Diagram / Circuit / Graph)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setImageFile(file);
                                                setImagePreview(URL.createObjectURL(file));
                                            }
                                        }}
                                        className="w-full text-xs text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange-600/20 file:text-orange-300 hover:file:bg-orange-600/30 cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                                        Explanation (Optional post-exam feedback)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.explanation}
                                        onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                                        placeholder="Detailed solution steps..."
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-orange-500 font-mono"
                                    />
                                </div>

                                <div className="pt-2 flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-600/30"
                                    >
                                        {editingId ? 'Save Changes' : 'Add to Bank'}
                                    </button>
                                </div>
                            </div>

                            {/* Right Pane: Live KaTeX Preview */}
                            <div className="lg:w-1/2 p-6 bg-[#0a0505] flex flex-col overflow-y-auto">
                                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                                        Live KaTeX Preview (Candidate View)
                                    </span>
                                    <span className="text-[10px] text-gray-500">Zero CDN • Offline Bundled</span>
                                </div>

                                <div className="flex-1 space-y-5">
                                    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl min-h-[90px]">
                                        {formData.body ? (
                                            <KaTeXRenderer content={formData.body} className="text-white text-sm leading-relaxed" />
                                        ) : (
                                            <span className="text-gray-600 italic text-xs">Question text will preview here in real time...</span>
                                        )}
                                    </div>

                                    {/* Image Preview */}
                                    {imagePreview && (
                                        <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-center">
                                            <img
                                                src={imagePreview}
                                                alt="Question Diagram"
                                                className="max-h-48 mx-auto rounded object-contain border border-white/10"
                                            />
                                        </div>
                                    )}

                                    {/* Options Preview */}
                                    <div className="space-y-2">
                                        {['a', 'b', 'c', 'd'].map((opt) => {
                                            const isCorrect = formData.correct_opt === opt;
                                            const optText = formData[`option_${opt}`];
                                            return (
                                                <div
                                                    key={opt}
                                                    className={`p-3 rounded-lg border text-xs flex items-center space-x-3 transition ${
                                                        isCorrect
                                                            ? 'bg-green-500/10 border-green-500/40 text-green-200'
                                                            : 'bg-white/[0.02] border-white/5 text-gray-300'
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] uppercase ${
                                                            isCorrect
                                                                ? 'bg-green-500 text-black'
                                                                : 'bg-white/10 text-gray-400'
                                                        }`}
                                                    >
                                                        {opt}
                                                    </span>
                                                    <div className="flex-1 overflow-x-auto">
                                                        {optText ? (
                                                            <KaTeXRenderer content={optText} />
                                                        ) : (
                                                            <span className="text-gray-600 italic">Empty option {opt.toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    {isCorrect && (
                                                        <span className="text-[10px] font-bold text-green-400 tracking-wider uppercase">
                                                            Correct Answer
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#140b0b] border border-white/20 rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                            <h3 className="font-bold text-white text-base">Bulk JSON Questions Import</h3>
                            <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <p className="text-xs text-gray-400 mb-3">
                            Paste a JSON array of question objects matching the schema:
                        </p>

                        <div className="bg-black/60 p-2.5 rounded-lg border border-white/5 font-mono text-[10px] text-gray-400 mb-4 overflow-x-auto">
                            {`[ { "topic_id": 1, "difficulty": "easy", "body": "LaTeX $x$", "option_a": "A", "option_b": "B", "option_c": "C", "option_d": "D", "correct_opt": "a" } ]`}
                        </div>

                        <form onSubmit={handleBulkImport} className="space-y-4">
                            <textarea
                                required
                                rows={8}
                                value={bulkJsonText}
                                onChange={(e) => setBulkJsonText(e.target.value)}
                                placeholder="Paste JSON array here..."
                                className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                            />

                            {bulkStatus && (
                                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-300">
                                    Successfully imported {bulkStatus.importedCount} questions!
                                </div>
                            )}

                            <div className="flex justify-end space-x-2 pt-2 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkModal(false)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-600/30"
                                >
                                    Import All Questions
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
