// Placeholder page. Original ForgotPasswordPage.jsx was null-byte corrupted
// during the 2026-04-18 restore and needs to be reconstructed with the full
// reset-request flow that pairs with authController forgotPassword endpoint.
import { useState } from 'react';
import { apiCall } from '../../api/apiConfig.js';

export default function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await apiCall('POST', '/auth/forgot-password', { email });
      setStatus({ type: 'ok', msg: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
      setStatus({ type: 'err', msg: err.message || 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
      <h2 style={{ margin: 0, marginBottom: 8 }}>Reset your password</h2>
      <p style={{ color: '#666', fontSize: 14, marginTop: 0 }}>
        Enter your email and we'll send you a reset link.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: '100%', padding: 10, fontSize: 14, border: '1px solid #ddd', borderRadius: 6, marginBottom: 12 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
        >
          {loading ? 'Sending…' : 'Send reset link'}
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
