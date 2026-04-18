import React, { useState } from 'react';
import SignaturePad from './SignaturePad';

/**
 * SignatureCollectionPanel Component
 *
 * Collects all required signatures (Inspector, Owner, Occupant) for an inspection report
 * Uses SignaturePad components for each signer
 *
 * Props:
 * - state: Redux state object containing signatures
 * - dispatch: Redux dispatch function
 */
const SignatureCollectionPanel = ({ state = {}, dispatch = () => {} }) => {
  const [expandedSigner, setExpandedSigner] = useState('inspector');
  const [dateSigned, setDateSigned] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Extract saved signatures from state
  const signatures = state?.signatures || {};
  const inspectorSig = signatures?.inspector;
  const ownerSig = signatures?.owner;
  const occupantSig = signatures?.occupant;

  // Determine if all required signatures are collected
  const allSignaturesCollected = inspectorSig && ownerSig;

  // Toggle section expansion
  const toggleExpanded = (signer) => {
    setExpandedSigner(expandedSigner === signer ? null : signer);
  };

  // Handle signature save
  const handleSignatureSave = (signatureData) => {
    if (dispatch) {
      dispatch({
        type: 'SAVE_SIGNATURE',
        payload: {
          signatureType: signatureData.signatureType,
          signatureData
        }
      });
    }
  };

  // Handle signature clear
  const handleSignatureClear = (signatureType) => {
    if (dispatch) {
      dispatch({
        type: 'CLEAR_SIGNATURE',
        payload: { signatureType }
      });
    }
  };

  // Status badge component
  const StatusBadge = ({ isCollected }) => {
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
        <span className="text-xs font-medium text-gray-600">Pending</span>
      </div>
    );
  };

  // Signature section component
  const SignatureSection = ({
    title,
    signatureType,
    savedSignature,
    isRequired = true,
    showInfo = false
  }) => {
    const isExpanded = expandedSigner === signatureType;
    const isCollected = !!savedSignature;

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        {/* Section Header */}
        <button
          onClick={() => toggleExpanded(signatureType)}
          className="w-full px-4 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">
                {title}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </h3>
              {showInfo && savedSignature && (
                <p className="text-xs text-gray-600 mt-1">
                  {savedSignature.signerName} • {new Date(savedSignature.timestamp).toLocaleDateString()}
                </p>
              )}
            </div>
            <StatusBadge isCollected={isCollected} />
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
              isExpanded ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>

        {/* Section Content */}
        {isExpanded && (
          <div className="px-4 py-6 border-t border-gray-200 bg-white">
            {isCollected ? (
              <div className="space-y-4">
                <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <img
                    src={savedSignature.dataUrl}
                    alt={`${signatureType} signature`}
                    className="w-full max-h-48 object-contain"
                  />
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">Signer:</span> {savedSignature.signerName}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium">Type:</span> {savedSignature.signatureType}
                    </p>
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
                  signerName=""
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

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <h2 className="text-2xl font-bold text-blue-900">Signature Collection</h2>
        <p className="text-sm text-gray-700 mt-2">
          All signatures required to finalize this inspection report
        </p>
      </div>

      {/* All Signatures Collected Banner */}
      {allSignaturesCollected && (
        <div className="mx-6 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">
              All signatures collected
            </p>
            <p className="text-xs text-green-700">
              This inspection report is ready for submission
            </p>
          </div>
        </div>
      )}

      {/* Date Signed Field */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Date Signed
        </label>
        <input
          type="date"
          value={dateSigned}
          onChange={(e) => setDateSigned(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Signature Sections */}
      <div className="px-6 py-6">
        <SignatureSection
          title="Inspector Signature"
          signatureType="inspector"
          savedSignature={inspectorSig}
          isRequired={true}
          showInfo={true}
        />

        <SignatureSection
          title="Property Owner Signature"
          signatureType="owner"
          savedSignature={ownerSig}
          isRequired={true}
          showInfo={true}
        />

        <SignatureSection
          title="Occupant Signature"
          signatureType="occupant"
          savedSignature={occupantSig}
          isRequired={false}
          showInfo={true}
        />
      </div>

      {/* Legal Text */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-gray-700 leading-relaxed text-justify">
            <span className="font-semibold block mb-2">Acknowledgment</span>
            By signing above, I acknowledge that this document has been reviewed and the information is accurate to the best of my knowledge. I understand that providing false or misleading information may result in legal consequences.
          </p>
        </div>
      </div>

      {/* Footer Status */}
      <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {allSignaturesCollected ? (
            <span className="text-green-700 font-medium">
              Ready for submission ✓
            </span>
          ) : (
            <span>
              <span className="font-medium">Progress:</span>{' '}
              {Object.keys(signatures).length} of 2 required signatures
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignatureCollectionPanel;
