import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import katex from 'katex';
import ImageEditorModal from '../components/ImageEditorModal';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function KaTeXPreview({ text, placeholder = 'Preview will appear here...' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (!text) {
      ref.current.innerHTML = `<span style="color:#627D87;font-style:italic">${placeholder}</span>`;
      return;
    }
    try {
      // Replace $$...$$ block and $...$ inline LaTeX
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

  const optionColors = {
    A: '#2A9D8F',
    B: '#E76F51',
    C: '#E9C46A',
    D: '#34B3A3',
  };

  return (
    <div style={{
      marginBottom: 16,
      background: 'rgba(18, 32, 39, 0.65)',
      padding: '16px',
      borderRadius: '10px',
      border: `1px solid ${isCorrect ? 'rgba(42, 157, 143, 0.5)' : 'rgba(42, 157, 143, 0.18)'}`,
      boxShadow: isCorrect ? '0 0 16px rgba(42, 157, 143, 0.15)' : 'none',
      transition: 'all 0.2s',
    }}>
      {/* Option Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: optionColors[label] || '#2A9D8F',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 13,
          }}>
            {label}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>
            Option {label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mark Correct Toggle Button */}
          <button
            type="button"
            onClick={onMarkCorrect}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: isCorrect ? '1.5px solid #2A9D8F' : '1px solid rgba(42, 157, 143, 0.25)',
              background: isCorrect ? 'rgba(42, 157, 143, 0.22)' : 'rgba(38, 70, 83, 0.35)',
              color: isCorrect ? '#48cfbe' : '#9CB6BF',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="radio"
              name="correct_opt"
              value={label.toLowerCase()}
              checked={isCorrect}
              onChange={onMarkCorrect}
              style={{ width: 'auto', margin: 0, cursor: 'pointer', accentColor: '#2A9D8F' }}
            />
            {isCorrect ? '✓ Correct Answer' : 'Mark as Correct'}
          </button>

          {/* Preview Toggle Button */}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, height: 32 }}
            onClick={() => setShowPreview(v => !v)}
          >
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Input Field */}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={`Enter text for Option ${label} (supports LaTeX like $x^2$ or $\\frac{a}{b}$)`}
        style={{ height: 44, fontSize: 13 }}
      />

      {showPreview && (
        <div style={{ marginTop: 8 }}>
          <KaTeXPreview text={value} placeholder={`Option ${label} math preview`} />
        </div>
      )}

      {/* Image Upload Area for Option */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        {imageUrl ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={imageUrl}
              alt={`Option ${label}`}
              style={{ height: 48, borderRadius: 6, border: '1px solid rgba(42, 157, 143, 0.4)', objectFit: 'cover' }}
            />
            <button
              type="button"
              onClick={onImageRemove}
              title="Remove image"
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                background: '#E76F51',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 20,
                height: 20,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            background: 'rgba(42, 157, 143, 0.12)',
            border: '1px dashed rgba(42, 157, 143, 0.35)',
            color: '#34B3A3',
            transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: 15 }}>🖼️</span> Add Option Image
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files[0]) onImageUpload(e.target.files[0]);
              }}
            />
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

  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState('');
  const [editorImageType, setEditorImageType] = useState('');

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

  function openEditor(file, type) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditorImageSrc(reader.result);
      setEditorImageType(type);
      setEditorModalOpen(true);
    };
    reader.readAsDataURL(file);
  }

  function handleFileDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      openEditor(file, 'main');
    }
  }

  function handleSaveCrop(croppedFile) {
    setEditorModalOpen(false);
    if (!croppedFile) return;

    if (editorImageType === 'main') {
      setImageFile(croppedFile);
      setImagePreview(URL.createObjectURL(croppedFile));
    }
    handleImageUpload(croppedFile, editorImageType);
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

  const diffColors = {
    easy: { color: '#2A9D8F', activeBg: 'rgba(42, 157, 143, 0.2)', border: '#2A9D8F' },
    medium: { color: '#E9C46A', activeBg: 'rgba(233, 196, 106, 0.2)', border: '#E9C46A' },
    hard: { color: '#E76F51', activeBg: 'rgba(231, 111, 81, 0.2)', border: '#E76F51' },
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {editorModalOpen && (
        <ImageEditorModal
          imageSrc={editorImageSrc}
          onClose={() => setEditorModalOpen(false)}
          onSave={handleSaveCrop}
        />
      )}

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
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/')}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700 }}
          >
            ← Back to Questions
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(42, 157, 143, 0.3)' }} />
          <span style={{ fontWeight: 800, fontSize: 16, color: '#F1F5F9', letterSpacing: '-0.01em' }}>
            {isEdit ? 'Edit MCQ Question' : 'Add New MCQ Question'}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onLogout}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          Logout
        </button>
      </nav>

      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '32px 24px' }}>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 24 }}>
            <span>⚠</span>
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={() => setError('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Metadata Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 18,
            marginBottom: 24,
            background: '#1B313B',
            padding: '20px',
            borderRadius: 14,
            border: '1px solid rgba(42, 157, 143, 0.22)',
          }}>
            {/* Subject */}
            <div>
              <label className="field-label">Subject *</label>
              <select
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                required
                style={{ height: 44 }}
              >
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="field-label">Topic *</label>
              <select
                value={topicId}
                onChange={e => setTopicId(e.target.value)}
                required
                disabled={!subjectId}
                style={{ height: 44 }}
              >
                <option value="">Select topic...</option>
                {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="field-label">Difficulty *</label>
              <div style={{ display: 'flex', gap: 8, height: 44 }}>
                {DIFFICULTIES.map(d => {
                  const active = difficulty === d;
                  const cfg = diffColors[d];
                  return (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setDifficulty(d)}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        border: `1.5px solid ${active ? cfg.border : 'rgba(42, 157, 143, 0.25)'}`,
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: 'capitalize',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        background: active ? cfg.activeBg : 'rgba(18, 32, 39, 0.6)',
                        color: active ? cfg.color : '#9CB6BF',
                        boxShadow: active ? `0 2px 10px ${cfg.activeBg}` : 'none',
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Question Body Card */}
          <div className="card" style={{ marginBottom: 24, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <label className="field-label" style={{ margin: 0, fontSize: 13 }}>
                  Question Body *
                </label>
                <p style={{ color: '#9CB6BF', fontSize: 12, margin: '2px 0 0' }}>
                  Write clearly. Use <code style={{ color: '#E9C46A', background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 4 }}>$formula$</code> for inline and <code style={{ color: '#E9C46A', background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 4 }}>$$formula$$</code> for block LaTeX.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700 }}
                onClick={() => setShowBodyPreview(v => !v)}
              >
                {showBodyPreview ? '👁️ Hide Preview' : '👁️ Show Preview'}
              </button>
            </div>

            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type the question statement here..."
              style={{ minHeight: 120, fontSize: 14, lineHeight: 1.6 }}
              required
            />

            {showBodyPreview && body && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 11, color: '#9CB6BF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Live LaTeX Preview
                </p>
                <KaTeXPreview text={body} />
              </div>
            )}
          </div>

          {/* Answer Options Card */}
          <div className="card" style={{ marginBottom: 24, padding: '24px' }}>
            <div style={{ marginBottom: 16 }}>
              <label className="field-label" style={{ margin: 0, fontSize: 13 }}>
                Answer Options *
              </label>
              <p style={{ color: '#9CB6BF', fontSize: 12, margin: '2px 0 0' }}>
                Fill in all 4 choices and click the button to mark the correct option.
              </p>
            </div>

            <OptionField
              label="A"
              value={optA}
              onChange={setOptA}
              isCorrect={correctOpt === 'a'}
              onMarkCorrect={() => setCorrectOpt('a')}
              imageUrl={optAImageUrl}
              onImageUpload={f => openEditor(f, 'optA')}
              onImageRemove={() => setOptAImageUrl('')}
            />
            <OptionField
              label="B"
              value={optB}
              onChange={setOptB}
              isCorrect={correctOpt === 'b'}
              onMarkCorrect={() => setCorrectOpt('b')}
              imageUrl={optBImageUrl}
              onImageUpload={f => openEditor(f, 'optB')}
              onImageRemove={() => setOptBImageUrl('')}
            />
            <OptionField
              label="C"
              value={optC}
              onChange={setOptC}
              isCorrect={correctOpt === 'c'}
              onMarkCorrect={() => setCorrectOpt('c')}
              imageUrl={optCImageUrl}
              onImageUpload={f => openEditor(f, 'optC')}
              onImageRemove={() => setOptCImageUrl('')}
            />
            <OptionField
              label="D"
              value={optD}
              onChange={setOptD}
              isCorrect={correctOpt === 'd'}
              onMarkCorrect={() => setCorrectOpt('d')}
              imageUrl={optDImageUrl}
              onImageUpload={f => openEditor(f, 'optD')}
              onImageRemove={() => setOptDImageUrl('')}
            />
          </div>

          {/* Explanation + Question Image */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
            {/* Explanation */}
            <div className="card" style={{ padding: '22px' }}>
              <label className="field-label" style={{ fontSize: 13 }}>
                Explanation
              </label>
              <p style={{ color: '#9CB6BF', fontSize: 12, marginBottom: 10 }}>
                Optional explanation shown after the exam. Supports LaTeX.
              </p>
              <textarea
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                placeholder="Explain why the marked answer is correct..."
                style={{ minHeight: 110 }}
              />
            </div>

            {/* Main Question Image */}
            <div className="card" style={{ padding: '22px' }}>
              <label className="field-label" style={{ fontSize: 13, marginBottom: 4 }}>
                Question Diagram / Image
              </label>
              <p style={{ color: '#9CB6BF', fontSize: 12, marginBottom: 12 }}>
                Optional diagram or figure displayed with the question body.
              </p>
              <div
                className={`image-drop ${dragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('img-input').click()}
                style={{ minHeight: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              >
                {uploading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <div className="spinner" style={{ width: 18, height: 18 }} />
                    <span style={{ fontWeight: 600, color: '#34B3A3' }}>Uploading image to storage...</span>
                  </div>
                ) : imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" style={{ maxHeight: 120, objectFit: 'contain' }} />
                    <p style={{ fontSize: 12, marginTop: 8, color: '#2A9D8F', fontWeight: 600 }}>Click to replace diagram</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>🖼️</div>
                    <p style={{ fontWeight: 600, color: '#F1F5F9', margin: 0 }}>Drag & drop or click to upload</p>
                    <p style={{ fontSize: 11, color: '#9CB6BF', marginTop: 4 }}>Supports PNG, JPG, WEBP, SVG</p>
                  </>
                )}
                <input id="img-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileDrop} />
              </div>
              {imageUrl && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  style={{ marginTop: 10, width: '100%', fontWeight: 700 }}
                  onClick={() => { setImageUrl(''); setImagePreview(''); }}
                >
                  ✕ Remove Diagram
                </button>
              )}
            </div>
          </div>

          {/* Action Bar / Submit Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 14,
            padding: '20px 24px',
            background: '#1B313B',
            borderRadius: 14,
            border: '1px solid rgba(42, 157, 143, 0.22)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.28)',
          }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/')}
              style={{ minWidth: 120, height: 46, fontSize: 14, fontWeight: 700 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || uploading}
              style={{ minWidth: 190, height: 46, fontSize: 14, fontWeight: 800 }}
            >
              {saving ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />
                  Saving Question...
                </>
              ) : isEdit ? (
                '✓ Update Question'
              ) : (
                '✓ Save & Add Question'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
