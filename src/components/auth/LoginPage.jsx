import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';

/**
 * LoginPage — inspector and client portal sign-in / registration.
 *
 * Platform admin sign-in is intentionally NOT handled in this component;
 * that lives in PlatformAdminLoginPage (mounted at /admin) so the two
 * surfaces are visually and structurally different — an inspector should
 * never confuse this page for the admin console.
 *
 * HOWEVER, for operators of the platform (there will usually be one or
 * two humans at the company who are Platform Admins), we expose a
 * discreet secondary entry point to /admin *outside* the sign-in card
 * — intentionally separate from the inspector↔client portal switcher
 * that lives inside the card. A legitimate platform admin who lands on
 * /login by muscle memory can find it without clutter for everyone
 * else, and the link is a proper anchor to /admin so it is bookmarkable
 * and works with middle-click / right-click → Open in new tab.
 *
 * Props:
 *   inviteMessage           — optional banner for team-invite flows
 *   isClientPortal          — when true, render the "Client Portal" variant
 *   onPortalSwitch          — toggle between Inspector and Client portal
 *                             (rendered INSIDE the card, near the top)
 *   onForgotPassword        — optional: show Forgot Password link + callback
 *   showPlatformAdminLink   — when true, render the discreet /admin link
 *                             BELOW the card. Opt-in so the invite-flow
 *                             variant (brand-new invited users) does not
 *                             see an admin entry point.
 */
