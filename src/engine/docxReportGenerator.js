import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber, LevelFormat, ImageRun
} from 'docx';
import { saveAs } from 'file-saver';
import { THRESHOLDS } from './constants';

// ============================================================================
// COLOR CONSTANTS
// ============================================================================
const NAVY = '1B3A5C';
const BLUE = '2E75B6';
const LIGHT_BLUE = 'D5E8F0';
const VERY_LIGHT = 'F2F7FB';
const RED = 'CC0000';
const GREEN = '228B22';
const YELLOW = 'FFD700';
const ORANGE = 'FF8C00';
const WHITE = 'FFFFFF';
const LIGHT_GRAY = 'F5F5F5';

// ============================================================================
// TABLE HELPERS
// ============================================================================
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const CELL_BORDERS = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };
const CELL_MARGINS = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: CELL_BORDERS,
    shading: { fill: BLUE, type: ShadingType.CLEAR },
    margins: CELL_MARGINS,
    children: [new Paragraph({
      children: [new TextRun({ text: text, bold: true, color: WHITE, font: 'Arial', size: 18 })],
    })],
  });
}

function dataCell(text, width, options = {}) {
  var fill = options.fill || null;
  var bold = options.bold || false;
  var color = options.color || '333333';
  var align = options.align || AlignmentType.LEFT;
  var cellConfig = {
    width: { size: width, type: WidthType.DXA },
    borders: CELL_BORDERS,
    margins: CELL_MARGINS,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: String(text), bold: bold, color: color, font: 'Arial', size: 18 })],
    })],
  };
  if (fill) {
    cellConfig.shading = { fill: fill, type: ShadingType.CLEAR };
  }
  return new TableCell(cellConfig);
}

// ============================================================================
// SECTION BUILDERS
// ============================================================================

function buildCoverPage(projectInfo) {
  return [
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'LEAD-BASED PAINT', font: 'Arial', size: 56, bold: true, color: NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: projectInfo.inspectionType.toUpperCase(), font: 'Arial', size: 44, bold: true, color: BLUE })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({ text: 'Property Risk Assessment Report', font: 'Arial', size: 28, color: BLUE })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
      children: [],
    }),
    new Paragraph({ spacing: { after: 400 }, children: [] }),
    // Property info
    buildLabelValue('Property Address', projectInfo.propertyAddress + ', ' + projectInfo.city + ', MI ' + projectInfo.zip),
    buildLabelValue('Inspection Date', projectInfo.inspectionDate),
    buildLabelValue('Report Date', projectInfo.reportDate),
    buildLabelValue('Year Built', projectInfo.yearBuilt),
    buildLabelValue('Program Type', projectInfo.programType),
    new Paragraph({ spacing: { after: 400 }, children: [] }),
    // Inspector info
    buildLabelValue('Inspector', projectInfo.inspectorName),
    buildLabelValue('Certification', projectInfo.inspectorCert),
    buildLabelValue('Company', projectInfo.companyName),
    buildLabelValue('Phone', projectInfo.companyPhone),
    new Paragraph({ spacing: { after: 400 }, children: [] }),
    // Client info
    buildLabelValue('Prepared For', projectInfo.clientName),
    buildLabelValue('Client Address', projectInfo.clientAddress),
    buildLabelValue('Client Phone', projectInfo.clientPhone),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildLabelValue(label, value) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label + ': ', bold: true, font: 'Arial', size: 22, color: NAVY }),
      new TextRun({ text: value || 'N/A', font: 'Arial', size: 22, color: '333333' }),
    ],
  });
}

function buildSectionHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 200 },
    children: [new TextRun({ text: text, font: 'Arial', size: 32, bold: true, color: NAVY })],
  });
}

function buildSubHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 120 },
    border: { left: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 4 } },
    indent: { left: 120 },
    children: [new TextRun({ text: text, font: 'Arial', size: 26, bold: true, color: BLUE })],
  });
}

function buildBodyText(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: text, font: 'Arial', size: 22, color: '333333' })],
  });
}

