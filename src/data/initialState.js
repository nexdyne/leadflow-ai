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
  complianceChecks: {}
  // Keys: xrf_calibration, app_a_resident_interview, app_b_building_survey,
  //        app_c_floor_plans, app_e_lab_reports, app_f_xrf_calibration, app_g_credentials
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

    case 'TOGGLE_COMPLIANCE_CHECK':
      return {
        ...state,
        complianceChecks: {
          ...state.complianceChecks,
          [action.payload]: !state.complianceChecks[action.payload]
        }
      };

    case 'LOAD_SAMPLE_DATA':
      return action.payload;

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}
