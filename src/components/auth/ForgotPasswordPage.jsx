import { useState } from 'react';
import { apiCall } from '../../api/apiConfig.js';

export default function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await apiCall('POST', '/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      setStatus({
        type: 'ok',
        msg:
          res?.message ||
          "If an account with that email exists, a reset link has been sent. Check your inbox (and spam folder).",
      });
    } catch (err) {
      setStatus({ type: 'err', msg: err.message || 'Request failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #2b6cb0 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '40px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1a365d', marginBottom: '4px' }}>
            LeadFlow AI
          </div>
          <div style={{ color: '#718096', fontSize: '14px' }}>
            Michigan LIRA-EBL Inspection Platform
          </div>
        </div>

        <h2 style={{ margin: '0 0 6px', color: '#1a365d', fontSize: '20px' }}>Reset your password</h2>
        <p style={{ color: '#718096', fontSize: '14px', marginTop: 0, marginBottom: '20px', lineHeight: 1.5 }}>
          Enter the email address on your account and we&apos;ll email you a link to set a new password.
        </p>

        {status && (
          <div
            style={{
              background: status.type === 'ok' ? '#d1fae5' : '#fed7d7',
              color: status.type === 'ok' ? '#065f46' : '#c53030',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
              lineHeight: 1.5,
            }}
          >
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoFocus
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading || !email}
            style={{
              width: '100%',
              padding: '12px',
              background: loading || !email ? '#a0aec0' : '#2c5282',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading || !email ? 'not-allowed' : 'pointer',
              marginTop: '16px',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#2c5282',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: '#4a5568',
  marginBottom: '4px',
  marginTop: '12px',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};
