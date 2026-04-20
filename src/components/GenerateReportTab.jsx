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

  // Fetch a site location map image as base64 data URL
  const fetchSiteMap = async (address, city, stateCode, zip) => {
    try {
      const query = encodeURIComponent(`${address}, ${city}, ${stateCode} ${zip}`);
      // Use Nominatim (OpenStreetMap) for geocoding — free, no API key
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
        headers: { 'User-Agent': 'LeadFlowAI/1.0' },
      });
      const geoData = await geoRes.json();
      if (!geoData || geoData.length === 0) return null;

      const lat = geoData[0].lat;
      const lon = geoData[0].lon;
      // Use OSM static map tile — render a canvas with tile + marker
      const zoom = 16;
      const tileX = Math.floor((parseFloat(lon) + 180) / 360 * Math.pow(2, zoom));
      const tileY = Math.floor((1 - Math.log(Math.tan(parseFloat(lat) * Math.PI / 180) + 1 / Math.cos(parseFloat(lat) * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      // Load center tile + surrounding tiles for a 640x480 map
      const tilePromises = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          const p = new Promise((resolve) => {
            img.onload = () => resolve({ img, dx, dy });
            img.onerror = () => resolve(null);
          });
          img.src = `https://tile.openstreetmap.org/${zoom}/${tileX + dx}/${tileY + dy}.png`;
          tilePromises.push(p);
        }
      }

      const tiles = await Promise.all(tilePromises);
      const offsetX = 320 - 128;
      const offsetY = 240 - 128;
      tiles.forEach(t => {
        if (t) ctx.drawImage(t.img, offsetX + t.dx * 256, offsetY + t.dy * 256, 256, 256);
      });

      // Draw red marker at center
      ctx.fillStyle = '#CC0000';
      ctx.beginPath();
      ctx.arc(320, 240, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(320, 240, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Add label
      ctx.font = 'bold 13px Arial';
      ctx.fillStyle = '#1B3A5C';
      ctx.fillRect(180, 440, 280, 28);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(address + ', ' + city, 320, 458);

      return canvas.toDataURL('image/png');
    } catch (err) {
      console.warn('Site map generation failed:', err);
      return null;
    }
  };

  const handleGenerateDocx = async () => {
    setGenerating(true);
    setLastFile(null);
    try {
      const hazards = runHazardAnalysis();

      // Try to fetch site location map
      const pi = state.projectInfo;
      let reportState = { ...state };
      if (pi.propertyAddress && pi.city) {
        const mapData = await fetchSiteMap(pi.propertyAddress, pi.city, pi.state || 'MI', pi.zip);
        if (mapData) reportState._siteMapImageData = mapData;
      }

      const filename = await generateDocxReport(reportState, hazards);
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

  const surveyFieldCount = Object.keys(state.buildingSurvey || {}).filter(k => state.buildingSurvey[k]).length;
  const interviewFieldCount = Object.keys(state.residentInterview || {}).filter(k => state.residentInterview[k]).length;

  const isComplete = {
    inspector: !!pi.inspectorName && !!pi.inspectorCert && !!pi.companyName,
    xrfDevice: !!pi.xrfModel && !!pi.xrfSerial,
    property: !!pi.propertyAddress && !!pi.city && !!pi.yearBuilt && !!pi.inspectionDate,
    xrfData: state.xrfData.length > 0,
    labResults: !isRA || ((state.dustWipeSamples || []).length > 0 && !!state.labName),
    photos: (state.photos || []).length > 0,
    buildingSurvey: surveyFieldCount >= 10,
    residentInterview: interviewFieldCount >= 8,
    hazards: state.hazards.length > 0
  };

  const completionCount = Object.values(isComplete).filter(Boolean).length;
  const totalItems = 9;
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
            { key: 'buildingSurvey', label: 'Building condition survey completed (10+ fields)' },
            { key: 'residentInterview', label: 'Resident interview completed (8+ fields)' },
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
