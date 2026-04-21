import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';

/**
 * PlatformAdminLoginPage — dedicated login surface for platform admins.
 *
 * Mounted at /admin and /admin/login. Deliberately DIFFERENT from the
 * inspector/client LoginPage:
 *   - Dark slate theme, not a bright white card.
 *   - No Sign In / Create Account tab toggle (admins are provisioned
 *     via the database migration + bootstrap helper — there is no
 *     self-serve registration path).
 *   - Calls login() with surface="admin" so the backend rejects any
 *     non-platform-admin credential with a clear 403/WRONG_SURFACE
 *     message. This is the production fix for the class of bugs where
 *     an inspector could sign in at /admin and silently land on the
 *     inspector dashboard.
 *   - Includes a "Forgot password" link that uses the same
 *     /auth/forgot-password flow as inspectors. The one-time
 *     BOOTSTRAP_PLATFORM_ADMIN env-var recovery is a disaster fallback,
 *     not a day-to-day reset — day-to-day admins recover by email like
 *     any other user.
 *   - No portal / inspector switch links in the main surface. A small
 *     muted "Inspector login" link lives at the very bottom for the
 *     unlikely case an inspector bookmarks /admin by mistake.
 *   - Clear "Authorized personnel only" warning so inspectors who
 *     stumble onto this URL immediately know they are in the wrong
 *     place.
 */
export default function PlatformAdminLoginPage({ onInspectorSwitch, onForgotPassword }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // surface="admin" tells the backend to enforce is_platform_admin=true.
      // Non-admin credentials get a 403 WRONG_SURFACE_NOT_ADMIN response
      // with a user-readable message we surface below.
      await login(email, password, 'admin');
    } catch (err) {
      // Surface role-rejection errors with a clearer heading so the
      // person reading them understands it's not a typo — it's that
      // their account isn't authorized for the admin console.
      if (err?.code === 'WRONG_SURFACE_NOT_ADMIN') {
        setError(err.message || 'This account is not authorized for the platform admin console.');
      } else {
        setError(err.message || 'Sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Ambient grid backdrop for visual distinction from inspector login */}
      <div style={styles.backdrop} aria-hidden="true" />

      <div style={styles.shell}>
        {/* Shield / lock mark */}
        <div style={styles.mark} aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>

        <div style={styles.kicker}>LEADFLOW AI</div>
        <div style={styles.title}>Platform Administration</div>
        <div style={styles.subtitle}>
          Authorized personnel only. This console manages every
          organization on the platform — access is restricted to the
          LeadFlow AI operations team.
        </div>

        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        <form onSubmit={handleSubmit} autoComplete="on">
          <label style={styles.label} htmlFor="admin-email">Admin email</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="username"
            placeholder="admin@abatecomply.com"
            style={styles.input}
          />

          <label style={styles.label} htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Enter your admin password"
            style={styles.input}
          />

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              ...styles.submit,
              opacity: (loading || !email || !password) ? 0.55 : 1,
              cursor: (loading || !email || !password) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Authenticating…' : 'Sign in to admin console'}
          </button>

          {/* Forgot-password link — goes through the same
              /auth/forgot-password flow as inspectors and clients. The
              reset link emailed to a platform admin lands on the reset
              page, then the backend returns surface="admin" on success
              so the UI knows to redirect back here. */}
          {onForgotPassword && (
            <div style={styles.forgotRow}>
              <button
                type="button"
                onClick={onForgotPassword}
                style={styles.forgotBtn}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#c4b5fd'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#8b5cf6'; }}
              >
                Forgot admin password?
              </button>
            </div>
          )}
        </form>

        <div style={styles.metaRow}>
          <span style={styles.metaLock} aria-hidden="true">•</span>
          <span>Secure session — audited on every sign-in</span>
        </div>
      </div>

      {/* Very muted inspector-login escape hatch */}
      {onInspectorSwitch && (
        <button
          type="button"
          onClick={onInspectorSwitch}
          style={styles.inspectorLink}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; }}
        >
          Not an administrator? Go to inspector login →
        </button>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: '#020617', // near-black slate; very distinct from inspector blue
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    position: 'relative',
    overflow: 'hidden',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.18) 0%, transparent 55%),' +
      'radial-gradient(ellipse at 70% 80%, rgba(30,58,138,0.22) 0%, transparent 60%),' +
      'linear-gradient(180deg, #020617 0%, #0b1120 100%)',
    pointerEvents: 'none',
  },
  shell: {
    position: 'relative',
    width: '100%',
    maxWidth: '440px',
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '32px 28px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(124,58,237,0.15)',
    backdropFilter: 'blur(8px)',
  },
  mark: {
    width: '72px',
    height: '72px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    border: '1px solid #4c1d95',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  kicker: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '2.4px',
    color: '#8b5cf6',
    marginBottom: '6px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#f1f5f9',
    marginBottom: '10px',
    letterSpacing: '-0.01em',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  subtitle: {
    fontSize: '13px',
    lineHeight: 1.55,
    color: '#94a3b8',
    marginBottom: '24px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  errorBox: {
    background: 'rgba(127, 29, 29, 0.45)',
    border: '1px solid #7f1d1d',
    color: '#fecaca',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1.4px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: '14px',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    background: '#0b1120',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  submit: {
    width: '100%',
    marginTop: '22px',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    transition: 'opacity 0.2s',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '20px',
    color: '#64748b',
    fontSize: '11px',
    letterSpacing: '0.5px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  metaLock: {
    color: '#8b5cf6',
    fontSize: '14px',
  },
  inspectorLink: {
    position: 'relative',
    marginTop: '32px',
    background: 'transparent',
    border: 'none',
    color: '#475569',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '8px 12px',
    transition: 'color 0.2s',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  forgotRow: {
    marginTop: '14px',
    textAlign: 'center',
  },
  forgotBtn: {
    background: 'transparent',
    border: 'none',
    color: '#8b5cf6',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.3px',
    cursor: 'pointer',
    padding: '4px 8px',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    transition: 'color 0.2s',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
};