function buildExecutiveSummary(state, hazards) {
  var projectInfo = state.projectInfo;
  var xrfData = state.xrfData;
  var dustWipeSamples = state.dustWipeSamples;
  var soilSamples = state.soilSamples;
  var positiveXrf = xrfData.filter(function(d) { return d.result >= THRESHOLDS.xrf_paint; });

  var sev1 = hazards.filter(function(h) { return h.severity === 1; }).length;
  var sev2 = hazards.filter(function(h) { return h.severity === 2; }).length;
  var sev3 = hazards.filter(function(h) { return h.severity === 3; }).length;

  var summaryText = 'This Lead-Based Paint (LBP) ' + projectInfo.inspectionType +
    ' was conducted on ' + projectInfo.inspectionDate +
    ' at ' + projectInfo.propertyAddress + ', ' + projectInfo.city + ', MI ' + projectInfo.zip +
    '. The property was built in ' + projectInfo.yearBuilt + '. ' +
    positiveXrf.length + ' positive lead-based paint readings were identified using ' +
    projectInfo.xrfModel + '. ' + hazards.length + ' total hazards were identified, including ' +
    sev1 + ' Severity 1, ' + sev2 + ' Severity 2, and ' + sev3 + ' Severity 3 hazard(s). ' +
    'Abatement is recommended for all identified hazards.';

  var children = [
    buildSectionHeading('EXECUTIVE SUMMARY'),
    buildBodyText(summaryText),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    buildSubHeading('Summary of Findings'),
    buildLabelValue('Total XRF Readings', String(xrfData.length)),
    buildLabelValue('Positive Readings (\u22651.0 mg/cm\u00B2)', String(positiveXrf.length)),
    buildLabelValue('Total Hazards Identified', String(hazards.length)),
    buildLabelValue('Severity 1 (Highest)', String(sev1)),
    buildLabelValue('Severity 2 (Medium)', String(sev2)),
    buildLabelValue('Severity 3 (Intact Positive)', String(sev3)),
  ];

  if (dustWipeSamples.length > 0) {
    children.push(buildLabelValue('Dust Wipe Samples', String(dustWipeSamples.length)));
  }
  if (soilSamples.length > 0) {
    children.push(buildLabelValue('Soil Samples', String(soilSamples.length)));
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  return children;
}

function buildPropertyDescription(projectInfo) {
  return [
    buildSectionHeading('PROPERTY DESCRIPTION'),
    buildLabelValue('Property Address', projectInfo.propertyAddress + ', ' + projectInfo.city + ', MI ' + projectInfo.zip),
    buildLabelValue('Year Built', projectInfo.yearBuilt),
    buildLabelValue('Inspection Type', projectInfo.inspectionType),
    buildLabelValue('Program', projectInfo.programType),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
  ];
}

function buildSurveyMethodology(projectInfo) {
  var children = [
    buildSectionHeading('SURVEY METHODOLOGY'),
    buildSubHeading('XRF Device Specifications'),
    buildLabelValue('Device Model', projectInfo.xrfModel),
    buildLabelValue('Serial Number', projectInfo.xrfSerial),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    buildSubHeading('Sampling Protocol'),
    buildBodyText('Lead was tested using X-Ray Fluorescence (XRF) analysis. This non-destructive method provides immediate results indicating the presence of lead on surfaces. All testing was conducted in accordance with EPA and HUD protocols.'),
  ];

  if (projectInfo.labName) {
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    children.push(buildSubHeading('Laboratory Analysis'));
    children.push(buildLabelValue('Lab Name', projectInfo.labName));
    children.push(buildLabelValue('Lab Certification', projectInfo.labCertNumber));
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  return children;
}

function buildXRFResultsSection(xrfData) {
  var positiveXrf = xrfData.filter(function(d) { return d.result >= THRESHOLDS.xrf_paint; });

  // Column widths for XRF table (total = 9360 for US Letter with 1" margins)
  var colWidths = [1800, 1800, 900, 1400, 1460, 1000, 1000];

  var headerRow = new TableRow({
    children: [
      headerCell('Room/Location', colWidths[0]),
      headerCell('Component', colWidths[1]),
      headerCell('Side', colWidths[2]),
      headerCell('Substrate', colWidths[3]),
      headerCell('Condition', colWidths[4]),
      headerCell('Result', colWidths[5]),
      headerCell('Status', colWidths[6]),
    ],
  });

  var dataRows = xrfData.map(function(reading, idx) {
    var isPositive = reading.result >= THRESHOLDS.xrf_paint;
    var rowFill = isPositive ? 'FFCCCC' : (idx % 2 === 0 ? null : LIGHT_GRAY);
    var statusColor = isPositive ? RED : GREEN;
    var statusText = isPositive ? 'POSITIVE' : 'NEGATIVE';

    return new TableRow({
      children: [
        dataCell(reading.room, colWidths[0], { fill: rowFill }),
        dataCell(reading.component, colWidths[1], { fill: rowFill }),
        dataCell(reading.side || '-', colWidths[2], { fill: rowFill }),
        dataCell(reading.substrate || 'Paint', colWidths[3], { fill: rowFill }),
        dataCell(reading.condition, colWidths[4], { fill: rowFill }),
        dataCell(reading.result.toFixed(2), colWidths[5], { fill: rowFill, align: AlignmentType.RIGHT, bold: isPositive }),
        dataCell(statusText, colWidths[6], { fill: rowFill, color: statusColor, bold: true }),
      ],
    });
  });

  var children = [
    buildSectionHeading('X-RAY FLUORESCENCE (XRF) RESULTS'),
    buildLabelValue('Total Readings', String(xrfData.length)),
    buildLabelValue('Positive (\u22651.0 mg/cm\u00B2)', String(positiveXrf.length)),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    buildSubHeading('All XRF Readings'),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [headerRow].concat(dataRows),
    }),
  ];

  // Positive-only summary table
  if (positiveXrf.length > 0) {
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
    children.push(buildSubHeading('Positive XRF Results Only (\u22651.0 mg/cm\u00B2)'));

    var posColWidths = [2200, 2200, 1000, 1800, 1160, 1000];
    var posHeaderRow = new TableRow({
      children: [
        headerCell('Room/Location', posColWidths[0]),
        headerCell('Component', posColWidths[1]),
        headerCell('Side', posColWidths[2]),
        headerCell('Condition', posColWidths[3]),
        headerCell('Result', posColWidths[4]),
        headerCell('Severity', posColWidths[5]),
      ],
    });

    var posRows = positiveXrf.map(function(reading) {
      return new TableRow({
        children: [
          dataCell(reading.room, posColWidths[0], { fill: 'FFCCCC' }),
          dataCell(reading.component, posColWidths[1], { fill: 'FFCCCC' }),
          dataCell(reading.side || '-', posColWidths[2], { fill: 'FFCCCC' }),
          dataCell(reading.condition, posColWidths[3], { fill: 'FFCCCC', bold: true }),
          dataCell(reading.result.toFixed(2) + ' mg/cm\u00B2', posColWidths[4], { fill: 'FFCCCC', bold: true, color: RED }),
          dataCell(reading.condition === 'Deteriorated' ? 'SEV 1-2' : 'SEV 3', posColWidths[5], { fill: 'FFCCCC', bold: true }),
        ],
      });
    });

    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: posColWidths,
      rows: [posHeaderRow].concat(posRows),
    }));
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  return children;
}

