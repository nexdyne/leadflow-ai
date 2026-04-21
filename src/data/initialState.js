export const initialState = {
  // Inspection metadata (managed internally, not user-editable)
  _inspectionId: null,    // UUID assigned on first save
  _lastSaved: null,       // ISO timestamp of last save
  _createdAt: null,       // ISO timestamp of creation
  _saveStatus: 'unsaved', // 'unsaved' | 'saving' | 'saved' | 'error'

  // Project Info
  projectInfo: {
    // C46: Inspector-assigned name for the project (distinct from property
    // address). Falls back to propertyAddress in list views when empty.
    projectName: '',
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
  // Each photo: { id, dataUrl, room, component, side, condition, caption, category, timestamp, width, height, latitude, longitude }

  // Building Condition Survey (structured field data)
  buildingSurvey: {},

  // Resident Interview (structured field data)
  residentInterview: {},

  // XRF Calibration Tracking (GAP A)
  calibrationReadings: [],
  // Each: { id, timestamp, standardValue, measuredValue, withinTolerance, notes }
  calibrationConfig: {
    standardValue: 1.02,       // NIST SRM expected value (mg/cm²)
    tolerancePercent: 10,      // ±10% acceptance range
    recalibrationHours: 4,     // EPA 4-hour recalibration requirement
  },

  // Assumed Positives (GAP B) — untested surfaces sharing painting history with positive tested
  assumedPositives: [],
  // Each: { id, room, component, substrate, side, reason, linkedReadingId }

  // Sample Collection Log (GAP C) — chain of custody for dust wipes, soil, paint chips
  sampleLog: [],
  // Each: { id, sampleId, type, room, surface, areaType, collectionTime, collectorName, wipeAreaCm2, notes, linkedLabId }

  // File attachments (lab reports, XRF cal data, etc.)
  attachments: {
    labReports: [],    // { id, fileName, fileSize, dataUrl, uploadedAt }
    xrfCalibration: [], // { id, fileName, fileSize, dataUrl, uploadedAt }
  },

  // Compliance manual check-offs (for items that can't be auto-detected)
  complianceChecks: {},
  // Keys: xrf_calibration, app_a_resident_interview, app_b_building_survey,
  //        app_c_floor_plans, app_e_lab_reports, app_f_xrf_calibration, app_g_credentials

  // Phase 2: Voice Notes
  voiceNotes: [],
  // Each: { id, timestamp, transcript, tab, fieldContext }

  // Phase 2: Floor Plans (canvas sketcher)
  floorPlans: {
    floors: {}
    // { [floorName]: { elements: [...], compassAngle: 0 } }
  },

  // Phase 2: Digital Signatures
  signatures: {
    inspector: null,
    owner: null,
    occupant: null,
    // Each: { dataUrl, signerName, signatureType, timestamp }
  },

  // Phase 2: Michigan Lead Registry submissions
  registrySubmissions: [],
  // Each: { confirmationNumber, submittedAt, status, propertyAddress, formData }

  // Phase 2: Public Records / Property Data
  propertyRecord: null,
  // Full BS&A record if imported

  // Phase 2: AI Photo Analysis results
  aiAnalyses: [],
  // Each: { photoId, predictions, condition, flags, timestamp }

  // NLG (Natural Language Generation) - Generated report sections
  nlgText: {
    executiveSummary: '',
    propertyDescription: '',
    hazardDescriptions: [],
    recommendations: '',
    disclosureLanguage: ''
  },

  // QA Review results
  qaResults: null,
  // { findings: [...], summary: { errors, warnings, info, overallScore, grade }, timestamp }

  // Custom threshold overrides (when regulations change)
  customThresholds: null,
  // { [thresholdId]: value } — only stores overrides, null = use defaults
};

export function appReducer(state, action) {
  switch (action.type) {
    case 'SET_INSPECTION_META':
      return { ...state, ...action.payload };

    case 'LOAD_INSPECTION':
      return { ...action.payload, _saveStatus: 'saved' };

    case 'SET_SAVE_STATUS':
      return { ...state, _saveStatus: action.payload };

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
      return { ...state, xrfData: state.xrfData.filter((_, i) => i !== action.payload) };

    case 'SET_COLUMN_MAPPING':
      return { ...state, columnMapping: action.payload };

    case 'ADD_DUST_SAMPLE':
      return { ...state, dustWipeSamples: [...state.dustWipeSamples, action.payload] };

    case 'DELETE_DUST_SAMPLE':
      return { ...state, dustWipeSamples: state.dustWipeSamples.filter((_, i) => i !== action.payload) };

    case 'ADD_SOIL_SAMPLE':
      return { ...state, soilSamples: [...state.soilSamples, action.payload] };

    case 'DELETE_SOIL_SAMPLE':
      return { ...state, soilSamples: state.soilSamples.filter((_, i) => i !== action.payload) };

    case 'UPDATE_LAB_INFO':
      return {
        ...state,
        labName: action.payload.labName,
        labCertNumber: action.payload.labCertNumber
      };

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
      return {
        ...state,
        photos: state.photos.map(function(p) {
          return p.id === action.payload.id ? { ...p, ...action.payload.updates } : p;
        })
      };

    case 'DELETE_PHOTO':
      return { ...state, photos: state.photos.filter(function(p) { return p.id !== action.payload; }) };

    case 'REORDER_PHOTOS':
      return { ...state, photos: action.payload };

    case 'UPDATE_BUILDING_SURVEY':
      return {
        ...state,
        buildingSurvey: { ...state.buildingSurvey, ...action.payload }
      };

    case 'UPDATE_RESIDENT_INTERVIEW':
      return {
        ...state,
        residentInterview: { ...state.residentInterview, ...action.payload }
      };

    case 'ADD_ATTACHMENT':
      // action.payload = { category: 'labReports'|'xrfCalibration', file: {...} }
      return {
        ...state,
        attachments: {
          ...state.attachments,
          [action.payload.category]: [
            ...(state.attachments?.[action.payload.category] || []),
            action.payload.file,
          ],
        },
      };

    case 'DELETE_ATTACHMENT':
      // action.payload = { category: 'labReports'|'xrfCalibration', id: '...' }
      return {
        ...state,
        attachments: {
          ...state.attachments,
          [action.payload.category]: (state.attachments?.[action.payload.category] || [])
            .filter(f => f.id !== action.payload.id),
        },
      };

    // GAP A: Calibration
    case 'ADD_CALIBRATION_READING':
      return { ...state, calibrationReadings: [...state.calibrationReadings, action.payload] };
    case 'DELETE_CALIBRATION_READING':
      return { ...state, calibrationReadings: state.calibrationReadings.filter(r => r.id !== action.payload) };
    case 'UPDATE_CALIBRATION_CONFIG':
      return { ...state, calibrationConfig: { ...state.calibrationConfig, ...action.payload } };

    // GAP B: Assumed Positives
    case 'ADD_ASSUMED_POSITIVE':
      return { ...state, assumedPositives: [...state.assumedPositives, action.payload] };
    case 'DELETE_ASSUMED_POSITIVE':
      return { ...state, assumedPositives: state.assumedPositives.filter(ap => ap.id !== action.payload) };

    // GAP C: Sample Log
    case 'ADD_SAMPLE_LOG':
      return { ...state, sampleLog: [...state.sampleLog, action.payload] };
    case 'UPDATE_SAMPLE_LOG':
      return { ...state, sampleLog: state.sampleLog.map(s => s.id === action.payload.id ? { ...s, ...action.payload.updates } : s) };
    case 'DELETE_SAMPLE_LOG':
      return { ...state, sampleLog: state.sampleLog.filter(s => s.id !== action.payload) };

    // GAP D: Photo GPS update
    case 'UPDATE_PHOTO_GPS':
      return { ...state, photos: state.photos.map(p => p.id === action.payload.id ? { ...p, latitude: action.payload.latitude, longitude: action.payload.longitude } : p) };

    case 'TOGGLE_COMPLIANCE_CHECK':
      return {
        ...state,
        complianceChecks: {
          ...state.complianceChecks,
          [action.payload]: !state.complianceChecks[action.payload]
        }
      };

    // Phase 2: Voice Notes
    case 'ADD_VOICE_NOTE':
      return { ...state, voiceNotes: [...(state.voiceNotes || []), action.payload] };
    case 'DELETE_VOICE_NOTE':
      return { ...state, voiceNotes: (state.voiceNotes || []).filter(n => n.id !== action.payload) };

    // Phase 2: Floor Plans
    case 'UPDATE_FLOOR_PLANS':
      return { ...state, floorPlans: action.payload };

    // Phase 2: Digital Signatures
    case 'SAVE_SIGNATURE':
      return {
        ...state,
        signatures: {
          ...(state.signatures || {}),
          [action.payload.signatureType]: action.payload.signatureData
        }
      };
    case 'CLEAR_SIGNATURE':
      return {
        ...state,
        signatures: {
          ...(state.signatures || {}),
          [action.payload]: null
        }
      };

    // Phase 2: Michigan Lead Registry
    case 'SAVE_REGISTRY_SUBMISSION':
      return { ...state, registrySubmissions: [...(state.registrySubmissions || []), action.payload] };

    // Phase 2: Public Records / Property Data
    case 'SAVE_PROPERTY_RECORD':
      return { ...state, propertyRecord: action.payload };

    // Phase 2: AI Photo Analysis
    case 'ADD_AI_ANALYSIS':
      return { ...state, aiAnalyses: [...(state.aiAnalyses || []), action.payload] };

    case 'LOAD_SAMPLE_DATA':
      return action.payload;

    case 'RESET':
      return JSON.parse(JSON.stringify(initialState));


    case 'SAVE_NLG_TEXT':
      return {
        ...state,
        nlgText: {
          ...(state.nlgText || {}),
          [action.payload.section]: action.payload.text
        }
      };

    // QA Review
    case 'SAVE_QA_RESULTS':
      return { ...state, qaResults: action.payload };

    // Threshold overrides
    case 'UPDATE_CUSTOM_THRESHOLDS':
      return { ...state, customThresholds: action.payload };

    default:
      return state;
  }
}
