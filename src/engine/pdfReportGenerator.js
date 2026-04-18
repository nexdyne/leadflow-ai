import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { THRESHOLDS } from './constants';

// Register fonts for pdfmake 0.3.7
// vfs_fonts exports base64 strings, but pdfmake 0.3.7 expects binary data in virtualfs.storage
function base64ToUint8Array(base64) {
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
Object.keys(pdfFonts).forEach(function(key) {
  pdfMake.virtualfs.storage[key] = base64ToUint8Array(pdfFonts[key]);
});

// ============================================================================
// COLOR CONSTANTS (matching DOCX report)
// ============================================================================
var NAVY = '#1B3A5C';
var BLUE = '#2E75B6';
var LIGHT_BLUE = '#D5E8F0';
var VERY_LIGHT = '#F2F7FB';
var RED = '#CC0000';
var GREEN = '#228B22';
var ORANGE = '#FF8C00';
var DARK_GOLD = '#B8860B';
var LIGHT_GRAY = '#F5F5F5';
var MED_GRAY = '#999999';
var DARK_TEXT = '#333333';
var HAZARD_BG = '#FFF3CD';
var HAZARD_BG_ALT = '#FFFDE7';
var POS_BG = '#FFCCCC';

// ============================================================================
// STYLES
// ============================================================================
var styles = {
  coverTitle: { fontSize: 28, bold: true, color: NAVY, alignment: 'center' },
  coverSubtitle: { fontSize: 22, bold: true, color: BLUE, alignment: 'center' },
  coverCaption: { fontSize: 14, color: BLUE, alignment: 'center' },
  sectionHeading: { fontSize: 16, bold: true, color: NAVY, margin: [0, 16, 0, 10] },
  subHeading: { fontSize: 13, bold: true, color: BLUE, margin: [0, 10, 0, 6] },
  bodyText: { fontSize: 10, color: DARK_TEXT, lineHeight: 1.4, margin: [0, 0, 0, 6] },
  labelBold: { fontSize: 10, bold: true, color: NAVY },
  labelValue: { fontSize: 10, color: DARK_TEXT },
  tableHeader: { fontSize: 9, bold: true, color: '#FFFFFF', fillColor: BLUE, margin: [4, 6, 4, 6] },
  tableCell: { fontSize: 9, color: DARK_TEXT, margin: [4, 4, 4, 4] },
  tableCellBold: { fontSize: 9, color: DARK_TEXT, bold: true, margin: [4, 4, 4, 4] },
  footer: { fontSize: 8, color: MED_GRAY, alignment: 'center', italics: true },
  smallNote: { fontSize: 8, color: MED_GRAY, italics: true, margin: [0, 2, 0, 4] },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function labelValue(label, value) {
  return {
    columns: [
      { text: label + ':', style: 'labelBold', width: 140 },
      { text: value || 'N/A', style: 'labelValue', width: '*' }
    ],
    margin: [0, 0, 0, 4]
  };
}

function sectionHeading(text) {
  return [
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 468, y2: 0, lineWidth: 2, lineColor: BLUE }], margin: [0, 12, 0, 0] },
    { text: text, style: 'sectionHeading' }
  ];
}

function subHeading(text) {
  return {
    columns: [
      { canvas: [{ type: 'rect', x: 0, y: 0, w: 4, h: 14, color: BLUE }], width: 8 },
      { text: text, style: 'subHeading', width: '*' }
    ],
    margin: [0, 8, 0, 4]
  };
}

function bodyText(text) {
  return { text: text, style: 'bodyText' };
}

function spacer(pts) {
  return { text: '', margin: [0, 0, 0, pts || 8] };
}

function pageBreak() {
  return { text: '', pageBreak: 'after' };
}

// Build a styled table from headers and data rows
function buildTable(headers, rows, options) {
  var opts = options || {};
  var widths = opts.widths || headers.map(function() { return '*'; });
  var headerRow = headers.map(function(h) {
    return { text: h, style: 'tableHeader', alignment: opts.headerAlign || 'left' };
  });

  var body = [headerRow].concat(rows);

  return {
    table: {
      headerRows: 1,
      widths: widths,
      body: body
    },
    layout: {
      hLineWidth: function() { return 0.5; },
      vLineWidth: function() { return 0.5; },
      hLineColor: function(i) { return i === 1 ? BLUE : '#DDDDDD'; },
      vLineColor: function() { return '#DDDDDD'; },
      fillColor: function(rowIndex) {
        if (rowIndex === 0) return BLUE;
        return null;
      },
      paddingLeft: function() { return 4; },
      paddingRight: function() { return 4; },
      paddingTop: function() { return 4; },
      paddingBottom: function() { return 4; }
    },
    margin: [0, 4, 0, 8]
  };
}

// Build a table with custom row fills (for hazard highlighting)
function buildColoredTable(headers, rows, rowFills, options) {
  var opts = options || {};
  var widths = opts.widths || headers.map(function() { return '*'; });
  var headerRow = headers.map(function(h) {
    return { text: h, style: 'tableHeader', alignment: opts.headerAlign || 'left' };
  });

  var body = [headerRow].concat(rows);
  var fills = [BLUE].concat(rowFills);

  return {
    table: {
      headerRows: 1,
      widths: widths,
      body: body
    },
    layout: {
      hLineWidth: function() { return 0.5; },
      vLineWidth: function() { return 0.5; },
      hLineColor: function(i) { return i === 1 ? BLUE : '#DDDDDD'; },
      vLineColor: function() { return '#DDDDDD'; },
      fillColor: function(rowIndex) {
        return fills[rowIndex] || null;
      },
      paddingLeft: function() { return 4; },
      paddingRight: function() { return 4; },
      paddingTop: function() { return 4; },
      paddingBottom: function() { return 4; }
    },
    margin: [0, 4, 0, 8]
  };
}

// Info box with colored background
function infoBox(text, bgColor) {
  return {
    table: {
      widths: ['*'],
      body: [[{ text: text, fontSize: 10, color: DARK_TEXT, margin: [8, 8, 8, 8] }]]
    },
    layout: {
      hLineWidth: function() { return 1; },
      vLineWidth: function() { return 1; },
      hLineColor: function() { return bgColor === HAZARD_BG ? '#FF6B6B' : BLUE; },
      vLineColor: function() { return bgColor === HAZARD_BG ? '#FF6B6B' : BLUE; },
      fillColor: function() { return bgColor || VERY_LIGHT; }
    },
    margin: [0, 4, 0, 8]
  };
}

// ============================================================================
// SECTION BUILDERS
// ============================================================================

