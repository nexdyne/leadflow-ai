import React, { useState, useEffect } from 'react';
import SignaturePad from './SignaturePad';

/**
 * SignatureCollectionPanel Component
 *
 * Collects required signatures (Inspector, Owner, Occupant) for an inspection report.
 *
 * Regulatory basis:
 *  - EPA 40 CFR 745.227(e)(10) — inspector/risk assessor signed certification that report
 *    is true, accurate, and prepared under their direct supervision.
 *  - Michigan Admin Rule R 325.99207 — inspection report contents, signature requirements.
 *  - Public Health Code Act 368 of 1978, Part 54A (MCL 333.5451–5477) — lead abatement licensure.
 *  - HUD 24 CFR 35.1300(e) — owner + adult occupant notice acknowledgment within 15 days of
 *    evaluation. Occupant signature is therefore REQUIRED when the project is HUD-assisted,
 *    a clearance exam, or an EBL investigation.
 *  - 40 CFR 745.227(h) — 3-year record retention.
 *
 * Props:
 *  - state: redux-like state — expects state.signatures, state.projectInfo
 *  - dispatch: dispatcher
 *  - projectType: one of 'standard_inspection' | 'risk_assessment' | 'clearance_exam'
 *                 | 'ebl_investigation' | 'hud_assisted' (drives occupant-required logic)
 */
