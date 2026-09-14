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
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(42,157,143,0.18) 0%, #122027 65%)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn 0.35s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #2A9D8F, #E76F51)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 900,
            color: '#fff',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(42,157,143,0.35)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            G
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
            Question Upload Portal
          </h1>
          <p style={{ color: '#9CB6BF', fontSize: 13, marginTop: 6 }}>
            AAC Recruitment 2026 Examination System
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          border: '1px solid rgba(42,157,143,0.25)',
          padding: '28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>
              Admin Authentication
            </h2>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 6,
              background: 'rgba(42,157,143,0.15)',
              color: '#48cfbe',
              border: '1px solid rgba(42,157,143,0.3)',
            }}>
              SECURE
            </span>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 18 }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 22 }}>
              <label className="field-label">Portal Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoFocus
                style={{ height: 46, fontSize: 14 }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: 46, fontSize: 14, fontWeight: 700 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />
                  Verifying Credentials...
                </>
              ) : (
                '→ Access Portal'
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#627D87', fontSize: 12, marginTop: 24 }}>
          AAC Recruitment 2026 · Question Management Platform
        </p>
      </div>
    </div>
  );
}
