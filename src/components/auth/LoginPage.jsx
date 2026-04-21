import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';

/**
 * LoginPage — inspector and client portal sign-in / registration.
 *
 * Platform admin sign-in is intentionally NOT handled here. It lives in
 * PlatformAdminLoginPage (mounted at /admin) so the two surfaces are
 * visually and structurally different — an inspector should never be
 * able to arrive here and confuse this for the admin console, and an
 * admin should always know to hit a separate URL.
 *
 * Props:
 *   inviteMessage    — optional banner for team-invite flows
 *   isClientPortal   — when true, render the "Client Portal" variant
 *   onPortalSwitch   — toggle between Inspector and Client portal
 *   onForgotPassword — optional: show Forgot Password link + callback
 */
export default function LoginPage({ inviteMessage, isClientPortal, onPortalSwitch, onForgotPassword }) {
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
        await login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const accentColor = isClientPortal ? '#4a5568' : '#2c5282';
  const audienceLabel = isClientPortal ? 'Client Portal' : 'Inspector Login';
  const tagline = isClientPortal
    ? 'Sign in to view inspection reports and request services.'
    : 'Michigan LIRA-EBL inspection platform for licensed inspectors.';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isClientPortal
        ? 'linear-gradient(135deg, #2d3748 0%, #4a5568 50%, #718096 100%)'
        : 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #2b6cb0 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{
            fontSize: '32px', fontWeight: '700', color: '#1a365d', marginBottom: '4px',
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
            background: isClientPortal ? '#edf2f7' : '#ebf8ff',
            padding: '4px 10px',
            borderRadius: '999px',
            marginTop: '6px',
          }}>
            {audienceLabel}
          </div>
          <div style={{ color: '#718096', fontSize: '13px', marginTop: '10px' }}>
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
