import { useState } from 'react';

export default function ChangePasswordModal({ onChangePassword, onLogout }) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPwd.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('New passwords do not match.');
      return;
    }
    if (newPwd === currentPwd) {
      setError('New password must be different from your current password.');
      return;
    }

    setSaving(true);
    try {
      await onChangePassword(currentPwd, newPwd);
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a365d' }}>
            Change Your Password
          </div>
        </div>
        <div style={body}>
          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#4a5568' }}>
            Your account was created with a temporary password. Please set a new password to continue.
          </div>

          {error && (
            <div style={errorBox}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>Current Password</label>
            <input
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              required
              style={inputStyle}
              placeholder="Enter your current/temp password"
              autoFocus
            />

            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              required
              style={inputStyle}
              placeholder="At least 8 characters"
            />

            <label style={labelStyle}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              required
              style={inputStyle}
              placeholder="Re-enter new password"
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button type="button" onClick={onLogout} style={btnCancel} disabled={saving}>
                Sign Out Instead
              </button>
              <button type="submit" disabled={saving || !currentPwd || !newPwd || !confirmPwd} style={{
                ...btnPrimary,
                opacity: (saving || !currentPwd || !newPwd || !confirmPwd) ? 0.6 : 1,
              }}>
                {saving ? 'Changing...' : 'Set New Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 2000,
  padding: '20px',
};
const modal = {
  background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '440px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
};
const header = {
  padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
  background: 'linear-gradient(135deg, #fff5f5 0%, #fefcbf 100%)',
};
const body = { padding: '20px' };
const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '600', color: '#2d3748',
  marginBottom: '4px', marginTop: '12px',
};
const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};
const errorBox = {
  padding: '10px 14px', borderRadius: '8px',
  background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030',
  fontSize: '13px', marginBottom: '12px',
};
const btnCancel = {
  padding: '10px 16px', background: '#edf2f7', color: '#4a5568',
  border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px',
  fontWeight: '500', cursor: 'pointer', flex: 1,
};
const btnPrimary = {
  padding: '10px 16px', background: '#2c5282', color: '#fff',
  border: 'none', borderRadius: '8px', fontSize: '13px',
  fontWeight: '600', cursor: 'pointer', flex: 1,
};