function buildDustWipeSection(dustWipeSamples) {
  if (dustWipeSamples.length === 0) return [];

  var colWidths = [1200, 2200, 1500, 1400, 1560, 1500];

  var headerRow = new TableRow({
    children: [
      headerCell('Sample ID', colWidths[0]),
      headerCell('Location', colWidths[1]),
      headerCell('Surface Type', colWidths[2]),
      headerCell('Result (\u00B5g/ft\u00B2)', colWidths[3]),
      headerCell('Threshold', colWidths[4]),
      headerCell('Status', colWidths[5]),
    ],
  });

  var dataRows = dustWipeSamples.map(function(sample, idx) {
    var threshold = (sample.surfaceType === 'Sill/Stool' || sample.surfaceType === 'Trough')
      ? THRESHOLDS.dust_sill_trough
      : sample.surfaceType === 'Porch Floor'
      ? THRESHOLDS.dust_porch
      : THRESHOLDS.dust_floor;
    var isHazard = sample.result >= threshold;
    var rowFill = isHazard ? 'FFCCCC' : (idx % 2 === 0 ? null : LIGHT_GRAY);
    var statusText = isHazard ? 'HAZARD' : 'ACCEPTABLE';
    var statusColor = isHazard ? RED : GREEN;

    return new TableRow({
      children: [
        dataCell(sample.sampleId, colWidths[0], { fill: rowFill }),
        dataCell(sample.location, colWidths[1], { fill: rowFill }),
        dataCell(sample.surfaceType, colWidths[2], { fill: rowFill }),
        dataCell(sample.result.toFixed(1), colWidths[3], { fill: rowFill, align: AlignmentType.RIGHT }),
        dataCell(String(threshold), colWidths[4], { fill: rowFill, align: AlignmentType.CENTER }),
        dataCell(statusText, colWidths[5], { fill: rowFill, color: statusColor, bold: true }),
      ],
    });
  });

  return [
    buildSectionHeading('DUST WIPE TEST RESULTS'),
    buildBodyText('Dust wipe samples were collected in accordance with ASTM E1728 and analyzed by an NLLAP-accredited laboratory.'),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [headerRow].concat(dataRows),
    }),
    new Paragraph({ spacing: { after: 100 }, children: [] }),
    buildBodyText('Hazard thresholds per EPA/HUD: Floors \u2265 10 \u00B5g/ft\u00B2, Window Sills/Troughs \u2265 100 \u00B5g/ft\u00B2, Porches \u2265 40 \u00B5g/ft\u00B2.'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildSoilSection(soilSamples) {
  if (soilSamples.length === 0) return [];

  var colWidths = [1200, 2400, 1500, 1400, 1460, 1400];

  var headerRow = new TableRow({
    children: [
      headerCell('Sample ID', colWidths[0]),
      headerCell('Location', colWidths[1]),
      headerCell('Area Type', colWidths[2]),
      headerCell('Result (ppm)', colWidths[3]),
      headerCell('Threshold', colWidths[4]),
      headerCell('Status', colWidths[5]),
    ],
  });

  var dataRows = soilSamples.map(function(sample, idx) {
    var threshold = sample.areaType === 'Play Area' ? THRESHOLDS.soil_play : THRESHOLDS.soil_yard;
    var isHazard = sample.result >= threshold;
    var rowFill = isHazard ? 'FFCCCC' : (idx % 2 === 0 ? null : LIGHT_GRAY);
    var statusText = isHazard ? 'HAZARD' : 'ACCEPTABLE';
    var statusColor = isHazard ? RED : GREEN;

    return new TableRow({
      children: [
        dataCell(sample.sampleId, colWidths[0], { fill: rowFill }),
        dataCell(sample.location, colWidths[1], { fill: rowFill }),
        dataCell(sample.areaType, colWidths[2], { fill: rowFill }),
        dataCell(String(sample.result), colWidths[3], { fill: rowFill, align: AlignmentType.RIGHT }),
        dataCell(String(threshold), colWidths[4], { fill: rowFill, align: AlignmentType.CENTER }),
        dataCell(statusText, colWidths[5], { fill: rowFill, color: statusColor, bold: true }),
      ],
    });
  });

  return [
    buildSectionHeading('SOIL TEST RESULTS'),
    buildBodyText('Soil samples were collected in accordance with EPA/HUD protocols from bare soil areas on the property.'),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [headerRow].concat(dataRows),
    }),
    new Paragraph({ spacing: { after: 100 }, children: [] }),
    buildBodyText('Hazard thresholds per EPA/HUD: Play Areas \u2265 400 ppm, Rest of Yard \u2265 1,200 ppm.'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildHazardAnalysisSection(hazards) {
  var children = [
    buildSectionHeading('HAZARD ANALYSIS AND RECOMMENDATIONS'),
    buildLabelValue('Total Hazards Identified', String(hazards.length)),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];

  if (hazards.length === 0) {
    children.push(buildBodyText('No lead-based paint hazards, dust hazards, or soil hazards were identified at this property.'));
    children.push(new Paragraph({ children: [new PageBreak()] }));
    return children;
  }

  // Summary table
  var colWidths = [2200, 1200, 1400, 1200, 1200, 1000, 1160];
  var headerRow = new TableRow({
    children: [
      headerCell('Component', colWidths[0]),
      headerCell('Location', colWidths[1]),
      headerCell('Type', colWidths[2]),
      headerCell('Result', colWidths[3]),
      headerCell('Condition', colWidths[4]),
      headerCell('Severity', colWidths[5]),
      headerCell('Priority', colWidths[6]),
    ],
  });

  var dataRows = hazards.map(function(hazard, idx) {
    var sevColor = hazard.severity === 1 ? RED : hazard.severity === 2 ? ORANGE : 'B8860B';
    var rowFill = idx % 2 === 0 ? null : LIGHT_GRAY;
    return new TableRow({
      children: [
        dataCell(hazard.component, colWidths[0], { fill: rowFill, bold: true }),
        dataCell(hazard.location, colWidths[1], { fill: rowFill }),
        dataCell(hazard.type, colWidths[2], { fill: rowFill }),
        dataCell(hazard.result.toFixed(2) + ' ' + hazard.unit, colWidths[3], { fill: rowFill }),
        dataCell(hazard.cause || '-', colWidths[4], { fill: rowFill }),
        dataCell('Severity ' + hazard.severity, colWidths[5], { fill: rowFill, color: sevColor, bold: true }),
        dataCell('Priority ' + hazard.priority, colWidths[6], { fill: rowFill }),
      ],
    });
  });

  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow].concat(dataRows),
  }));

  // Detailed hazard boxes
  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  children.push(buildSubHeading('Detailed Hazard Descriptions & Recommendations'));

  hazards.forEach(function(hazard, idx) {
    children.push(new Paragraph({
      spacing: { before: 200, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE, space: 1 } },
      children: [new TextRun({
        text: 'Hazard #' + (idx + 1) + ': ' + hazard.component + ' - ' + hazard.location,
        font: 'Arial', size: 24, bold: true, color: NAVY,
      })],
    }));
    children.push(buildLabelValue('Type', hazard.type));
    children.push(buildLabelValue('Result', hazard.result.toFixed(2) + ' ' + hazard.unit));
    children.push(buildLabelValue('Severity', 'Severity ' + hazard.severity));
    children.push(buildLabelValue('Priority', 'Priority ' + hazard.priority));
    children.push(buildLabelValue('Cause', hazard.cause || 'N/A'));

    children.push(new Paragraph({
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: 'Recommended Abatement Options:', font: 'Arial', size: 20, bold: true, color: BLUE })],
    }));

    if (hazard.abatementOptions && hazard.abatementOptions.length > 0) {
      hazard.abatementOptions.forEach(function(opt) {
        children.push(new Paragraph({
          spacing: { after: 40 },
          indent: { left: 400 },
          children: [new TextRun({ text: '\u2022 ' + opt, font: 'Arial', size: 20, color: '333333' })],
        }));
      });
    }

    children.push(new Paragraph({
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: 'Interim Control Measures:', font: 'Arial', size: 20, bold: true, color: BLUE })],
    }));

    var interimText = hazard.selectedInterimControl || hazard.interimControlOptions || 'N/A';
    children.push(new Paragraph({
      spacing: { after: 80 },
      indent: { left: 400 },
      children: [new TextRun({ text: interimText, font: 'Arial', size: 20, color: '333333' })],
    }));
  });

  children.push(new Paragraph({ children: [new PageBreak()] }));
  return children;
}

