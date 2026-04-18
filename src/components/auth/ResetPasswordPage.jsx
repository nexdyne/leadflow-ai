// Placeholder page. Original ResetPasswordPage.jsx was null-byte corrupted
// during the 2026-04-18 restore and needs to be reconstructed.
import { useState } from 'react';
import { apiCall } from '../../api/apiConfig.js';

export default function ResetPasswordPage({ token, onBackToLogin }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus({ type: 'err', msg: 'Passwords do not match' });
      return;
    }
    if (password.length < 8) {
      setStatus({ type: 'err', msg: 'Password must be at least 8 characters' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await apiCall('POST', '/auth/reset-password', { token, password });
      setStatus({ type: 'ok', msg: 'Password reset. You can now log in.' });
      setTimeout(() => onBackToLogin(), 1500);
    } catch (err) {
      setStatus({ type: 'err', msg: err.message || 'Reset failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
      <h2 style={{ margin: 0, marginBottom: 8 }}>Set a new password</h2>
      <p style={{ color: '#666', fontSize: 14, marginTop: 0 }}>
        Enter a new password for your account.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          style={{ width: '100%', padding: 10, fontSize: 14, border: '1px solid #ddd', borderRadius: 6, marginBottom: 10 }}
        />
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          style={{ width: '100%', padding: 10, fontSize: 14, border: '1px solid #ddd', borderRadius: 6, marginBottom: 12 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
        >
          {loading ? 'Saving…' : 'Reset password'}
        </button>
      </form>
      {status && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: status.type === 'ok' ? '#d1fae5' : '#fee2e2', color: status.type === 'ok' ? '#065f46' : '#991b1b', fontSize: 13 }}>
          {status.msg}
        </div>
      )}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button onClick={onBackToLogin} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}>
          Back to login
        </button>
      </div>
    </div>
  );
}