const SignatureCollectionPanel = ({ state = {}, dispatch = () => {}, projectType }) => {
  const [expandedSigner, setExpandedSigner] = useState('inspector');

  // Derive project type from state if not passed explicitly
  const effectiveProjectType = projectType
    || state?.projectInfo?.projectType
    || state?.projectType
    || 'standard_inspection';

  // Occupant signature required for HUD-assisted, clearance exams, and EBL investigations
  // (HUD 24 CFR 35.1300(e) owner+adult-occupant ack; MDHHS LIRA-EBL parent/guardian ack).
  const occupantRequired = ['hud_assisted', 'clearance_exam', 'ebl_investigation'].includes(effectiveProjectType);

  const signatures = state?.signatures || {};
  const inspectorSig = signatures?.inspector;
  const ownerSig = signatures?.owner;
  const occupantSig = signatures?.occupant;

  // Persisted date signed (lives in redux state, not local-only)
  const initialDate = signatures?.dateSigned || new Date().toISOString().split('T')[0];
  const [dateSigned, setDateSigned] = useState(initialDate);

  // Sync back to redux when date changes
  useEffect(() => {
    if (signatures?.dateSigned !== dateSigned) {
      dispatch({ type: 'SET_SIGNATURE_DATE', payload: { dateSigned } });
    }
  }, [dateSigned]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill inspector name + license from project state
  const inspectorNameFromState =
    state?.projectInfo?.inspectorName
    || state?.projectInfo?.inspector?.name
    || state?.user?.fullName
    || '';
  const inspectorLicenseFromState =
    state?.projectInfo?.inspectorLicense
    || state?.projectInfo?.inspector?.licenseNumber
    || state?.user?.licenseNumber
    || '';
  const inspectorDesignation =
    state?.projectInfo?.inspectorDesignation
    || state?.user?.designation
    || 'lead_inspector';

  const ownerNameFromState = state?.projectInfo?.ownerName || '';
  const occupantNameFromState =
    state?.projectInfo?.occupantName
    || state?.projectInfo?.parentGuardianName // EBL
    || '';

  // All required collected?
  const allRequiredCollected = inspectorSig && ownerSig && (!occupantRequired || occupantSig);

  // Progress count
  const requiredCount = 2 + (occupantRequired ? 1 : 0);
  const collectedCount = (inspectorSig ? 1 : 0) + (ownerSig ? 1 : 0) + (occupantRequired && occupantSig ? 1 : 0);

  const toggleExpanded = (signer) => {
    setExpandedSigner(expandedSigner === signer ? null : signer);
  };

  const handleSignatureSave = (signatureData) => {
    if (dispatch) {
      dispatch({
        type: 'SAVE_SIGNATURE',
        payload: {
          signatureType: signatureData.signatureType,
          signatureData: {
            ...signatureData,
            // Persist inspector license for audit trail on inspector sig
            ...(signatureData.signatureType === 'inspector' && inspectorLicenseFromState
              ? { licenseNumber: inspectorLicenseFromState, designation: inspectorDesignation }
              : {})
          }
        }
      });
    }
  };

  const handleSignatureClear = (signatureType) => {
    if (dispatch) {
      dispatch({
        type: 'CLEAR_SIGNATURE',
        payload: { signatureType }
      });
    }
  };

  const StatusBadge = ({ isCollected, isRequired }) => {
    if (isCollected) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-xs font-medium text-green-700">Collected</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
        <span className="text-xs font-medium text-gray-600">
          {isRequired ? 'Required' : 'Optional'}
        </span>
      </div>
    );
  };

  const SignatureSection = ({
    title,
    signatureType,
    savedSignature,
    prefilledName,
    isRequired = true,
    showInfo = false,
    certificationBlock = null
  }) => {
    const isExpanded = expandedSigner === signatureType;
    const isCollected = !!savedSignature;

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <button
          onClick={() => toggleExpanded(signatureType)}
          className="w-full px-4 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          aria-expanded={isExpanded}
          aria-controls={`sig-section-${signatureType}`}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 text-left">
              <h3 className="text-base font-semibold text-gray-900">
                {title}
                {isRequired && <span className="text-red-500 ml-1" aria-label="required">*</span>}
              </h3>
              {showInfo && savedSignature && (
                <p className="text-xs text-gray-600 mt-1">
                  {savedSignature.signerName} • {new Date(savedSignature.timestamp).toLocaleDateString()}
                  {savedSignature.licenseNumber && ` • Lic. ${savedSignature.licenseNumber}`}
                </p>
              )}
            </div>
            <StatusBadge isCollected={isCollected} isRequired={isRequired} />
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>

        {isExpanded && (
          <div id={`sig-section-${signatureType}`} className="px-4 py-6 border-t border-gray-200 bg-white">
            {certificationBlock}

            {isCollected ? (
              <div className="space-y-4">
                <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <img
                    src={savedSignature.dataUrl}
                    alt={`${signatureType} signature`}
                    className="w-full max-h-48 object-contain bg-white"
                  />
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-gray-700"><span className="font-medium">Signer:</span> {savedSignature.signerName}</p>
                    <p className="text-gray-700"><span className="font-medium">Type:</span> {savedSignature.signatureType}</p>
                    {savedSignature.licenseNumber && (
                      <p className="text-gray-700"><span className="font-medium">License:</span> {savedSignature.licenseNumber}</p>
                    )}
                    {savedSignature.method && (
                      <p className="text-gray-700"><span className="font-medium">Method:</span> {savedSignature.method}</p>
                    )}
                    {savedSignature.consented !== null && savedSignature.consented !== undefined && (
                      <p className="text-gray-700">
                        <span className="font-medium">ESIGN/UETA consent:</span>{' '}
                        {savedSignature.consented ? 'Acknowledged' : 'Not required'}
                      </p>
                    )}
                    <p className="text-gray-600 text-xs">
                      <span className="font-medium">Signed:</span> {new Date(savedSignature.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleExpanded(signatureType)}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Collapse
                </button>
              </div>
            ) : (
              <div>
                <SignaturePad
                  signatureType={signatureType}
                  signerName={prefilledName || ''}
                  onSave={handleSignatureSave}
                  onClear={() => handleSignatureClear(signatureType)}
                  existingSignature={null}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // EPA 40 CFR 745.227(e)(10) + Michigan R 325.99207 inspector certification
  const inspectorCertification = (
    <div className="mb-4 p-4 border-l-4 border-blue-600 bg-blue-50 rounded">
      <p className="text-sm font-semibold text-blue-900 mb-2">
        Inspector / Risk Assessor Certification — 40 CFR 745.227(e)(10), R 325.99207
      </p>
      <p className="text-xs text-gray-800 leading-relaxed">
        I certify under penalty of applicable federal and Michigan law that I am currently licensed
        and accredited by EPA (or an authorized state program) and by the State of Michigan under
        Public Health Code Act 368 of 1978, Part 54A (MCL 333.5451–5477) to perform the lead-based
        paint activities described in this report. I further certify that this report is true,
        accurate, and complete to the best of my knowledge, that all sampling, measurements, and
        analyses were performed in accordance with the procedures specified in 40 CFR 745.227 and
        Michigan Administrative Rules R 325.99101 – R 325.99403, and that the work was performed
        by me or under my direct supervision. I understand that knowingly falsifying this report
        is grounds for license revocation and may subject me to civil and criminal penalties.
      </p>
      {inspectorLicenseFromState && (
        <p className="text-xs text-blue-900 mt-2 font-mono">
          License #: {inspectorLicenseFromState}
        </p>
      )}
    </div>
  );

  // Owner acknowledgment — consistent with HUD 24 CFR 35.1300(e) notice delivery
  const ownerCertification = (
    <div className="mb-4 p-4 border-l-4 border-slate-500 bg-slate-50 rounded">
      <p className="text-sm font-semibold text-slate-900 mb-2">
        Property Owner Acknowledgment
      </p>
      <p className="text-xs text-gray-800 leading-relaxed">
        I acknowledge that I have received a copy of this lead-based paint inspection or risk
        assessment report as required by 40 CFR 745.227, and (where applicable) the notice of
        lead hazard evaluation required by HUD 24 CFR 35.1300(e). I understand that a copy of
        this report must be retained for a minimum of three (3) years pursuant to 40 CFR 745.227(h)
        and must be disclosed to prospective purchasers and lessees as required by 42 U.S.C.
        § 4852d and 40 CFR Part 745 Subpart F.
      </p>
    </div>
  );

  // Occupant / parent-guardian acknowledgment — HUD + MDHHS EBL
  const occupantCertification = (
    <div className="mb-4 p-4 border-l-4 border-slate-500 bg-slate-50 rounded">
      <p className="text-sm font-semibold text-slate-900 mb-2">
        {effectiveProjectType === 'ebl_investigation'
          ? 'Parent / Guardian Acknowledgment (MDHHS LIRA-EBL)'
          : 'Adult Occupant Acknowledgment'}
      </p>
      <p className="text-xs text-gray-800 leading-relaxed">
        {effectiveProjectType === 'ebl_investigation'
          ? 'I am the parent or legal guardian of the child identified in this Lead Investigation Report (LIRA-EBL Form 633775) and I acknowledge receipt of this report. I understand that the Michigan Department of Health and Human Services may use this information to coordinate follow-up medical and environmental services for my child, and that this report may be shared with my local health department under MDHHS policy.'
          : 'I am an adult occupant of the dwelling and I acknowledge that I have received, or been offered, a copy of the notice of lead hazard evaluation for this property as required by HUD 24 CFR 35.1300(e). I understand I may request a full copy of the inspection report from the property owner.'}
      </p>
    </div>
  );

  const projectTypeLabel = {
    standard_inspection: 'Standard Inspection',
    risk_assessment: 'Risk Assessment',
    clearance_exam: 'Clearance Examination',
    ebl_investigation: 'EBL Investigation (LIRA-EBL)',
    hud_assisted: 'HUD-Assisted Property'
  }[effectiveProjectType] || 'Standard Inspection';

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <h2 className="text-2xl font-bold text-blue-900">Signature Collection</h2>
        <p className="text-sm text-gray-700 mt-2">
          All signatures required to finalize this inspection report ({projectTypeLabel})
        </p>
      </div>

      {/* All Signatures Collected Banner */}
      {allRequiredCollected && (
        <div className="mx-6 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">All required signatures collected</p>
            <p className="text-xs text-green-700">This inspection report is ready for certification and submission</p>
          </div>
        </div>
      )}

      {/* Date Signed Field — now persisted to redux */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <label className="block text-sm font-medium text-gray-900 mb-2" htmlFor="signature-date">
          Date Signed
        </label>
        <input
          id="signature-date"
          type="date"
          value={dateSigned}
          onChange={(e) => setDateSigned(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Retained under 40 CFR 745.227(h) for a minimum of three (3) years.
        </p>
      </div>

      {/* Signature Sections */}
      <div className="px-6 py-6">
        <SignatureSection
          title="Inspector / Risk Assessor Signature"
          signatureType="inspector"
          savedSignature={inspectorSig}
          prefilledName={inspectorNameFromState}
          isRequired={true}
          showInfo={true}
          certificationBlock={inspectorCertification}
        />

        <SignatureSection
          title="Property Owner Signature"
          signatureType="owner"
          savedSignature={ownerSig}
          prefilledName={ownerNameFromState}
          isRequired={true}
          showInfo={true}
          certificationBlock={ownerCertification}
        />

        <SignatureSection
          title={effectiveProjectType === 'ebl_investigation'
            ? 'Parent / Guardian Signature'
            : 'Occupant Signature'}
          signatureType="occupant"
          savedSignature={occupantSig}
          prefilledName={occupantNameFromState}
          isRequired={occupantRequired}
          showInfo={true}
          certificationBlock={occupantCertification}
        />
      </div>

      {/* General legal text */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-gray-700 leading-relaxed text-justify">
            <span className="font-semibold block mb-2">Electronic Signature Notice</span>
            Electronic signatures captured on this form have the same legal effect as handwritten
            signatures under the federal ESIGN Act (15 U.S.C. § 7001) and the Michigan Uniform
            Electronic Transactions Act (MCL 450.831 et seq.). Each signer has affirmatively
            consented to sign electronically. Signed records are retained in reproducible form
            under 40 CFR 745.227(h).
          </p>
        </div>
      </div>

      {/* Footer Status */}
      <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {allRequiredCollected ? (
            <span className="text-green-700 font-medium">
              Ready for submission ✓
            </span>
          ) : (
            <span>
              <span className="font-medium">Progress:</span>{' '}
              {collectedCount} of {requiredCount} required signatures
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignatureCollectionPanel;
