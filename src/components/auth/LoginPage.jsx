import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function LoginPage({ isClientPortal, onPortalSwitch, onPlatformSwitch, onForgotPassword }) {
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

      try {
              if (isRegister) {
                        await register(email, password, fullName, companyName);
              } else {
                        await login(email, password);
              }
      } catch (err) {
              setError(err.message);
      } finally {
              setLoading(false);
      }
  }

  return (
        <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #2b6cb0 100%)',
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
                          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                      <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: '#1a365d',
                      marginBottom: '4px',
        }}>
                                                    LeadFlow AI
                                      </div>
                                      <div style={{ color: '#718096', fontSize: '14px' }}>
                                                    {isClientPortal ? 'Client Portal - View Your Inspection' : 'Michigan LIRA-EBL Inspection Platform'}
                                      </div>
                          </div>

                  {/* Inspector Portal Toggle */} {onPortalSwitch && (<div style={{display:'flex',background:'#e6f0fa',borderRadius:'8px',padding:'4px',marginBottom:'16px'}}><button type="button" onClick={() => { if (isClientPortal) onPortalSwitch(); }} style={{flex:1,padding:'8px',border:'none',borderRadius:'6px',background:!isClientPortal?'#fff':'transparent',color:!isClientPortal?'#1a365d':'#718096',fontWeight:!isClientPortal?'600':'400',fontSize:'13px',cursor:'pointer',boxShadow:!isClientPortal?'0 1px 3px rgba(0,0,0,0.1)':'none',transition:'all 0.2s'}}>Inspector</button><button type="button" onClick={() => { if (!isClientPortal) onPortalSwitch(); }} style={{flex:1,padding:'8px',border:'none',borderRadius:'6px',background:isClientPortal?'#fff':'transparent',color:isClientPortal?'#1a365d':'#718096',fontWeight:isClientPortal?'600':'400',fontSize:'13px',cursor:'pointer',boxShadow:isClientPortal?'0 1px 3px rgba(0,0,0,0.1)':'none',transition:'all 0.2s'}}>Customer</button></div>)} {/* Tab Toggle */}
                          <div style={{
                    display: 'flex',
                    background: '#edf2f7',
                    borderRadius: '8px',
                    padding: '4px',
                    marginBottom: '24px',
        }}>
                                      <button
                                                    onClick={() => { setIsRegister(false); setError(''); }}
                                                    style={{
                                                                    flex: 1,
                                                                    padding: '8px',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
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
                                                                  flex: 1,
                                                                  padding: '8px',
                                                                  border: 'none',
                                                                  borderRadius: '6px',
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
                                  background: '#fed7d7',
                                  color: '#c53030',
                                  padding: '10px 14px',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  marginBottom: '16px',
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
                                                      type="text"
                                                      value={fullName}
                                                      onChange={e => setFullName(e.target.value)}
                                                      placeholder="John Smith"
                                                      style={inputStyle}
                                                    />
                                    <label style={labelStyle}>Company Name</label>
                                    <input
                                                      type="text"
                                                      value={companyName}
                                                      onChange={e => setCompanyName(e.target.value)}
                                                      placeholder="Smith Environmental LLC"
                                                      style={inputStyle}
                                                    />
                      </>
                    )}
                                  <label style={labelStyle}>Email</label>
                                  <input
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="you@company.com"
                                                required
                                                style={inputStyle}
                                              />
                                  <label style={labelStyle}>Password</label>
                                  <input
                                                type="password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder={isRegister ? 'Min 8 characters' : 'Your password'}
                                                required
                                                minLength={isRegister ? 8 : undefined}
                                                style={inputStyle}
                                              />
                        
                                  <button
                                                type="submit"
                                                disabled={loading}
                                                style={{
                                                                width: '100%',
                                                                padding: '12px',
                                                                background: loading ? '#a0aec0' : '#2c5282',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                fontSize: '15px',
                                                                fontWeight: '600',
                                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                                marginTop: '8px',
                                                                transition: 'background 0.2s',
                                                }}
                                              >
                                    {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
                                  </button>
                        
                          {!isRegister && onForgotPassword && (
                      <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                    <button
                                                      type="button"
                                                      onClick={onForgotPassword}
                                                      style={{
                                                                          background: 'none',
                                                                          border: 'none',
                                                                          color: '#2c5282',
                                                                          fontSize: '13px',
                                                                          fontWeight: '500',
                                                                          cursor: 'pointer',
                                                                          textDecoration: 'underline',
                                                                          padding: '4px 8px',
                                                      }}
                                                    >
                                                    Forgot password?
                                    </button>
                      </div>
                                  )}
                        </form>{onPlatformSwitch && (<div style={{textAlign:'center',marginTop:'16px',paddingTop:'12px',borderTop:'1px solid #edf2f7'}}><button type="button" onClick={onPlatformSwitch} style={{background:'none',border:'none',color:'#90cdf4',fontSize:'11px',fontWeight:'500',cursor:'pointer',textDecoration:'underline',padding:'2px 6px',opacity:0.75}}>Platform Admin</button></div>)}
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