function buildCoverPage(projectInfo) {
  return [
    spacer(60),
    { text: 'LEAD-BASED PAINT', style: 'coverTitle', margin: [0, 0, 0, 8] },
    { text: (projectInfo.inspectionType || 'Inspection').toUpperCase(), style: 'coverSubtitle', margin: [0, 0, 0, 12] },
    { text: 'Property Risk Assessment Report', style: 'coverCaption', margin: [0, 0, 0, 8] },
    { canvas: [{ type: 'line', x1: 100, y1: 0, x2: 368, y2: 0, lineWidth: 3, lineColor: BLUE }], margin: [0, 0, 0, 30], alignment: 'center' },

    // Property info block
    { text: 'PROPERTY INFORMATION', fontSize: 11, bold: true, color: NAVY, margin: [0, 0, 0, 6] },
    labelValue('Property Address', projectInfo.propertyAddress + ', ' + projectInfo.city + ', MI ' + projectInfo.zip),
    labelValue('Inspection Date', projectInfo.inspectionDate),
    labelValue('Report Date', projectInfo.reportDate),
    labelValue('Year Built', projectInfo.yearBuilt),
    labelValue('Program Type', projectInfo.programType),
    spacer(16),

    // Inspector info block
    { text: 'INSPECTOR INFORMATION', fontSize: 11, bold: true, color: NAVY, margin: [0, 0, 0, 6] },
    labelValue('Inspector', projectInfo.inspectorName),
    labelValue('Certification', projectInfo.inspectorCert),
    labelValue('Company', projectInfo.companyName),
    labelValue('Phone', projectInfo.companyPhone),
    spacer(16),

    // Client info block
    { text: 'PREPARED FOR', fontSize: 11, bold: true, color: NAVY, margin: [0, 0, 0, 6] },
    labelValue('Client', projectInfo.clientName),
    labelValue('Address', projectInfo.clientAddress),
    labelValue('Phone', projectInfo.clientPhone),
    pageBreak()
  ];
}

function buildExecutiveSummary(state, hazards) {
  var pi = state.projectInfo;
  var xrfData = state.xrfData;
  var positiveXrf = xrfData.filter(function(d) { return d.result >= THRESHOLDS.xrf_paint; });
  var sev1 = hazards.filter(function(h) { return h.severity === 1; }).length;
  var sev2 = hazards.filter(function(h) { return h.severity === 2; }).length;
  var sev3 = hazards.filter(function(h) { return h.severity === 3; }).length;

  var summaryText = 'This Lead-Based Paint (LBP) ' + pi.inspectionType +
    ' was conducted on ' + pi.inspectionDate +
    ' at ' + pi.propertyAddress + ', ' + pi.city + ', MI ' + pi.zip +
    '. The property was built in ' + pi.yearBuilt + '. ' +
    positiveXrf.length + ' positive lead-based paint readings were identified using ' +
    pi.xrfModel + '. ' + hazards.length + ' total hazards were identified, including ' +
    sev1 + ' Severity 1, ' + sev2 + ' Severity 2, and ' + sev3 + ' Severity 3 hazard(s). ' +
    'Abatement is recommended for all identified hazards.';

  var content = [
    sectionHeading('EXECUTIVE SUMMARY'),
    infoBox(summaryText, VERY_LIGHT),
    spacer(6),
    subHeading('Summary of Findings'),
    labelValue('Total XRF Readings', String(xrfData.length)),
    labelValue('Positive Readings (\u22651.0 mg/cm\u00B2)', String(positiveXrf.length)),
    labelValue('Total Hazards Identified', String(hazards.length)),
    labelValue('Severity 1 (Highest)', String(sev1)),
    labelValue('Severity 2 (Medium)', String(sev2)),
    labelValue('Severity 3 (Intact Positive)', String(sev3)),
  ];

  if (state.dustWipeSamples.length > 0) {
    content.push(labelValue('Dust Wipe Samples', String(state.dustWipeSamples.length)));
  }
  if (state.soilSamples.length > 0) {
    content.push(labelValue('Soil Samples', String(state.soilSamples.length)));
  }

  content.push(pageBreak());
  return content;
}

function buildPurposeAndScope(projectInfo) {
  var scopeText = projectInfo.inspectionType === 'LBP Inspection Only'
    ? 'The purpose of this Lead-Based Paint (LBP) Inspection is to determine the presence or absence of lead-based paint on all accessible painted surfaces within the subject property. This inspection was conducted in accordance with 40 CFR Part 745, Subpart L (EPA Work Practice Standards) and HUD Guidelines for the Evaluation and Control of Lead-Based Paint Hazards in Housing (Chapter 7).'
    : 'The purpose of this Lead-Based Paint (LBP) Inspection and Risk Assessment is to identify the presence of lead-based paint, evaluate lead hazards from paint, dust, and soil, and provide recommendations for hazard control at the subject property. This assessment was conducted in accordance with 40 CFR Part 745, Subpart L (EPA Work Practice Standards), HUD Guidelines for the Evaluation and Control of Lead-Based Paint Hazards in Housing (Chapters 5 and 7), and the State of Michigan Lead Hazard Control Rules (R 325.9901 et seq.).';

  var programText = '';
  if (projectInfo.programType === 'HUD') {
    programText = 'This inspection was conducted under a HUD Lead Hazard Control/Reduction program in accordance with 24 CFR Part 35. The property is subject to HUD lead disclosure requirements (24 CFR Part 35, Subpart A), and all identified lead-based paint hazards must be addressed through abatement or interim controls prior to occupancy clearance. This report follows HUD Guidelines Chapters 5 and 7 protocols and meets the requirements for submission to the Michigan Department of Health and Human Services (MDHHS) Healthy Homes Section.';
  } else if (projectInfo.programType === 'Medicaid') {
    programText = 'This inspection was conducted as part of a Medicaid-funded lead investigation in response to an identified elevated blood lead level (EBL) case. Under Michigan Public Health Code Act 368, Part 54A, the local health department has ordered this environmental investigation to identify lead sources in the child\'s primary residence. This report documents all tested surfaces, identified hazards, and recommended remediation to protect the health of the affected child and other occupants under age six.';
  } else if (projectInfo.programType === 'EBL') {
    programText = 'This inspection was conducted in response to an Elevated Blood Lead Level (EBL) case as required under Michigan Public Health Code Act 368, Part 54A, and the Michigan EBL Environmental Investigation Protocol. The local health department has issued an Order of Lead Abatement requiring identification and elimination of lead hazards at this property. This report includes documentation of all child activity areas, potential non-paint lead sources (imported goods, cosmetics, spices, pottery), and secondary locations as required by MDHHS EBL investigation standards.';
  } else if (projectInfo.programType === 'Private') {
    programText = 'This inspection was conducted at the request of the property owner/client for informational and due diligence purposes. While not mandated by a specific government program, this report follows the same EPA and HUD protocols to ensure thorough and defensible results. Results may be used for real estate transactions, property management, renovation planning, or voluntary compliance with lead safety standards.';
  } else {
    programText = 'This inspection was conducted at the request of the property owner/client for informational and due diligence purposes. While not mandated by a specific government program, this report follows the same EPA and HUD protocols to ensure thorough and defensible results.';
  }

  return [
    sectionHeading('PURPOSE AND SCOPE'),
    bodyText(scopeText),
    spacer(4),
    bodyText(programText),
    spacer(4),
    bodyText('The scope of this ' + projectInfo.inspectionType + ' includes testing of all accessible painted surfaces using X-Ray Fluorescence (XRF) analysis, collection and laboratory analysis of dust wipe and soil samples as applicable, visual assessment of paint conditions, and evaluation of potential lead hazard exposure pathways.'),
    pageBreak()
  ];
}

