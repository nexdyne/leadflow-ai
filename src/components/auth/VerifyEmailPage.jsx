import { useState, useEffect, useRef } from 'react';
import { apiCall } from '../../api/apiConfig.js';

export default function VerifyEmailPage({ token, onDone }) {
  const [status, setStatus] = useState(
    token
      ? { type: 'loading', msg: 'Verifying your email…' }
      : { type: 'err', msg: 'No verification token found. Please use the link from your verification email.' }
  );
  const fired = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (fired.current) return;
    fired.current = true;

    (async () => {
      try {
        await apiCall('POST', '/auth/verify-email', { token });
        setStatus({
          type: 'ok',
          msg: 'Email verified! You can now sign in to your account.',
        });
      } catch (err) {
        setStatus({
          type: 'err',
          msg: err.message || 'Verification failed. The link may have expired — please request a new one.',
        });
      }
    })();
  }, [token]);

  const colors = {
    loading: { bg: '#e0f2fe', fg: '#075985' },
    ok: { bg: '#d1fae5', fg: '#065f46' },
    err: { bg: '#fed7d7', fg: '#c53030' },
  }[status.type];

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

        <h2 style={{ margin: '0 0 6px', color: '#1a365d', fontSize: '20px' }}>Verify your email</h2>
        <p style={{ color: '#718096', fontSize: '14px', marginTop: 0, marginBottom: '20px', lineHeight: 1.5 }}>
          Confirming your email address so you can start using LeadFlow AI.
        </p>

        <div
          style={{
            background: colors.bg,
            color: colors.fg,
            padding: '12px 14px',
            borderRadius: '6px',
            fontSize: '14px',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {status.type === 'loading' && (
            <span
              aria-hidden="true"
              style={{
                width: 14,
                height: 14,
                border: '2px solid rgba(7, 89, 133, 0.3)',
                borderTopColor: '#075985',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'lf-spin 0.8s linear infinite',
                flexShrink: 0,
              }}
            />
          )}
          <span>{status.msg}</span>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onDone}
            style={{
              background: status.type === 'ok' ? '#2c5282' : 'none',
              color: status.type === 'ok' ? '#fff' : '#2c5282',
              border: status.type === 'ok' ? 'none' : '1px solid transparent',
              borderRadius: '8px',
              padding: status.type === 'ok' ? '12px 24px' : '8px 0',
              cursor: 'pointer',
              fontSize: status.type === 'ok' ? '15px' : '14px',
              fontWeight: '600',
            }}
          >
            {status.type === 'ok' ? 'Go to sign in →' : '← Back to sign in'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes lf-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
