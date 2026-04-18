import { THRESHOLDS } from './constants';

// Opens report in a new tab using a blob URL (avoids popup blocking)
export function generateReport(state, hazards) {
  const html = generateReportHTML(state, hazards);
  var blob = new Blob([html], { type: 'text/html' });
  var url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function generateReportHTML(state, hazards) {
  const { projectInfo, xrfData, dustWipeSamples, soilSamples } = state;
  const positiveXrf = xrfData.filter(d => d.result >= THRESHOLDS.xrf_paint);

  const hazardSummary = {
    severity1: hazards.filter(h => h.severity === 1).length,
    severity2: hazards.filter(h => h.severity === 2).length,
    severity3: hazards.filter(h => h.severity === 3).length
  };

  const executiveSummary = 'This Lead-Based Paint (LBP) ' + projectInfo.inspectionType +
    ' was conducted on ' + projectInfo.inspectionDate +
    ' at ' + projectInfo.propertyAddress + ', ' + projectInfo.city + ', MI ' + projectInfo.zip +
    '. The property was built in ' + projectInfo.yearBuilt + '. ' +
    positiveXrf.length + ' positive lead-based paint readings were identified using ' + projectInfo.xrfModel +
    '. ' + hazards.length + ' total hazards were identified, including ' +
    hazardSummary.severity1 + ' Severity 1 hazard(s), ' +
    hazardSummary.severity2 + ' Severity 2 hazard(s), and ' +
    hazardSummary.severity3 + ' Severity 3 hazard(s). Abatement is recommended for all identified hazards.';

  // Build XRF rows
  var xrfRows = xrfData.map(function(reading) {
    var cls = reading.result >= THRESHOLDS.xrf_paint ? 'positive' : 'negative';
    var status = reading.result >= THRESHOLDS.xrf_paint ? 'POSITIVE' : 'NEGATIVE';
    return '<tr class="' + cls + '">' +
      '<td>' + reading.room + '</td>' +
      '<td>' + reading.component + '</td>' +
      '<td>' + reading.side + '</td>' +
      '<td>' + reading.condition + '</td>' +
      '<td style="text-align: right;">' + reading.result.toFixed(2) + '</td>' +
      '<td>' + status + '</td>' +
      '</tr>';
  }).join('');

  // Build positive XRF rows
  var positiveXrfRows = positiveXrf.map(function(reading) {
    return '<tr class="positive">' +
      '<td>' + reading.room + '</td>' +
      '<td>' + reading.component + '</td>' +
      '<td>' + reading.side + '</td>' +
      '<td>' + reading.condition + '</td>' +
      '<td style="text-align: right;">' + reading.result.toFixed(2) + '</td>' +
      '</tr>';
  }).join('');

  // Build dust wipe section
  var dustSection = dustWipeSamples.length > 0 ? buildDustSection(dustWipeSamples) : '';

  // Build soil section
  var soilSection = soilSamples.length > 0 ? buildSoilSection(soilSamples) : '';

  // Build hazard section
  var hazardSection = buildHazardSection(hazards);

  // Build lab section
  var labSection = projectInfo.labName ? (
    '<h2>Laboratory Analysis</h2>' +
    '<table>' +
    '<tr><th>Lab Name</th><td>' + projectInfo.labName + '</td></tr>' +
    '<tr><th>Lab Certification</th><td>' + projectInfo.labCertNumber + '</td></tr>' +
    '</table>'
  ) : '';

  // Dust summary line
  var dustSummaryLine = dustWipeSamples.length > 0
    ? '<p><strong>Dust Wipe Samples Collected:</strong> ' + dustWipeSamples.length + '</p>'
    : '';

  // Soil summary line
  var soilSummaryLine = soilSamples.length > 0
    ? '<p><strong>Soil Samples Collected:</strong> ' + soilSamples.length + '</p>'
    : '';

  // Positive XRF section
  var positiveXrfSection = positiveXrf.length > 0
    ? '<h2>Positive XRF Results (\u22651.0 mg/cm\u00B2)</h2>' +
      '<table><thead><tr>' +
      '<th>Room/Location</th><th>Component</th><th>Side</th><th>Condition</th><th>Result (mg/cm\u00B2)</th>' +
      '</tr></thead><tbody>' + positiveXrfRows + '</tbody></table>'
    : '<p>No positive XRF results detected.</p>';

  return '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8">' +
    '<title>Lead-Based Paint ' + projectInfo.inspectionType + '</title>' +
    '<style>' + getReportStyles() + '</style>' +
    '</head><body>' +

    // COVER PAGE
    '<div class="page-break"><div class="cover-page">' +
    '<div class="cover-title">LEAD-BASED PAINT<br/>' + projectInfo.inspectionType + '</div>' +
    '<div class="cover-subtitle">Property Risk Assessment Report</div>' +
    '<div class="cover-info">' +
    '<p><strong>Property Address:</strong> ' + projectInfo.propertyAddress + ', ' + projectInfo.city + ', MI ' + projectInfo.zip + '</p>' +
    '<p><strong>Inspection Date:</strong> ' + projectInfo.inspectionDate + '</p>' +
    '<p><strong>Report Date:</strong> ' + projectInfo.reportDate + '</p>' +
    '<p><strong>Year Built:</strong> ' + projectInfo.yearBuilt + '</p>' +
    '<p><strong>Program Type:</strong> ' + projectInfo.programType + '</p>' +
    '<br/><br/>' +
    '<p><strong>Inspector:</strong> ' + projectInfo.inspectorName + '</p>' +
    '<p><strong>Certification:</strong> ' + projectInfo.inspectorCert + '</p>' +
    '<p><strong>Company:</strong> ' + projectInfo.companyName + '</p>' +
    '<p><strong>Phone:</strong> ' + projectInfo.companyPhone + '</p>' +
    '<br/><br/>' +
    '<p><strong>Prepared For:</strong> ' + projectInfo.clientName + '</p>' +
    '<p><strong>Address:</strong> ' + projectInfo.clientAddress + '</p>' +
    '<p><strong>Phone:</strong> ' + projectInfo.clientPhone + '</p>' +
    '</div></div></div>' +

    // TABLE OF CONTENTS
    '<div class="page-break">' +
    '<h1>TABLE OF CONTENTS</h1>' +
    '<ol>' +
    '<li>Executive Summary</li>' +
    '<li>Property Description</li>' +
    '<li>Survey Methodology</li>' +
    '<li>X-Ray Fluorescence (XRF) Results</li>' +
    '<li>Laboratory Test Results</li>' +
    '<li>Hazard Analysis and Recommendations</li>' +
    '<li>Regulatory Standards Reference</li>' +
    '<li>Inspector Certification</li>' +
    '</ol></div>' +

    // EXECUTIVE SUMMARY
    '<div class="page-break">' +
    '<h1>EXECUTIVE SUMMARY</h1>' +
    '<div class="info-box"><p>' + executiveSummary + '</p></div>' +
    '<h2>Summary of Findings</h2>' +
    '<p><strong>Total XRF Readings:</strong> ' + xrfData.length + '</p>' +
    '<p><strong>Positive Readings (\u22651.0 mg/cm\u00B2):</strong> ' + positiveXrf.length + '</p>' +
    '<p><strong>Total Hazards Identified:</strong> ' + hazards.length + '</p>' +
    '<ul>' +
    '<li>Severity 1 Hazards: ' + hazardSummary.severity1 + '</li>' +
    '<li>Severity 2 Hazards: ' + hazardSummary.severity2 + '</li>' +
    '<li>Severity 3 Hazards: ' + hazardSummary.severity3 + '</li>' +
    '</ul>' +
    dustSummaryLine +
    soilSummaryLine +
    '</div>' +

    // PROPERTY DESCRIPTION
    '<h1>PROPERTY DESCRIPTION</h1>' +
    '<p><strong>Property Address:</strong> ' + projectInfo.propertyAddress + ', ' + projectInfo.city + ', MI ' + projectInfo.zip + '</p>' +
    '<p><strong>Year Built:</strong> ' + projectInfo.yearBuilt + '</p>' +
    '<p><strong>Inspection Type:</strong> ' + projectInfo.inspectionType + '</p>' +
    '<p><strong>Program:</strong> ' + projectInfo.programType + '</p>' +

    // SURVEY METHODOLOGY
    '<h1>SURVEY METHODOLOGY</h1>' +
    '<h2>XRF Device Specifications</h2>' +
    '<table>' +
    '<tr><th>Device Model</th><td>' + projectInfo.xrfModel + '</td></tr>' +
    '<tr><th>Serial Number</th><td>' + projectInfo.xrfSerial + '</td></tr>' +
    '</table>' +
    '<h2>Sampling Protocol</h2>' +
    '<p>Lead was tested using X-Ray Fluorescence (XRF) analysis. This non-destructive method provides immediate results indicating the presence of lead on surfaces.</p>' +
    labSection +

    // XRF RESULTS
    '<div class="page-break">' +
    '<h1>X-RAY FLUORESCENCE (XRF) RESULTS</h1>' +
    '<p><strong>Total Readings:</strong> ' + xrfData.length + '</p>' +
    '<h2>All XRF Readings</h2>' +
    '<table><thead><tr>' +
    '<th>Room/Location</th><th>Component</th><th>Side</th><th>Condition</th><th>Result (mg/cm\u00B2)</th><th>Status</th>' +
    '</tr></thead><tbody>' + xrfRows + '</tbody></table>' +
    positiveXrfSection +
    '</div>' +

    // DUST & SOIL RESULTS
    dustSection +
    soilSection +

    // HAZARD ANALYSIS
    '<div class="page-break">' +
    '<h1>HAZARD ANALYSIS AND RECOMMENDATIONS</h1>' +
    '<p><strong>Total Hazards Identified:</strong> ' + hazards.length + '</p>' +
    hazardSection +
    '</div>' +

    // REGULATORY STANDARDS
    '<div class="page-break">' +
    '<h1>REGULATORY STANDARDS REFERENCE</h1>' +
    '<h2>XRF Paint Standards (mg/cm\u00B2)</h2>' +
    '<div class="threshold-box">' +
    '<p><strong>Positive (Hazard):</strong> \u2265 1.0 mg/cm\u00B2</p>' +
    '<p>Intact lead-based paint at or above 1.0 mg/cm\u00B2 is considered a hazard if deteriorated or in high-friction/impact areas.</p>' +
    '</div>' +
    '<h2>Dust Hazard Standards (\u00B5g/ft\u00B2)</h2>' +
    '<div class="threshold-box">' +
    '<p><strong>Hard Floors &amp; Carpets:</strong> \u2265 10 \u00B5g/ft\u00B2</p>' +
    '<p><strong>Window Sills/Stools:</strong> \u2265 100 \u00B5g/ft\u00B2</p>' +
    '<p><strong>Window Troughs:</strong> \u2265 100 \u00B5g/ft\u00B2</p>' +
    '<p><strong>Porches/Exterior:</strong> \u2265 40 \u00B5g/ft\u00B2</p>' +
    '</div>' +
    '<h2>Soil Hazard Standards (ppm)</h2>' +
    '<div class="threshold-box">' +
    '<p><strong>Play Areas:</strong> \u2265 400 ppm</p>' +
    '<p><strong>Rest of Yard:</strong> \u2265 1,200 ppm</p>' +
    '</div>' +
    '<h2>Severity Classification</h2>' +
    '<div class="threshold-box">' +
    '<p><strong>Severity 1 (Highest Priority):</strong> Deteriorated paint in accessible, high-friction areas (living spaces, windows, doors)</p>' +
    '<p><strong>Severity 2 (Medium Priority):</strong> Deteriorated paint in less accessible areas (exterior, basement)</p>' +
    '<p><strong>Severity 3 (Lower Priority):</strong> Intact positive lead paint</p>' +
    '</div></div>' +

    // CERTIFICATION PAGE
    '<div class="page-break">' +
    '<h1>INSPECTOR CERTIFICATION</h1>' +
    '<p>This report was prepared in accordance with EPA Renovation, Repair, and Painting Rule (RRP) and HUD requirements for lead-based paint inspection and risk assessment.</p>' +
    '<table>' +
    '<tr><th>Inspector Name</th><td>' + projectInfo.inspectorName + '</td></tr>' +
    '<tr><th>Certification Number</th><td>' + projectInfo.inspectorCert + '</td></tr>' +
    '<tr><th>Company</th><td>' + projectInfo.companyName + '</td></tr>' +
    '<tr><th>Email</th><td>' + projectInfo.inspectorEmail + '</td></tr>' +
    '<tr><th>Phone</th><td>' + projectInfo.companyPhone + '</td></tr>' +
    '<tr><th>Inspection Date</th><td>' + projectInfo.inspectionDate + '</td></tr>' +
    '<tr><th>Report Date</th><td>' + projectInfo.reportDate + '</td></tr>' +
    '</table>' +
    '<p style="margin-top: 40px;">I certify that I have personally conducted the inspection(s) described in this report and that the findings are accurate based on my professional assessment.</p>' +
    '<div style="margin-top: 60px; border-top: 2px solid #333; padding-top: 10px; width: 300px;">' +
    '<p style="margin: 5px 0;">Inspector Signature</p>' +
    '<p style="margin: 20px 0; color: #666; font-size: 10px;">Date: _____________________</p>' +
    '</div>' +
    '<div class="footer">' +
    '<p>This report contains confidential information and is provided for the exclusive use of the client for whom it was prepared. Unauthorized reproduction, distribution, or use of this information is prohibited. Report generated by LeadFlow AI - Lead Abatement Report Automation</p>' +
    '</div></div>' +

    '</body></html>';
}

function buildDustSection(dustWipeSamples) {
  var rows = dustWipeSamples.map(function(sample) {
    var threshold = (sample.surfaceType === 'Sill/Stool' || sample.surfaceType === 'Trough')
      ? THRESHOLDS.dust_sill_trough
      : sample.surfaceType === 'Porch Floor'
      ? THRESHOLDS.dust_porch
      : THRESHOLDS.dust_floor;
    var isHazard = sample.result >= threshold;
    var cls = isHazard ? ' class="positive"' : '';
    var status = isHazard ? 'HAZARD' : 'ACCEPTABLE';
    return '<tr' + cls + '>' +
      '<td>' + sample.sampleId + '</td>' +
      '<td>' + sample.location + '</td>' +
      '<td>' + sample.surfaceType + '</td>' +
      '<td style="text-align: right;">' + sample.result.toFixed(1) + '</td>' +
      '<td style="text-align: center;">' + threshold + '</td>' +
      '<td>' + status + '</td>' +
      '</tr>';
  }).join('');

  return '<div class="page-break">' +
    '<h1>DUST WIPE TEST RESULTS</h1>' +
    '<table><thead><tr>' +
    '<th>Sample ID</th><th>Location</th><th>Surface Type</th><th>Result (\u00B5g/ft\u00B2)</th><th>Hazard Threshold</th><th>Status</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function buildSoilSection(soilSamples) {
  var rows = soilSamples.map(function(sample) {
    var threshold = sample.areaType === 'Play Area' ? THRESHOLDS.soil_play : THRESHOLDS.soil_yard;
    var isHazard = sample.result >= threshold;
    var cls = isHazard ? ' class="positive"' : '';
    var status = isHazard ? 'HAZARD' : 'ACCEPTABLE';
    return '<tr' + cls + '>' +
      '<td>' + sample.sampleId + '</td>' +
      '<td>' + sample.location + '</td>' +
      '<td>' + sample.areaType + '</td>' +
      '<td style="text-align: right;">' + sample.result + '</td>' +
      '<td style="text-align: center;">' + threshold + '</td>' +
      '<td>' + status + '</td>' +
      '</tr>';
  }).join('');

  return '<div class="page-break">' +
    '<h1>SOIL TEST RESULTS</h1>' +
    '<table><thead><tr>' +
    '<th>Sample ID</th><th>Location</th><th>Area Type</th><th>Result (ppm)</th><th>Hazard Threshold</th><th>Status</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function buildHazardSection(hazards) {
  if (hazards.length === 0) {
    return '<div class="info-box"><p>No lead-based paint hazards, dust hazards, or soil hazards were identified at this property.</p></div>';
  }

  var tableRows = hazards.map(function(hazard) {
    return '<tr class="hazard">' +
      '<td><strong>' + hazard.component + '</strong><br/>' + hazard.location + '</td>' +
      '<td>' + hazard.type + '</td>' +
      '<td style="text-align: right;">' + hazard.result.toFixed(2) + ' ' + hazard.unit + '</td>' +
      '<td><span class="hazard-severity severity-' + hazard.severity + '">Severity ' + hazard.severity + '</span></td>' +
      '<td>Priority ' + hazard.priority + '</td>' +
      '</tr>';
  }).join('');

  var detailBoxes = hazards.map(function(hazard) {
    var abatementList = hazard.abatementOptions.map(function(opt) { return '<li>' + opt + '</li>'; }).join('');
    var interimText = hazard.selectedInterimControl || hazard.interimControlOptions;
    return '<div class="hazard-box">' +
      '<h3>' + hazard.component + ' - ' + hazard.location + '</h3>' +
      '<p><strong>Type:</strong> ' + hazard.type + '</p>' +
      '<p><strong>Result:</strong> ' + hazard.result.toFixed(2) + ' ' + hazard.unit + '</p>' +
      '<p><strong>Severity:</strong> ' + hazard.severity + '</p>' +
      '<p><strong>Cause:</strong> ' + hazard.cause + '</p>' +
      '<h4>Recommended Abatement:</h4>' +
      '<ul>' + abatementList + '</ul>' +
      '<h4>Interim Control Measures (if abatement is delayed):</h4>' +
      '<p>' + interimText + '</p>' +
      '</div>';
  }).join('');

  return '<table><thead><tr>' +
    '<th>Component &amp; Location</th><th>Type</th><th>Result</th><th>Severity</th><th>Priority</th>' +
    '</tr></thead><tbody>' + tableRows + '</tbody></table>' +
    detailBoxes;
}

function getReportStyles() {
  return 'body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 8.5in; margin: 0.5in auto; padding: 0; }' +
    '.page-break { page-break-after: always; padding: 1in 0; border-bottom: 1px solid #ddd; }' +
    'h1 { color: #1B3A5C; font-size: 28px; text-align: center; margin: 20px 0; border-bottom: 3px solid #2E75B6; padding-bottom: 10px; }' +
    'h2 { color: #2E75B6; font-size: 18px; margin-top: 20px; margin-bottom: 10px; border-left: 4px solid #2E75B6; padding-left: 10px; }' +
    'h3 { color: #1B3A5C; font-size: 14px; margin-top: 15px; margin-bottom: 8px; }' +
    'table { width: 100%; border-collapse: collapse; margin: 15px 0; }' +
    'th { background-color: #2E75B6; color: white; padding: 10px; text-align: left; font-weight: bold; font-size: 12px; }' +
    'td { border: 1px solid #ddd; padding: 8px; font-size: 11px; }' +
    'tr:nth-child(even) { background-color: #f9f9f9; }' +
    '.positive { background-color: #ffcccc; font-weight: bold; }' +
    '.negative { background-color: #ccffcc; }' +
    '.hazard { background-color: #fff3cd; border-left: 4px solid #ff6b6b; }' +
    '.info-box { background-color: #e7f3ff; border: 1px solid #2E75B6; padding: 12px; margin: 15px 0; border-radius: 4px; }' +
    '.hazard-box { background-color: #fff3cd; border: 2px solid #ff6b6b; padding: 12px; margin: 12px 0; border-radius: 4px; }' +
    '.hazard-severity { display: inline-block; padding: 2px 8px; border-radius: 3px; font-weight: bold; font-size: 10px; margin-right: 5px; }' +
    '.severity-1 { background-color: #ff6b6b; color: white; }' +
    '.severity-2 { background-color: #ffa500; color: white; }' +
    '.severity-3 { background-color: #ffeb3b; color: #333; }' +
    '.cover-page { text-align: center; padding: 2in 0; }' +
    '.cover-title { font-size: 36px; color: #1B3A5C; margin: 40px 0; font-weight: bold; }' +
    '.cover-subtitle { font-size: 18px; color: #2E75B6; margin: 20px 0; }' +
    '.cover-info { margin-top: 60px; text-align: left; font-size: 12px; }' +
    '.cover-info p { margin: 8px 0; }' +
    '.threshold-box { background-color: #f0f0f0; border: 1px solid #999; padding: 10px; margin: 10px 0; font-size: 11px; }' +
    'ul { margin: 10px 0; padding-left: 20px; }' +
    'li { margin: 5px 0; }' +
    '.footer { text-align: center; font-size: 10px; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }' +
    '@media print { body { margin: 0.5in; } .page-break { page-break-after: always; } }';
}
