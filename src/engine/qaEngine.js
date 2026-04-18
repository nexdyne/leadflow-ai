import { THRESHOLDS } from './constants.js';

// ============================================================================
// QUALITY ASSURANCE ENGINE FOR LEADFLOW AI
// Automated review of inspection reports for consistency, completeness, and
// regulatory compliance across all tabs
// ============================================================================

// Unique ID generator for findings
function generateFindingId() {
  return 'finding_' + Math.random().toString(36).substr(2, 9);
}

// ============================================================================
// 1. CONSISTENCY CHECKS
// ============================================================================
export function runConsistencyCheck(state) {
  const findings = [];
  const projectInfo = state.projectInfo || {};
  const xrfData = state.xrfData || [];
  const hazards = state.hazards || [];
  const photos = state.photos || [];
  const dustSamples = state.dustWipeSamples || [];
  const soilSamples = state.soilSamples || [];
  const buildingSurvey = state.buildingSurvey || {};
  const sampleLog = state.sampleLog || [];
  const calibrationReadings = state.calibrationReadings || [];
  const assumedPositives = state.assumedPositives || [];

  // Check 1: XRF readings >= 1.0 mg/cm² must have corresponding hazard entry
  xrfData.forEach(reading => {
    if (reading.result >= THRESHOLDS.xrf_paint) {
      const hasHazard = hazards.some(h =>
        h.source === 'XRF' &&
        h.linkedReadingId === reading.reading
      );
      if (!hasHazard) {
        findings.push({
          id: generateFindingId(),
          severity: 'critical',
          category: 'consistency',
          title: 'Positive XRF Reading Missing from Hazards',
          description: `XRF reading #${reading.reading} from ${reading.room} (${reading.component}) shows ${reading.result} mg/cm², which exceeds the threshold of ${THRESHOLDS.xrf_paint} mg/cm², but no corresponding hazard entry exists.`,
          affectedTab: 'Hazards',
          suggestedFix: `Go to Hazards tab and create an entry for the ${reading.component} in ${reading.room}. Link it to XRF reading #${reading.reading}.`
        });
      }
    }
  });

  // Check 2: Hazards without matching data sources (orphan hazards)
  hazards.forEach((hazard, idx) => {
    let hasSource = false;

    if (hazard.source === 'XRF' && hazard.linkedReadingId) {
      hasSource = xrfData.some(r => r.reading === hazard.linkedReadingId);
    } else if (hazard.source === 'Dust' && hazard.linkedLabId) {
      hasSource = dustSamples.some(d => d.sampleId === hazard.linkedLabId);
    } else if (hazard.source === 'Soil' && hazard.linkedLabId) {
      hasSource = soilSamples.some(s => s.sampleId === hazard.linkedLabId);
    } else if (hazard.source === 'Assumed Positive' && hazard.linkedReadingId) {
      hasSource = assumedPositives.some(ap => ap.id === hazard.linkedReadingId);
    }

    if (!hasSource && hazard.source) {
      findings.push({
        id: generateFindingId(),
        severity: 'warning',
        category: 'consistency',
        title: 'Orphan Hazard Entry',
        description: `Hazard for ${hazard.component || 'unknown'} in ${hazard.room || 'unknown'} is marked as ${hazard.source}, but the linked data source cannot be found.`,
        affectedTab: 'Hazards',
        suggestedFix: `Verify the link to the source data, or delete this hazard entry if it is no longer needed.`
      });
    }
  });

  // Check 3: Room names in XRF data should match room names in photos
  const xrfRooms = new Set(xrfData.map(r => r.room).filter(Boolean));
  const photoRooms = new Set(photos.map(p => p.room).filter(Boolean));

  xrfRooms.forEach(room => {
    if (!photoRooms.has(room)) {
      findings.push({
        id: generateFindingId(),
        severity: 'warning',
        category: 'consistency',
        title: 'Room with XRF Data but No Photos',
        description: `Room '${room}' has XRF readings but no photos have been assigned to this room.`,
        affectedTab: 'Photos',
        suggestedFix: `Add at least one photo tagged to '${room}' in the Photos tab.`
      });
    }
  });

  // Check 4: Building survey deteriorated paint fields should have XRF readings
  if (buildingSurvey.extPaintDeteriorated || buildingSurvey.intPaintDeteriorated) {
    const hasPaintPositives = xrfData.some(r => r.result >= THRESHOLDS.xrf_paint);
    if (!hasPaintPositives) {
      findings.push({
        id: generateFindingId(),
        severity: 'warning',
        category: 'consistency',
        title: 'Deteriorated Paint Noted but No Positive XRF Readings',
        description: 'Building Survey indicates deteriorated paint, but no XRF readings >= 1.0 mg/cm² were found.',
        affectedTab: 'XRF Data',
        suggestedFix: 'Ensure XRF testing was conducted in areas where deteriorated paint was observed.'
      });
    }
  }

  // Check 5: Inspector name should match sample log collector names
  if (projectInfo.inspectorName && sampleLog.length > 0) {
    const sampleCollectors = new Set(sampleLog.map(s => s.collectorName).filter(Boolean));
    sampleCollectors.forEach(collector => {
      if (collector !== projectInfo.inspectorName) {
        findings.push({
          id: generateFindingId(),
          severity: 'major',
          category: 'consistency',
          title: 'Sample Collector Name Mismatch',
          description: `Sample log shows collector '${collector}', but the inspector is listed as '${projectInfo.inspectorName}'.`,
          affectedTab: 'Sample Log',
          suggestedFix: `Verify that all sample collectors are properly identified. Update the sample log if needed.`
        });
      }
    });
  }

  // Check 6: Inspection date should be before or equal to report date
  if (projectInfo.inspectionDate && projectInfo.reportDate) {
    const inspDate = new Date(projectInfo.inspectionDate);
    const reportDate = new Date(projectInfo.reportDate);
    if (inspDate > reportDate) {
      findings.push({
        id: generateFindingId(),
        severity: 'error',
        category: 'consistency',
        title: 'Inspection Date After Report Date',
        description: `The inspection date (${projectInfo.inspectionDate}) is after the report date (${projectInfo.reportDate}).`,
        affectedTab: 'Project Info',
        suggestedFix: 'Update either the inspection date or report date to ensure the inspection occurred before the report was generated.'
      });
    }
  }

  // Check 7: Year built should be before 1978 (pre-1978 requirement)
  if (projectInfo.yearBuilt) {
    const yearBuilt = parseInt(projectInfo.yearBuilt);
    if (yearBuilt >= 1978) {
      findings.push({
        id: generateFindingId(),
        severity: 'warning',
        category: 'consistency',
        title: 'Property Built After 1977',
        description: `Property was built in ${projectInfo.yearBuilt}. Lead inspection may not be required for properties built after 1977 (unless HUD financed or child-occupied).`,
        affectedTab: 'Project Info',
        suggestedFix: 'Verify that the property falls under a regulatory program (HUD, EBL, Medicaid) that requires inspection regardless of build year.'
      });
    }
  }

  // Check 8: Dust wipe results exist → lab info must be filled
  if (dustSamples.length > 0) {
    if (!projectInfo.labName || !projectInfo.labCertNumber) {
      findings.push({
        id: generateFindingId(),
        severity: 'error',
        category: 'consistency',
        title: 'Dust Wipe Samples Without Lab Information',
        description: `${dustSamples.length} dust wipe sample(s) exist, but lab name and/or certification number are missing.`,
        affectedTab: 'Lab Info',
        suggestedFix: 'Enter the lab name and certification number in the Project Info section.'
      });
    }
  }

  // Check 9: EBL program → residentInterview should have child-related fields
  if (projectInfo.programType === 'EBL') {
    const residentInterview = state.residentInterview || {};
    const hasChildFields = residentInterview.childrenPresent !== undefined ||
                          residentInterview.childAge !== undefined ||
                          residentInterview.childName !== undefined;
    if (!hasChildFields) {
      findings.push({
        id: generateFindingId(),
        severity: 'warning',
        category: 'consistency',
        title: 'EBL Program Missing Child-Related Interview Data',
        description: 'Program type is EBL, but resident interview does not include information about children in the household.',
        affectedTab: 'Resident Interview',
        suggestedFix: 'Complete the child-related questions in the Resident Interview tab (child presence, age, name).'
      });
    }
  }

  // Check 10: Photos should cover all rooms with positive XRF readings
  const positiveXrfRooms = new Set();
  xrfData.forEach(r => {
    if (r.result >= THRESHOLDS.xrf_paint && r.room) {
      positiveXrfRooms.add(r.room);
    }
  });

  positiveXrfRooms.forEach(room => {
    const hasPhoto = photos.some(p => p.room === room);
    if (!hasPhoto) {
      findings.push({
        id: generateFindingId(),
        severity: 'warning',
        category: 'consistency',
        title: `Room with Positive XRF (${room}) Lacks Photo Documentation`,
        description: `${room} has positive XRF readings (>= ${THRESHOLDS.xrf_paint} mg/cm²) but no photos are tagged to this room.`,
        affectedTab: 'Photos',
        suggestedFix: `Add a photograph and tag it to '${room}' to document the positive XRF finding.`
      });
    }
  });

  // Check 11: Assumed positives should reference valid XRF reading IDs
  assumedPositives.forEach(ap => {
    if (ap.linkedReadingId) {
      const hasReading = xrfData.some(r => r.reading === ap.linkedReadingId);
      if (!hasReading) {
        findings.push({
          id: generateFindingId(),
          severity: 'critical',
          category: 'consistency',
          title: 'Assumed Positive References Invalid XRF Reading',
          description: `Assumed positive for ${ap.component} in ${ap.room} references XRF reading #${ap.linkedReadingId}, which does not exist.`,
          affectedTab: 'Assumed Positives',
          suggestedFix: 'Update the link to reference a valid XRF reading, or delete this assumed positive entry.'
        });
      }
    }
  });

  // Check 11b: Assumed positives validation (pre-1978 properties only, linked readings or justification)
  assumedPositives.forEach(ap => {
    // Verify assumed positives only exist for pre-1978 properties
    if (projectInfo.yearBuilt && parseInt(projectInfo.yearBuilt) >= 1978) {
      findings.push({
        id: generateFindingId(),
        severity: 'critical',
        category: 'consistency',
        title: 'Assumed Positive on Non-Pre-1978 Property',
        description: `Property was built in ${projectInfo.yearBuilt}, but assumed positive exists for ${ap.component} in ${ap.room}. Assumed positives should only be used for pre-1978 properties.`,
        affectedTab: 'Assumed Positives',
        suggestedFix: 'Remove assumed positive entries or verify property meets pre-1978 requirement.'
      });
    }

    // Check that each assumed positive has a linked positive reading OR documented justification
    const hasLinkedReading = ap.linkedReadingId && xrfData.some(r => r.reading === ap.linkedReadingId && r.result >= THRESHOLDS.xrf_paint);
    const hasJustification = ap.justification && ap.justification.trim().length > 0;

    if (!hasLinkedReading && !hasJustification) {
      findings.push({
        id: generateFindingId(),
        severity: 'critical',
        category: 'consistency',
        title: 'Assumed Positive Missing Linked Reading or Justification',
        description: `Assumed positive for ${ap.component} in ${ap.room} has neither a linked positive XRF reading nor documented justification.`,
        affectedTab: 'Assumed Positives',
        suggestedFix: 'Link to a positive XRF reading or provide a documented justification for the assumed positive.'
      });
    }

    // Verify assumed positives aren't used when XRF testing was feasible
    if (ap.linkedReadingId === undefined && xrfData.some(r => r.room === ap.room)) {
      findings.push({
        id: generateFindingId(),
        severity: 'major',
        category: 'consistency',
        title: 'Assumed Positive in Tested Room Without XRF Link',
        description: `${ap.room} was tested with XRF, but assumed positive for ${ap.component} lacks a link to a positive XRF reading.`,
        affectedTab: 'Assumed Positives',
        suggestedFix: 'Link the assumed positive to the corresponding positive XRF reading from the same room.'
      });
    }
  });

  // Check 12: Calibration readings should be within 4 hours of inspection time
  if (calibrationReadings.length > 0 && projectInfo.inspectionDate) {
    calibrationReadings.forEach(cal => {
      if (cal.timestamp) {
        const calDate = new Date(cal.timestamp);
        const inspDate = new Date(projectInfo.inspectionDate);
        const diffHours = Math.abs((calDate - inspDate) / (1000 * 60 * 60));
        if (diffHours > 4) {
          findings.push({
            id: generateFindingId(),
            severity: 'warning',
            category: 'consistency',
            title: 'Calibration Reading Outside 4-Hour Window',
            description: `Calibration reading at ${cal.timestamp} is ${diffHours.toFixed(1)} hours away from the inspection date.`,
            affectedTab: 'XRF Calibration',
            suggestedFix: 'EPA requires calibration checks within 4 hours of inspection. Verify the calibration timestamp or conduct a new calibration check.'
          });
        }
      }
    });
  }

  return findings;
}