// ============================================================================
// NEW COMPLIANCE SECTIONS (Michigan LIRA-EBL + EPA/HUD)
// ============================================================================

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
    buildSectionHeading('PURPOSE AND SCOPE'),
    buildBodyText(scopeText),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    buildBodyText(programText),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    buildBodyText('The scope of this ' + projectInfo.inspectionType + ' includes testing of all accessible painted surfaces using X-Ray Fluorescence (XRF) analysis, collection and laboratory analysis of dust wipe and soil samples as applicable, visual assessment of paint conditions, and evaluation of potential lead hazard exposure pathways.'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildKeyDefinitions() {
  return [
    buildSectionHeading('KEY DEFINITIONS'),
    buildSubHeading('Lead-Based Paint (LBP)'),
    buildBodyText('Paint or other surface coatings that contain lead equal to or exceeding 1.0 milligrams per square centimeter (mg/cm\u00B2) as measured by XRF, or more than 0.5 percent by weight (5,000 parts per million) as determined by laboratory analysis. (40 CFR 745.61)'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    buildSubHeading('Lead-Based Paint Hazard'),
    buildBodyText('Any condition that causes exposure to lead from lead-contaminated dust, lead-contaminated soil, or deteriorated lead-based paint, or lead-based paint that is present on friction surfaces, impact surfaces, or chewable surfaces that would result in adverse human health effects. (40 CFR 745.61)'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    buildSubHeading('Dust-Lead Hazard'),
    buildBodyText('Surface dust in a residential dwelling or child-occupied facility that contains a mass-per-area concentration of lead at any reportable level as analyzed by an EPA-recognized NLLAP laboratory. Per the 2024 EPA Final Rule (effective January 13, 2025), any dust-lead level reported by an NLLAP-accredited laboratory constitutes a Dust-Lead Reportable Level (DLRL).'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    buildSubHeading('Soil-Lead Hazard'),
    buildBodyText('Bare soil on residential real property or on the property of a child-occupied facility that contains total lead equal to or exceeding 400 parts per million (ppm) in play areas, or average of 1,200 ppm in the rest of the yard. (40 CFR 745.65)'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    buildSubHeading('Abatement'),
    buildBodyText('Any set of measures designed to permanently eliminate lead-based paint or lead-based paint hazards. Abatement includes removal, enclosure, encapsulation, replacement of components, removal of soil, and all preparation, cleanup, disposal, and post-abatement clearance testing. (40 CFR 745.223)'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    buildSubHeading('Interim Controls'),
    buildBodyText('A set of measures designed to reduce temporarily human exposure or likely exposure to lead-based paint hazards. Interim controls include specialized cleaning, repairs, maintenance, painting, temporary containment, ongoing monitoring, and the establishment and operation of management and resident education programs. (24 CFR 35.110)'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildSurfacesUnableToTest(xrfData) {
  // This section is required by Michigan LIRA-EBL checklist even if empty
  return [
    buildSectionHeading('SURFACES UNABLE TO BE TESTED'),
    buildBodyText('The following surfaces were inaccessible or otherwise unable to be tested during the inspection. Per Michigan Lead Hazard Control Rules, untested surfaces that share construction and painting history with positive tested surfaces should be assumed to contain lead-based paint.'),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    buildBodyText('[This section to be completed by the inspector. Document any surfaces that could not be accessed due to furniture, sealed areas, structural conditions, or other reasons. Include: Room, Component, and Reason Not Tested.]'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    buildBodyText('If no surfaces were inaccessible: All accessible painted surfaces within the property were tested during this inspection.'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildPotentialHazards(xrfData) {
  // Intact positive surfaces = potential hazards (positive but not currently deteriorated)
  var potentialHazards = xrfData.filter(function(d) {
    return d.result >= THRESHOLDS.xrf_paint && d.condition === 'Intact';
  });

  var children = [
    buildSectionHeading('POTENTIAL LEAD-BASED PAINT HAZARDS'),
    buildBodyText('Potential hazards are surfaces that tested positive for lead-based paint but were in intact condition at the time of inspection. These surfaces do not currently constitute an active hazard but will become hazardous if the paint deteriorates. Ongoing monitoring and maintenance is required.'),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];

  if (potentialHazards.length === 0) {
    children.push(buildBodyText('No potential hazards (intact positive surfaces) were identified at this property.'));
  } else {
    var colWidths = [2000, 2200, 1000, 1400, 1360, 1400];
    var headerRow = new TableRow({
      children: [
        headerCell('Room/Location', colWidths[0]),
        headerCell('Component', colWidths[1]),
        headerCell('Side', colWidths[2]),
        headerCell('Substrate', colWidths[3]),
        headerCell('Result (mg/cm\u00B2)', colWidths[4]),
        headerCell('Condition', colWidths[5]),
      ],
    });

    var dataRows = potentialHazards.map(function(reading, idx) {
      var rowFill = idx % 2 === 0 ? 'FFF3CD' : 'FFFDE7';
      return new TableRow({
        children: [
          dataCell(reading.room, colWidths[0], { fill: rowFill }),
          dataCell(reading.component, colWidths[1], { fill: rowFill }),
          dataCell(reading.side || '-', colWidths[2], { fill: rowFill }),
          dataCell(reading.substrate || 'Paint', colWidths[3], { fill: rowFill }),
          dataCell(reading.result.toFixed(2), colWidths[4], { fill: rowFill, align: AlignmentType.RIGHT }),
          dataCell('Intact', colWidths[5], { fill: rowFill, color: 'B8860B', bold: true }),
        ],
      });
    });

    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [headerRow].concat(dataRows),
    }));

    children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    children.push(buildBodyText('IMPORTANT: These surfaces must be maintained in intact condition. If paint deterioration occurs on any of these surfaces, they will constitute active lead-based paint hazards requiring immediate interim controls or abatement.'));
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  return children;
}

function buildRegulatoryStandards() {
  return [
    buildSectionHeading('REGULATORY STANDARDS REFERENCE'),

    buildSubHeading('Applicable Federal Regulations'),
    buildBodyText('40 CFR Part 745 - Lead-Based Paint Poisoning Prevention in Certain Residential Structures (EPA)'),
    buildBodyText('24 CFR Part 35 - Lead-Based Paint Poisoning Prevention in Certain Residential Structures (HUD)'),
    buildBodyText('HUD Guidelines for the Evaluation and Control of Lead-Based Paint Hazards in Housing (Chapters 5 and 7)'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),

    buildSubHeading('Applicable Michigan Regulations'),
    buildBodyText('Michigan Lead Hazard Control Rules - LARA Administrative Code R 325.9901 through R 325.9999'),
    buildBodyText('Michigan Public Health Code - Act 368 of 1978, Part 54A (Lead Abatement)'),
    buildBodyText('Michigan Lead Information Registry - leadinforegistry.state.mi.us'),
    new Paragraph({ spacing: { after: 120 }, children: [] }),

    buildSubHeading('XRF Paint Standards (mg/cm\u00B2)'),
    buildBodyText('Positive (Lead-Based Paint): \u2265 1.0 mg/cm\u00B2 per 40 CFR 745.65'),
    buildBodyText('Laboratory Analysis: \u2265 0.5% by weight or \u2265 5,000 ppm per 40 CFR 745.65'),
    buildBodyText('Inconclusive XRF readings are determined per the XRF Performance Characteristic Sheet (PCS) for the specific instrument used.'),
    new Paragraph({ spacing: { after: 120 }, children: [] }),

    buildSubHeading('Dust-Lead Hazard Standards (\u00B5g/ft\u00B2) - Risk Assessment'),
    buildBodyText('Per the 2024 EPA Final Rule (effective January 13, 2025):'),
    buildBodyText('Dust-Lead Reportable Level (DLRL): Any reportable level from an NLLAP-accredited laboratory'),
    buildBodyText('Legacy reference thresholds still used by many HUD programs:'),
    buildBodyText('  Hard Floors & Carpets: \u2265 10 \u00B5g/ft\u00B2'),
    buildBodyText('  Window Sills/Stools: \u2265 100 \u00B5g/ft\u00B2'),
    buildBodyText('  Window Troughs: \u2265 100 \u00B5g/ft\u00B2'),
    buildBodyText('  Porches/Exterior: \u2265 40 \u00B5g/ft\u00B2 (HUD)'),
    new Paragraph({ spacing: { after: 120 }, children: [] }),

    buildSubHeading('Dust-Lead Action Levels (DLAL) - Post-Abatement Clearance'),
    buildBodyText('Per EPA 2024 Final Rule (full compliance required January 12, 2026):'),
    buildBodyText('  Floors: \u2265 5 \u00B5g/ft\u00B2 (reduced from 10)'),
    buildBodyText('  Window Sills: \u2265 40 \u00B5g/ft\u00B2 (reduced from 100)'),
    buildBodyText('  Window Troughs: \u2265 100 \u00B5g/ft\u00B2 (reduced from 400)'),
    new Paragraph({ spacing: { after: 120 }, children: [] }),

    buildSubHeading('Soil Hazard Standards (ppm)'),
    buildBodyText('Play Areas: \u2265 400 ppm per 40 CFR 745.65'),
    buildBodyText('Rest of Yard (Average): \u2265 1,200 ppm per 40 CFR 745.65'),
    new Paragraph({ spacing: { after: 120 }, children: [] }),

    buildSubHeading('Severity Classification (per Michigan/HUD Guidelines)'),
    buildBodyText('Severity 1 (Highest Priority): Deteriorated paint on accessible, high-friction/impact surfaces in living spaces (windows, doors, stairs). Active lead dust generation likely.'),
    buildBodyText('Severity 2 (Medium Priority): Deteriorated paint on less accessible surfaces (exterior, basement, attic). Exposure pathway exists but is less direct.'),
    buildBodyText('Severity 3 (Lower Priority): Intact positive lead-based paint in low-traffic areas. No active deterioration but requires monitoring and maintenance.'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildDisclosureLanguage(projectInfo) {
  return [
    buildSectionHeading('DISCLOSURE AND NOTIFICATION'),

    buildSubHeading('Federal Title X Disclosure Requirement'),
    buildBodyText('Federal law (Title X, Residential Lead-Based Paint Hazard Reduction Act of 1992) requires that sellers and lessors of most pre-1978 housing disclose known lead-based paint and lead-based paint hazards to prospective buyers and tenants. A copy of this report must be provided to the buyer or tenant before the sale or lease is finalized.'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),

    buildSubHeading('Michigan Notification Requirements'),
    buildBodyText('Per Michigan Lead Hazard Control Rules (R 325.9959), a copy of this report must be provided to the property owner within 20 business days of completion of the inspection/risk assessment. The owner is responsible for disclosing the results to current and future occupants.'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),

    buildSubHeading('EPA Educational Pamphlet'),
    buildBodyText('The EPA pamphlet "Protect Your Family From Lead in Your Home" (EPA-747-K-12-001) must be provided to all occupants of the property. This pamphlet is available from the National Lead Information Center at 1-800-424-LEAD (5323) or online at www.epa.gov/lead.'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),

    buildSubHeading('Notification of Results'),
    buildBodyText('The results of this ' + projectInfo.inspectionType + ' must be disclosed to:'),
    buildBodyText('  1. The property owner (within 20 business days per Michigan R 325.9959)'),
    buildBodyText('  2. Current occupants of the property'),
    buildBodyText('  3. Prospective buyers or tenants (before sale or lease per Title X)'),
    buildBodyText('  4. The Michigan Department of Health and Human Services (MDHHS) as required'),
    buildBodyText('  5. The local health department if an Elevated Blood Lead (EBL) case is involved'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildOperationsAndMaintenance(hazards) {
  return [
    buildSectionHeading('OPERATIONS AND MAINTENANCE GUIDANCE'),
    buildBodyText('The following safe maintenance practices should be followed in any pre-1978 property where lead-based paint has been identified:'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),

    buildSubHeading('General Safe Work Practices'),
    buildBodyText('1. Do not dry sand, dry scrape, or use heat guns on lead-based paint surfaces.'),
    buildBodyText('2. Always wet surfaces before disturbing paint (wet scraping, wet sanding).'),
    buildBodyText('3. Contain all paint chips and debris using plastic sheeting.'),
    buildBodyText('4. Clean work areas with HEPA vacuum followed by wet mopping.'),
    buildBodyText('5. Any renovation, repair, or painting work disturbing more than 6 square feet of painted surface in a room (or 20 square feet on exterior) must be performed by an EPA-certified renovator under the RRP Rule (40 CFR 745, Subpart E).'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),

    buildSubHeading('Ongoing Monitoring'),
    buildBodyText('1. Inspect all identified lead-based paint surfaces at least annually for signs of deterioration.'),
    buildBodyText('2. Immediately address any peeling, chipping, chalking, or cracking paint on positive surfaces.'),
    buildBodyText('3. Keep all positive surfaces clean using wet cleaning methods.'),
    buildBodyText('4. Maintain written records of all monitoring activities and paint maintenance.'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),

    buildSubHeading('Dust Control'),
    buildBodyText('1. Clean floors, window sills, and window troughs regularly using wet mopping and HEPA vacuuming.'),
    buildBodyText('2. Pay special attention to window wells and troughs where lead dust accumulates from friction.'),
    buildBodyText('3. Wash children\'s hands frequently, especially before meals.'),
    buildBodyText('4. Keep play areas clean and free of paint chips.'),
    new Paragraph({ spacing: { after: 80 }, children: [] }),

    buildSubHeading('Soil Precautions'),
    buildBodyText('1. Cover bare soil in play areas with grass, mulch, gravel, or other ground cover.'),
    buildBodyText('2. Ensure children wash hands after playing outdoors.'),
    buildBodyText('3. Remove shoes before entering the home to prevent tracking lead-contaminated soil inside.'),
    buildBodyText('4. Plant grass or other vegetation to prevent soil erosion near the foundation.'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function buildReevaluationSchedule(projectInfo, hazards) {
  var hasActiveHazards = hazards.some(function(h) { return h.severity === 1 || h.severity === 2; });

  return [
    buildSectionHeading('RE-EVALUATION SCHEDULE'),
    buildBodyText('Per HUD requirements (24 CFR 35.1355) and Michigan Lead Hazard Control Rules, properties with identified lead-based paint hazards must undergo periodic re-evaluation to verify that hazard controls remain effective.'),
    new Paragraph({ spacing: { after: 120 }, children: [] }),

    buildSubHeading('Recommended Re-evaluation Timeline'),
    buildBodyText(hasActiveHazards
      ? 'Active hazards were identified at this property. The following re-evaluation schedule is recommended:'
      : 'No active hazards requiring immediate action were identified. The following monitoring schedule is recommended:'
    ),
    new Paragraph({ spacing: { after: 80 }, children: [] }),

    buildBodyText('Post-Abatement Clearance: Immediately following completion of any abatement or interim control work. Dust clearance testing must confirm levels below EPA Dust-Lead Action Levels (DLAL): floors < 5 \u00B5g/ft\u00B2, sills < 40 \u00B5g/ft\u00B2, troughs < 100 \u00B5g/ft\u00B2.'),
    new Paragraph({ spacing: { after: 60 }, children: [] }),
    buildBodyText('Interim Control Re-evaluation: Within 12 months of interim control implementation, and annually thereafter, to verify continued effectiveness.'),
    new Paragraph({ spacing: { after: 60 }, children: [] }),
    buildBodyText('Ongoing Monitoring: Visual inspection of all identified lead-based paint surfaces at least annually. Document any deterioration and address immediately.'),
    new Paragraph({ spacing: { after: 60 }, children: [] }),
    buildBodyText('Reevaluation of Risk Assessment: A new risk assessment should be conducted if: (a) paint deterioration is observed on positive surfaces, (b) renovation or repair work disturbs painted surfaces, (c) a child with elevated blood lead levels is identified as residing in the property, or (d) the property changes ownership or tenancy.'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function dataUrlToBuffer(dataUrl) {
  // Convert base64 data URL to Uint8Array for docx ImageRun
  var base64 = dataUrl.split(',')[1];
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Category ID to human-readable label mapping
var PHOTO_CATEGORY_LABELS = {
  // Exterior (Side A = address/street, clockwise per HUD Ch.7)
  ext_side_a: 'Exterior - Side A (Street/Address)',
  ext_side_b: 'Exterior - Side B',
  ext_side_c: 'Exterior - Side C (Rear)',
  ext_side_d: 'Exterior - Side D',
  ext_foundation: 'Exterior - Foundation/Dripline',
  ext_roof: 'Exterior - Roof/Soffit/Fascia',
  ext_gutters: 'Exterior - Gutters/Downspouts',
  ext_porch: 'Exterior - Porch/Deck/Steps',
  ext_outbuilding: 'Exterior - Garage/Shed/Outbuilding',
  ext_fence: 'Exterior - Fence/Railing',
  // Interior (per HUD Ch.5/7 & MI Building Condition Survey)
  interior_room: 'Interior - Room Overview',
  interior_window: 'Interior - Window (Sash/Sill/Trough)',
  interior_door: 'Interior - Door/Frame/Jamb',
  interior_wall: 'Interior - Wall Surface',
  interior_ceiling: 'Interior - Ceiling',
  interior_trim: 'Interior - Trim/Baseboard/Crown',
  interior_closet: 'Interior - Closet/Cabinet/Shelving',
  interior_stairwell: 'Interior - Stairwell/Railing/Banister',
  interior_floor: 'Interior - Floor/Carpet Condition',
  // Building Condition (per HUD 2012 Survey)
  condition_water: 'Condition - Water Damage/Staining',
  condition_plaster: 'Condition - Plaster/Drywall Damage',
  condition_mini_blinds: 'Condition - Vinyl Mini Blinds (Pre-1997)',
  // Hazards (per MI LIRA-EBL Checklist)
  hazard_closeup: 'Hazard - Deteriorated Paint Close-up',
  hazard_friction: 'Hazard - Friction Surface (Windows/Doors)',
  hazard_impact: 'Hazard - Impact Surface (Door Stops/Knobs)',
  hazard_chewable: 'Hazard - Chewable Surface (Sills/Railings)',
  hazard_bare_soil: 'Hazard - Bare Soil/Play Area',
  // Testing (per 40 CFR 745 & HUD protocols)
  xrf_location: 'Testing - XRF Reading Location',
  paint_chip: 'Testing - Paint Chip Sample Location',
  dust_sample_floor: 'Testing - Dust Wipe: Floor',
  dust_sample_sill: 'Testing - Dust Wipe: Window Sill/Stool',
  dust_sample_trough: 'Testing - Dust Wipe: Window Trough',
  soil_sample_play: 'Testing - Soil: Play Area',
  soil_sample_dripline: 'Testing - Soil: Foundation Dripline',
  soil_sample_yard: 'Testing - Soil: Bare Yard Area',
  // EBL/Medicaid Child-Specific (per MI EBL Protocol)
  child_sleep: 'Child - Sleeping Area/Crib/Bed',
  child_play: 'Child - Play Area (Indoor)',
  child_eat: 'Child - Eating Area/High Chair',
  child_chewable: 'Child - Chewable Surfaces (Sills/Rails)',
  child_outdoor_play: 'Child - Outdoor Play Area',
  household_items: 'Household - Lead-Containing Items (Toys/Ceramics)',
  household_mini_blinds: 'Household - Vinyl Mini Blinds',
  household_spices: 'Household - Imported Spices/Cosmetics/Pottery',
  secondary_location: 'Secondary Location (Daycare/Relative)',
  // Clearance (per HUD Ch.12/15)
  clearance_before: 'Clearance - Before (Pre-Abatement)',
  clearance_after: 'Clearance - After (Post-Abatement)',
  clearance_dust: 'Clearance - Dust Clearance Sample Location',
  // General
  general_property: 'General - Property Overview',
  other: 'Other',
  // Legacy compatibility
  dust_sample: 'Testing - Dust Wipe Sample Location',
  soil_sample: 'Testing - Soil Sample Location',
  child_area: 'Child-Specific - Play Area/Bedroom',
};

function getCatLabel(catId) {
  return PHOTO_CATEGORY_LABELS[catId] || catId || 'N/A';
}

function buildPhotoLog(photos) {
  if (!photos || photos.length === 0) {
    return [
      buildSubHeading('Appendix D: Photo Log'),
      buildBodyText('[No photos uploaded. Per Michigan LIRA-EBL Report Checklist and HUD Chapters 5/7, attach photographs of: exterior sides A through D, each room inspected, specific hazard conditions, deteriorated paint areas, sample collection locations, and overall property views. Photos must include captions identifying location, component, and condition.]'),
      new Paragraph({ spacing: { after: 200 }, children: [] }),
    ];
  }

  // Group photos by room
  var photosByRoom = {};
  photos.forEach(function(p) {
    var key = p.room || 'Unassigned';
    if (!photosByRoom[key]) photosByRoom[key] = [];
    photosByRoom[key].push(p);
  });

  var children = [
    buildSubHeading('Appendix D: Photo Log'),
    buildBodyText('Total photos documented: ' + photos.length + '. Photos are organized by room/location per Michigan LIRA-EBL Report Checklist requirements. Each photo includes sequential numbering, location, component, category, paint condition assessment, and descriptive caption.'),
    new Paragraph({ spacing: { after: 60 }, children: [] }),

    // Photo summary table
    buildBodyText('Photo Summary by Location:'),
  ];

  // Build summary table
  var summaryColWidths = [4000, 2680, 2680];
  var summaryHeaderRow = new TableRow({
    children: [
      headerCell('Room / Location', summaryColWidths[0]),
      headerCell('Photo Count', summaryColWidths[1]),
      headerCell('Categories', summaryColWidths[2]),
    ],
  });

  var roomNames = Object.keys(photosByRoom).sort();
  var summaryRows = roomNames.map(function(roomName, idx) {
    var roomPhotos = photosByRoom[roomName];
    var cats = {};
    roomPhotos.forEach(function(p) { cats[getCatLabel(p.category)] = true; });
    var catList = Object.keys(cats).join(', ');
    var rowFill = idx % 2 === 0 ? null : LIGHT_GRAY;
    return new TableRow({
      children: [
        dataCell(roomName, summaryColWidths[0], { fill: rowFill, bold: true }),
        dataCell(String(roomPhotos.length), summaryColWidths[1], { fill: rowFill }),
        dataCell(catList, summaryColWidths[2], { fill: rowFill }),
      ],
    });
  });

  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: summaryColWidths,
    rows: [summaryHeaderRow].concat(summaryRows),
  }));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Photo details by room
  var photoNum = 0;

  roomNames.forEach(function(roomName) {
    var roomPhotos = photosByRoom[roomName];

    children.push(new Paragraph({
      spacing: { before: 200, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE, space: 1 } },
      children: [new TextRun({
        text: roomName + ' (' + roomPhotos.length + ' photo' + (roomPhotos.length !== 1 ? 's' : '') + ')',
        font: 'Arial', size: 22, bold: true, color: NAVY,
      })],
    }));

    roomPhotos.forEach(function(photo) {
      photoNum++;
      try {
        if (!photo.dataUrl) {
          children.push(buildBodyText('Photo ' + photoNum + ': [Image not available]'));
          return;
        }
        var imgBuffer = dataUrlToBuffer(photo.dataUrl);

        var maxWidth = 360;
        var maxHeight = 270;
        var w = photo.width || 800;
        var h = photo.height || 600;
        var ratio = Math.min(maxWidth / w, maxHeight / h, 1);
        var displayW = Math.round(w * ratio);
        var displayH = Math.round(h * ratio);

        // Photo header with number
        children.push(new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({ text: 'Photo ' + photoNum + ': ', font: 'Arial', size: 20, bold: true, color: NAVY }),
            new TextRun({
              text: (photo.room || 'N/A') + ' - ' + (photo.component || 'General') +
                (photo.side ? ' (Side ' + photo.side + ')' : ''),
              font: 'Arial', size: 20, bold: true, color: '333333',
            }),
          ],
        }));

        // Image
        children.push(new Paragraph({
          spacing: { after: 40 },
          children: [new ImageRun({
            data: imgBuffer,
            transformation: { width: displayW, height: displayH },
            type: 'jpg',
          })],
        }));

        // Caption
        if (photo.caption) {
          children.push(new Paragraph({
            spacing: { after: 20 },
            children: [new TextRun({ text: photo.caption, font: 'Arial', size: 18, italics: true, color: '333333' })],
          }));
        }

        // Metadata line
        var conditionText = photo.condition && photo.condition !== 'N/A' ? photo.condition : 'Not assessed';
        var dateText = photo.timestamp ? new Date(photo.timestamp).toLocaleString() : 'N/A';
        var metaLine = 'Category: ' + getCatLabel(photo.category) +
          ' | Condition: ' + conditionText +
          ' | Date: ' + dateText;

        children.push(new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: metaLine, font: 'Arial', size: 16, color: '999999' })],
        }));
      } catch (err) {
        children.push(buildBodyText('Photo ' + photoNum + ': [Error embedding image - ' + (err.message || 'unknown') + ']'));
      }
    });
  });

  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  return children;
}

function buildAppendixPlaceholders(projectInfo, photos) {
  var children = [
    buildSectionHeading('APPENDICES'),
    new Paragraph({ spacing: { after: 200 }, children: [] }),

    buildSubHeading('Appendix A: Resident Interview'),
    buildBodyText('[Attach completed Resident Interview form. The resident interview documents family composition, child ages and behavior patterns, renovation history, housekeeping practices, and occupant health concerns as required by Michigan LIRA-EBL Report Checklist.]'),
    new Paragraph({ spacing: { after: 200 }, children: [] }),

    buildSubHeading('Appendix B: Building Condition Survey'),
    buildBodyText('[Attach completed Building Condition Survey form. The survey documents interior and exterior building conditions including: roof, gutters, exterior siding, foundation, windows, doors, interior walls, ceilings, plaster condition, water damage, and vinyl mini blinds as required by Michigan LIRA-EBL Report Checklist.]'),
    new Paragraph({ spacing: { after: 200 }, children: [] }),

    buildSubHeading('Appendix C: Floor Plans'),
    buildBodyText('[Attach floor plans for each level of the building showing: room numbers, window locations with type codes (WD=Wood, V=Vinyl, AL=Aluminum), dust wipe sample locations, soil sample locations, and compass orientation (North arrow). Required per Michigan LIRA-EBL Report Checklist.]'),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
  ];

  // Appendix D: Photo Log - use real photos if available
  children = children.concat(buildPhotoLog(photos));

  children.push(buildSubHeading('Appendix E: Laboratory Reports'));
  children.push(buildBodyText('[Attach original laboratory analysis reports from the NLLAP-accredited laboratory including: chain of custody forms, dust wipe results, soil sample results, paint chip results (if any), and quality assurance documentation. Lab: ' + (projectInfo.labName || 'N/A') + ', Certification: ' + (projectInfo.labCertNumber || 'N/A') + ']'));
  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  children.push(buildSubHeading('Appendix F: XRF Calibration Data'));
  children.push(buildBodyText('[Attach XRF instrument calibration records including: Performance Characteristic Sheet (PCS), pre-inspection calibration checks (minimum 3 readings), 4-hour recalibration records, and post-inspection calibration verification. Device: ' + (projectInfo.xrfModel || 'N/A') + ', Serial: ' + (projectInfo.xrfSerial || 'N/A') + ']'));
  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  children.push(buildSubHeading('Appendix G: Inspector Credentials'));
  children.push(buildBodyText('[Attach copy of inspector/risk assessor certification card or license. Name: ' + (projectInfo.inspectorName || 'N/A') + ', Certification: ' + (projectInfo.inspectorCert || 'N/A') + ']'));

  return children;
}

function buildCertificationPage(projectInfo) {
  return [
    buildSectionHeading('INSPECTOR CERTIFICATION'),
    buildBodyText('This report was prepared in accordance with EPA Renovation, Repair, and Painting Rule (RRP) and HUD requirements for lead-based paint inspection and risk assessment.'),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    buildLabelValue('Inspector Name', projectInfo.inspectorName),
    buildLabelValue('Certification Number', projectInfo.inspectorCert),
    buildLabelValue('Company', projectInfo.companyName),
    buildLabelValue('Email', projectInfo.inspectorEmail),
    buildLabelValue('Phone', projectInfo.companyPhone),
    buildLabelValue('Inspection Date', projectInfo.inspectionDate),
    buildLabelValue('Report Date', projectInfo.reportDate),
    new Paragraph({ spacing: { after: 400 }, children: [] }),
    buildBodyText('I certify that I have personally conducted the inspection(s) described in this report and that the findings are accurate based on my professional assessment.'),
    new Paragraph({ spacing: { after: 600 }, children: [] }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '333333', space: 1 } },
      spacing: { after: 40 },
      children: [],
    }),
    new Paragraph({
      spacing: { after: 20 },
      children: [new TextRun({ text: 'Inspector Signature', font: 'Arial', size: 18, color: '666666' })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Date: _____________________', font: 'Arial', size: 18, color: '666666' })],
    }),
    new Paragraph({ spacing: { after: 400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC', space: 1 } },
      spacing: { before: 200 },
      children: [new TextRun({
        text: 'This report contains confidential information and is provided for the exclusive use of the client for whom it was prepared. Report generated by LeadFlow AI.',
        font: 'Arial', size: 16, color: '999999', italics: true,
      })],
    }),
  ];
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export async function generateDocxReport(state, hazards) {
  var projectInfo = state.projectInfo;

  // Build all sections per Michigan LIRA-EBL Report Checklist (Form 633775, V.3)
  // and EPA/HUD requirements (40 CFR 745, 24 CFR 35, HUD Chapters 5 & 7)
  var children = [];

  // 1. Cover Page
  children = children.concat(buildCoverPage(projectInfo));

  // 2. Executive Summary
  children = children.concat(buildExecutiveSummary(state, hazards));

  // 3. Purpose and Scope (REQUIRED per 40 CFR 745.227)
  children = children.concat(buildPurposeAndScope(projectInfo));

  // 4. Key Definitions (REQUIRED per Michigan LIRA-EBL checklist)
  children = children.concat(buildKeyDefinitions());

  // 5. Property Description
  children = children.concat(buildPropertyDescription(projectInfo));

  // 6. Survey Methodology (REQUIRED per 40 CFR 745.227)
  children = children.concat(buildSurveyMethodology(projectInfo));

  // 7. XRF Results - All Readings + Positive Only
  children = children.concat(buildXRFResultsSection(state.xrfData));

  // 8. Dust Wipe Results (if applicable — not for LBP Inspection Only)
  if (projectInfo.inspectionType !== 'LBP Inspection Only') {
    children = children.concat(buildDustWipeSection(state.dustWipeSamples));

    // 9. Soil Results (if applicable)
    children = children.concat(buildSoilSection(state.soilSamples));
  }

  // 10. Surfaces Unable to Be Tested (REQUIRED per Michigan checklist)
  children = children.concat(buildSurfacesUnableToTest(state.xrfData));

  // 11. Potential Hazards - Intact Positive Surfaces (REQUIRED per Michigan checklist)
  children = children.concat(buildPotentialHazards(state.xrfData));

  // 12. Hazard Analysis and Recommendations
  children = children.concat(buildHazardAnalysisSection(hazards));

  // 13. Regulatory Standards Reference (with 2025 EPA updates)
  children = children.concat(buildRegulatoryStandards());

  // 14. Disclosure and Notification (REQUIRED per Title X + Michigan R 325.9959)
  children = children.concat(buildDisclosureLanguage(projectInfo));

  // 15. Operations and Maintenance Guidance (REQUIRED per HUD 24 CFR 35)
  children = children.concat(buildOperationsAndMaintenance(hazards));

  // 16. Re-evaluation Schedule (REQUIRED per HUD 24 CFR 35.1355)
  children = children.concat(buildReevaluationSchedule(projectInfo, hazards));

  // 17. Inspector Certification and Signature
  children = children.concat(buildCertificationPage(projectInfo));

  // 18. Appendix Placeholders (with real photos if available)
  children = children.concat(buildAppendixPlaceholders(projectInfo, state.photos || []));

  var doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 32, bold: true, font: 'Arial', color: NAVY },
          paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 26, bold: true, font: 'Arial', color: BLUE },
          paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'LeadFlow AI - ', font: 'Arial', size: 16, color: BLUE, italics: true }),
              new TextRun({ text: projectInfo.inspectionType + ' Report', font: 'Arial', size: 16, color: NAVY, italics: true }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: projectInfo.propertyAddress + ', ' + projectInfo.city + ', MI ' + projectInfo.zip + '  |  Page ', font: 'Arial', size: 16, color: '999999' }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '999999' }),
            ],
          })],
        }),
      },
      children: children,
    }],
  });

  // Generate and download
  var blob = await Packer.toBlob(doc);
  var filename = 'LeadFlow_LIRA_' +
    (projectInfo.propertyAddress || 'Report').replace(/[^a-zA-Z0-9]/g, '_') +
    '_' + (projectInfo.inspectionDate || 'undated') + '.docx';
  saveAs(blob, filename);

  return filename;
}

// ============================================================================
// PDF EXPORT (via HTML print)
// ============================================================================

// PDF export is handled directly in GenerateReportTab via the HTML report generator + print dialog
