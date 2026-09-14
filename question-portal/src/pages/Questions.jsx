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
    setMsg('Question deleted successfully.');
    loadData();
  }

  function truncate(str, n = 80) {
    if (!str) return '';
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Navbar */}
      <nav style={{
        background: '#1B313B',
        borderBottom: '1px solid rgba(42, 157, 143, 0.22)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #2A9D8F, #E76F51)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 18,
            color: '#fff',
            boxShadow: '0 4px 12px rgba(42, 157, 143, 0.3)',
          }}>
            G
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#F1F5F9', letterSpacing: '-0.01em' }}>
              Question Portal
            </span>
            <span style={{
              marginLeft: 10,
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(42, 157, 143, 0.15)',
              color: '#34B3A3',
              border: '1px solid rgba(42, 157, 143, 0.3)',
            }}>
              EXAM ADMIN
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/questions/new')}
            style={{ padding: '9px 18px', fontSize: 13 }}
          >
            + Add Question
          </button>
          <button
            className="btn btn-ghost"
            onClick={onLogout}
            style={{ padding: '9px 16px', fontSize: 13 }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 28 }}>
          {[
            { label: 'Total Questions', value: stats.total, color: '#2A9D8F', bgDim: 'rgba(42, 157, 143, 0.1)' },
            { label: 'Pending Sync', value: stats.pending, color: '#E9C46A', bgDim: 'rgba(233, 196, 106, 0.1)' },
            { label: 'Synced to Local', value: stats.synced, color: '#48cfbe', bgDim: 'rgba(72, 207, 190, 0.1)' },
          ].map(s => (
            <div
              key={s.label}
              className="card"
              style={{
                padding: '20px 24px',
                borderLeft: `4px solid ${s.color}`,
                background: '#1B313B',
              }}
            >
              <p style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#9CB6BF',
                marginBottom: 8,
              }}>
                {s.label}
              </p>
              <p style={{ fontSize: 32, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', margin: 0 }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 18 }}>
            <span>⚠</span>
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>✕</button>
          </div>
        )}
        {msg && (
          <div className="alert alert-success" style={{ marginBottom: 18 }}>
            <span>✓</span>
            <span style={{ flex: 1 }}>{msg}</span>
            <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 22,
          flexWrap: 'wrap',
          background: '#1B313B',
          padding: '16px',
          borderRadius: 12,
          border: '1px solid rgba(42, 157, 143, 0.22)',
        }}>
          <input
            type="text"
            placeholder="🔍 Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 220px', minWidth: 200, height: 42 }}
          />
          <select
            value={filterSubject}
            onChange={e => { setFilterSubject(e.target.value); setFilterTopic(''); }}
            style={{ width: 170, height: 42 }}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select
            value={filterTopic}
            onChange={e => setFilterTopic(e.target.value)}
            style={{ width: 190, height: 42 }}
            disabled={!filterSubject}
          >
            <option value="">All Topics</option>
            {filteredTopics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            style={{ width: 150, height: 42 }}
          >
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
          <select
            value={filterSynced}
            onChange={e => setFilterSynced(e.target.value)}
            style={{ width: 150, height: 42 }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending Sync</option>
            <option value="synced">Synced</option>
          </select>
          {(filterSubject || filterTopic || filterDifficulty || filterSynced || search) && (
            <button
              className="btn btn-ghost"
              onClick={() => { setFilterSubject(''); setFilterTopic(''); setFilterDifficulty(''); setFilterSynced(''); setSearch(''); }}
              style={{ height: 42, padding: '0 16px' }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Question</th>
                <th>Subject</th>
                <th>Topic</th>
                <th>Difficulty</th>
                <th>Image</th>
                <th>Sync Status</th>
                <th style={{ textAlign: 'right', paddingRight: 24 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '56px', color: '#9CB6BF' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 13, color: '#9CB6BF' }}>Loading questions from Supabase...</p>
                  </td>
                </tr>
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="icon">📝</div>
                      <h3>No questions found</h3>
                      <p style={{ fontSize: 13, marginTop: 6, color: '#9CB6BF' }}>
                        {questions.length === 0 ? 'Click "+ Add Question" to add your first MCQ.' : 'Try adjusting your filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredQuestions.map((q, i) => (
                <tr key={q.id}>
                  <td style={{ color: '#627D87', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ maxWidth: 360 }}>
                    <span style={{ color: '#F1F5F9', fontWeight: 500, lineHeight: 1.5 }}>
                      {truncate(q.body)}
                    </span>
                  </td>
                  <td style={{ color: '#9CB6BF', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {q.cloud_subjects?.name}
                  </td>
                  <td style={{ color: '#9CB6BF', fontSize: 12 }}>
                    {q.cloud_topics?.name}
                  </td>
                  <td>
                    <span className={`badge badge-${q.difficulty}`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td>
                    {q.image_url ? (
                      <a
                        href={q.image_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#2A9D8F',
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: 'none',
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: 'rgba(42, 157, 143, 0.15)',
                        }}
                      >
                        View ↗
                      </a>
                    ) : (
                      <span style={{ color: '#627D87', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${q.synced_to_local ? 'badge-synced' : 'badge-pending'}`}>
                      {q.synced_to_local ? '✓ Synced' : '⏳ Pending'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: 24 }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/questions/${q.id}/edit`)}
                        style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700 }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(q.id)}
                        style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700 }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ color: '#627D87', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
          Showing {filteredQuestions.length} of {questions.length} questions
        </p>
      </div>
    </div>
  );
}