// ============================================================================
// 2. COMPLETENESS CHECKS
// ============================================================================
export function runCompletenessCheck(state) {
  const findings = [];
  const projectInfo = state.projectInfo || {};
  const xrfData = state.xrfData || [];
  const dustSamples = state.dustWipeSamples || [];
  const soilSamples = state.soilSamples || [];
  const photos = state.photos || [];
  const floorPlans = state.floorPlans || {};
  const signatures = state.signatures || {};
  const hazards = state.hazards || [];

  // Check 1: All 12 sections of Michigan Form 633775 V.3 have data
  // Section 1: Project & Property Information
  if (!projectInfo.propertyAddress || !projectInfo.city || !projectInfo.zip) {
    findings.push({
      id: generateFindingId(),
      severity: 'critical',
      category: 'completeness',
      title: 'Section 1: Incomplete Property Information',
      description: 'Property address, city, and ZIP code are required per Michigan Form 633775.',
      affectedTab: 'Project Info',
      suggestedFix: 'Complete all property information fields in Project Info tab.'
    });
  }

  // Section 2: Inspector Credentials
  if (!projectInfo.inspectorName || !projectInfo.inspectorCert) {
    findings.push({
      id: generateFindingId(),
      severity: 'critical',
      category: 'completeness',
      title: 'Section 2: Incomplete Inspector Credentials',
      description: 'Inspector name and Michigan certification number are required.',
      affectedTab: 'Project Info',
      suggestedFix: 'Enter inspector name and certification number in Project Info tab.'
    });
  }

  // Check 2: Photo count requirements
  const exteriorPhotos = photos.filter(p => p.category === 'exterior_1side' || p.category === 'exterior');
  if (exteriorPhotos.length < 4) {
    findings.push({
      id: generateFindingId(),
      severity: 'warning',
      category: 'completeness',
      title: 'Insufficient Exterior Photos',
      description: `Only ${exteriorPhotos.length} exterior photos found. Minimum 4 sides of the exterior are recommended.`,
      affectedTab: 'Photos',
      suggestedFix: 'Add photos of all 4 sides of the exterior (front, back, left, right).'
    });
  }

  const roomRooms = new Set(xrfData.map(r => r.room).filter(Boolean));
  roomRooms.forEach(room => {
    const roomPhotos = photos.filter(p => p.room === room);
    if (roomPhotos.length === 0) {
      findings.push({
        id: generateFindingId(),
        severity: 'major',
        category: 'completeness',
        title: `Missing Photos for Tested Room: ${room}`,
        description: `Room '${room}' was tested with XRF but has no photo documentation.`,
        affectedTab: 'Photos',
        suggestedFix: `Add at least one photo of '${room}' and tag it with the room name.`
      });
    }
  });

  const hazardPhotos = photos.filter(p => p.category === 'hazard_closeup' || p.category === 'hazard');
  if (hazardPhotos.length < hazards.length) {
    findings.push({
      id: generateFindingId(),
      severity: 'info',
      category: 'completeness',
      title: 'Limited Hazard Close-up Photos',
      description: `Only ${hazardPhotos.length} hazard close-up photo(s) found for ${hazards.length} identified hazard(s).`,
      affectedTab: 'Photos',
      suggestedFix: 'Consider adding close-up photos of identified hazards for documentation.'
    });
  }

  // Check 3: XRF testing minimums
  const uniqueXrfRooms = new Set(xrfData.map(r => r.room).filter(Boolean));
  if (uniqueXrfRooms.size < 3) {
    findings.push({
      id: generateFindingId(),
      severity: 'warning',
      category: 'completeness',
      title: 'Minimum XRF Room Coverage',
      description: `Only ${uniqueXrfRooms.size} room(s) tested with XRF. Minimum 3 rooms recommended.`,
      affectedTab: 'XRF Data',
      suggestedFix: 'Conduct XRF testing in at least 3 different rooms of the property.'
    });
  }

  const uniqueComponents = new Set(xrfData.map(r => r.component).filter(Boolean));
  if (uniqueComponents.size < 3) {
    findings.push({
      id: generateFindingId(),
      severity: 'warning',
      category: 'completeness',
      title: 'Minimum XRF Component Coverage',
      description: `Only ${uniqueComponents.size} component type(s) tested. Minimum 3 components per room recommended.`,
      affectedTab: 'XRF Data',
      suggestedFix: 'Expand XRF testing to include more component types (windows, doors, walls, trim, etc.).'
    });
  }

  // Check 4: Dust wipe minimums
  const dustFloorSamples = dustSamples.filter(d => d.surfaceType === 'Hard Floor' || d.location.toLowerCase().includes('floor'));
  const dustSillSamples = dustSamples.filter(d => d.surfaceType === 'Sill/Stool' || d.surfaceType === 'Trough');

  if (projectInfo.inspectionType !== 'LBP Inspection Only' && dustFloorSamples.length === 0) {
    findings.push({
      id: generateFindingId(),
      severity: 'warning',
      category: 'completeness',
      title: 'Missing Dust Floor Samples',
      description: 'Risk assessment requires at least 1 dust floor sample.',
      affectedTab: 'Lab Results',
      suggestedFix: 'Collect and submit a dust wipe sample from an interior floor surface.'
    });
  }

  if (projectInfo.inspectionType !== 'LBP Inspection Only' && dustSillSamples.length === 0) {
    findings.push({
      id: generateFindingId(),
      severity: 'warning',
      category: 'completeness',
      title: 'Missing Dust Sill/Trough Samples',
      description: 'Risk assessment requires at least 1 window sill or trough sample.',
      affectedTab: 'Lab Results',
      suggestedFix: 'Collect and submit a dust wipe sample from a window sill or trough.'
    });
  }

  // Check 5: Soil sample minimums
  if (projectInfo.inspectionType !== 'LBP Inspection Only') {
    const playAreaSamples = soilSamples.filter(s => s.areaType === 'Play Area');
    const driplineSamples = soilSamples.filter(s => s.areaType === 'Dripline');

    if (playAreaSamples.length === 0) {
      findings.push({
        id: generateFindingId(),
        severity: 'major',
        category: 'completeness',
        title: 'Missing Play Area Soil Sample',
        description: 'Risk assessment requires at least 1 soil sample from a play area.',
        affectedTab: 'Lab Results',
        suggestedFix: 'Collect and submit a soil sample from a play area or accessible yard.'
      });
    }

    if (driplineSamples.length === 0) {
      findings.push({
        id: generateFindingId(),
        severity: 'major',
        category: 'completeness',
        title: 'Missing Dripline Soil Sample',
        description: 'Risk assessment recommends at least 1 soil sample from the dripline area.',
        affectedTab: 'Lab Results',
        suggestedFix: 'Collect and submit a soil sample from the building dripline area.'
      });
    }
  }

  // Check 6: Floor plans exist
  const hasFloorPlans = floorPlans.floors && Object.keys(floorPlans.floors).length > 0 &&
    Object.values(floorPlans.floors).some(floor => floor.elements && floor.elements.length > 0);

  if (!hasFloorPlans) {
    findings.push({
      id: generateFindingId(),
      severity: 'info',
      category: 'completeness',
      title: 'Floor Plans Not Created',
      description: 'Floor plans with identified areas have not been created.',
      affectedTab: 'Floor Plans',
      suggestedFix: 'Sketch floor plans showing rooms, tested areas, and identified hazards.'
    });
  }

  // Check 7: Signatures collected
  const requiredSignatures = ['inspector'];
  requiredSignatures.forEach(sigType => {
    if (!signatures[sigType]) {
      findings.push({
        id: generateFindingId(),
        severity: 'major',
        category: 'completeness',
        title: `Missing ${sigType.charAt(0).toUpperCase() + sigType.slice(1)} Signature`,
        description: `The ${sigType} signature has not been collected.`,
        affectedTab: 'Signatures',
        suggestedFix: `Collect the ${sigType} signature in the Signatures tab.`
      });
    }
  });

  // Check 8: Building survey has actual data (not just checkbox)
  const buildingSurvey = state.buildingSurvey || {};
  const hasBuildingSurveyData = Object.values(buildingSurvey).some(val =>
    val === true || (typeof val === 'string' && val.trim().length > 0)
  );
  if (!hasBuildingSurveyData) {
    findings.push({
      id: generateFindingId(),
      severity: 'warning',
      category: 'completeness',
      title: 'Building Survey Data Missing',
      description: 'Building Survey section has no actual data. At minimum, deteriorated paint conditions should be documented.',
      affectedTab: 'Building Survey',
      suggestedFix: 'Complete the Building Survey tab with information about building conditions, paint deterioration, and other observations.'
    });
  }

  // Check 9: Resident interview has actual data
  const residentInterview = state.residentInterview || {};
  const hasResidentData = Object.values(residentInterview).some(val =>
    val !== undefined && val !== null && val !== '' && (typeof val !== 'boolean' || val === true)
  );
  if (!hasResidentData && projectInfo.inspectionType !== 'LBP Inspection Only') {
    findings.push({
      id: generateFindingId(),
      severity: 'warning',
      category: 'completeness',
      title: 'Resident Interview Data Missing',
      description: 'Resident Interview section is empty. Information about occupants, children, and property use is important for risk assessment.',
      affectedTab: 'Resident Interview',
      suggestedFix: 'Complete the Resident Interview tab with occupant information and property use details.'
    });
  }

  // Check 10: Calibration readings exist and have entries
  const calibrationReadings = state.calibrationReadings || [];
  if (calibrationReadings.length === 0 && xrfData.length > 0) {
    findings.push({
      id: generateFindingId(),
      severity: 'critical',
      category: 'completeness',
      title: 'No XRF Calibration Readings',
      description: 'XRF data exists but no calibration readings have been recorded. EPA requires calibration checks at or within 4 hours of inspection.',
      affectedTab: 'XRF Calibration',
      suggestedFix: 'Document calibration readings for the XRF instrument used in this inspection.'
    });
  }

  // Check 11: Sample log has entries when dust/soil samples exist
  const sampleLog = state.sampleLog || [];
  const totalSamples = dustSamples.length + soilSamples.length;
  if (totalSamples > 0 && sampleLog.length === 0) {
    findings.push({
      id: generateFindingId(),
      severity: 'error',
      category: 'completeness',
      title: 'Dust/Soil Samples Exist But No Sample Log',
      description: `${totalSamples} dust or soil sample(s) recorded, but the Sample Log is empty.`,
      affectedTab: 'Sample Log',
      suggestedFix: 'Document all samples in the Sample Log with collection date, time, location, collector name, and lab submission details.'
    });
  }

  // Check 12: NLG text sections are populated
  if (!state.nlgTexts || Object.keys(state.nlgTexts).length === 0) {
    findings.push({
      id: generateFindingId(),
      severity: 'info',
      category: 'completeness',
      title: 'Report Text Not Generated',
      description: 'Generated report text sections (executive summary, disclosure language, etc.) have not been created.',
      affectedTab: 'Report',
      suggestedFix: 'Generate the inspection report to populate executive summary, findings, and disclosure language sections.'
    });
  } else {
    const executiveSummary = state.nlgTexts.executiveSummary || '';
    const disclosureLanguage = state.nlgTexts.disclosureLanguage || '';

    if (!executiveSummary || executiveSummary.trim().length === 0) {
      findings.push({
        id: generateFindingId(),
        severity: 'major',
        category: 'completeness',
        title: 'Executive Summary Not Generated',
        description: 'The executive summary section of the report is empty.',
        affectedTab: 'Report',
        suggestedFix: 'Ensure the executive summary is generated with an overview of findings and recommendations.'
      });
    }

    if (!disclosureLanguage || disclosureLanguage.trim().length === 0) {
      findings.push({
        id: generateFindingId(),
        severity: 'critical',
        category: 'completeness',
        title: 'Disclosure Language Not Generated',
        description: 'The lead hazard disclosure section is missing. This is a critical regulatory requirement.',
        affectedTab: 'Report',
        suggestedFix: 'Generate the disclosure language section with required regulatory citations and hazard disclosures.'
      });
    }
  }

  return findings;
}

