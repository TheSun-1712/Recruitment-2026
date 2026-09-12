import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import katex from 'katex';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function KaTeXPreview({ text, placeholder = 'Preview will appear here...' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (!text) { ref.current.innerHTML = `<span style="color:#334155;font-style:italic">${placeholder}</span>`; return; }
    try {
      // Replace $...$ inline and $$...$$ block LaTeX
      let html = text
        .replace(/\$\$(.+?)\$\$/gs, (_, m) => katex.renderToString(m, { displayMode: true, throwOnError: false }))
        .replace(/\$(.+?)\$/g, (_, m) => katex.renderToString(m, { displayMode: false, throwOnError: false }));
      ref.current.innerHTML = html;
    } catch {
      ref.current.textContent = text;
    }
  }, [text, placeholder]);
  return <div ref={ref} className="katex-preview" />;
}

function OptionField({ label, value, onChange, isCorrect, onMarkCorrect, imageUrl, onImageUpload, onImageRemove }) {
  const [showPreview, setShowPreview] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <label className="field-label" style={{ margin: 0, flex: 1 }}>Option {label}</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
          <input type="radio" name="correct_opt" value={label.toLowerCase()} checked={isCorrect} onChange={onMarkCorrect} style={{ width: 'auto', accentColor: '#f97316' }} />
          <span style={{ color: isCorrect ? '#86efac' : '#475569', fontWeight: isCorrect ? 700 : 400 }}>
            {isCorrect ? '✓ Correct' : 'Mark correct'}
          </span>
        </label>
        <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setShowPreview(v => !v)}>
          {showPreview ? 'Hide Preview' : 'Preview'}
        </button>
      </div>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={`Option ${label} (supports $LaTeX$)`} />
      {showPreview && <div style={{ marginTop: 5 }}><KaTeXPreview text={value} placeholder={`Option ${label} preview`} /></div>}
      
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        {imageUrl ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={imageUrl} alt={`Option ${label}`} style={{ height: 40, borderRadius: 4, border: '1px solid #334155' }} />
            <button type="button" onClick={onImageRemove} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        ) : (
          <label style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <span style={{ fontSize: 16 }}>🖼️</span> Add Image
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
              if (e.target.files[0]) onImageUpload(e.target.files[0]);
            }} />
          </label>
        )}
      </div>
    </div>
  );
}

