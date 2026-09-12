import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SUBJECTS = ['Mathematics', 'English', 'C Programming', 'Aptitude'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function Questions({ onLogout }) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterSynced, setFilterSynced] = useState('');
  const [search, setSearch] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, synced: 0, pending: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, sRes, tRes] = await Promise.all([
        supabase.from('cloud_questions').select('*, cloud_subjects(name), cloud_topics(name)').order('created_at', { ascending: false }),
        supabase.from('cloud_subjects').select('*').order('name'),
        supabase.from('cloud_topics').select('*').order('name'),
      ]);
      if (qRes.error) throw qRes.error;
      setQuestions(qRes.data || []);
      setSubjects(sRes.data || []);
      setTopics(tRes.data || []);

      const total = qRes.data?.length || 0;
      const synced = qRes.data?.filter(q => q.synced_to_local).length || 0;
      setStats({ total, synced, pending: total - synced });
    } catch (err) {
      setError('Failed to load questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredTopics = topics.filter(t => {
    if (!filterSubject) return true;
    const sub = subjects.find(s => s.name === filterSubject);
    return sub && t.subject_id === sub.id;
  });

  const filteredQuestions = questions.filter(q => {
    if (filterSubject && q.cloud_subjects?.name !== filterSubject) return false;
    if (filterTopic && q.cloud_topics?.name !== filterTopic) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    if (filterSynced === 'synced' && !q.synced_to_local) return false;
    if (filterSynced === 'pending' && q.synced_to_local) return false;
    if (search && !q.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleDelete(id) {
    if (!confirm('Delete this question permanently?')) return;
    const { error } = await supabase.from('cloud_questions').delete().eq('id', id);
    if (error) { setError('Delete failed: ' + error.message); return; }
    setMsg('Question deleted.');
    loadData();
  }

  function truncate(str, n = 80) {
    if (!str) return '';
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0606' }}>
      {/* Navbar */}
      <nav style={{
        background: '#110909', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 58,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#f97316,#dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 16, color: '#fff',
          }}>G</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
            Question Portal
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/questions/new')}>
            + Add Question
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Questions', value: stats.total, color: '#f97316' },
            { label: 'Pending Sync', value: stats.pending, color: '#eab308' },
            { label: 'Synced to Local', value: stats.synced, color: '#22c55e' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '18px 22px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 8 }}>{s.label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><span>⚠</span>{error}<button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button></div>}
        {msg && <div className="alert alert-success" style={{ marginBottom: 16 }}><span>✓</span>{msg}<button onClick={() => setMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button></div>}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            type="text" placeholder="🔍 Search questions..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 200px', minWidth: 180 }}
          />
          <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setFilterTopic(''); }} style={{ width: 160 }}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} style={{ width: 180 }} disabled={!filterSubject}>
            <option value="">All Topics</option>
            {filteredTopics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} style={{ width: 140 }}>
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
          <select value={filterSynced} onChange={e => setFilterSynced(e.target.value)} style={{ width: 140 }}>
            <option value="">All Status</option>
            <option value="pending">Pending Sync</option>
            <option value="synced">Synced</option>
          </select>
          {(filterSubject || filterTopic || filterDifficulty || filterSynced || search) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterSubject(''); setFilterTopic(''); setFilterDifficulty(''); setFilterSynced(''); setSearch(''); }}>
              Clear Filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Subject</th>
                <th>Topic</th>
                <th>Difficulty</th>
                <th>Image</th>
                <th>Sync Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : filteredQuestions.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <div className="icon">📝</div>
                    <h3>No questions found</h3>
                    <p style={{ fontSize: 13, marginTop: 6 }}>
                      {questions.length === 0 ? 'Click "Add Question" to add your first MCQ.' : 'Try adjusting your filters.'}
                    </p>
                  </div>
                </td></tr>
              ) : filteredQuestions.map((q, i) => (
                <tr key={q.id}>
                  <td style={{ color: '#475569', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ maxWidth: 320 }}>
                    <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{truncate(q.body)}</span>
                  </td>
                  <td style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>{q.cloud_subjects?.name}</td>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>{q.cloud_topics?.name}</td>
                  <td><span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span></td>
                  <td>
                    {q.image_url
                      ? <a href={q.image_url} target="_blank" rel="noreferrer" style={{ color: '#f97316', fontSize: 12 }}>View</a>
                      : <span style={{ color: '#334155', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <span className={`badge ${q.synced_to_local ? 'badge-synced' : 'badge-pending'}`}>
                      {q.synced_to_local ? '✓ Synced' : '⏳ Pending'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/questions/${q.id}/edit`)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(q.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ color: '#334155', fontSize: 12, marginTop: 14, textAlign: 'center' }}>
          {filteredQuestions.length} of {questions.length} questions shown
        </p>
      </div>
    </div>
  );
}
