export const initialState = {
  // Project Info
  projectInfo: {
    propertyAddress: '',
    city: '',
    state: 'MI',
    zip: '',
    yearBuilt: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    reportDate: new Date().toISOString().split('T')[0],
    inspectionType: 'Risk Assessment',
    programType: 'HUD',
    inspectorName: '',
    inspectorCert: '',
    inspectorEmail: '',
    companyName: '',
    companyPhone: '',
    clientName: '',
    clientAddress: '',
    clientPhone: '',
    xrfModel: 'Viken Pb200e',
    xrfSerial: ''
  },
  // XRF Data
  xrfData: [],
  columnMapping: {},
  // Lab Results
  dustWipeSamples: [],
  soilSamples: [],
  labName: '',
  labCertNumber: '',
  // Hazards
  hazards: [],
  // Photos - organized by room
  photos: [],
  // Each photo: { id, dataUrl, room, component, side, condition, caption, category, timestamp }
  // Compliance manual check-offs (for items that can't be auto-detected)
  complianceChecks: {},
  // Keys: xrf_calibration, app_a_resident_interview, app_b_building_survey,
  //       app_c_floor_plans, app_e_lab_reports, app_f_xrf_calibration, app_g_credentials

  // === New fields (HUD Ch. 7 / EPA 40 CFR 745 / Michigan R 325.9901+) ===
  // Building Survey (HUD Ch. 7 §7-IV, Appendix B — physical/painted-component inventory)
  buildingSurvey: {},
  // Resident Interview (HUD Ch. 7 Appendix A — occupant-reported hazards, child behavior, condition reports)
  residentInterview: {},
  // Sample Collection / Chain of Custody Log (EPA 40 CFR 745.227(e)(8); Michigan R 325.9907)
  sampleLog: [],
  // QA Review Sign-off (Michigan R 325.9905 — certified supervisor review)
  qaResults: {
    reviewedBy: '',
    supervisorCertNumber: '',
    reviewedDate: '',
    notes: '',
    issues: []
  },
  // QA dismissals (40 CFR 745.227(h) audit trail — inspector acknowledgements of auto-detected findings)
  qaDismissedFindings: {},
  // Audit stamp for the most recent dismissal/restore action (who/when/what)
  qaDismissedLastChange: null,
  // Custom project-specific thresholds (overrides REGULATORY_THRESHOLDS when applicable)
  customThresholds: {},
  // Appendix attachments (Appendix E lab reports, Appendix F XRF daily QC)
  attachments: {
    labReports: [],
    xrfCalibration: []
  },
  // XRF daily calibration readings (NIOSH 9102 / Viken Pb200e spec — daily QC log)
  calibrationReadings: [],
  calibrationConfig: {},
  // Voice notes captured during inspection walkthrough
  voiceNotes: [],
  // Natural-language narrative text cached for reuse in report rendering
  nlgText: {},
  // Digital signature captures (inspector + supervisor) plus shared dateSigned
  signatures: {},
  // Current authenticated user — minimal shape { name, email, role, licenseNumber }
  // Hydrated from auth provider when available; otherwise falls back to projectInfo.inspectorName
  currentUser: null
};