export default function LoginPage({
  inviteMessage,
  isClientPortal,
  onPortalSwitch,
  onForgotPassword,
  showPlatformAdminLink,
}) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const designationOptions = [
    { key: 'lead_inspector', label: 'Lead Inspector' },
    { key: 'lead_risk_assessor', label: 'Lead Risk Assessor' },
    { key: 'ebl_investigator', label: 'EBL Investigator' },
    { key: 'clearance_technician', label: 'Clearance Technician' },
    { key: 'abatement_supervisor', label: 'Lead Abatement Supervisor' },
    { key: 'abatement_worker', label: 'Lead Abatement Worker' },
    { key: 'project_designer', label: 'Lead Project Designer' },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const role = isClientPortal ? 'client' : undefined;
        const desig = (!isClientPortal && designation) ? designation : undefined;
        await register(email, password, fullName, companyName, role, desig);
      } else {
        // Pass the audience of THIS login surface so the backend can
        // enforce role/surface separation. "client" for Client Portal
        // sign-in, "inspector" for everyone else on this page. The
        // admin surface has its own dedicated component and never
        // reaches this handler.
        const surface = isClientPortal ? 'client' : 'inspector';
        await login(email, password, surface);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Colors: clients get a warmer sky-blue/teal palette so the portal
  // feels approachable and unmistakably "for homeowners", not a drab
  // copy of the inspector login. Inspector surface keeps the existing
  // deep-navy technical vibe.
  const accentColor = isClientPortal ? '#0ea5e9' : '#2c5282';
  const audienceLabel = isClientPortal ? 'Client Portal' : 'Inspector Login';
  const tagline = isClientPortal
    ? 'View your inspection, check status, and message your inspector directly.'
    : 'Michigan LIRA-EBL inspection platform for licensed inspectors.';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      gap: '0',
      background: isClientPortal
        ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 45%, #bae6fd 100%)'
        : 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #2b6cb0 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Client-portal hero card lives ABOVE the sign-in card — a
          welcome block that introduces what the portal is for. This
          replaces the drab dark-grey variant and matches C45's
          "give the client UI the kind of face it needs" directive. */}
      {isClientPortal && (
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '24px 28px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 12px 40px rgba(14, 165, 233, 0.15)',
          marginBottom: '16px',
          display: 'grid',
          gridTemplateColumns: '56px 1fr',
          gap: '16px',
          alignItems: 'center',
          border: '1px solid rgba(14, 165, 233, 0.12)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
            boxShadow: '0 6px 16px rgba(14, 165, 233, 0.35)',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0c4a6e', marginBottom: 4 }}>
              Welcome to your LeadFlow Client Portal
            </div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              Follow your inspection in real time, see photos and reports as soon
              as they're ready, and message your inspector with questions.
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: '#fff',
        borderRadius: isClientPortal ? '16px' : '12px',
        padding: '40px',
        width: '100%',
        maxWidth: isClientPortal ? '440px' : '420px',
        boxShadow: isClientPortal
          ? '0 20px 50px rgba(14, 165, 233, 0.18)'
          : '0 20px 60px rgba(0,0,0,0.3)',
        border: isClientPortal ? '1px solid rgba(14, 165, 233, 0.1)' : undefined,
      }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{
            fontSize: '32px', fontWeight: '700',
            color: isClientPortal ? '#0c4a6e' : '#1a365d',
            marginBottom: '4px',
          }}>
            LeadFlow AI
          </div>
          <div style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1.6px',
            textTransform: 'uppercase',
            color: accentColor,
            background: isClientPortal ? '#e0f2fe' : '#ebf8ff',
            padding: '4px 10px',
            borderRadius: '999px',
            marginTop: '6px',
          }}>
            {audienceLabel}
          </div>
          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '10px', lineHeight: 1.5 }}>
            {tagline}
          </div>
        </div>

        {/* Portal/Inspector switch */}
        {onPortalSwitch && (
          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <button
              onClick={onPortalSwitch}
              style={{
                background: 'none', border: 'none', color: '#3182ce',
                fontSize: '13px', cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              {isClientPortal ? 'Inspector login →' : 'Client portal →'}
            </button>
          </div>
        )}

        {/* Invite message */}
        {inviteMessage && (
          <div style={{
            background: '#ebf8ff', color: '#2c5282', padding: '10px 14px',
            borderRadius: '6px', fontSize: '13px', marginTop: '16px', textAlign: 'center',
          }}>
            {inviteMessage}
          </div>
        )}

        {/* Tab Toggle */}
        <div style={{
          display: 'flex', background: '#edf2f7', borderRadius: '8px',
          padding: '4px', marginTop: '24px', marginBottom: '24px',
        }}>
          <button
            onClick={() => { setIsRegister(false); setError(''); }}
            style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
              background: !isRegister ? '#fff' : 'transparent',
              color: !isRegister ? '#1a365d' : '#718096',
              fontWeight: !isRegister ? '600' : '400',
              cursor: 'pointer',
              boxShadow: !isRegister ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsRegister(true); setError(''); }}
            style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: '6px',
              background: isRegister ? '#fff' : 'transparent',
              color: isRegister ? '#1a365d' : '#718096',
              fontWeight: isRegister ? '600' : '400',
              cursor: 'pointer',
              boxShadow: isRegister ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fed7d7', color: '#c53030', padding: '10px 14px',
            borderRadius: '6px', fontSize: '13px', marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text" value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={isClientPortal ? 'Jane Doe' : 'John Smith'}
                style={inputStyle}
              />
              <label style={labelStyle}>{isClientPortal ? 'Company / Property Name' : 'Company Name'}</label>
              <input
                type="text" value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder={isClientPortal ? 'Doe Properties LLC' : 'Smith Environmental LLC'}
                style={inputStyle}
              />
              {!isClientPortal && (
                <>
                  <label style={labelStyle}>Professional Designation</label>
                  <select
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select your certification...</option>
                    {designationOptions.map(d => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                </>
              )}
            </>
          )}
          <label style={labelStyle}>Email</label>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            required style={inputStyle}
          />
          <label style={labelStyle}>Password</label>
          <input
            type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={isRegister ? 'Min 8 characters' : 'Your password'}
            required minLength={isRegister ? 8 : undefined}
            style={inputStyle}
          />

          {/* Forgot Password link (sign-in only) */}
          {!isRegister && onForgotPassword && (
            <div style={{ textAlign: 'right', marginTop: '6px' }}>
              <button
                type="button" onClick={onForgotPassword}
                style={{
                  background: 'none', border: 'none', color: '#3182ce',
                  fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', padding: 0,
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? '#a0aec0' : accentColor,
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '15px', fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px', transition: 'background 0.2s',
            }}
          >
            {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>
      </div>

      {/*
        Discreet Platform Admin entry point.
        Lives OUTSIDE and BELOW the sign-in card so it is visually
        separated from the inspector↔client portal switcher inside the
        card. Rendered as a real <a href="/admin"> so it is bookmarkable,
        middle-clickable, right-click → "Open in new tab"-able, and
        accessible to keyboard / screen-reader users. Extremely muted
        by default (low opacity); reveals on hover & keyboard focus.
      */}
      {showPlatformAdminLink && (
        <a
          href="/admin"
          style={adminLinkStyle}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
          onFocus={(e) => { e.currentTarget.style.opacity = '1'; }}
          onBlur={(e) => { e.currentTarget.style.opacity = '0.5'; }}
          aria-label="Platform Admin — restricted access"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '5px', verticalAlign: '-1px' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Platform Admin
        </a>
      )}
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
  boxSizing: 'border-box', transition: 'border-color 0.2s',
};

const adminLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  marginTop: '28px',
  padding: '6px 12px',
  color: 'rgba(255, 255, 255, 0.85)',
  opacity: 0.5,
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.6px',
  textTransform: 'uppercase',
  textDecoration: 'none',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'rgba(255, 255, 255, 0.04)',
  transition: 'opacity 0.2s, border-color 0.2s',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};