// ============================================================================
// 3. LANGUAGE & REGULATORY COMPLIANCE REVIEW
// ============================================================================
export function runLanguageReview(state) {
  const findings = [];
  const nlgTexts = state.nlgTexts || {};

  // Helper: check if text contains a string (case-insensitive)
  function textContains(text, str) {
    return text && text.toLowerCase().includes(str.toLowerCase());
  }

  // Helper: check if text matches regex
  function textMatches(text, regex) {
    return text && regex.test(text);
  }

  const allText = Object.values(nlgTexts).join(' ');

  if (allText.length === 0) {
    // No NLG text generated yet - return info-level note
    findings.push({
      id: generateFindingId(),
      severity: 'info',
      category: 'language',
      title: 'No Generated Text to Review',
      description: 'NLG report text has not yet been generated.',
      affectedTab: 'Report',
      suggestedFix: 'Generate the inspection report to enable language and compliance review.'
    });
    return findings;
  }

  // Check 1: Regulatory citations
  const hasCFR35 = textContains(allText, '24 CFR Part 35') || textContains(allText, '24 CFR 35');
  const hasCFR745 = textContains(allText, '40 CFR Part 745') || textContains(allText, '40 CFR 745');
  const hasMichiganRef = textContains(allText, 'R 325.9901') || textContains(allText, 'Michigan');

  if (!hasCFR35 && !hasCFR745) {
    findings.push({
      id: generateFindingId(),
      severity: 'critical',
      category: 'language',
      title: 'Missing Regulatory Citations',
      description: 'Report does not cite EPA/HUD regulations (24 CFR Part 35 or 40 CFR Part 745).',
      affectedTab: 'Report',
      suggestedFix: 'Add citations to 24 CFR Part 35 (HUD) and/or 40 CFR Part 745 (EPA) where applicable.'
    });
  }

  // Check 2: "Lead-based paint" definition (LBP should not be abbreviated without definition)
  if (textContains(allText, 'LBP') && !textContains(allText, 'lead-based paint')) {
    findings.push({
      id: generateFindingId(),
      severity: 'major',
      category: 'language',
      title: 'Abbreviation "LBP" Without Definition',
      description: 'The abbreviation "LBP" is used but "lead-based paint" is not spelled out.',
      affectedTab: 'Report',
      suggestedFix: 'Define "LBP" as "lead-based paint" on first use.'
    });
  }

  // Check 3: Clearance testing recommendation (occupant notification + clearance testing)
  const hasClearanceLanguage = textContains(allText, 'clearance') || textContains(allText, 'clearance test');
  const hasClearanceCitation = textContains(allText, '40 CFR 745.227') || textContains(allText, '745.227');

  if (hasClearanceLanguage === false) {
    findings.push({
      id: generateFindingId(),
      severity: 'info',
      category: 'language',
      title: 'No Clearance Testing Language',
      description: 'Report does not mention post-remediation clearance testing.',
      affectedTab: 'Report',
      suggestedFix: 'If recommendations are provided, include language about clearance testing requirements post-remediation, citing 40 CFR 745.227(e).'
    });
  }

  if (hasClearanceLanguage && !hasClearanceCitation) {
    findings.push({
      id: generateFindingId(),
      severity: 'major',
      category: 'language',
      title: 'Clearance Testing Language Missing Citation',
      description: 'Report mentions clearance testing but does not cite 40 CFR 745.227(e).',
      affectedTab: 'Report',
      suggestedFix: 'Add citation to 40 CFR 745.227(e) when discussing clearance testing procedures.'
    });
  }

  // Check 3b: Occupant notification language per 24 CFR 35.92(b)
  const hasOccupantNotification = textContains(allText, 'occupant') || textContains(allText, 'resident') ||
                                  textContains(allText, 'notification') || textContains(allText, 'notify');
  const hasNotificationCitation = textContains(allText, '24 CFR 35.92') || textContains(allText, '35.92(b)');

  if (hasOccupantNotification === false) {
    findings.push({
      id: generateFindingId(),
      severity: 'critical',
      category: 'language',
      title: 'Missing Occupant Notification Language',
      description: 'Report does not include occupant notification language as required by 24 CFR 35.92(b).',
      affectedTab: 'Report',
      suggestedFix: 'Add language describing notification requirements for occupants regarding identified lead hazards and remediation procedures.'
    });
  }

  if (hasOccupantNotification && !hasNotificationCitation) {
    findings.push({
      id: generateFindingId(),
      severity: 'major',
      category: 'language',
      title: 'Occupant Notification Language Missing Citation',
      description: 'Report mentions occupants but does not cite 24 CFR 35.92(b).',
      affectedTab: 'Report',
      suggestedFix: 'Add citation to 24 CFR 35.92(b) when discussing occupant notification requirements.'
    });
  }

  // Check 4: Michigan-specific requirements (detailed checks)
  if (state.projectInfo.state === 'MI') {
    // Check for Michigan Act 219 citation in disclosure
    const hasAct219 = textContains(allText, 'Act 219') || textContains(allText, 'Michigan Act 219') ||
                     textContains(allText, 'PA 219') || textContains(allText, 'P.A. 219');
    if (!hasAct219) {
      findings.push({
        id: generateFindingId(),
        severity: 'critical',
        category: 'language',
        title: 'Michigan: Missing Act 219 Citation in Disclosure',
        description: 'Report does not cite Michigan Act 219, which is required for Michigan lead disclosure.',
        affectedTab: 'Report',
        suggestedFix: 'Add citation to Michigan Act 219 in the lead hazard disclosure section.'
      });
    }

    // Check for R 325.9901 citation
    const hasR325 = textContains(allText, 'R 325.9901') || textContains(allText, 'MCL 333.9901');
    if (!hasR325) {
      findings.push({
        id: generateFindingId(),
        severity: 'critical',
        category: 'language',
        title: 'Michigan: Missing R 325.9901 Citation',
        description: 'Report does not cite Michigan Administrative Rule R 325.9901 (required reporting and inspection standards).',
        affectedTab: 'Report',
        suggestedFix: 'Add citation to R 325.9901 in regulatory compliance section.'
      });
    }

    // Check for Form 633775 V.3 reference
    const hasForm633 = textContains(allText, 'Form 633775') || textContains(allText, '633775');
    if (!hasForm633) {
      findings.push({
        id: generateFindingId(),
        severity: 'major',
        category: 'language',
        title: 'Michigan: Missing Form 633775 V.3 Reference',
        description: 'Report does not reference Michigan Form 633775 V.3 (required inspection form for Michigan properties).',
        affectedTab: 'Report',
        suggestedFix: 'Reference Form 633775 V.3 in the report methodology or appendix.'
      });
    }

    // Check for LARA inspector certification reference
    const hasLARA = textContains(allText, 'LARA') || textContains(allText, 'Michigan Department') ||
                   textContains(allText, 'Licensed and Regulated');
    const hasLARAInspectorRef = textContains(allText, 'certified') || textContains(allText, 'certification') ||
                               textContains(allText, 'Licensed');
    if (!hasLARA || !hasLARAInspectorRef) {
      findings.push({
        id: generateFindingId(),
        severity: 'critical',
        category: 'language',
        title: 'Michigan: Missing LARA Inspector Certification Reference',
        description: 'Report does not reference LARA inspector certification or licensing status.',
        affectedTab: 'Report',
        suggestedFix: 'Include inspector LARA certification number and statement about inspector qualifications.'
      });
    }

    // Additional Michigan re-evaluation requirement
    const hasReeval = textContains(allText, 're-evaluation') || textContains(allText, 'reevaluation') ||
                     textContains(allText, 'annual inspection');
    if (!hasReeval) {
      findings.push({
        id: generateFindingId(),
        severity: 'info',
        category: 'language',
        title: 'Michigan: Re-evaluation Schedule Not Mentioned',
        description: 'Report does not mention re-evaluation or annual inspection requirements.',
        affectedTab: 'Report',
        suggestedFix: 'Include information about re-evaluation timing and requirements per Michigan regulations.'
      });
    }
  }

  // Check 5: Avoid absolute language
  const absoluteWords = ['guaranteed', 'definitely', '100%', 'always', 'never'];
  const foundAbsolutes = [];

  absoluteWords.forEach(word => {
    if (textContains(allText, word)) {
      foundAbsolutes.push(word);
    }
  });

  if (foundAbsolutes.length > 0) {
    findings.push({
      id: generateFindingId(),
      severity: 'major',
      category: 'language',
      title: 'Absolute Language Detected',
      description: `Report uses absolute language (${foundAbsolutes.join(', ')}) which may not be appropriate for professional risk assessment.`,
      affectedTab: 'Report',
      suggestedFix: `Replace absolute language with qualified language: use "may", "can", "should", "recommended" instead of ${foundAbsolutes.join(', ')}.`
    });
  }

  // Check 6: Conditional language presence
  const conditionalWords = ['may', 'should', 'recommend', 'suggest', 'consider'];
  const hasConditional = conditionalWords.some(word => textContains(allText, word));

  if (!hasConditional) {
    findings.push({
      id: generateFindingId(),
      severity: 'info',
      category: 'language',
      title: 'Limited Conditional Language',
      description: 'Report could benefit from more qualified language (may, should, recommend, etc.).',
      affectedTab: 'Report',
      suggestedFix: 'Use conditional language to convey recommendations appropriately.'
    });
  }

  // Check 7: Threshold values accuracy (basic check)
  const mentionsThreshold = textContains(allText, '1.0 mg/cm') ||
                           textContains(allText, '10') ||
                           textContains(allText, 'threshold');

  if (mentionsThreshold && textContains(allText, 'hazard')) {
    // Check for obviously wrong values
    if (textContains(allText, '0.1 mg/cm') || textContains(allText, '10 mg/cm')) {
      findings.push({
        id: generateFindingId(),
        severity: 'critical',
        category: 'language',
        title: 'Threshold Value Appears Incorrect',
        description: 'A threshold value in the report appears to be incorrect compared to EPA/HUD standards.',
        affectedTab: 'Report',
        suggestedFix: 'Verify threshold values: XRF paint 1.0 mg/cm², dust floor 10 µg/ft², sill 100 µg/ft².'
      });
    }
  }

  // Check 8: Required disclosure language
  if (!textContains(allText, 'lead') && !textContains(allText, 'Lead')) {
    findings.push({
      id: generateFindingId(),
      severity: 'critical',
      category: 'language',
      title: 'Missing Lead Hazard Disclosure',
      description: 'Report does not mention "lead" or any hazard findings.',
      affectedTab: 'Report',
      suggestedFix: 'Ensure report includes appropriate disclosure of lead hazards identified.'
    });
  }

  return findings;
}