function buildKeyDefinitions() {
  return [
    sectionHeading('KEY DEFINITIONS'),

    subHeading('Lead-Based Paint (LBP)'),
    bodyText('Paint or other surface coatings that contain lead equal to or exceeding 1.0 milligrams per square centimeter (mg/cm\u00B2) as measured by XRF, or more than 0.5 percent by weight (5,000 parts per million) as determined by laboratory analysis. (40 CFR 745.61)'),

    subHeading('Lead-Based Paint Hazard'),
    bodyText('Any condition that causes exposure to lead from lead-contaminated dust, lead-contaminated soil, or deteriorated lead-based paint, or lead-based paint that is present on friction surfaces, impact surfaces, or chewable surfaces that would result in adverse human health effects. (40 CFR 745.61)'),

    subHeading('Dust-Lead Hazard'),
    bodyText('Surface dust in a residential dwelling or child-occupied facility that contains a mass-per-area concentration of lead at any reportable level as analyzed by an EPA-recognized NLLAP laboratory. Per the 2024 EPA Final Rule (effective January 13, 2025), any dust-lead level reported by an NLLAP-accredited laboratory constitutes a Dust-Lead Reportable Level (DLRL).'),

    subHeading('Soil-Lead Hazard'),
    bodyText('Bare soil on residential real property or on the property of a child-occupied facility that contains total lead equal to or exceeding 400 parts per million (ppm) in play areas, or average of 1,200 ppm in the rest of the yard. (40 CFR 745.65)'),

    subHeading('Abatement'),
    bodyText('Any set of measures designed to permanently eliminate lead-based paint or lead-based paint hazards. Abatement includes removal, enclosure, encapsulation, replacement of components, removal of soil, and all preparation, cleanup, disposal, and post-abatement clearance testing. (40 CFR 745.223)'),

    subHeading('Interim Controls'),
    bodyText('A set of measures designed to reduce temporarily human exposure or likely exposure to lead-based paint hazards. Interim controls include specialized cleaning, repairs, maintenance, painting, temporary containment, ongoing monitoring, and the establishment and operation of management and resident education programs. (24 CFR 35.110)'),

    pageBreak()
  ];
}

function buildPropertyDescription(projectInfo) {
  return [
    sectionHeading('PROPERTY DESCRIPTION'),
    labelValue('Property Address', projectInfo.propertyAddress + ', ' + projectInfo.city + ', MI ' + projectInfo.zip),
    labelValue('Year Built', projectInfo.yearBuilt),
    labelValue('Inspection Type', projectInfo.inspectionType),
    labelValue('Program', projectInfo.programType),
    spacer(12)
  ];
}

function buildSurveyMethodology(projectInfo) {
  var content = [
    sectionHeading('SURVEY METHODOLOGY'),
    subHeading('XRF Device Specifications'),
    labelValue('Device Model', projectInfo.xrfModel),
    labelValue('Serial Number', projectInfo.xrfSerial),
    spacer(6),
    subHeading('Sampling Protocol'),
    bodyText('Lead was tested using X-Ray Fluorescence (XRF) analysis. This non-destructive method provides immediate results indicating the presence of lead on surfaces. All testing was conducted in accordance with EPA and HUD protocols.'),
  ];

  if (projectInfo.labName) {
    content.push(spacer(6));
    content.push(subHeading('Laboratory Analysis'));
    content.push(labelValue('Lab Name', projectInfo.labName));
    content.push(labelValue('Lab Certification', projectInfo.labCertNumber));
  }

  content.push(pageBreak());
  return content;
}

function buildXRFResultsSection(xrfData) {
  var positiveXrf = xrfData.filter(function(d) { return d.result >= THRESHOLDS.xrf_paint; });

  var content = [
    sectionHeading('X-RAY FLUORESCENCE (XRF) RESULTS'),
    labelValue('Total Readings', String(xrfData.length)),
    labelValue('Positive (\u22651.0 mg/cm\u00B2)', String(positiveXrf.length)),
    spacer(6),
    subHeading('All XRF Readings'),
  ];

  // All readings table
  var headers = ['Room/Location', 'Component', 'Side', 'Condition', 'Result', 'Status'];
  var widths = [90, 90, 45, 70, 55, 55];
  var rows = [];
  var fills = [];

  xrfData.forEach(function(reading, idx) {
    var isPositive = reading.result >= THRESHOLDS.xrf_paint;
    var statusText = isPositive ? 'POSITIVE' : 'NEGATIVE';
    var statusColor = isPositive ? RED : GREEN;
    var fill = isPositive ? POS_BG : (idx % 2 === 0 ? null : LIGHT_GRAY);
    fills.push(fill);

    rows.push([
      { text: reading.room, style: 'tableCell' },
      { text: reading.component, style: 'tableCell' },
      { text: reading.side || '-', style: 'tableCell' },
      { text: reading.condition, style: 'tableCell' },
      { text: reading.result.toFixed(2), style: 'tableCell', alignment: 'right' },
      { text: statusText, fontSize: 9, bold: true, color: statusColor, margin: [4, 4, 4, 4] }
    ]);
  });

  content.push(buildColoredTable(headers, rows, fills, { widths: widths }));

  // Positive-only table
  if (positiveXrf.length > 0) {
    content.push(spacer(8));
    content.push(subHeading('Positive XRF Results Only (\u22651.0 mg/cm\u00B2)'));

    var posHeaders = ['Room/Location', 'Component', 'Side', 'Condition', 'Result (mg/cm\u00B2)', 'Severity'];
    var posWidths = [95, 95, 50, 75, 75, 55];
    var posRows = [];
    var posFills = [];

    positiveXrf.forEach(function(reading) {
      posFills.push(POS_BG);
      posRows.push([
        { text: reading.room, style: 'tableCellBold' },
        { text: reading.component, style: 'tableCellBold' },
        { text: reading.side || '-', style: 'tableCell' },
        { text: reading.condition, style: 'tableCellBold' },
        { text: reading.result.toFixed(2), fontSize: 9, bold: true, color: RED, margin: [4, 4, 4, 4], alignment: 'right' },
        { text: reading.condition === 'Deteriorated' ? 'SEV 1-2' : 'SEV 3', fontSize: 9, bold: true, color: RED, margin: [4, 4, 4, 4] }
      ]);
    });

    content.push(buildColoredTable(posHeaders, posRows, posFills, { widths: posWidths }));
  }

  content.push(pageBreak());
  return content;
}

