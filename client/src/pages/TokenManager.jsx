import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminFetch } from '../utils/api';

export default function TokenManager() {
    const [candidates, setCandidates] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ shift_id: '', branch: '', section: '', search: '' });
    const [revealedTokens, setRevealedTokens] = useState({}); // { [candidateId]: boolean }

    // Spot registration form state
    const [formData, setFormData] = useState({
        name: '',
        roll_no: '',
        branch: 'CSE',
        section: 'A',
        email: '',
        shift_id: '',
    });
    const [generating, setGenerating] = useState(false);
    const [lastGenerated, setLastGenerated] = useState(null); // stores the newly created candidate with token
    const [copiedToken, setCopiedToken] = useState(false);

    // Bulk modal state
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkDefaultShift, setBulkDefaultShift] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [bulkImporting, setBulkImporting] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);

    // Edit modal state
    const [editingCandidate, setEditingCandidate] = useState(null);
    const [editSaving, setEditSaving] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        loadShifts();
    }, []);

    useEffect(() => {
        loadCandidates();
    }, [filters, pagination.page]);

    async function loadShifts() {
        try {
            const res = await adminFetch('/admin/shifts');
            const shiftList = res.shifts || [];
            setShifts(shiftList);
            if (shiftList.length > 0) {
                setFormData((prev) => ({ ...prev, shift_id: shiftList[0].id.toString() }));
                setBulkDefaultShift(shiftList[0].id.toString());
            }
        } catch (err) {
            console.error('Failed to load shifts:', err);
        }
    }

    async function loadCandidates() {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (filters.shift_id) queryParams.set('shift_id', filters.shift_id);
            if (filters.branch) queryParams.set('branch', filters.branch);
            if (filters.section) queryParams.set('section', filters.section);
            if (filters.search) queryParams.set('search', filters.search);
            queryParams.set('page', pagination.page);
            queryParams.set('limit', pagination.limit);

            const res = await adminFetch(`/admin/candidates?${queryParams.toString()}`);
            setCandidates(res.candidates || []);
            setPagination(res.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
        } catch (err) {
            setError(err.message || 'Failed to load candidates');
        } finally {
            setLoading(false);
        }
    }

    async function handleSpotRegister(e) {
        e.preventDefault();
        setGenerating(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const res = await adminFetch('/admin/candidates', {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.name,
                    roll_no: formData.roll_no,
                    branch: formData.branch,
                    section: formData.section,
                    email: formData.email || `${formData.roll_no.toLowerCase()}@exam.lan`,
                    shift_id: parseInt(formData.shift_id, 10),
                }),
            });

            setLastGenerated(res.candidate);
            setSuccessMessage(`Candidate registered successfully! Token generated.`);
            // Reset roll_no and email for the next candidate, keep branch/section/shift
            setFormData((prev) => ({ ...prev, name: '', roll_no: '', email: '' }));
            loadCandidates();
        } catch (err) {
            setError(err.message || 'Failed to register candidate');
        } finally {
            setGenerating(false);
        }
    }

    function handleCopyToken(token) {
        navigator.clipboard.writeText(token);
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
    }

    function handlePrintToken(candidate) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Exam Entry Pass - ${candidate.roll_no}</title>
                    <style>
                        body { font-family: monospace; padding: 40px; text-align: center; }
                        .card { border: 2px dashed #333; padding: 25px; border-radius: 12px; max-width: 450px; margin: 0 auto; }
                        .title { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
                        .subtitle { font-size: 13px; color: #666; margin-bottom: 20px; text-transform: uppercase; }
                        .token { font-size: 26px; font-weight: 900; background: #eee; padding: 12px; border-radius: 8px; letter-spacing: 2px; margin: 15px 0; }
                        .details { text-align: left; font-size: 14px; margin-top: 15px; line-height: 1.6; }
                        .footer { margin-top: 25px; font-size: 11px; color: #888; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="title">G-PRIME MCQ EXAM</div>
                        <div class="subtitle">Candidate Access Token Pass</div>
                        <div class="details">
                            <div><strong>Candidate:</strong> ${candidate.name}</div>
                            <div><strong>Roll Number:</strong> ${candidate.roll_no}</div>
                            <div><strong>Branch & Sec:</strong> ${candidate.branch} - ${candidate.section}</div>
                            <div><strong>Assigned Shift:</strong> ${candidate.shift_name || candidate.shift_id}</div>
                        </div>
                        <div class="token">${candidate.token}</div>
                        <div class="footer">
                            Do not share this token. It is valid for a single exam session on the LAN network.
                        </div>
                    </div>
                    <script>
                        window.print();
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    async function handleDeleteCandidate(candidate) {
        if (!window.confirm(`Are you sure you want to delete candidate ${candidate.name} (${candidate.roll_no})?`)) return;
        try {
            await adminFetch(`/admin/candidates/${candidate.id}`, { method: 'DELETE' });
            loadCandidates();
            if (lastGenerated?.id === candidate.id) setLastGenerated(null);
        } catch (err) {
            alert(err.message || 'Failed to delete candidate');
        }
    }

    async function handleSaveEdit(e) {
        e.preventDefault();
        setEditSaving(true);
        try {
            await adminFetch(`/admin/candidates/${editingCandidate.id}`, {
                method: 'PUT',
                body: JSON.stringify(editingCandidate),
            });
            setEditingCandidate(null);
            loadCandidates();
        } catch (err) {
            alert(err.message || 'Failed to update candidate');
        } finally {
            setEditSaving(false);
        }
    }

    async function handleBulkImport() {
        if (!bulkText.trim()) return;
        setBulkImporting(true);
        setBulkResult(null);

        try {
            let parsed = [];
            // Check if CSV or JSON
            if (bulkText.trim().startsWith('[') || bulkText.trim().startsWith('{')) {
                const json = JSON.parse(bulkText);
                parsed = Array.isArray(json) ? json : [json];
            } else {
                // Parse simple CSV (name, roll_no, branch, section, email)
                const lines = bulkText.trim().split('\n');
                lines.forEach((line) => {
                    const parts = line.split(',').map((p) => p.trim());
                    if (parts.length >= 2) {
                        parsed.push({
                            name: parts[0],
                            roll_no: parts[1],
                            branch: parts[2] || 'CSE',
                            section: parts[3] || 'A',
                            email: parts[4] || `${parts[1]?.toLowerCase()}@exam.lan`,
                            shift_id: parts[5] || bulkDefaultShift,
                        });
                    }
                });
            }

            const res = await adminFetch('/admin/candidates/bulk', {
                method: 'POST',
                body: JSON.stringify({
                    candidates: parsed,
                    default_shift_id: bulkDefaultShift,
                }),
            });

            setBulkResult(res);
            loadCandidates();
        } catch (err) {
            alert(err.message || 'Failed to process bulk import');
        } finally {
            setBulkImporting(false);
        }
    }

    return (
        <AdminLayout
            title="Token Manager"
            subtitle="Spot candidate registration, cryptographic token issuing, and candidate directory"
            actions={
                <button
                    onClick={() => {
                        setBulkText('');
                        setBulkResult(null);
                        setShowBulkModal(true);
                    }}
                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-xs font-semibold tracking-wide transition flex items-center space-x-1.5"
                >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span>Bulk Import</span>
                </button>
            }
        >
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold ml-4">✕</button>
                </div>
            )}

            {successMessage && (
                <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-xs flex items-center justify-between">
                    <span>{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-white font-bold ml-4">✕</button>
                </div>
            )}

            {/* Top Cards: Spot Registration & Issued Token Pass */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                {/* Spot Registration Form */}
                <div className="lg:col-span-7 bg-[#140b0b] border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center space-x-2.5 mb-5">
                        <span className="material-symbols-outlined text-orange-400 text-[20px]">person_add</span>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Spot Registration</h2>
                    </div>

                    <form onSubmit={handleSpotRegister} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Roll Number *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 21CS042"
                                    value={formData.roll_no}
                                    onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Branch *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="CSE / ECE / IT"
                                    value={formData.branch}
                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Section *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="A / B / C"
                                    value={formData.section}
                                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Email (Optional)</label>
                                <input
                                    type="email"
                                    placeholder="candidate@college.edu"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Assigned Shift *</label>
                                <select
                                    required
                                    value={formData.shift_id}
                                    onChange={(e) => setFormData({ ...formData, shift_id: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500"
                                >
                                    {shifts.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.status})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={generating || shifts.length === 0}
                                className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition shadow-lg shadow-orange-600/25 flex items-center space-x-2 disabled:opacity-40"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    {generating ? 'sync' : 'key'}
                                </span>
                                <span>{generating ? 'Issuing Token...' : 'Register & Generate Token'}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Issued Token Display Card */}
                <div className="lg:col-span-5 bg-[#140b0b] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <span className="material-symbols-outlined text-amber-400 text-[20px]">badge</span>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Generated Token Pass</h3>
                            </div>
                            {lastGenerated && (
                                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold uppercase">
                                    Active Pass
                                </span>
                            )}
                        </div>

                        {lastGenerated ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-[#180d0d] border border-orange-500/30 rounded-xl">
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Candidate Token</div>
                                    <div className="text-xl sm:text-2xl font-mono font-black text-orange-400 tracking-wider my-2 select-all">
                                        {lastGenerated.token}
                                    </div>
                                    <div className="text-xs text-gray-300 font-medium">
                                        {lastGenerated.name} • <span className="text-white font-bold">{lastGenerated.roll_no}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                        Shift: <span className="text-gray-300">{lastGenerated.shift_name}</span> | {lastGenerated.branch}-{lastGenerated.section}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleCopyToken(lastGenerated.token)}
                                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-white transition flex items-center justify-center space-x-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">
                                            {copiedToken ? 'check' : 'content_copy'}
                                        </span>
                                        <span>{copiedToken ? 'Copied to Clipboard!' : 'Copy Token'}</span>
                                    </button>

                                    <button
                                        onClick={() => handlePrintToken(lastGenerated)}
                                        className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-lg text-xs font-semibold text-orange-400 hover:text-orange-300 transition flex items-center space-x-1.5"
                                        title="Print Token Slip"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">print</span>
                                        <span>Print Pass</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/10 rounded-xl">
                                <span className="material-symbols-outlined text-gray-600 text-3xl mb-1">key_off</span>
                                <p className="text-xs text-gray-500">
                                    Fill out the registration form on the left to issue a unique token pass.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="text-[11px] text-gray-500 mt-4 pt-3 border-t border-white/5">
                        Token format: <code className="text-orange-400/80 font-mono">BRANCH-SEC-LAST4-HASH</code> (Cryptographically random 6-hex entropy)
                    </div>
                </div>
            </div>

            {/* Candidates Directory Table */}
            <div className="bg-[#140b0b] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                {/* Table Header & Filters */}
                <div className="p-4 border-b border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                        <span className="material-symbols-outlined text-orange-400 text-[20px]">group</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                            Candidates Directory ({pagination.total})
                        </h3>
                    </div>

                    {/* Filter controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
                        <select
                            value={filters.shift_id}
                            onChange={(e) => setFilters({ ...filters, shift_id: e.target.value })}
                            className="px-2.5 py-1.5 bg-[#180d0d] border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                        >
                            <option value="">All Shifts</option>
                            {shifts.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        <input
                            type="text"
                            placeholder="Branch (e.g. CSE)"
                            value={filters.branch}
                            onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                            className="px-2.5 py-1.5 bg-[#180d0d] border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none"
                        />

                        <input
                            type="text"
                            placeholder="Section (e.g. A)"
                            value={filters.section}
                            onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                            className="px-2.5 py-1.5 bg-[#180d0d] border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none"
                        />

                        <input
                            type="text"
                            placeholder="Search Name / Roll..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="px-2.5 py-1.5 bg-[#180d0d] border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Table Data */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-4 font-bold">Roll No & Name</th>
                                <th className="py-3 px-4 font-bold">Branch / Sec</th>
                                <th className="py-3 px-4 font-bold">Shift</th>
                                <th className="py-3 px-4 font-bold">Token</th>
                                <th className="py-3 px-4 font-bold text-center">Exam Status</th>
                                <th className="py-3 px-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {candidates.map((c) => {
                                const isRevealed = revealedTokens[c.id];
                                return (
                                    <tr key={c.id} className="hover:bg-white/[0.02] transition">
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-white text-sm">{c.roll_no}</div>
                                            <div className="text-gray-400 text-xs">{c.name}</div>
                                            <div className="text-[10px] text-gray-500">{c.email}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-semibold text-gray-300">{c.branch}</span>
                                            <span className="text-gray-500 ml-1">({c.section})</span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-300">
                                            {c.shift_name || `Shift #${c.shift_id}`}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="inline-flex items-center space-x-1.5 bg-[#0d0707] border border-white/10 rounded-lg px-2 py-1 font-mono text-[11px]">
                                                <span>
                                                    {isRevealed ? c.token : `${c.token.slice(0, 8)}••••••••`}
                                                </span>
                                                <button
                                                    onClick={() => setRevealedTokens({ ...revealedTokens, [c.id]: !isRevealed })}
                                                    className="text-gray-500 hover:text-white"
                                                    title={isRevealed ? 'Hide Token' : 'Reveal Token'}
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">
                                                        {isRevealed ? 'visibility_off' : 'visibility'}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => handleCopyToken(c.token)}
                                                    className="text-gray-500 hover:text-orange-400"
                                                    title="Copy Token"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {c.is_submitted ? (
                                                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">
                                                    Submitted ({c.score} / 75)
                                                </span>
                                            ) : c.token_used ? (
                                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center space-x-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                                    <span>Active in Exam</span>
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-400 text-[10px] font-medium">
                                                    Unused
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => handlePrintToken(c)}
                                                    className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                                                    title="Print Pass"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">print</span>
                                                </button>
                                                <button
                                                    onClick={() => setEditingCandidate(c)}
                                                    className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-amber-400"
                                                    title="Edit Info"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCandidate(c)}
                                                    disabled={c.token_used}
                                                    className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 disabled:opacity-20"
                                                    title="Delete Candidate"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {candidates.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-gray-500">
                                        No candidates found matching the criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                {pagination.totalPages > 1 && (
                    <div className="p-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                        <div>
                            Showing page {pagination.page} of {pagination.totalPages}
                        </div>
                        <div className="flex items-center space-x-1">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
                            >
                                Previous
                            </button>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Import Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#140b0b] border border-white/15 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="material-symbols-outlined text-orange-400 text-[22px]">upload_file</span>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Bulk Candidate Import</h3>
                            </div>
                            <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        <p className="text-xs text-gray-400">
                            Paste a CSV (one per line: <code className="text-orange-300">Name, RollNo, Branch, Section, Email</code>) or a JSON array of candidate objects.
                        </p>

                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Default Shift</label>
                            <select
                                value={bulkDefaultShift}
                                onChange={(e) => setBulkDefaultShift(e.target.value)}
                                className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white text-xs focus:outline-none"
                            >
                                {shifts.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Data (CSV or JSON)</label>
                            <textarea
                                rows="6"
                                placeholder={`Aarav Sharma, 21CS001, CSE, A, aarav@college.edu\nDiya Patel, 21CS002, CSE, A, diya@college.edu`}
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                className="w-full p-3 bg-[#180d0d] border border-white/10 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                            />
                        </div>

                        {bulkResult && (
                            <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs space-y-1">
                                <div className="text-green-400 font-bold">
                                    ✓ Imported: {bulkResult.importedCount} candidate(s)
                                </div>
                                {bulkResult.failedCount > 0 && (
                                    <div className="text-red-400">
                                        ✗ Failed: {bulkResult.failedCount} candidate(s) (e.g. duplicate roll numbers)
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-end space-x-3 pt-2">
                            <button
                                onClick={() => setShowBulkModal(false)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-lg"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleBulkImport}
                                disabled={bulkImporting || !bulkText.trim()}
                                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider disabled:opacity-40"
                            >
                                {bulkImporting ? 'Importing...' : 'Process Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Candidate Modal */}
            {editingCandidate && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleSaveEdit} className="bg-[#140b0b] border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Edit Candidate</h3>
                            <button type="button" onClick={() => setEditingCandidate(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editingCandidate.name}
                                    onChange={(e) => setEditingCandidate({ ...editingCandidate, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-1">Roll No</label>
                                <input
                                    type="text"
                                    required
                                    value={editingCandidate.roll_no}
                                    onChange={(e) => setEditingCandidate({ ...editingCandidate, roll_no: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-gray-400 mb-1">Branch</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingCandidate.branch}
                                        onChange={(e) => setEditingCandidate({ ...editingCandidate, branch: e.target.value })}
                                        className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1">Section</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingCandidate.section}
                                        onChange={(e) => setEditingCandidate({ ...editingCandidate, section: e.target.value })}
                                        className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editingCandidate.email || ''}
                                    onChange={(e) => setEditingCandidate({ ...editingCandidate, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#180d0d] border border-white/10 rounded-lg text-white focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-3">
                            <button
                                type="button"
                                onClick={() => setEditingCandidate(null)}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={editSaving}
                                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider"
                            >
                                {editSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </AdminLayout>
    );
}