export default function QuestionEditor({ onLogout }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);

  // Form state
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [body, setBody] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOpt, setCorrectOpt] = useState('a');
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [optAImageUrl, setOptAImageUrl] = useState('');
  const [optBImageUrl, setOptBImageUrl] = useState('');
  const [optCImageUrl, setOptCImageUrl] = useState('');
  const [optDImageUrl, setOptDImageUrl] = useState('');

  const [showBodyPreview, setShowBodyPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    supabase.from('cloud_subjects').select('*').order('name').then(({ data }) => setSubjects(data || []));
    supabase.from('cloud_topics').select('*').order('name').then(({ data }) => setTopics(data || []));
  }, []);

  useEffect(() => {
    if (subjectId) {
      setFilteredTopics(topics.filter(t => t.subject_id === parseInt(subjectId)));
      setTopicId('');
    } else {
      setFilteredTopics([]);
    }
  }, [subjectId, topics]);

  useEffect(() => {
    if (!isEdit) return;
    supabase.from('cloud_questions').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) return;
      setSubjectId(String(data.subject_id));
      setTopicId(String(data.topic_id));
      setDifficulty(data.difficulty);
      setBody(data.body);
      setOptA(data.option_a);
      setOptB(data.option_b);
      setOptC(data.option_c);
      setOptD(data.option_d);
      setCorrectOpt(data.correct_opt);
      setExplanation(data.explanation || '');
      setImageUrl(data.image_url || '');
      if (data.image_url) setImagePreview(data.image_url);
      setOptAImageUrl(data.opt_a_image_url || '');
      setOptBImageUrl(data.opt_b_image_url || '');
      setOptCImageUrl(data.opt_c_image_url || '');
      setOptDImageUrl(data.opt_d_image_url || '');
    });
  }, [id, isEdit]);

  async function handleImageUpload(file, type = 'main') {
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `questions/${type}_${Date.now()}.${ext}`;
    setUploading(true);
    setError('');
    try {
      const { error: upErr } = await supabase.storage.from('question-images').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('question-images').getPublicUrl(path);
      if (type === 'main') {
        setImageUrl(data.publicUrl);
        setImagePreview(data.publicUrl);
      } else if (type === 'optA') setOptAImageUrl(data.publicUrl);
      else if (type === 'optB') setOptBImageUrl(data.publicUrl);
      else if (type === 'optC') setOptCImageUrl(data.publicUrl);
      else if (type === 'optD') setOptDImageUrl(data.publicUrl);
    } catch (err) {
      setError('Image upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleFileDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      handleImageUpload(file, 'main');
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!subjectId) { setError('Please select a subject.'); return; }
    if (!topicId) { setError('Please select a topic.'); return; }
    if (!body.trim()) { setError('Question body is required.'); return; }
    if (!optA || !optB || !optC || !optD) { setError('All 4 options are required.'); return; }

    setSaving(true);
    setError('');

    const payload = {
      subject_id: parseInt(subjectId),
      topic_id: parseInt(topicId),
      difficulty,
      body: body.trim(),
      option_a: optA.trim(),
      option_b: optB.trim(),
      option_c: optC.trim(),
      option_d: optD.trim(),
      correct_opt: correctOpt,
      explanation: explanation.trim() || null,
      image_url: imageUrl || null,
      opt_a_image_url: optAImageUrl || null,
      opt_b_image_url: optBImageUrl || null,
      opt_c_image_url: optCImageUrl || null,
      opt_d_image_url: optDImageUrl || null,
      synced_to_local: false,
    };

    try {
      let err;
      if (isEdit) {
        ({ error: err } = await supabase.from('cloud_questions').update(payload).eq('id', id));
      } else {
        ({ error: err } = await supabase.from('cloud_questions').insert(payload));
      }
      if (err) throw err;
      navigate('/');
    } catch (err) {
      setError('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const diffColors = { easy: '#22c55e', medium: '#eab308', hard: '#ef4444' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0606' }}>
      {/* Navbar */}
      <nav style={{
        background: '#110909', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Back</button>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
            {isEdit ? 'Edit Question' : 'Add New Question'}
          </span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px' }}>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <span>⚠</span> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>✕</button>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Subject */}
            <div>
              <label className="field-label">Subject *</label>
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required>
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {/* Topic */}
            <div>
              <label className="field-label">Topic *</label>
              <select value={topicId} onChange={e => setTopicId(e.target.value)} required disabled={!subjectId}>
                <option value="">Select topic...</option>
                {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {/* Difficulty */}
            <div>
              <label className="field-label">Difficulty *</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                {DIFFICULTIES.map(d => (
                  <button
                    type="button" key={d}
                    onClick={() => setDifficulty(d)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid',
                      cursor: 'pointer', fontWeight: 700, fontSize: 12, textTransform: 'capitalize',
                      transition: 'all 0.15s',
                      background: difficulty === d ? `rgba(${d === 'easy' ? '34,197,94' : d === 'medium' ? '234,179,8' : '239,68,68'},0.2)` : 'rgba(0,0,0,0.3)',
                      borderColor: difficulty === d ? diffColors[d] : 'rgba(255,255,255,0.08)',
                      color: difficulty === d ? diffColors[d] : '#475569',
                    }}
                  >{d}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Question Body */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label className="field-label" style={{ margin: 0 }}>Question Body * <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(supports $LaTeX$)</span></label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowBodyPreview(v => !v)}>
                {showBodyPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Type the question here. Use $...$ for inline LaTeX and $$...$$ for block LaTeX." style={{ minHeight: 100 }} required />
            {showBodyPreview && body && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Live Preview</p>
                <KaTeXPreview text={body} />
              </div>
            )}
          </div>

          {/* Options */}
          <div className="card" style={{ marginBottom: 20 }}>
            <label className="field-label" style={{ marginBottom: 14 }}>Answer Options * <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— select the correct answer</span></label>
            <OptionField label="A" value={optA} onChange={setOptA} isCorrect={correctOpt === 'a'} onMarkCorrect={() => setCorrectOpt('a')} imageUrl={optAImageUrl} onImageUpload={f => handleImageUpload(f, 'optA')} onImageRemove={() => setOptAImageUrl('')} />
            <OptionField label="B" value={optB} onChange={setOptB} isCorrect={correctOpt === 'b'} onMarkCorrect={() => setCorrectOpt('b')} imageUrl={optBImageUrl} onImageUpload={f => handleImageUpload(f, 'optB')} onImageRemove={() => setOptBImageUrl('')} />
            <OptionField label="C" value={optC} onChange={setOptC} isCorrect={correctOpt === 'c'} onMarkCorrect={() => setCorrectOpt('c')} imageUrl={optCImageUrl} onImageUpload={f => handleImageUpload(f, 'optC')} onImageRemove={() => setOptCImageUrl('')} />
            <OptionField label="D" value={optD} onChange={setOptD} isCorrect={correctOpt === 'd'} onMarkCorrect={() => setCorrectOpt('d')} imageUrl={optDImageUrl} onImageUpload={f => handleImageUpload(f, 'optD')} onImageRemove={() => setOptDImageUrl('')} />
          </div>

          {/* Explanation + Image */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card">
              <label className="field-label">Explanation <span style={{ color: '#334155', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional, shown after submit)</span></label>
              <textarea value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Explain the correct answer... (supports $LaTeX$)" style={{ minHeight: 100 }} />
            </div>

            <div className="card">
              <label className="field-label" style={{ marginBottom: 10 }}>Question Image <span style={{ color: '#334155', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <div
                className={`image-drop ${dragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('img-input').click()}
              >
                {uploading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <div className="spinner" style={{ width: 16, height: 16 }} /> Uploading...
                  </div>
                ) : imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" />
                    <p style={{ fontSize: 12, marginTop: 8, color: '#64748b' }}>Click to replace</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                    <p>Drag & drop or click to upload</p>
                    <p style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>PNG, JPG, GIF, SVG</p>
                  </>
                )}
                <input id="img-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileDrop} />
              </div>
              {imageUrl && (
                <button type="button" className="btn btn-danger btn-sm" style={{ marginTop: 8 }} onClick={() => { setImageUrl(''); setImagePreview(''); }}>
                  Remove Image
                </button>
              )}
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : isEdit ? '✓ Update Question' : '✓ Add Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