function buildDustWipeSection(dustWipeSamples) {
  if (dustWipeSamples.length === 0) return [];

  var content = [
    sectionHeading('DUST WIPE TEST RESULTS'),
    bodyText('Dust wipe samples were collected in accordance with ASTM E1728 and analyzed by an NLLAP-accredited laboratory.'),
    spacer(4),
  ];

  var headers = ['Sample ID', 'Location', 'Surface Type', 'Result (\u00B5g/ft\u00B2)', 'Threshold', 'Status'];
  var widths = [60, 110, 75, 70, 65, 65];
  var rows = [];
  var fills = [];

  dustWipeSamples.forEach(function(sample, idx) {
    var threshold = (sample.surfaceType === 'Sill/Stool' || sample.surfaceType === 'Trough')
      ? THRESHOLDS.dust_sill_trough
      : sample.surfaceType === 'Porch Floor'
      ? THRESHOLDS.dust_porch
      : THRESHOLDS.dust_floor;
    var isHazard = sample.result >= threshold;
    var fill = isHazard ? POS_BG : (idx % 2 === 0 ? null : LIGHT_GRAY);
    fills.push(fill);

    rows.push([
      { text: sample.sampleId, style: 'tableCell' },
      { text: sample.location, style: 'tableCell' },
      { text: sample.surfaceType, style: 'tableCell' },
      { text: sample.result.toFixed(1), style: 'tableCell', alignment: 'right' },
      { text: String(threshold), style: 'tableCell', alignment: 'center' },
      { text: isHazard ? 'HAZARD' : 'ACCEPTABLE', fontSize: 9, bold: true, color: isHazard ? RED : GREEN, margin: [4, 4, 4, 4] }
    ]);
  });

  content.push(buildColoredTable(headers, rows, fills, { widths: widths }));
  content.push({ text: 'Hazard thresholds per EPA/HUD: Floors \u2265 10 \u00B5g/ft\u00B2, Window Sills/Troughs \u2265 100 \u00B5g/ft\u00B2, Porches \u2265 40 \u00B5g/ft\u00B2.', style: 'smallNote' });
  content.push(pageBreak());
  return content;
}

function buildSoilSection(soilSamples) {
  if (soilSamples.length === 0) return [];

  var content = [
    sectionHeading('SOIL TEST RESULTS'),
    bodyText('Soil samples were collected in accordance with EPA/HUD protocols from bare soil areas on the property.'),
    spacer(4),
  ];

  var headers = ['Sample ID', 'Location', 'Area Type', 'Result (ppm)', 'Threshold', 'Status'];
  var widths = [60, 120, 75, 65, 65, 60];
  var rows = [];
  var fills = [];

  soilSamples.forEach(function(sample, idx) {
    var threshold = sample.areaType === 'Play Area' ? THRESHOLDS.soil_play : THRESHOLDS.soil_yard;
    var isHazard = sample.result >= threshold;
    var fill = isHazard ? POS_BG : (idx % 2 === 0 ? null : LIGHT_GRAY);
    fills.push(fill);

    rows.push([
      { text: sample.sampleId, style: 'tableCell' },
      { text: sample.location, style: 'tableCell' },
      { text: sample.areaType, style: 'tableCell' },
      { text: String(sample.result), style: 'tableCell', alignment: 'right' },
      { text: String(threshold), style: 'tableCell', alignment: 'center' },
      { text: isHazard ? 'HAZARD' : 'ACCEPTABLE', fontSize: 9, bold: true, color: isHazard ? RED : GREEN, margin: [4, 4, 4, 4] }
    ]);
  });

  content.push(buildColoredTable(headers, rows, fills, { widths: widths }));
  content.push({ text: 'Hazard thresholds per EPA/HUD: Play Areas \u2265 400 ppm, Rest of Yard \u2265 1,200 ppm.', style: 'smallNote' });
  content.push(pageBreak());
  return content;
}

function buildSurfacesUnableToTest() {
  return [
    sectionHeading('SURFACES UNABLE TO BE TESTED'),
    bodyText('The following surfaces were inaccessible or otherwise unable to be tested during the inspection. Per Michigan Lead Hazard Control Rules, untested surfaces that share construction and painting history with positive tested surfaces should be assumed to contain lead-based paint.'),
    spacer(6),
    infoBox('[This section to be completed by the inspector. Document any surfaces that could not be accessed due to furniture, sealed areas, structural conditions, or other reasons. Include: Room, Component, and Reason Not Tested.]', VERY_LIGHT),
    spacer(4),
    bodyText('If no surfaces were inaccessible: All accessible painted surfaces within the property were tested during this inspection.'),
    pageBreak()
  ];
}

function buildPotentialHazards(xrfData) {
  var potentialHazards = xrfData.filter(function(d) {
    return d.result >= THRESHOLDS.xrf_paint && d.condition === 'Intact';
  });

  var content = [
    sectionHeading('POTENTIAL LEAD-BASED PAINT HAZARDS'),
    bodyText('Potential hazards are surfaces that tested positive for lead-based paint but were in intact condition at the time of inspection. These surfaces do not currently constitute an active hazard but will become hazardous if the paint deteriorates. Ongoing monitoring and maintenance is required.'),
    spacer(4),
  ];

  if (potentialHazards.length === 0) {
    content.push(bodyText('No potential hazards (intact positive surfaces) were identified at this property.'));
  } else {
    var headers = ['Room/Location', 'Component', 'Side', 'Substrate', 'Result (mg/cm\u00B2)', 'Condition'];
    var widths = [85, 95, 50, 65, 80, 65];
    var rows = [];
    var fills = [];

    potentialHazards.forEach(function(reading, idx) {
      var fill = idx % 2 === 0 ? HAZARD_BG : HAZARD_BG_ALT;
      fills.push(fill);
      rows.push([
        { text: reading.room, style: 'tableCell' },
        { text: reading.component, style: 'tableCell' },
        { text: reading.side || '-', style: 'tableCell' },
        { text: reading.substrate || 'Paint', style: 'tableCell' },
        { text: reading.result.toFixed(2), style: 'tableCell', alignment: 'right' },
        { text: 'Intact', fontSize: 9, bold: true, color: DARK_GOLD, margin: [4, 4, 4, 4] }
      ]);
    });

    content.push(buildColoredTable(headers, rows, fills, { widths: widths }));
    content.push(spacer(4));
    content.push(infoBox('IMPORTANT: These surfaces must be maintained in intact condition. If paint deterioration occurs on any of these surfaces, they will constitute active lead-based paint hazards requiring immediate interim controls or abatement.', HAZARD_BG));
  }

  content.push(pageBreak());
  return content;
}

