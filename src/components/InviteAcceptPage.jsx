import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTeam } from '../hooks/useTeam.js';

export default function InviteAcceptPage({ token, onDone }) {
  const { isAuthenticated, refreshProfile } = useAuth();
  const { getInviteDetails, acceptInvite, loading, error } = useTeam();

  const [invite, setInvite] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  useEffect(() => {
    if (token) {
      getInviteDetails(token)
        .then(data => setInvite(data))
        .catch(() => {}); // error set in hook
    }
  }, [token, getInviteDetails]);

  async function handleAccept() {
    setAcceptError('');
    try {
      await acceptInvite(token);
      setAccepted(true);
      await refreshProfile();
    } catch (err) {
      setAcceptError(err.message || 'Failed to accept invite');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #2b6cb0 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '40px',
        width: '100%', maxWidth: '460px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a365d', marginBottom: '4px' }}>
            LeadFlow AI
          </div>
          <div style={{ color: '#718096', fontSize: '14px' }}>Team Invitation</div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
            Loading invite details...
          </div>
        )}

        {error && !invite && (
          <div style={{
            background: '#fed7d7', color: '#c53030', padding: '14px',
            borderRadius: '8px', fontSize: '14px', textAlign: 'center',
          }}>
            {error.includes('expired') ? 'This invite has expired.' :
             error.includes('revoked') ? 'This invite has been revoked.' :
             'This invite link is invalid or has expired.'}
            <div style={{ marginTop: '12px' }}>
              <button onClick={onDone} style={btnSecondary}>Go to Dashboard</button>
            </div>
          </div>
        )}

        {invite && !accepted && (
          <>
            <div style={{
              background: '#f7fafc', borderRadius: '8px', padding: '20px',
              marginBottom: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                You've been invited to join
              </div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#1a365d', marginBottom: '4px' }}>
                {invite.teamName}
              </div>
              <div style={{ fontSize: '14px', color: '#718096' }}>
                as <strong style={{ textTransform: 'capitalize', color: '#2d3748' }}>{invite.role}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#a0aec0', marginTop: '8px' }}>
                Invited by {invite.invitedByName || 'a team admin'}
              </div>
            </div>

            {!isAuthenticated && (
              <div style={{
                background: '#fefcbf', color: '#975a16', padding: '12px',
                borderRadius: '6px', fontSize: '13px', marginBottom: '16px',
              }}>
                You need to sign in or create an account to accept this invite.
                <div style={{ marginTop: '8px' }}>
                  <button onClick={onDone} style={btnPrimary}>Sign In / Register</button>
                </div>
              </div>
            )}

            {isAuthenticated && (
              <>
                {acceptError && (
                  <div style={{
                    background: '#fed7d7', color: '#c53030', padding: '10px',
                    borderRadius: '6px', fontSize: '13px', marginBottom: '12px',
                  }}>{acceptError}</div>
                )}
                <button onClick={handleAccept} style={{ ...btnPrimary, width: '100%', padding: '12px', fontSize: '15px' }}>
                  Accept Invite
                </button>
                <button onClick={onDone} style={{ ...btnSecondary, width: '100%', padding: '10px', marginTop: '8px' }}>
                  Decline
                </button>
              </>
            )}
          </>
        )}

        {accepted && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '48px', marginBottom: '12px',
            }}>✓</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#276749', marginBottom: '8px' }}>
              Welcome to {invite?.teamName}!
            </div>
            <div style={{ fontSize: '14px', color: '#718096', marginBottom: '20px' }}>
              You've joined the team as {invite?.role}. You can now access shared projects.
            </div>
            <button onClick={onDone} style={{ ...btnPrimary, padding: '10px 24px' }}>
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const btnPrimary = {
  padding: '8px 16px', background: '#2c5282', color: '#fff', border: 'none',
  borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
};
const btnSecondary = {
  padding: '8px 16px', background: '#edf2f7', color: '#2d3748', border: '1px solid #e2e8f0',
  borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
};
