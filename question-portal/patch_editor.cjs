const fs = require('fs');
const file = '/home/aditya2003/gp-ultimate-quiz-platform/question-portal/src/pages/QuestionEditor.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update OptionField
content = content.replace(
  `function OptionField({ label, value, onChange, isCorrect, onMarkCorrect }) {`,
  `function OptionField({ label, value, onChange, isCorrect, onMarkCorrect, imageUrl, onImageUpload, onImageRemove }) {`
);

content = content.replace(
  `{showPreview && <div style={{ marginTop: 5 }}><KaTeXPreview text={value} placeholder={\`Option \${label} preview\`} /></div>}
    </div>
  );
}`,
  `{showPreview && <div style={{ marginTop: 5 }}><KaTeXPreview text={value} placeholder={\`Option \${label} preview\`} /></div>}
      
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        {imageUrl ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={imageUrl} alt={\`Option \${label}\`} style={{ height: 40, borderRadius: 4, border: '1px solid #334155' }} />
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
}`
);

// 2. Add state
content = content.replace(
  `  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');`,
  `  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [optAImageUrl, setOptAImageUrl] = useState('');
  const [optBImageUrl, setOptBImageUrl] = useState('');
  const [optCImageUrl, setOptCImageUrl] = useState('');
  const [optDImageUrl, setOptDImageUrl] = useState('');`
);

// 3. Update useEffect
content = content.replace(
  `      setImageUrl(data.image_url || '');
      if (data.image_url) setImagePreview(data.image_url);
    });`,
  `      setImageUrl(data.image_url || '');
      if (data.image_url) setImagePreview(data.image_url);
      setOptAImageUrl(data.opt_a_image_url || '');
      setOptBImageUrl(data.opt_b_image_url || '');
      setOptCImageUrl(data.opt_c_image_url || '');
      setOptDImageUrl(data.opt_d_image_url || '');
    });`
);

// 4. Update handleImageUpload
content = content.replace(
  `  async function handleImageUpload(file) {
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = \`questions/\${Date.now()}.\${ext}\`;
    setUploading(true);
    setError('');
    try {
      const { error: upErr } = await supabase.storage.from('question-images').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('question-images').getPublicUrl(path);
      setImageUrl(data.publicUrl);
      setImagePreview(data.publicUrl);
    } catch (err) {
      setError('Image upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }`,
  `  async function handleImageUpload(file, type = 'main') {
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = \`questions/\${type}_\${Date.now()}.\${ext}\`;
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
  }`
);

// 5. Update handleFileDrop
content = content.replace(
  `      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      handleImageUpload(file);`,
  `      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      handleImageUpload(file, 'main');`
);

// 6. Update handleSave payload
content = content.replace(
  `      explanation: explanation.trim() || null,
      image_url: imageUrl || null,
      synced_to_local: false,`,
  `      explanation: explanation.trim() || null,
      image_url: imageUrl || null,
      opt_a_image_url: optAImageUrl || null,
      opt_b_image_url: optBImageUrl || null,
      opt_c_image_url: optCImageUrl || null,
      opt_d_image_url: optDImageUrl || null,
      synced_to_local: false,`
);

// 7. Update OptionField rendering
content = content.replace(
  `            <OptionField label="A" value={optA} onChange={setOptA} isCorrect={correctOpt === 'a'} onMarkCorrect={() => setCorrectOpt('a')} />
            <OptionField label="B" value={optB} onChange={setOptB} isCorrect={correctOpt === 'b'} onMarkCorrect={() => setCorrectOpt('b')} />
            <OptionField label="C" value={optC} onChange={setOptC} isCorrect={correctOpt === 'c'} onMarkCorrect={() => setCorrectOpt('c')} />
            <OptionField label="D" value={optD} onChange={setOptD} isCorrect={correctOpt === 'd'} onMarkCorrect={() => setCorrectOpt('d')} />`,
  `            <OptionField label="A" value={optA} onChange={setOptA} isCorrect={correctOpt === 'a'} onMarkCorrect={() => setCorrectOpt('a')} imageUrl={optAImageUrl} onImageUpload={f => handleImageUpload(f, 'optA')} onImageRemove={() => setOptAImageUrl('')} />
            <OptionField label="B" value={optB} onChange={setOptB} isCorrect={correctOpt === 'b'} onMarkCorrect={() => setCorrectOpt('b')} imageUrl={optBImageUrl} onImageUpload={f => handleImageUpload(f, 'optB')} onImageRemove={() => setOptBImageUrl('')} />
            <OptionField label="C" value={optC} onChange={setOptC} isCorrect={correctOpt === 'c'} onMarkCorrect={() => setCorrectOpt('c')} imageUrl={optCImageUrl} onImageUpload={f => handleImageUpload(f, 'optC')} onImageRemove={() => setOptCImageUrl('')} />
            <OptionField label="D" value={optD} onChange={setOptD} isCorrect={correctOpt === 'd'} onMarkCorrect={() => setCorrectOpt('d')} imageUrl={optDImageUrl} onImageUpload={f => handleImageUpload(f, 'optD')} onImageRemove={() => setOptDImageUrl('')} />`
);

fs.writeFileSync(file, content);
console.log('QuestionEditor updated');