function buildHazardAnalysisSection(hazards) {
  var content = [
    sectionHeading('HAZARD ANALYSIS AND RECOMMENDATIONS'),
    labelValue('Total Hazards Identified', String(hazards.length)),
    spacer(6),
  ];

  if (hazards.length === 0) {
    content.push(infoBox('No lead-based paint hazards, dust hazards, or soil hazards were identified at this property.', VERY_LIGHT));
    content.push(pageBreak());
    return content;
  }

  // Summary table
  var headers = ['Component', 'Location', 'Type', 'Result', 'Severity', 'Priority'];
  var widths = [90, 70, 75, 80, 60, 60];
  var rows = [];
  var fills = [];

  hazards.forEach(function(hazard, idx) {
    var sevColor = hazard.severity === 1 ? RED : hazard.severity === 2 ? ORANGE : DARK_GOLD;
    var fill = idx % 2 === 0 ? null : LIGHT_GRAY;
    fills.push(fill);

    rows.push([
      { text: hazard.component, style: 'tableCellBold' },
      { text: hazard.location, style: 'tableCell' },
      { text: hazard.type, style: 'tableCell' },
      { text: hazard.result.toFixed(2) + ' ' + hazard.unit, style: 'tableCell' },
      { text: 'Severity ' + hazard.severity, fontSize: 9, bold: true, color: sevColor, margin: [4, 4, 4, 4] },
      { text: 'Priority ' + hazard.priority, style: 'tableCell' }
    ]);
  });

  content.push(buildColoredTable(headers, rows, fills, { widths: widths }));
  content.push(spacer(8));
  content.push(subHeading('Detailed Hazard Descriptions & Recommendations'));

  // Detail boxes for each hazard
  hazards.forEach(function(hazard, idx) {
    content.push(spacer(6));
    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 468, y2: 0, lineWidth: 1, lineColor: BLUE }],
      margin: [0, 4, 0, 4]
    });
    content.push({ text: 'Hazard #' + (idx + 1) + ': ' + hazard.component + ' - ' + hazard.location, fontSize: 12, bold: true, color: NAVY, margin: [0, 0, 0, 4] });
    content.push(labelValue('Type', hazard.type));
    content.push(labelValue('Result', hazard.result.toFixed(2) + ' ' + hazard.unit));
    content.push(labelValue('Severity', 'Severity ' + hazard.severity));
    content.push(labelValue('Priority', 'Priority ' + hazard.priority));
    content.push(labelValue('Cause', hazard.cause || 'N/A'));

    content.push(spacer(4));
    content.push({ text: 'Recommended Abatement Options:', fontSize: 10, bold: true, color: BLUE, margin: [0, 0, 0, 4] });

    if (hazard.abatementOptions && hazard.abatementOptions.length > 0) {
      hazard.abatementOptions.forEach(function(opt) {
        content.push({ text: '\u2022 ' + opt, fontSize: 9, color: DARK_TEXT, margin: [16, 0, 0, 2] });
      });
    }

    content.push(spacer(4));
    content.push({ text: 'Interim Control Measures:', fontSize: 10, bold: true, color: BLUE, margin: [0, 0, 0, 4] });
    var interimText = hazard.selectedInterimControl || hazard.interimControlOptions || 'N/A';
    content.push({ text: interimText, fontSize: 9, color: DARK_TEXT, margin: [16, 0, 0, 2] });
  });

  content.push(pageBreak());
  return content;
}

function buildRegulatoryStandards() {
  return [
    sectionHeading('REGULATORY STANDARDS REFERENCE'),

    subHeading('Applicable Federal Regulations'),
    bodyText('40 CFR Part 745 - Lead-Based Paint Poisoning Prevention in Certain Residential Structures (EPA)'),
    bodyText('24 CFR Part 35 - Lead-Based Paint Poisoning Prevention in Certain Residential Structures (HUD)'),
    bodyText('HUD Guidelines for the Evaluation and Control of Lead-Based Paint Hazards in Housing (Chapters 5 and 7)'),

    subHeading('Applicable Michigan Regulations'),
    bodyText('Michigan Lead Hazard Control Rules - LARA Administrative Code R 325.9901 through R 325.9999'),
    bodyText('Michigan Public Health Code - Act 368 of 1978, Part 54A (Lead Abatement)'),

    subHeading('XRF Paint Standards (mg/cm\u00B2)'),
    bodyText('Positive (Lead-Based Paint): \u2265 1.0 mg/cm\u00B2 per 40 CFR 745.65'),
    bodyText('Laboratory Analysis: \u2265 0.5% by weight or \u2265 5,000 ppm per 40 CFR 745.65'),

    subHeading('Dust-Lead Hazard Standards (\u00B5g/ft\u00B2) - Risk Assessment'),
    bodyText('Per the 2024 EPA Final Rule (effective January 13, 2025):'),
    bodyText('Dust-Lead Reportable Level (DLRL): Any reportable level from an NLLAP-accredited laboratory'),
    bodyText('Legacy reference thresholds: Floors \u2265 10 \u00B5g/ft\u00B2, Sills/Troughs \u2265 100 \u00B5g/ft\u00B2, Porches \u2265 40 \u00B5g/ft\u00B2'),

    subHeading('Dust-Lead Action Levels (DLAL) - Post-Abatement Clearance'),
    bodyText('Per EPA 2024 Final Rule (full compliance required January 12, 2026):'),
    bodyText('Floors: \u2265 5 \u00B5g/ft\u00B2  |  Window Sills: \u2265 40 \u00B5g/ft\u00B2  |  Window Troughs: \u2265 100 \u00B5g/ft\u00B2'),

    subHeading('Soil Hazard Standards (ppm)'),
    bodyText('Play Areas: \u2265 400 ppm  |  Rest of Yard: \u2265 1,200 ppm per 40 CFR 745.65'),

    subHeading('Severity Classification (per Michigan/HUD Guidelines)'),
    bodyText('Severity 1 (Highest Priority): Deteriorated paint on accessible, high-friction/impact surfaces in living spaces. Active lead dust generation likely.'),
    bodyText('Severity 2 (Medium Priority): Deteriorated paint on less accessible surfaces. Exposure pathway exists but is less direct.'),
    bodyText('Severity 3 (Lower Priority): Intact positive lead-based paint in low-traffic areas. No active deterioration but requires monitoring.'),
    pageBreak()
  ];
}

