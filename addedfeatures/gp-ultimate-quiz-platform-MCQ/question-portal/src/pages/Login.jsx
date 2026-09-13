import React, { useState } from 'react';

const PASSWORD = import.meta.env.VITE_PORTAL_PASSWORD || 'gprime_admin_2026';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (password === PASSWORD) {
        onLogin();
      } else {
        setError('Incorrect password. Please try again.');
        setLoading(false);
      }
    }, 400);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.12) 0%, #0a0606 60%)',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.4s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, #f97316, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(249,115,22,0.35)',
          }}>G</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
            Question Upload Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
            G-Prime MCQ Exam Platform
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: '#f1f5f9' }}>
            Admin Access
          </h2>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="field-label">Portal Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <><div className="spinner" style={{width:14,height:14}} /> Verifying...</> : '→ Access Portal'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: 12, marginTop: 20 }}>
          G-Prime · Question Management Portal
        </p>
      </div>
    </div>
  );
}
