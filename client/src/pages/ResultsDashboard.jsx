import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import KaTeXRenderer from '../components/KaTeXRenderer';
import { adminFetch, API_URL } from '../utils/api';

export default function ResultsDashboard() {
    const [results, setResults] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [shiftStats, setShiftStats] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ shift_id: '', branch: '', section: '', search: '' });

    // Per-candidate breakdown modal state
    const [selectedCandidateId, setSelectedCandidateId] = useState(null);
    const [candidateDetail, setCandidateDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Syncing state
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);

    // CSV exporting state
    const [exportingCsv, setExportingCsv] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadShifts();
    }, []);

    useEffect(() => {
        loadResults();
        if (filters.shift_id) {
            loadShiftSummary(filters.shift_id);
        } else {
            setShiftStats(null);
        }
    }, [filters, pagination.page]);

    async function loadShifts() {
        try {
            const res = await adminFetch('/admin/shifts');
            setShifts(res.shifts || []);
        } catch (err) {
            console.error('Failed to load shifts:', err);
        }
    }

    async function loadShiftSummary(shiftId) {
        try {
            const res = await adminFetch(`/admin/results/shift/${shiftId}/summary`);
            setShiftStats(res.stats || null);
        } catch (err) {
            console.error('Failed to load shift summary stats:', err);
        }
    }

    async function loadResults() {
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

            const res = await adminFetch(`/admin/results?${queryParams.toString()}`);
            setResults(res.results || []);
            setPagination(res.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
        } catch (err) {
            setError(err.message || 'Failed to load results');
        } finally {
            setLoading(false);
        }
    }

    async function handleViewDetails(candidateId) {
        setSelectedCandidateId(candidateId);
        setDetailLoading(true);
        try {
            const res = await adminFetch(`/admin/results/${candidateId}`);
            setCandidateDetail(res);
        } catch (err) {
            alert(err.message || 'Failed to load candidate answer details');
            setSelectedCandidateId(null);
        } finally {
            setDetailLoading(false);
        }
    }

    async function handleExportCsv() {
        setExportingCsv(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.shift_id) queryParams.set('shift_id', filters.shift_id);
            if (filters.branch) queryParams.set('branch', filters.branch);
            if (filters.section) queryParams.set('section', filters.section);

            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_URL}/admin/results/export.csv?${queryParams.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to generate CSV');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mcq_exam_results_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(err.message || 'CSV export failed');
        } finally {
            setExportingCsv(false);
        }
    }

    async function handleSyncToCloud() {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await adminFetch('/admin/results/sync', { method: 'POST' });
            setSyncResult({ success: true, message: res.message || `Synced ${res.synced} records!` });
            loadResults();
        } catch (err) {
            setSyncResult({ success: false, message: err.message || 'Cloud sync failed' });
        } finally {
            setSyncing(false);
        }
    }

    function formatTime(seconds) {
        if (!seconds && seconds !== 0) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    }

    return (
        <AdminLayout
            title="Results & Analytics"
            subtitle="Real-time leaderboard, score distributions, answer sheets, and cloud sync"
            actions={
                <div className="flex items-center space-x-2.5">
                    <button
                        onClick={handleExportCsv}
                        disabled={exportingCsv}
                        className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-xs font-semibold tracking-wide transition flex items-center space-x-1.5 disabled:opacity-40"
                    >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
                    </button>

                    <button
                        onClick={handleSyncToCloud}
                        disabled={syncing}
                        className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition shadow-lg shadow-orange-600/20 flex items-center space-x-1.5 disabled:opacity-40"
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            {syncing ? 'sync' : 'cloud_upload'}
                        </span>
                        <span>{syncing ? 'Syncing...' : 'Sync to Supabase'}</span>
                    </button>
                </div>
            }
        >
            {/* Sync Notification Toast / Banner */}
            {syncResult && (
                <div className={`mb-6 p-4 rounded-xl text-xs flex items-center justify-between ${
                    syncResult.success 
                        ? 'bg-green-500/10 border border-green-500/30 text-green-300' 
                        : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}>
                    <div className="flex items-center space-x-2">
                        <span className="material-symbols-outlined text-[18px]">
                            {syncResult.success ? 'cloud_done' : 'cloud_off'}
                        </span>
                        <span>{syncResult.message}</span>
                    </div>
                    <button onClick={() => setSyncResult(null)} className="font-bold ml-4">✕</button>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold ml-4">✕</button>
                </div>
            )}

            {/* Shift Summary Metric Cards (Visible when shift is selected or overall) */}
            {shiftStats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    <div className="bg-[#140b0b] border border-white/10 rounded-xl p-4">
                        <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Submissions</span>
                        <div className="text-2xl font-black text-white mt-1">
                            {shiftStats.submission_count}
                        </div>
                        <span className="text-[10px] text-gray-500">In this shift</span>
                    </div>

                    <div className="bg-[#140b0b] border border-white/10 rounded-xl p-4">
                        <span className="text-[10px] font-bold tracking-wider text-orange-400 uppercase">Mean Score</span>
                        <div className="text-2xl font-black text-white mt-1">
                            {shiftStats.mean_score} <span className="text-xs text-gray-500 font-normal">/ 75</span>
                        </div>
                        <span className="text-[10px] text-gray-500">Average points</span>
                    </div>

                    <div className="bg-[#140b0b] border border-white/10 rounded-xl p-4">
                        <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">Median Score</span>
                        <div className="text-2xl font-black text-white mt-1">
                            {shiftStats.median_score || 0} <span className="text-xs text-gray-500 font-normal">/ 75</span>
                        </div>
                        <span className="text-[10px] text-gray-500">50th Percentile</span>
                    </div>

                    <div className="bg-[#140b0b] border border-white/10 rounded-xl p-4">
                        <span className="text-[10px] font-bold tracking-wider text-green-400 uppercase">Highest Score</span>
                        <div className="text-2xl font-black text-white mt-1">
                            {shiftStats.highest_score} <span className="text-xs text-gray-500 font-normal">/ 75</span>
                        </div>
                        <span className="text-[10px] text-gray-500">Peak performance</span>
                    </div>

                    <div className="bg-[#140b0b] border border-white/10 rounded-xl p-4 col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">Avg Time Taken</span>
                        <div className="text-2xl font-black text-white mt-1">
                            {formatTime(shiftStats.avg_time_sec)}
                        </div>
                        <span className="text-[10px] text-gray-500">Per candidate</span>
                    </div>
                </div>
            )}

            {/* Main Results Table Card */}
            <div className="bg-[#140b0b] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                {/* Filters header bar */}
                <div className="p-4 border-b border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                        <span className="material-symbols-outlined text-orange-400 text-[20px]">leaderboard</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                            Leaderboard & Submissions ({pagination.total})
                        </h3>
                    </div>

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
                            placeholder="Search Roll/Name..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="px-2.5 py-1.5 bg-[#180d0d] border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-4 font-bold text-center w-16">Rank</th>
                                <th className="py-3 px-4 font-bold">Candidate</th>
                                <th className="py-3 px-4 font-bold">Branch - Sec</th>
                                <th className="py-3 px-4 font-bold">Shift</th>
                                <th className="py-3 px-4 font-bold text-center">Score</th>
                                <th className="py-3 px-4 font-bold text-center">Percentage</th>
                                <th className="py-3 px-4 font-bold text-center">Grade</th>
                                <th className="py-3 px-4 font-bold text-center">Status</th>
                                <th className="py-3 px-4 font-bold text-center">Accuracy Breakdown</th>
                                <th className="py-3 px-4 font-bold text-center">Time Taken</th>
                                <th className="py-3 px-4 font-bold text-center">Cloud Sync</th>
                                <th className="py-3 px-4 font-bold text-right">Paper Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {results.map((r) => {
                                const rank = parseInt(r.rank, 10);
                                return (
                                    <tr key={r.id} className="hover:bg-white/[0.02] transition">
                                        {/* Rank Badge */}
                                        <td className="py-3 px-4 text-center">
                                            {rank === 1 ? (
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-400/30">
                                                    1
                                                </span>
                                            ) : rank === 2 ? (
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-black font-black text-xs">
                                                    2
                                                </span>
                                            ) : rank === 3 ? (
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs">
                                                    3
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-bold">{rank}</span>
                                            )}
                                        </td>

                                        {/* Candidate details */}
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-white text-sm">{r.candidate_name}</div>
                                            <div className="text-[11px] text-orange-400 font-mono">{r.roll_no}</div>
                                        </td>

                                        {/* Branch & Sec */}
                                        <td className="py-3 px-4 text-gray-300 font-medium">
                                            {r.branch} - {r.section}
                                        </td>

                                        {/* Shift */}
                                        <td className="py-3 px-4 text-gray-400">
                                            {r.shift_name}
                                        </td>

                                        {/* Score */}
                                        <td className="py-3 px-4 text-center">
                                            <div className="font-black text-white text-sm">
                                                {r.score} <span className="text-gray-500 text-xs font-normal">/ {r.total_marks ?? r.total_questions}</span>
                                            </div>
                                            <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mt-1 overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                                                    style={{ width: `${Math.min(100, Math.max(0, (r.score / Number(r.total_marks || r.total_questions || 1)) * 100))}%` }}
                                                />
                                            </div>
                                        </td>
                                        
                                        <td className="py-3 px-4 text-center font-mono font-bold text-gray-300">
                                            {r.percentage ? `${r.percentage}%` : '--'}
                                        </td>
                                        
                                        <td className="py-3 px-4 text-center font-black text-white text-lg">
                                            {r.grade || '-'}
                                        </td>
                                        
                                        <td className="py-3 px-4 text-center">
                                            {r.pass_fail ? (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                    r.pass_fail.toLowerCase() === 'pass' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {r.pass_fail}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>

                                        {/* Accuracy breakdown chips */}
                                        <td className="py-3 px-4 text-center">
                                            <div className="inline-flex items-center space-x-1">
                                                <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold text-[10px]" title="Correct Answers">
                                                    ✓ {r.correct_count}
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]" title="Wrong Answers">
                                                    ✗ {r.wrong_count}
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 font-medium text-[10px]" title="Skipped Questions">
                                                    - {r.skipped_count}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Time Taken */}
                                        <td className="py-3 px-4 text-center font-mono text-gray-300">
                                            {formatTime(r.time_taken_sec)}
                                        </td>

                                        {/* Cloud sync status */}
                                        <td className="py-3 px-4 text-center">
                                            {r.synced_to_cloud ? (
                                                <span className="material-symbols-outlined text-green-400 text-[18px]" title="Synced to Supabase">
                                                    cloud_done
                                                </span>
                                            ) : (
                                                <span className="material-symbols-outlined text-gray-500 text-[18px]" title="Local only - Not yet synced">
                                                    cloud_queue
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions: View paper */}
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => handleViewDetails(r.candidate_id)}
                                                className="px-3 py-1 bg-white/5 hover:bg-orange-600/20 hover:border-orange-500/30 border border-white/10 rounded-lg text-xs font-semibold text-gray-300 hover:text-orange-400 transition inline-flex items-center space-x-1"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">article</span>
                                                <span>View Paper</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {results.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="9" className="py-12 text-center text-gray-500">
                                        No exam results found for the active criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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

            {/* Candidate Question-by-Question Paper Modal */}
            {selectedCandidateId && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#140b0b] border border-white/15 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#180d0d]">
                            <div>
                                <div className="flex items-center space-x-3">
                                    <h3 className="text-base font-bold text-white">
                                        {candidateDetail?.candidate?.name || 'Candidate Answer Sheet'}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-md bg-orange-600/20 text-orange-400 font-mono text-xs font-bold">
                                        {candidateDetail?.candidate?.roll_no}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1 flex items-center space-x-3">
                                    <span>Branch: {candidateDetail?.candidate?.branch}-{candidateDetail?.candidate?.section}</span>
                                    <span>• Shift: {candidateDetail?.candidate?.shift_name}</span>
                                    <span>• Time: {formatTime(candidateDetail?.candidate?.time_taken_sec)}</span>
                                    <span>
                                        • Final Score: <strong className="text-white font-bold">{candidateDetail?.candidate?.score} / {candidateDetail?.candidate?.total_marks || candidateDetail?.candidate?.total_questions || '—'}</strong>
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedCandidateId(null);
                                    setCandidateDetail(null);
                                }}
                                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                            >
                                <span className="material-symbols-outlined text-[22px]">close</span>
                            </button>
                        </div>

                        {/* Modal Body: Question List */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {detailLoading ? (
                                <div className="py-12 text-center text-gray-400 flex flex-col items-center">
                                    <span className="material-symbols-outlined animate-spin text-3xl text-orange-500 mb-2">progress_activity</span>
                                    <p className="text-xs">Loading candidate response sheet...</p>
                                </div>
                            ) : candidateDetail?.breakdown?.length > 0 ? (
                                candidateDetail.breakdown.map((q, idx) => {
                                    const isAttempted = Boolean(q.selected_opt);
                                    const isCorrect = q.is_correct;

                                    return (
                                        <div
                                            key={q.question_id || idx}
                                            className={`p-4 rounded-xl border transition ${
                                                !isAttempted
                                                    ? 'bg-[#180d0d] border-white/10'
                                                    : isCorrect
                                                        ? 'bg-green-950/15 border-green-500/30'
                                                        : 'bg-red-950/15 border-red-500/30'
                                            }`}
                                        >
                                            {/* Question header info */}
                                            <div className="flex items-center justify-between text-xs mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-mono font-bold text-white text-sm">
                                                        Q{q.position}
                                                    </span>
                                                    <span className="text-gray-400">
                                                        {q.subject_name} • {q.topic_name}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                                        q.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                                        q.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {q.difficulty}
                                                    </span>
                                                </div>

                                                <div>
                                                    {!isAttempted ? (
                                                        <span className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 text-[10px] font-bold">
                                                            Skipped / Not Attempted
                                                        </span>
                                                    ) : isCorrect ? (
                                                        <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold">
                                                            ✓ Correct (+{q.marks ?? 1})
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                                                            ✗ Wrong ({Number(q.negative_marks || 0) > 0 ? `-${q.negative_marks}` : '0'})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Question Body with KaTeX */}
                                            <div className="text-sm text-gray-200 leading-relaxed mb-3">
                                                <KaTeXRenderer text={q.body} />
                                            </div>

                                            {/* Optional Image */}
                                            {q.image_url && (
                                                <div className="mb-3">
                                                    <img
                                                        src={q.image_url.startsWith('http') ? q.image_url : `${API_URL}${q.image_url}`}
                                                        alt="Question illustration"
                                                        className="max-h-48 rounded-lg border border-white/10"
                                                    />
                                                </div>
                                            )}

                                            {/* Options Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                {['A', 'B', 'C', 'D'].map((opt) => {
                                                    const optText = q[`option_${opt.toLowerCase()}`];
                                                    const isCandidateSelected = q.selected_opt === opt;
                                                    const isCorrectOption = q.correct_opt === opt;

                                                    let optionStyle = 'bg-[#120808] border-white/10 text-gray-300';
                                                    if (isCorrectOption) {
                                                        optionStyle = 'bg-green-500/15 border-green-500/50 text-green-300 font-semibold';
                                                    } else if (isCandidateSelected && !isCorrectOption) {
                                                        optionStyle = 'bg-red-500/15 border-red-500/50 text-red-300 font-semibold';
                                                    }

                                                    return (
                                                        <div
                                                            key={opt}
                                                            className={`p-2.5 rounded-lg border flex items-start space-x-2 ${optionStyle}`}
                                                        >
                                                            <span className="font-bold text-xs uppercase">{opt})</span>
                                                            <div className="flex-1">
                                                                <KaTeXRenderer text={optText || ''} />
                                                                {q[`opt_${opt.toLowerCase()}_image_url`] && (
                                                                    <div className="mt-2">
                                                                        <img
                                                                            src={q[`opt_${opt.toLowerCase()}_image_url`].startsWith('http') ? q[`opt_${opt.toLowerCase()}_image_url`] : `${API_URL}${q[`opt_${opt.toLowerCase()}_image_url`]}`}
                                                                            alt={`Option ${opt} image`}
                                                                            className="max-h-24 rounded border border-white/10 shadow-sm object-contain"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {isCandidateSelected && (
                                                                <span className="text-[10px] font-bold uppercase ml-1 px-1 rounded bg-white/10">
                                                                    Selected
                                                                </span>
                                                            )}
                                                            {isCorrectOption && (
                                                                <span className="material-symbols-outlined text-[16px] text-green-400">
                                                                    check
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Explanation */}
                                            {q.explanation && (
                                                <div className="mt-3 p-2.5 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-gray-400">
                                                    <strong className="text-gray-300">Explanation: </strong>
                                                    <KaTeXRenderer text={q.explanation} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-8 text-center text-gray-500 text-xs">
                                    No question responses found for this candidate.
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-white/10 bg-[#180d0d] flex justify-end">
                            <button
                                onClick={() => {
                                    setSelectedCandidateId(null);
                                    setCandidateDetail(null);
                                }}
                                className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