function buildDisclosureLanguage(projectInfo) {
  return [
    sectionHeading('DISCLOSURE AND NOTIFICATION'),

    subHeading('Federal Title X Disclosure Requirement'),
    bodyText('Federal law (Title X, Residential Lead-Based Paint Hazard Reduction Act of 1992) requires that sellers and lessors of most pre-1978 housing disclose known lead-based paint and lead-based paint hazards to prospective buyers and tenants. A copy of this report must be provided to the buyer or tenant before the sale or lease is finalized.'),

    subHeading('Michigan Notification Requirements'),
    bodyText('Per Michigan Lead Hazard Control Rules (R 325.9959), a copy of this report must be provided to the property owner within 20 business days of completion of the inspection/risk assessment. The owner is responsible for disclosing the results to current and future occupants.'),

    subHeading('EPA Educational Pamphlet'),
    bodyText('The EPA pamphlet "Protect Your Family From Lead in Your Home" (EPA-747-K-12-001) must be provided to all occupants of the property.'),

    subHeading('Notification of Results'),
    bodyText('The results of this ' + projectInfo.inspectionType + ' must be disclosed to:'),
    bodyText('1. The property owner (within 20 business days per Michigan R 325.9959)'),
    bodyText('2. Current occupants of the property'),
    bodyText('3. Prospective buyers or tenants (before sale or lease per Title X)'),
    bodyText('4. The Michigan Department of Health and Human Services (MDHHS) as required'),
    bodyText('5. The local health department if an Elevated Blood Lead (EBL) case is involved'),
    pageBreak()
  ];
}

function buildOperationsAndMaintenance() {
  return [
    sectionHeading('OPERATIONS AND MAINTENANCE GUIDANCE'),
    bodyText('The following safe maintenance practices should be followed in any pre-1978 property where lead-based paint has been identified:'),

    subHeading('General Safe Work Practices'),
    bodyText('1. Do not dry sand, dry scrape, or use heat guns on lead-based paint surfaces.'),
    bodyText('2. Always wet surfaces before disturbing paint (wet scraping, wet sanding).'),
    bodyText('3. Contain all paint chips and debris using plastic sheeting.'),
    bodyText('4. Clean work areas with HEPA vacuum followed by wet mopping.'),
    bodyText('5. Any renovation disturbing more than 6 sq ft of painted surface in a room (or 20 sq ft exterior) must be performed by an EPA-certified renovator under the RRP Rule (40 CFR 745, Subpart E).'),

    subHeading('Ongoing Monitoring'),
    bodyText('1. Inspect all identified lead-based paint surfaces at least annually for signs of deterioration.'),
    bodyText('2. Immediately address any peeling, chipping, chalking, or cracking paint on positive surfaces.'),
    bodyText('3. Keep all positive surfaces clean using wet cleaning methods.'),
    bodyText('4. Maintain written records of all monitoring activities and paint maintenance.'),

    subHeading('Dust Control'),
    bodyText('1. Clean floors, window sills, and window troughs regularly using wet mopping and HEPA vacuuming.'),
    bodyText('2. Pay special attention to window wells and troughs where lead dust accumulates from friction.'),
    bodyText('3. Wash children\'s hands frequently, especially before meals.'),

    subHeading('Soil Precautions'),
    bodyText('1. Cover bare soil in play areas with grass, mulch, gravel, or other ground cover.'),
    bodyText('2. Ensure children wash hands after playing outdoors.'),
    bodyText('3. Remove shoes before entering the home to prevent tracking lead-contaminated soil inside.'),
    pageBreak()
  ];
}

function buildReevaluationSchedule(projectInfo, hazards) {
  var hasActiveHazards = hazards.some(function(h) { return h.severity === 1 || h.severity === 2; });

  return [
    sectionHeading('RE-EVALUATION SCHEDULE'),
    bodyText('Per HUD requirements (24 CFR 35.1355) and Michigan Lead Hazard Control Rules, properties with identified lead-based paint hazards must undergo periodic re-evaluation to verify that hazard controls remain effective.'),
    spacer(4),
    subHeading('Recommended Re-evaluation Timeline'),
    bodyText(hasActiveHazards
      ? 'Active hazards were identified at this property. The following re-evaluation schedule is recommended:'
      : 'No active hazards requiring immediate action were identified. The following monitoring schedule is recommended:'
    ),
    spacer(4),
    bodyText('Post-Abatement Clearance: Immediately following completion of any abatement or interim control work. Dust clearance testing must confirm levels below EPA DLAL: floors < 5 \u00B5g/ft\u00B2, sills < 40 \u00B5g/ft\u00B2, troughs < 100 \u00B5g/ft\u00B2.'),
    bodyText('Interim Control Re-evaluation: Within 12 months of interim control implementation, and annually thereafter.'),
    bodyText('Ongoing Monitoring: Visual inspection of all identified lead-based paint surfaces at least annually.'),
    bodyText('Reevaluation of Risk Assessment: Conduct a new risk assessment if: (a) paint deterioration is observed, (b) renovation work disturbs painted surfaces, (c) a child with elevated blood lead levels resides in the property, or (d) ownership/tenancy changes.'),
    pageBreak()
  ];
}

function buildCertificationPage(projectInfo) {
  return [
    sectionHeading('INSPECTOR CERTIFICATION'),
    bodyText('This report was prepared in accordance with EPA Renovation, Repair, and Painting Rule (RRP) and HUD requirements for lead-based paint inspection and risk assessment.'),
    spacer(12),
    labelValue('Inspector Name', projectInfo.inspectorName),
    labelValue('Certification Number', projectInfo.inspectorCert),
    labelValue('Company', projectInfo.companyName),
    labelValue('Email', projectInfo.inspectorEmail),
    labelValue('Phone', projectInfo.companyPhone),
    labelValue('Inspection Date', projectInfo.inspectionDate),
    labelValue('Report Date', projectInfo.reportDate),
    spacer(20),
    bodyText('I certify that I have personally conducted the inspection(s) described in this report and that the findings are accurate based on my professional assessment.'),
    spacer(40),
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1.5, lineColor: DARK_TEXT }], margin: [0, 0, 0, 4] },
    { text: 'Inspector Signature', fontSize: 9, color: MED_GRAY, margin: [0, 0, 0, 12] },
    { text: 'Date: _____________________', fontSize: 9, color: MED_GRAY, margin: [0, 0, 0, 20] },
    spacer(20),
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 468, y2: 0, lineWidth: 0.5, lineColor: '#CCCCCC' }], margin: [0, 0, 0, 8] },
    { text: 'This report contains confidential information and is provided for the exclusive use of the client for whom it was prepared. Report generated by LeadFlow AI.', fontSize: 8, color: MED_GRAY, italics: true, alignment: 'center' },
    pageBreak()
  ];
}