export function appReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_PROJECT_INFO':
      return {
        ...state,
        projectInfo: { ...state.projectInfo, ...action.payload }
      };
    case 'SET_XRF_DATA':
      return { ...state, xrfData: action.payload };
    case 'ADD_XRF_READING':
      return { ...state, xrfData: [...state.xrfData, action.payload] };
    case 'DELETE_XRF_READING':
      return { ...state, xrfData: state.xrfData.filter((_, i) => i \!== action.payload) };
    case 'SET_COLUMN_MAPPING':
      return { ...state, columnMapping: action.payload };
    case 'ADD_DUST_SAMPLE':
      return { ...state, dustWipeSamples: [...state.dustWipeSamples, action.payload] };
    case 'DELETE_DUST_SAMPLE':
      return { ...state, dustWipeSamples: state.dustWipeSamples.filter((_, i) => i \!== action.payload) };
    case 'ADD_SOIL_SAMPLE':
      return { ...state, soilSamples: [...state.soilSamples, action.payload] };
    case 'DELETE_SOIL_SAMPLE':
      return { ...state, soilSamples: state.soilSamples.filter((_, i) => i \!== action.payload) };
    case 'UPDATE_LAB_INFO':
      return { ...state, labName: action.payload.labName, labCertNumber: action.payload.labCertNumber };
    case 'GENERATE_HAZARDS':
      return { ...state, hazards: action.payload };
    case 'UPDATE_HAZARD':
      const updatedHazards = [...state.hazards];
      updatedHazards[action.payload.index] = { ...updatedHazards[action.payload.index], ...action.payload.updates };
      return { ...state, hazards: updatedHazards };
    // Photo actions
    case 'ADD_PHOTOS':
      return { ...state, photos: [...state.photos, ...action.payload] };
    case 'UPDATE_PHOTO':
      return { ...state, photos: state.photos.map(function(p) { return p.id === action.payload.id ? { ...p, ...action.payload.updates } : p; }) };
    case 'DELETE_PHOTO':
      return { ...state, photos: state.photos.filter(function(p) { return p.id \!== action.payload; }) };
    case 'REORDER_PHOTOS':
      return { ...state, photos: action.payload };
    case 'TOGGLE_COMPLIANCE_CHECK':
      return { ...state, complianceChecks: { ...state.complianceChecks, [action.payload]: \!state.complianceChecks[action.payload] } };
    case 'LOAD_SAMPLE_DATA':
      return action.payload;
    case 'RESET':
      return initialState;

    // === New reducer cases ===
    // Building Survey (HUD Ch. 7 §7-IV)
    case 'UPDATE_BUILDING_SURVEY':
      return { ...state, buildingSurvey: { ...state.buildingSurvey, ...action.payload } };
    // Resident Interview (HUD Ch. 7 Appendix A)
    case 'UPDATE_RESIDENT_INTERVIEW':
      return { ...state, residentInterview: { ...state.residentInterview, ...action.payload } };
    // Sample Collection / Chain of Custody (EPA 40 CFR 745.227(e)(8); R 325.9907)
    case 'ADD_SAMPLE_LOG':
      return { ...state, sampleLog: [...(state.sampleLog || []), action.payload] };
    case 'DELETE_SAMPLE_LOG':
      return { ...state, sampleLog: (state.sampleLog || []).filter(function(_, i) { return i \!== action.payload; }) };
    // QA Review Sign-off (Michigan R 325.9905)
    case 'SAVE_QA_RESULTS':
      return { ...state, qaResults: { ...(state.qaResults || {}), ...action.payload } };
    // QA dismissal audit trail (40 CFR 745.227(h) — persist inspector acknowledgements + who/when)
    case 'SAVE_QA_DISMISSED': {
      var dPayload = action.payload || {};
      return {
        ...state,
        qaDismissedFindings: dPayload.dismissed \!= null ? dPayload.dismissed : (state.qaDismissedFindings || {}),
        qaDismissedLastChange: dPayload.lastChange \!= null ? dPayload.lastChange : (state.qaDismissedLastChange || null)
      };
    }
    // Custom thresholds
    case 'UPDATE_CUSTOM_THRESHOLDS':
      return { ...state, customThresholds: { ...(state.customThresholds || {}), ...action.payload } };
    // Appendix attachments
    case 'ADD_ATTACHMENT': {
      var bucket = action.payload && action.payload.bucket;
      var file = action.payload && action.payload.file;
      var atts = state.attachments || { labReports: [], xrfCalibration: [] };
      var currentBucket = atts[bucket] || [];
      return { ...state, attachments: { ...atts, [bucket]: [...currentBucket, file] } };
    }
    case 'DELETE_ATTACHMENT': {
      var delBucket = action.payload && action.payload.bucket;
      var delIdx = action.payload && action.payload.index;
      var delAtts = state.attachments || { labReports: [], xrfCalibration: [] };
      var filtered = (delAtts[delBucket] || []).filter(function(_, i) { return i \!== delIdx; });
      return { ...state, attachments: { ...delAtts, [delBucket]: filtered } };
    }
    // XRF daily calibration (NIOSH 9102 / Viken Pb200e daily QC)
    case 'ADD_CALIBRATION_READING':
      return { ...state, calibrationReadings: [...(state.calibrationReadings || []), action.payload] };
    case 'DELETE_CALIBRATION_READING':
      return { ...state, calibrationReadings: (state.calibrationReadings || []).filter(function(_, i) { return i \!== action.payload; }) };
    // Voice notes
    case 'ADD_VOICE_NOTE':
      return { ...state, voiceNotes: [...(state.voiceNotes || []), action.payload] };
    case 'DELETE_VOICE_NOTE':
      return { ...state, voiceNotes: (state.voiceNotes || []).filter(function(n) { return n.id \!== action.payload; }) };

    // === Signature collection (ASTM E1528 / HUD Ch. 7 §7-XI — inspector + supervisor sign-off) ===
    // Set the shared signing date (applies to all signatures collected on this report)
    case 'SET_SIGNATURE_DATE':
      return { ...state, signatures: { ...(state.signatures || {}), dateSigned: action.payload && action.payload.dateSigned } };
    // Persist one signature record keyed by type (e.g., 'inspector', 'supervisor', 'client')
    case 'SAVE_SIGNATURE': {
      var sigType = action.payload && action.payload.signatureType;
      var sigData = action.payload && action.payload.signatureData;
      if (\!sigType) return state;
      return { ...state, signatures: { ...(state.signatures || {}), [sigType]: sigData } };
    }
    // Clear one signature by type
    case 'CLEAR_SIGNATURE': {
      var clearType = action.payload && action.payload.signatureType;
      if (\!clearType) return state;
      var nextSigs = { ...(state.signatures || {}) };
      delete nextSigs[clearType];
      return { ...state, signatures: nextSigs };
    }

    // === Current user (session authentication — informs audit stamps on dismissals/signatures) ===
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload || null };

    default:
      return state;
  }
}
