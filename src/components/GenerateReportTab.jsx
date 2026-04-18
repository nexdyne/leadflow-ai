import React, { useState } from 'react';
import { generateHazards } from '../engine/hazardAnalysis';
import { generateReport } from '../engine/reportGenerator';
import { generateDocxReport } from '../engine/docxReportGenerator';
import { generatePdfReport } from '../engine/pdfReportGenerator';

function GenerateReportTab({ state, dispatch }) {
  const [generating, setGenerating] = useState(false);
  const [lastFile, setLastFile] = useState(null);

  const runHazardAnalysis = () => {
    const hazards = generateHazards(state.xrfData, state.dustWipeSamples, state.soilSamples);
    dispatch({ type: 'GENERATE_HAZARDS', payload: hazards });
    return hazards;
  };

  const handleGenerateDocx = async () => {
    setGenerating(true);
    setLastFile(null);
    try {
      const hazards = runHazardAnalysis();
      const filename = await generateDocxReport(state, hazards);
      setLastFile(filename);
    } catch (err) {
      console.error('DOCX generation failed:', err);
      alert('Error generating DOCX: ' + err.message);
    }
    setGenerating(false);
  };

  const handleGenerateHtml = () => {
    const hazards = runHazardAnalysis();
    generateReport(state, hazards);
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    setLastFile(null);
    try {
      const hazards = runHazardAnalysis();
      const filename = await generatePdfReport(state, hazards);
      setLastFile(filename);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Error generating PDF: ' + err.message);
    }
    setGenerating(false);
  };

  // Quick compliance summary (mirrors ComplianceTab logic)
  const pi = state.projectInfo || {};
  const isRA = (pi.inspectionType || 'Risk Assessment') !== 'LBP Inspection Only';
  const isEBL = pi.programType === 'EBL';
  const isMedicaid = pi.programType === 'Medicaid';

  const isComplete = {
    inspector: !!pi.inspectorName && !!pi.inspectorCert && !!pi.companyName,
    xrfDevice: !!pi.xrfModel && !!pi.xrfSerial,
    property: !!pi.propertyAddress && !!pi.city && !!pi.yearBuilt && !!pi.inspectionDate,
    xrfData: state.xrfData.length > 0,
    labResults: !isRA || ((state.dustWipeSamples || []).length > 0 && !!state.labName),
    photos: (state.photos || []).length > 0,
    hazards: state.hazards.length > 0
  };

  const completionCount = Object.values(isComplete).filter(Boolean).length;
  const totalItems = 7;
  const canGenerate = completionCount >= 4; // Need at least property, inspector, XRF device, and data

  // Count critical compliance gaps
  const complianceWarnings = [];
  if (!pi.inspectorCert) complianceWarnings.push('Missing inspector certification number');
  if (!pi.xrfSerial) complianceWarnings.push('Missing XRF serial number');
  if (isRA && (state.dustWipeSamples || []).length === 0) complianceWarnings.push('No dust wipe samples (required for Risk Assessment)');
  if (isRA && (state.soilSamples || []).length === 0) complianceWarnings.push('No soil samples (required for Risk Assessment)');
  if ((state.photos || []).length === 0) complianceWarnings.push('No photos uploaded for Appendix D');
  if (isRA && !state.labName) complianceWarnings.push('Lab name missing (required for Risk Assessment)');
  if ((isEBL || isMedicaid) && !(state.photos || []).some(function(p) { return p.category === 'child_sleep'; })) {
    complianceWarnings.push('Missing child sleeping area photo (required for ' + pi.programType + ')');
  }

  return (
    <div className="space-y-6">
      {/* Completion Checklist */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">Completion Checklist</h3>
        <div className="space-y-2">
          {[
            { key: 'inspector', label: 'Inspector certification included' },
            { key: 'xrfDevice', label: 'XRF device information complete' },
            { key: 'property', label: 'Property information complete' },
            { key: 'xrfData', label: 'XRF data uploaded' },
            { key: 'labResults', label: 'Lab results entered (optional for LBP Inspection)' },
            { key: 'photos', label: 'Photos uploaded for Appendix D Photo Log' },
            { key: 'hazards', label: 'Hazard analysis run (auto-runs on generate)' }
          ].map(item => (
            <div key={item.key} className="flex items-center gap-2">
              {isComplete[item.key] ? (
                <span className="text-green-600 text-xl">{'\u2713'}</span>
              ) : (
                <span className="text-red-600 text-xl">{'\u2717'}</span>
              )}
              <span className={isComplete[item.key] ? 'text-green-700' : 'text-red-700'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm">
          <div className="font-semibold">Progress: {completionCount}/{totalItems} items complete</div>
          <div className="w-full bg-gray-300 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: (completionCount / totalItems) * 100 + '%' }}
            />
          </div>
        </div>
      </div>

      {/* Compliance Warnings */}
      {complianceWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">{'\u26A0\uFE0F'} Compliance Warnings ({complianceWarnings.length})</h3>
          <p className="text-xs text-yellow-700 mb-2">
            Review the Compliance tab for full details. These items should be addressed before final report delivery:
          </p>
          <div className="space-y-1">
            {complianceWarnings.map(function(w, i) {
              return (
                <div key={i} className="flex items-center gap-2 text-sm text-yellow-800">
                  <span className="text-yellow-500">{'\u2022'}</span>
                  <span>{w}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-lg">Export Report</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* DOCX Export - Primary */}
          <button
            onClick={handleGenerateDocx}
            disabled={!canGenerate || generating}
            className={
              'flex flex-col items-center px-6 py-5 rounded-lg font-bold text-lg transition border-2 ' +
              (!canGenerate || generating
                ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 border-blue-500 text-blue-700 hover:bg-blue-100 hover:border-blue-600')
            }
          >
            <span className="text-3xl mb-2">{'\uD83D\uDCC4'}</span>
            <span>{generating ? 'Generating...' : 'Download DOCX'}</span>
            <span className="text-xs font-normal mt-1 text-gray-500">Word Document - Recommended</span>
          </button>

          {/* PDF Export */}
          <button
            onClick={handleGeneratePdf}
            disabled={!canGenerate || generating}
            className={
              'flex flex-col items-center px-6 py-5 rounded-lg font-bold text-lg transition border-2 ' +
              (!canGenerate || generating
                ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                : 'bg-red-50 border-red-400 text-red-700 hover:bg-red-100 hover:border-red-500')
            }
          >
            <span className="text-3xl mb-2">{'\uD83D\uDCD5'}</span>
            <span>{generating ? 'Generating...' : 'Download PDF'}</span>
            <span className="text-xs font-normal mt-1 text-gray-500">Direct PDF download</span>
          </button>

          {/* HTML Preview */}
          <button
            onClick={handleGenerateHtml}
            disabled={!canGenerate}
            className={
              'flex flex-col items-center px-6 py-5 rounded-lg font-bold text-lg transition border-2 ' +
              (!canGenerate
                ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                : 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100 hover:border-green-500')
            }
          >
            <span className="text-3xl mb-2">{'\uD83D\uDD0D'}</span>
            <span>HTML Preview</span>
            <span className="text-xs font-normal mt-1 text-gray-500">Opens in new tab</span>
          </button>
        </div>

        {lastFile && (
          <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-3">
            <p className="text-sm text-green-800">
              {'\u2713'} Report downloaded: <strong>{lastFile}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Help text */}
      {!canGenerate && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Complete at least the property info, inspector details, XRF device info, and upload XRF data before generating a report.
          </p>
        </div>
      )}

      {canGenerate && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong>DOCX (Recommended):</strong> Downloads a professionally formatted Word document with your company header, all data tables, hazard analysis, and certification page. Editable before client delivery.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <strong>PDF:</strong> Downloads a formatted PDF version of the report directly to your computer. Great for final client delivery.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <strong>HTML Preview:</strong> Quick preview of the report in your browser. Great for reviewing before exporting the final version.
          </p>
        </div>
      )}
    </div>
  );
}

export default GenerateReportTab;