// Category ID to label mapping (mirrors DOCX)
var PDF_CATEGORY_LABELS = {
  ext_side_a: 'Exterior - Side A (Street)', ext_side_b: 'Exterior - Side B',
  ext_side_c: 'Exterior - Side C (Rear)', ext_side_d: 'Exterior - Side D',
  ext_foundation: 'Exterior - Foundation/Dripline', ext_roof: 'Exterior - Roof/Soffit/Fascia',
  ext_gutters: 'Exterior - Gutters/Downspouts', ext_porch: 'Exterior - Porch/Deck/Steps',
  ext_outbuilding: 'Exterior - Garage/Shed/Outbuilding', ext_fence: 'Exterior - Fence/Railing',
  interior_room: 'Interior - Room Overview', interior_window: 'Interior - Window (Sash/Sill/Trough)',
  interior_door: 'Interior - Door/Frame/Jamb', interior_wall: 'Interior - Wall Surface',
  interior_ceiling: 'Interior - Ceiling', interior_trim: 'Interior - Trim/Baseboard/Crown',
  interior_closet: 'Interior - Closet/Cabinet/Shelving', interior_stairwell: 'Interior - Stairwell/Railing',
  interior_floor: 'Interior - Floor/Carpet Condition',
  condition_water: 'Condition - Water Damage/Staining', condition_plaster: 'Condition - Plaster/Drywall Damage',
  condition_mini_blinds: 'Condition - Vinyl Mini Blinds (Pre-1997)',
  hazard_closeup: 'Hazard - Deteriorated Paint Close-up', hazard_friction: 'Hazard - Friction Surface',
  hazard_impact: 'Hazard - Impact Surface', hazard_chewable: 'Hazard - Chewable Surface',
  hazard_bare_soil: 'Hazard - Bare Soil/Play Area',
  xrf_location: 'Testing - XRF Reading Location', paint_chip: 'Testing - Paint Chip Sample',
  dust_sample_floor: 'Testing - Dust Wipe: Floor', dust_sample_sill: 'Testing - Dust Wipe: Window Sill',
  dust_sample_trough: 'Testing - Dust Wipe: Window Trough',
  soil_sample_play: 'Testing - Soil: Play Area', soil_sample_dripline: 'Testing - Soil: Foundation Dripline',
  soil_sample_yard: 'Testing - Soil: Bare Yard Area',
  child_sleep: 'Child - Sleeping Area/Crib', child_play: 'Child - Play Area (Indoor)',
  child_eat: 'Child - Eating Area/High Chair', child_chewable: 'Child - Chewable Surfaces',
  child_outdoor_play: 'Child - Outdoor Play Area',
  household_items: 'Household - Lead Items (Toys/Ceramics)', household_mini_blinds: 'Household - Vinyl Mini Blinds',
  household_spices: 'Household - Imported Spices/Cosmetics', secondary_location: 'Secondary Location',
  clearance_before: 'Clearance - Before (Pre-Abatement)', clearance_after: 'Clearance - After (Post-Abatement)',
  clearance_dust: 'Clearance - Dust Sample Location',
  general_property: 'General - Property Overview', other: 'Other',
  dust_sample: 'Testing - Dust Wipe Sample', soil_sample: 'Testing - Soil Sample',
  child_area: 'Child - Play Area/Bedroom',
};

function getPdfCatLabel(catId) {
  return PDF_CATEGORY_LABELS[catId] || catId || 'N/A';
}

function buildPhotoLogPdf(photos) {
  if (!photos || photos.length === 0) {
    return [
      subHeading('Appendix D: Photo Log'),
      bodyText('[No photos uploaded. Per Michigan LIRA-EBL Report Checklist and HUD Chapters 5/7, attach photographs of: exterior sides A through D, each room inspected, specific hazard conditions, deteriorated paint areas, sample collection locations, and overall property views. Photos must include captions identifying location, component, and condition.]'),
      spacer(12),
    ];
  }

  // Group photos by room
  var photosByRoom = {};
  photos.forEach(function(p) {
    var key = p.room || 'Unassigned';
    if (!photosByRoom[key]) photosByRoom[key] = [];
    photosByRoom[key].push(p);
  });

  var roomNames = Object.keys(photosByRoom).sort();

  var content = [
    subHeading('Appendix D: Photo Log'),
    bodyText('Total photos documented: ' + photos.length + '. Organized by room/location per Michigan LIRA-EBL Report Checklist requirements with sequential numbering, category, condition assessment, and captions.'),
    spacer(4),
  ];

  // Photo summary table
  var summaryHeaders = ['Room / Location', 'Count', 'Categories'];
  var summaryWidths = [180, 50, 230];
  var summaryRows = roomNames.map(function(roomName) {
    var roomPhotos = photosByRoom[roomName];
    var cats = {};
    roomPhotos.forEach(function(p) { cats[getPdfCatLabel(p.category)] = true; });
    return [
      { text: roomName, style: 'tableCellBold' },
      { text: String(roomPhotos.length), style: 'tableCell', alignment: 'center' },
      { text: Object.keys(cats).join(', '), fontSize: 8, color: DARK_TEXT, margin: [4, 4, 4, 4] }
    ];
  });

  content.push(buildTable(summaryHeaders, summaryRows, { widths: summaryWidths }));
  content.push(pageBreak());

  // Photo details by room
  var photoNum = 0;

  roomNames.forEach(function(roomName) {
    var roomPhotos = photosByRoom[roomName];

    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 468, y2: 0, lineWidth: 1, lineColor: BLUE }],
      margin: [0, 8, 0, 4]
    });
    content.push({ text: roomName + ' (' + roomPhotos.length + ' photo' + (roomPhotos.length !== 1 ? 's' : '') + ')', fontSize: 12, bold: true, color: NAVY, margin: [0, 0, 0, 6] });

    roomPhotos.forEach(function(photo) {
      photoNum++;
      try {
        content.push({
          text: [
            { text: 'Photo ' + photoNum + ': ', fontSize: 10, bold: true, color: NAVY },
            { text: (photo.room || 'N/A') + ' - ' + (photo.component || 'General') +
              (photo.side ? ' (Side ' + photo.side + ')' : ''), fontSize: 10, bold: true, color: DARK_TEXT }
          ],
          margin: [0, 8, 0, 4]
        });

        if (photo.dataUrl) {
          content.push({ image: photo.dataUrl, width: 350, margin: [0, 0, 0, 4] });
        } else {
          content.push(bodyText('[Image not available]'));
        }

        if (photo.caption) {
          content.push({ text: photo.caption, fontSize: 9, italics: true, color: DARK_TEXT, margin: [0, 0, 0, 2] });
        }

        var conditionText = photo.condition && photo.condition !== 'N/A' ? photo.condition : 'Not assessed';
        var dateText = photo.timestamp ? new Date(photo.timestamp).toLocaleString() : 'N/A';
        content.push({
          text: 'Category: ' + getPdfCatLabel(photo.category) + ' | Condition: ' + conditionText + ' | Date: ' + dateText,
          fontSize: 8, color: MED_GRAY, margin: [0, 0, 0, 8]
        });
      } catch (err) {
        content.push(bodyText('Photo ' + photoNum + ': [Error embedding image]'));
      }
    });
  });

  content.push(spacer(12));
  return content;
}

