import { useState } from 'react';
import { apiCall } from '../../api/apiConfig.js';

export default function ResetPasswordPage({ token, onDone }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const noToken = !token;

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus({ type: 'err', msg: 'Passwords do not match.' });
      return;
    }
    if (password.length < 8) {
      setStatus({ type: 'err', msg: 'Password must be at least 8 characters long.' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await apiCall('POST', '/auth/reset-password', { token, password });
      setSuccess(true);
      setStatus({ type: 'ok', msg: 'Password reset successfully! Redirecting you to sign in…' });
      setTimeout(() => onDone?.(), 1800);
    } catch (err) {
      setStatus({ type: 'err', msg: err.message || 'Reset failed. Please request a new link.' });
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

        <h2 style={{ margin: '0 0 6px', color: '#1a365d', fontSize: '20px' }}>Set a new password</h2>
        <p style={{ color: '#718096', fontSize: '14px', marginTop: 0, marginBottom: '20px', lineHeight: 1.5 }}>
          Choose a strong password of at least 8 characters. You&apos;ll be signed out of all
          devices after you reset.
        </p>

        {noToken && (
          <div
            style={{
              background: '#fed7d7',
              color: '#c53030',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
              lineHeight: 1.5,
            }}
          >
            No reset token found. Please use the link from your password reset email, or
            request a new one.
          </div>
        )}

        {status && !noToken && (
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

        {!noToken && !success && (
          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              minLength={8}
              required
              autoFocus
              style={inputStyle}
            />
            <label style={labelStyle}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type it again"
              minLength={8}
              required
              style={inputStyle}
            />

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              style={{
                width: '100%',
                padding: '12px',
                background: loading || !password || !confirmPassword ? '#a0aec0' : '#2c5282',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor:
                  loading || !password || !confirmPassword ? 'not-allowed' : 'pointer',
                marginTop: '16px',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onDone}
            style={{
              background: 'none',
              border: 'none',
              color: '#2c5282',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {success ? 'Go to sign in now →' : '← Back to sign in'}
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
