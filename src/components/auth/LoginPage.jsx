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
 * Two audiences share this component but get meaningfully different UI:
 *   INSPECTOR variant  — deep-navy gradient; Sign In / Create Account
 *                        as equal-weight tabs (pros expect to sign up
 *                        their company here).
 *   CLIENT variant     — light sky-blue gradient; Sign In is primary,
 *                        Create Account is a quiet secondary link under
 *                        the submit button (homeowners are typically
 *                        invited by email and shouldn't be confronted
 *                        with a sign-up path by default).
 *
 * HOWEVER, for operators of the platform (there will usually be one or
 * two humans at the company who are Platform Admins), we expose a
 * discreet secondary entry point to /admin *outside* the sign-in card.
 * The link's coloring is theme-aware so it remains legible against both
 * the dark (inspector) and the light (client) backgrounds.
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

  // Palette: clients get a light, approachable sky-blue/teal surface so
  // the portal reads as "for homeowners", not a clone of the technical
  // inspector login. Inspector variant keeps the deep-navy identity.
  const accentColor = isClientPortal ? '#0ea5e9' : '#2c5282';
  const accentDeep = isClientPortal ? '#0284c7' : '#1a365d';
  const audienceLabel = isClientPortal ? 'Client Portal' : 'Inspector Login';
  const tagline = isClientPortal
    ? 'Follow your inspection, view reports, and message your inspector.'
    : 'Michigan LIRA-EBL inspection platform for licensed inspectors.';
  const trustLine = isClientPortal
    ? 'Encrypted connection · Your data stays private · Michigan LIRA-EBL compliance'
    : 'Encrypted connection · EPA / HUD / Michigan LIRA aligned · Role-scoped access';

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
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    }}>
      {/* Client hero card — sits above the sign-in card, introduces the
          portal and gives the page an unmistakably consumer face. Uses a
          composite shield+home icon to convey both "your home" and
          "secure portal" without needing two icons. */}
      {isClientPortal && (
        <div style={{
          background: '#fff',
          borderRadius: '18px',
          padding: '22px 26px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 10px 32px rgba(14, 165, 233, 0.14)',
          marginBottom: '16px',
          display: 'grid',
          gridTemplateColumns: '56px 1fr',
          gap: '16px',
          alignItems: 'center',
          border: '1px solid rgba(14, 165, 233, 0.10)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '14px',
            background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
            boxShadow: '0 6px 16px rgba(14, 165, 233, 0.30)',
          }}>
            {/* Shield outline with a small home silhouette inside —
                signals "secure" + "your home" in one mark. */}
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 13V10l3-2.4L15 10v3" />
              <path d="M11 13h2" />
            </svg>
          </div>
          <div>
            <div style={{
              fontSize: 18, fontWeight: 700, color: '#0c4a6e', marginBottom: 4,
              letterSpacing: '-0.01em',
            }}>
              Your Michigan lead inspection, online
            </div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.55 }}>
              Follow progress in real time, view photos and reports the moment
              they're ready, and message your certified inspector directly.
            </div>
          </div>
        </div>
      )}

      {/* Sign-in card. Top accent stripe adds an "official" touch
          without locking us into heavier chrome. */}
      <div style={{
        background: '#fff',
        borderRadius: isClientPortal ? '18px' : '12px',
        width: '100%',
        maxWidth: isClientPortal ? '440px' : '420px',
        boxShadow: isClientPortal
          ? '0 18px 44px rgba(14, 165, 233, 0.16)'
          : '0 20px 60px rgba(0,0,0,0.3)',
        border: isClientPortal ? '1px solid rgba(14, 165, 233, 0.10)' : undefined,
        overflow: 'hidden',
      }}>
        {/* Top accent stripe */}
        <div style={{
          height: '4px',
          background: isClientPortal
            ? 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)'
            : 'linear-gradient(90deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
        }} />

        <div style={{ padding: '36px 40px 32px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{
              fontSize: '30px', fontWeight: '700',
              color: accentDeep,
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}>
              LeadFlow <span style={{ fontWeight: 500, color: accentColor }}>AI</span>
            </div>
            <div style={{
              display: 'inline-block',
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '1.6px',
              textTransform: 'uppercase',
              color: accentColor,
              background: isClientPortal ? '#e0f2fe' : '#ebf8ff',
              padding: '4px 10px',
              borderRadius: '999px',
              marginTop: '2px',
            }}>
              {audienceLabel}
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '12px', lineHeight: 1.5 }}>
              {tagline}
            </div>
          </div>

          {/* Portal/Inspector switch */}
          {onPortalSwitch && (
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                onClick={onPortalSwitch}
                style={{
                  background: 'none', border: 'none', color: accentColor,
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

          {/* Sign In / Create Account toggle.
              INSPECTOR: full two-tab UI (pros expect to register a company).
              CLIENT:    no tabs — Sign In is the primary action, and a
                         quiet toggle link below the submit button lets a
                         homeowner who needs to self-register get there. */}
          {!isClientPortal ? (
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
          ) : (
            <div style={{
              textAlign: 'center', marginTop: '22px', marginBottom: '6px',
              fontSize: '15px', fontWeight: 600, color: '#0c4a6e',
              letterSpacing: '-0.01em',
            }}>
              {isRegister ? 'Create your client account' : 'Sign in to your portal'}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: '#fed7d7', color: '#c53030', padding: '10px 14px',
              borderRadius: '6px', fontSize: '13px', marginBottom: '16px',
              marginTop: isClientPortal ? '16px' : '0',
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
                    background: 'none', border: 'none', color: accentColor,
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
                marginTop: '14px', transition: 'background 0.2s',
                boxShadow: loading ? 'none' : (isClientPortal
                  ? '0 4px 12px rgba(14, 165, 233, 0.25)'
                  : '0 4px 12px rgba(26, 54, 93, 0.18)'),
              }}
            >
              {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {/* Client-only secondary toggle link. Mirrors the role of the
              Inspector variant's tabs without the visual weight. */}
          {isClientPortal && (
            <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: '#64748b' }}>
              {isRegister ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(false); setError(''); }}
                    style={{
                      background: 'none', border: 'none', color: accentColor,
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      textDecoration: 'underline', padding: 0,
                    }}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  First time here?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(true); setError(''); }}
                    style={{
                      background: 'none', border: 'none', color: accentColor,
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      textDecoration: 'underline', padding: 0,
                    }}
                  >
                    Create an account
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Trust-marker footer strip — understated, sits inside the card
            so it scales with the card's width. Uses muted slate on both
            variants because the card itself is white. */}
        <div style={{
          borderTop: isClientPortal ? '1px solid #e0f2fe' : '1px solid #edf2f7',
          padding: '10px 16px',
          textAlign: 'center',
          fontSize: '10.5px',
          color: isClientPortal ? '#64748b' : '#718096',
          letterSpacing: '0.3px',
          background: isClientPortal ? '#f8fafc' : '#f7fafc',
        }}>
          {trustLine}
        </div>
      </div>

      {/*
        Discreet Platform Admin entry point.
        Lives OUTSIDE and BELOW the sign-in card so it is visually
        separated from the inspector↔client portal switcher inside the
        card. Rendered as a real <a href="/admin"> so it is bookmarkable,
        middle-clickable, right-click → "Open in new tab"-able, and
        accessible to keyboard / screen-reader users. Styling is
        theme-aware so the link reads correctly on both the dark
        (inspector) and the light (client) backgrounds.
      */}
      {showPlatformAdminLink && (
        <a
          href="/admin"
          style={adminLinkStyleFor(isClientPortal)}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = isClientPortal ? '0.7' : '0.5'; }}
          onFocus={(e) => { e.currentTarget.style.opacity = '1'; }}
          onBlur={(e) => { e.currentTarget.style.opacity = isClientPortal ? '0.7' : '0.5'; }}
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

// C56: theme-aware admin link. Prior version was hard-coded white-on-dark
// and became invisible on the client portal's light sky-blue background.
// Returns a style object whose text/border/background colors match the
// surrounding gradient for the given audience.
function adminLinkStyleFor(isClientPortal) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: '28px',
    padding: '6px 12px',
    color: isClientPortal ? '#475569' : 'rgba(255, 255, 255, 0.85)',
    opacity: isClientPortal ? 0.7 : 0.5,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: '6px',
    border: isClientPortal
      ? '1px solid rgba(14, 165, 233, 0.25)'
      : '1px solid rgba(255, 255, 255, 0.12)',
    background: isClientPortal
      ? 'rgba(255, 255, 255, 0.55)'
      : 'rgba(255, 255, 255, 0.04)',
    transition: 'opacity 0.2s, border-color 0.2s',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  };
}
