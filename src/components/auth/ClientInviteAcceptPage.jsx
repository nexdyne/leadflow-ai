import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';

/**
 * ClientInviteAcceptPage — landing page for /invite/client/:token
 *
 * Flow:
 *   1. On mount, GET /api/client-invite/:token to fetch the invite
 *      preview (inspector name, project name, any personal message).
 *   2. Render a warm, explanatory welcome screen with the project
 *      details and a password form. No surprises — the client knows
 *      exactly who invited them and to what before committing.
 *   3. On submit, POST /api/client-invite/:token/accept which
 *      atomically creates (or reactivates) the client account, grants
 *      project access, marks the invite accepted, and returns a session.
 *   4. Seed the session via useAuth().applySession so the user is
 *      dropped straight into the Client Portal on the next render,
 *      without a second login round-trip.
 *
 * Distinct from InviteAcceptPage (which handles TEAM invites — inviting
 * another inspector onto your team). Those flows share nothing except
 * the URL pattern.
 */
export default function ClientInviteAcceptPage({ token, onDone, onGoToLogin }) {
  const { applySession, login } = useAuth();
  const [phase, setPhase] = useState('loading'); // loading | preview | accepting | already | invalid | done
  const [invite, setInvite] = useState(null);
  const [serverError, setServerError] = useState('');
  const [loginUrl, setLoginUrl] = useState(null);

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [formError, setFormError] = useState('');

  // Existing-client quick-signin form
  const [signinPassword, setSigninPassword] = useState('');
  const [signinError, setSigninError] = useState('');
  const [signinLoading, setSigninLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/client-invite/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          if (data.code === 'ALREADY_ACCEPTED') {
            setPhase('already');
            setLoginUrl(data.loginUrl || '/portal');
          } else if (['REVOKED', 'EXPIRED', 'INVALID_TOKEN', 'NOT_FOUND'].includes(data.code)) {
            setPhase('invalid');
            setServerError(data.error || 'This invite link is no longer valid.');
          } else {
            setPhase('invalid');
            setServerError(data.error || 'Failed to load invite.');
          }
          return;
        }
        setInvite(data.invite);
        if (data.invite.name && !fullName) setFullName(data.invite.name);
        setPhase('preview');
      } catch (err) {
        if (!cancelled) {
          setPhase('invalid');
          setServerError('Unable to reach the server. Please try again.');
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAccept(e) {
    e.preventDefault();
    setFormError('');

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setPhase('accepting');
    try {
      const res = await fetch(`/api/client-invite/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          fullName: fullName.trim(),
          companyName: companyName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || 'Failed to accept invitation');
        setPhase('preview');
        return;
      }

      // Drop the session into AuthContext so the next render goes
      // straight into the Client Portal.
      if (applySession) {
        applySession({ user: data.user, token: data.token, refreshToken: data.refreshToken });
      }
      setPhase('done');
      if (onDone) onDone(data);
    } catch (err) {
      setFormError('Network error. Please try again.');
      setPhase('preview');
    }
  }

  async function handleExistingClientSignin(e) {
    e.preventDefault();
    setSigninError('');
    setSigninLoading(true);
    try {
      await login(invite.email, signinPassword, 'client');
      // After login, accept the invite server-side so the
      // client_projects row gets created. Re-use the accept endpoint —
      // it's idempotent for existing client users.
      const res = await fetch(`/api/client-invite/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: signinPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSigninError(data.error || 'Accept failed after sign-in.');
        return;
      }
      setPhase('done');
      if (onDone) onDone();
    } catch (err) {
      setSigninError(err.message || 'Sign-in failed');
    } finally {
      setSigninLoading(false);
    }
  }

  // ─── Render phases ───────────────────────────────────────
  if (phase === 'loading') return <Shell><Spinner label="Loading your invitation..." /></Shell>;
  if (phase === 'accepting') return <Shell><Spinner label="Setting up your account..." /></Shell>;

  if (phase === 'invalid') {
    return (
      <Shell>
        <h2 style={h2Style}>Invitation unavailable</h2>
        <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
          {serverError || "This invite link isn't valid anymore."}
        </p>
        <button
          style={primaryButton('#0ea5e9')}
          onClick={() => { window.location.href = '/portal'; }}
        >
          Go to Client Portal
        </button>
      </Shell>
    );
  }

  if (phase === 'already') {
    return (
      <Shell>
        <h2 style={h2Style}>You already accepted this invite</h2>
        <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
          Your account is all set. Sign in to the Client Portal to see your project.
        </p>
        <button
          style={primaryButton('#0ea5e9')}
          onClick={() => { window.location.href = loginUrl || '/portal'; }}
        >
          Sign in to the Client Portal
        </button>
      </Shell>
    );
  }

  if (phase === 'done') {
    return (
      <Shell>
        <h2 style={h2Style}>You're in!</h2>
        <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
          Your account is ready. Opening your Client Portal...
        </p>
        <Spinner label="" />
      </Shell>
    );
  }

  // phase === 'preview' — main form
  const inspectorLine = invite.inspectorCompany
    ? `${invite.inspectorName || 'Your inspector'} — ${invite.inspectorCompany}`
    : (invite.inspectorName || 'Your inspector');

  return (
    <Shell>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 56, height: 56, borderRadius: '50%', background: '#e0f2fe',
          color: '#0369a1', marginBottom: 12,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
          You've been invited
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
          to view your inspection in the LeadFlow Client Portal
        </p>
      </div>

      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
        padding: 18, marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          Project
        </div>
        <div style={{ fontSize: 16, color: '#0f172a', fontWeight: 600 }}>
          {invite.projectName}
        </div>
        {invite.projectAddress && (
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            {invite.projectAddress}
          </div>
        )}
        <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 12, paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            Invited by
          </div>
          <div style={{ fontSize: 14, color: '#0f172a' }}>
            {inspectorLine}
          </div>
        </div>
      </div>

      {invite.message && (
        <div style={{
          background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12,
          padding: 16, marginBottom: 20, borderLeft: '4px solid #ea580c',
        }}>
          <div style={{ fontSize: 12, color: '#9a3412', fontWeight: 600, marginBottom: 6 }}>
            Message from {invite.inspectorName || 'your inspector'}
          </div>
          <div style={{ fontSize: 14, color: '#7c2d12', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {invite.message}
          </div>
        </div>
      )}

      {invite.hasNonClientConflict ? (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: 14, color: '#991b1b', fontSize: 13, lineHeight: 1.5,
          marginBottom: 16,
        }}>
          The email <strong>{invite.email}</strong> is already used by a staff
          account in our system. For security reasons we can't reuse it here.
          Please ask your inspector to send a fresh invite to a personal email
          address.
        </div>
      ) : invite.hasExistingClient ? (
        <>
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
            padding: 14, color: '#1e40af', fontSize: 13, lineHeight: 1.5,
            marginBottom: 16,
          }}>
            Welcome back! You already have a Client Portal account for{' '}
            <strong>{invite.email}</strong>. Sign in with your existing password
            to accept this invite and add the project to your dashboard.
          </div>
          <form onSubmit={handleExistingClientSignin}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={invite.email} disabled style={{ ...inputStyle, background: '#f1f5f9' }} />
            <label style={labelStyle}>Password</label>
            <input
              type="password" value={signinPassword}
              onChange={(e) => setSigninPassword(e.target.value)}
              placeholder="Your existing password"
              required autoFocus style={inputStyle}
            />
            {signinError && (
              <div style={{ background: '#fed7d7', color: '#c53030', padding: 10, borderRadius: 6, marginTop: 10, fontSize: 13 }}>
                {signinError}
              </div>
            )}
            <button
              type="submit" disabled={signinLoading || !signinPassword}
              style={primaryButton('#0ea5e9', signinLoading)}
            >
              {signinLoading ? 'Signing in...' : 'Sign in & accept invite'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button
              type="button"
              onClick={() => { window.location.href = '/portal?forgot=true'; }}
              style={{ background: 'none', border: 'none', color: '#0369a1', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Forgot your password?
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleAccept}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={invite.email} disabled style={{ ...inputStyle, background: '#f1f5f9' }} />
          <label style={labelStyle}>Your Name</label>
          <input
            type="text" value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            style={inputStyle}
          />
          <label style={labelStyle}>Company / Property Name <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
          <input
            type="text" value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Doe Properties LLC"
            style={inputStyle}
          />
          <label style={labelStyle}>Create Password</label>
          <input
            type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required minLength={8} style={inputStyle}
          />
          <label style={labelStyle}>Confirm Password</label>
          <input
            type="password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            required minLength={8} style={inputStyle}
          />
          {formError && (
            <div style={{ background: '#fed7d7', color: '#c53030', padding: 10, borderRadius: 6, marginTop: 10, fontSize: 13 }}>
              {formError}
            </div>
          )}
          <button
            type="submit"
            style={primaryButton('#0ea5e9')}
          >
            Create account & view project
          </button>
          <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
            By creating an account you agree to receive email updates about your
            inspection. You can adjust notification preferences anytime.
          </div>
        </form>
      )}
    </Shell>
  );
}

// ─── Small presentational helpers ───────────────────────────
function Shell({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '36px 36px 32px',
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)',
      }}>
        {children}
      </div>
    </div>
  );
}

function Spinner({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{
        width: 36, height: 36, margin: '0 auto 12px',
        border: '3px solid #e0f2fe',
        borderTopColor: '#0ea5e9',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ color: '#64748b', fontSize: 14 }}>{label}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const h2Style = { fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 10px', textAlign: 'center' };

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#334155', marginBottom: 4, marginTop: 12,
};

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 14, outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
};

function primaryButton(color, loading) {
  return {
    width: '100%', padding: '12px',
    background: loading ? '#94a3b8' : color,
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    marginTop: 16,
    transition: 'background 0.2s, transform 0.05s',
  };
}