function buildAppendixPlaceholders(projectInfo, photos) {
  var content = [
    sectionHeading('APPENDICES'),
    spacer(8),

    subHeading('Appendix A: Resident Interview'),
    bodyText('[Attach completed Resident Interview form. Documents family composition, child ages, renovation history, housekeeping practices, and occupant health concerns as required by Michigan LIRA-EBL Report Checklist.]'),

    subHeading('Appendix B: Building Condition Survey'),
    bodyText('[Attach completed Building Condition Survey form. Documents interior and exterior building conditions including roof, gutters, exterior siding, foundation, windows, doors, interior walls, ceilings, plaster condition, and water damage.]'),

    subHeading('Appendix C: Floor Plans'),
    bodyText('[Attach floor plans for each level showing room numbers, window locations with type codes, dust wipe sample locations, soil sample locations, and compass orientation.]'),
  ];

  // Appendix D: Photo Log - use real photos if available
  content = content.concat(buildPhotoLogPdf(photos));

  content.push(subHeading('Appendix E: Laboratory Reports'));
  content.push(bodyText('[Attach original laboratory analysis reports from NLLAP-accredited laboratory including chain of custody forms and quality assurance documentation. Lab: ' + (projectInfo.labName || 'N/A') + ', Cert: ' + (projectInfo.labCertNumber || 'N/A') + ']'));

  content.push(subHeading('Appendix F: XRF Calibration Data'));
  content.push(bodyText('[Attach XRF calibration records including Performance Characteristic Sheet (PCS), pre-inspection calibration checks, 4-hour recalibration records, and post-inspection verification. Device: ' + (projectInfo.xrfModel || 'N/A') + ', Serial: ' + (projectInfo.xrfSerial || 'N/A') + ']'));

  content.push(subHeading('Appendix G: Inspector Credentials'));
  content.push(bodyText('[Attach copy of inspector/risk assessor certification card or license. Name: ' + (projectInfo.inspectorName || 'N/A') + ', Cert: ' + (projectInfo.inspectorCert || 'N/A') + ']'));

  return content;
}


// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export async function generatePdfReport(state, hazards) {
  var projectInfo = state.projectInfo;

  // Build all content sections (mirrors DOCX structure exactly)
  var content = [];
  content = content.concat(buildCoverPage(projectInfo));
  content = content.concat(buildExecutiveSummary(state, hazards));
  content = content.concat(buildPurposeAndScope(projectInfo));
  content = content.concat(buildKeyDefinitions());
  content = content.concat(buildPropertyDescription(projectInfo));
  content = content.concat(buildSurveyMethodology(projectInfo));
  content = content.concat(buildXRFResultsSection(state.xrfData));
  // Dust wipe and soil sections only apply to Risk Assessment and Combined LIRA
  if (projectInfo.inspectionType !== 'LBP Inspection Only') {
    content = content.concat(buildDustWipeSection(state.dustWipeSamples));
    content = content.concat(buildSoilSection(state.soilSamples));
  }
  content = content.concat(buildSurfacesUnableToTest());
  content = content.concat(buildPotentialHazards(state.xrfData));
  content = content.concat(buildHazardAnalysisSection(hazards));
  content = content.concat(buildRegulatoryStandards());
  content = content.concat(buildDisclosureLanguage(projectInfo));
  content = content.concat(buildOperationsAndMaintenance());
  content = content.concat(buildReevaluationSchedule(projectInfo, hazards));
  content = content.concat(buildCertificationPage(projectInfo));
  content = content.concat(buildAppendixPlaceholders(projectInfo, state.photos || []));

  // Flatten any nested arrays from sectionHeading()
  var flatContent = [];
  content.forEach(function(item) {
    if (Array.isArray(item)) {
      item.forEach(function(sub) { flatContent.push(sub); });
    } else {
      flatContent.push(item);
    }
  });

  var docDefinition = {
    pageSize: 'LETTER',
    pageMargins: [72, 60, 72, 60],

    header: function(currentPage) {
      if (currentPage === 1) return null;
      return {
        columns: [
          { text: '', width: '*' },
          {
            text: 'LeadFlow AI - ' + projectInfo.inspectionType + ' Report',
            fontSize: 8,
            italics: true,
            color: BLUE,
            alignment: 'right',
            margin: [0, 20, 72, 0]
          }
        ]
      };
    },

    footer: function(currentPage, pageCount) {
      return {
        columns: [
          {
            text: projectInfo.propertyAddress + ', ' + projectInfo.city + ', MI ' + projectInfo.zip,
            fontSize: 8,
            color: MED_GRAY,
            alignment: 'left',
            margin: [72, 0, 0, 0]
          },
          {
            text: 'Page ' + currentPage + ' of ' + pageCount,
            fontSize: 8,
            color: MED_GRAY,
            alignment: 'right',
            margin: [0, 0, 72, 0]
          }
        ],
        margin: [0, 20, 0, 0]
      };
    },

    content: flatContent,

    styles: styles,

    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: DARK_TEXT,
      lineHeight: 1.3
    },

    info: {
      title: 'Lead-Based Paint ' + projectInfo.inspectionType + ' Report',
      author: projectInfo.inspectorName || 'LeadFlow AI',
      subject: 'LBP Report - ' + projectInfo.propertyAddress,
      creator: 'LeadFlow AI'
    }
  };

  // Generate filename
  var filename = 'LeadFlow_LIRA_' +
    (projectInfo.propertyAddress || 'Report').replace(/[^a-zA-Z0-9]/g, '_') +
    '_' + (projectInfo.inspectionDate || new Date().toISOString().split('T')[0]) + '.pdf';

  // Generate and download (pdfmake 0.3.7 uses Promise-based API)
  var pdfDoc = pdfMake.createPdf(docDefinition);
  return Promise.race([
    pdfDoc.download(filename).then(function() { return filename; }),
    new Promise(function(_, reject) {
      setTimeout(function() {
        reject(new Error('PDF generation timed out after 30 seconds. Try reducing the number of embedded photos.'));
      }, 30000);
    })
  ]);
}