// ============================================================================
// 4. RUN FULL QA REVIEW
// ============================================================================
export function runFullQAReview(state) {
  const timestamp = new Date().toISOString();

  // Run all three checks
  const consistencyFindings = runConsistencyCheck(state);
  const completenessFindings = runCompletenessCheck(state);
  const languageFindings = runLanguageReview(state);

  // Combine all findings
  const allFindings = [
    ...consistencyFindings,
    ...completenessFindings,
    ...languageFindings
  ];

  // Map old severity values to new severity categories with point penalties
  // Weighted scoring: Critical (-10), Major (-5), Minor (-2), Info (0)
  allFindings.forEach(finding => {
    if (finding.severity === 'critical') {
      finding.severity = 'critical';
      finding.points = -10;
    } else if (finding.severity === 'error') {
      // Treat 'error' as critical regulatory violations
      finding.severity = 'critical';
      finding.points = -10;
    } else if (finding.severity === 'major') {
      finding.severity = 'major';
      finding.points = -5;
    } else if (finding.severity === 'warning') {
      // Treat 'warning' as major issues
      finding.severity = 'major';
      finding.points = -5;
    } else if (finding.severity === 'minor') {
      finding.severity = 'minor';
      finding.points = -2;
    } else if (finding.severity === 'info') {
      finding.severity = 'info';
      finding.points = 0;
    }
  });

  // Sort by severity: critical > major > minor > info
  const severityOrder = { 'critical': 0, 'major': 1, 'minor': 2, 'info': 3 };
  allFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Count by severity
  const summary = {
    critical: allFindings.filter(f => f.severity === 'critical').length,
    major: allFindings.filter(f => f.severity === 'major').length,
    minor: allFindings.filter(f => f.severity === 'minor').length,
    info: allFindings.filter(f => f.severity === 'info').length,
    overallScore: 100,
    grade: 'A'
  };

  // Calculate overall score using weighted point deductions
  // Critical errors: -10 points each
  // Major errors: -5 points each
  // Minor errors: -2 points each
  // Info items: 0 points
  const totalPoints = allFindings.reduce((sum, finding) => sum + (finding.points || 0), 0);
  summary.overallScore = Math.max(0, 100 + totalPoints); // totalPoints is negative, so we add it

  // Assign grade
  if (summary.overallScore >= 95) summary.grade = 'A+';
  else if (summary.overallScore >= 90) summary.grade = 'A';
  else if (summary.overallScore >= 85) summary.grade = 'A-';
  else if (summary.overallScore >= 80) summary.grade = 'B+';
  else if (summary.overallScore >= 75) summary.grade = 'B';
  else if (summary.overallScore >= 70) summary.grade = 'B-';
  else if (summary.overallScore >= 65) summary.grade = 'C';
  else if (summary.overallScore >= 60) summary.grade = 'D';
  else summary.grade = 'F';

  return {
    findings: allFindings,
    summary,
    timestamp
  };
}
