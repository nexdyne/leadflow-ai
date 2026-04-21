import { useState } from 'react';
import { apiCall } from '../../api/apiConfig.js';

export default function ResetPasswordPage({ token, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  // After a successful reset the backend returns the user's surface
  // ("admin" | "client" | "inspector") so we can route them back to
  // exactly the login page they need. Default to inspector for
  // forward-compat with older backends that don't return the field.
  const [surface, setSurface] = useState('inspector');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const result = await apiCall('POST', '/auth/reset-password', { token, newPassword: password });
      if (result && typeof result.surface === 'string') setSurface(result.surface);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Route the "Go to Sign In" button to the surface this user actually
  // signs in from. Admin users must be sent to /admin; sending them to
  // / (inspector landing) would force them to re-navigate and see the
  // wrong UI first.
  function handleDone() {
    const dest =
      surface === 'admin' ? '/admin' :
      surface === 'client' ? '/portal' :
      '/login';
    // Replace URL so the back button doesn't bring the user back to the
    // consumed reset-password link (the token is already invalidated).
    window.history.replaceState(null, '', dest);
    if (onDone) onDone();
  }

  const signInLabel =
    surface === 'admin' ? 'Go to Admin Sign In' :
    surface === 'client' ? 'Go to Client Portal Sign In' :
    'Go to Sign In';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #2b6cb0 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '40px',
        width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1a365d', marginBottom: '4px' }}>
            LeadFlow AI
          </div>
          <div style={{ color: '#718096', fontSize: '14px' }}>Set New Password</div>
        </div>

        {success ? (
          <div>
            <div style={{
              background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '8px',
              padding: '16px', textAlign: 'center', marginBottom: '16px',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>&#10003;</div>
              <div style={{ color: '#276749', fontWeight: '600', marginBottom: '4px' }}>Password Reset Successful</div>
              <div style={{ color: '#4a5568', fontSize: '13px' }}>
                Your password has been updated. You can now sign in with your new password.
              </div>
            </div>
            <button
              onClick={handleDone}
              style={{
                width: '100%', padding: '12px', background: '#2c5282',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              {signInLabel}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: '#fed7d7', color: '#c53030', padding: '10px 14px',
                borderRadius: '6px', fontSize: '13px', marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <label style={labelStyle}>New Password</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required minLength={8}
              style={inputStyle}
            />

            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
              style={inputStyle}
            />

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '12px', background: loading ? '#a0aec0' : '#2c5282',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontSize: '15px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer', marginTop: '12px',
              }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '600',
  color: '#4a5568', marginBottom: '4px', marginTop: '12px',
};

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
  borderRadius: '6px', fontSize: '14px', outline: 'none',
  boxSizing: 'border-box',
};
