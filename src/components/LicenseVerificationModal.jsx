import { useState } from 'react';

const DESIGNATION_LABELS = {
  lead_inspector: 'Lead Inspector',
  lead_risk_assessor: 'Lead Risk Assessor',
  ebl_investigator: 'EBL Investigator',
  clearance_technician: 'Clearance Technician',
  abatement_supervisor: 'Lead Abatement Supervisor',
  abatement_worker: 'Lead Abatement Worker',
  project_designer: 'Lead Project Designer',
};

/**
 * LicenseVerificationModal
 *
 * A popup dialog that asks for a Michigan LARA license number (P-XXXXX)
 * and verifies it before allowing a designation to be saved.
 *
 * Props:
 *   designation  – the selected designation key
 *   onVerify     – async fn(designation, licenseNumber) => result
 *   onClose      – fn() to close modal
 *   onSuccess    – fn(result) called after successful verification
 *   title        – optional override for modal title
 */
export default function LicenseVerificationModal({ designation, onVerify, onClose, onSuccess, title }) {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const label = DESIGNATION_LABELS[designation] || designation;

  async function handleVerify(e) {
    e.preventDefault();
    if (!licenseNumber.trim()) return;

    setVerifying(true);
    setError('');
    setResult(null);

    try {
      const res = await onVerify(designation, licenseNumber.trim());
      setResult(res);

      // If the verification succeeded (result has success:true or verification.status === 'active' or 'pending')
      if (res.success || res.verified || (res.verification && ['active', 'pending'].includes(res.verification.status))) {
        // Brief delay so user can see the result, then close
        setTimeout(() => {
          if (onSuccess) onSuccess(res);
        }, 1500);
      }
    } catch (err) {
      const msg = err?.message || 'Verification failed';
      // Try to parse server error
      try {
        const parsed = JSON.parse(err.message || '{}');
        setError(parsed.error || msg);
        if (parsed.verification) setResult(parsed.verification);
      } catch {
        setError(msg);
      }
    } finally {
      setVerifying(false);
    }
  }

  const isSuccess = result && (result.success || result.verified ||
    (result.verification && ['active', 'pending'].includes(result.verification?.status)));
  const verificationObj = result?.verification || result;

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        {/* Header */}
        <div style={modalHeader}>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a365d' }}>
            {title || 'License Verification Required'}
          </div>
          <button onClick={onClose} style={closeBtn}>&times;</button>
        </div>

        {/* Body */}
        <div style={modalBody}>
          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#4a5568' }}>
            To set <strong>{label}</strong> as your designation, please enter your Michigan LARA
            professional license number for verification.
          </div>

          <form onSubmit={handleVerify}>
            <label style={labelStyle}>Michigan Lead Professional License Number</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={e => setLicenseNumber(e.target.value.toUpperCase())}
              placeholder="P-12345"
              disabled={verifying}
              autoFocus
              style={inputStyle}
            />
            <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>
              Your state license number typically starts with P- followed by digits
            </div>

            {/* Error message */}
            {error && (
              <div style={errorBox}>
                {error}
              </div>
            )}

            {/* Verification result */}
            {verificationObj && !error && (
              <div style={{
                ...resultBox,
                borderColor: isSuccess ? '#38a169' : '#e53e3e',
                background: isSuccess ? '#f0fff4' : '#fff5f5',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '18px',
                    color: isSuccess ? '#38a169' : '#e53e3e',
                  }}>
                    {isSuccess ? '\u2713' : '\u2717'}
                  </span>
                  <strong style={{
                    color: isSuccess ? '#276749' : '#c53030',
                    fontSize: '14px',
                  }}>
                    {verificationObj.status === 'active' ? 'License Verified — Active' :
                     verificationObj.status === 'pending' ? 'Saved — Pending Manual Verification' :
                     verificationObj.status === 'inactive' ? 'License Inactive / Not in Good Standing' :
                     verificationObj.status === 'not_found' ? 'License Not Found' :
                     verificationObj.status === 'expired' ? 'License Expired' :
                     'Verification Result'}
                  </strong>
                </div>
                <div style={{ fontSize: '13px', color: '#4a5568' }}>
                  {verificationObj.message || ''}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={btnCancel} disabled={verifying}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifying || !licenseNumber.trim() || isSuccess}
                style={{
                  ...btnVerify,
                  opacity: (verifying || !licenseNumber.trim()) ? 0.6 : 1,
                  cursor: (verifying || !licenseNumber.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {verifying ? 'Verifying with LARA...' : isSuccess ? 'Verified!' : 'Verify License'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────
const overlay = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  padding: '20px',
};
const modal = {
  background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
};
const modalHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
  background: 'linear-gradient(135deg, #ebf8ff 0%, #e9d8fd 100%)',
};
const closeBtn = {
  background: 'none', border: 'none', fontSize: '22px', color: '#718096',
  cursor: 'pointer', padding: '0 4px', lineHeight: 1,
};
const modalBody = {
  padding: '20px',
};
const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '600', color: '#2d3748',
  marginBottom: '6px',
};
const inputStyle = {
  width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0',
  borderRadius: '8px', fontSize: '16px', fontFamily: 'monospace',
  letterSpacing: '1px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};
const errorBox = {
  marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
  background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030',
  fontSize: '13px',
};
const resultBox = {
  marginTop: '12px', padding: '12px 14px', borderRadius: '8px',
  border: '2px solid',
};
const btnCancel = {
  padding: '8px 16px', background: '#edf2f7', color: '#4a5568',
  border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px',
  fontWeight: '500', cursor: 'pointer',
};
const btnVerify = {
  padding: '8px 20px', background: '#2c5282', color: '#fff',
  border: 'none', borderRadius: '8px', fontSize: '13px',
  fontWeight: '600',
};
