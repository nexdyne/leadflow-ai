// Placeholder page. Original VerifyEmailPage.jsx was null-byte corrupted
// during the 2026-04-18 restore and needs to be reconstructed.
import { useState, useEffect } from 'react';
import { apiCall } from '../../api/apiConfig.js';

export default function VerifyEmailPage({ token, onBackToLogin }) {
  const [status, setStatus] = useState({ type: 'loading', msg: 'Verifying your email…' });

  useEffect(() => {
    if (!token) {
      setStatus({ type: 'err', msg: 'No verification token provided.' });
      return;
    }
    (async () => {
      try {
        await apiCall('POST', '/auth/verify-email', { token });
        setStatus({ type: 'ok', msg: 'Email verified! You can now log in.' });
      } catch (err) {
        setStatus({ type: 'err', msg: err.message || 'Verification failed' });
      }
    })();
  }, [token]);

  const colors = {
    loading: { bg: '#e0f2fe', fg: '#075985' },
    ok: { bg: '#d1fae5', fg: '#065f46' },
    err: { bg: '#fee2e2', fg: '#991b1b' },
  }[status.type];

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
      <h2 style={{ margin: 0, marginBottom: 16 }}>Verify your email</h2>
      <div style={{ padding: 14, borderRadius: 8, background: colors.bg, color: colors.fg, fontSize: 14 }}>
        {status.msg}
      </div>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button onClick={onBackToLogin} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}>
          Go to login
        </button>
      </div>
    </div>
  );
}
