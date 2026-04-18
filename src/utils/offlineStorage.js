const DB_NAME = 'leadflow-offline';
const DB_VERSION = 1;
const INSPECTIONS_STORE = 'inspections';
const PENDING_SYNC_STORE = 'pendingSync';

let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(INSPECTIONS_STORE)) {
        const inspectionsStore = db.createObjectStore(INSPECTIONS_STORE, { keyPath: 'id' });
        inspectionsStore.createIndex('lastSaved', 'lastSaved', { unique: false });
      }

      if (!db.objectStoreNames.contains(PENDING_SYNC_STORE)) {
        db.createObjectStore(PENDING_SYNC_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function calculateTabCompletion(state) {
  if (!state) return {};
  const completion = {};

  // Project Info: check key fields (FIX 3: null/undefined guards)
  const pi = state.projectInfo || {};
  const piFields = [(pi.propertyAddress || '').trim(), (pi.city || '').trim(), (pi.zip || '').trim(), (pi.yearBuilt || '').trim(), (pi.inspectionDate || '').trim(), (pi.inspectorName || '').trim(), (pi.inspectorCert || '').trim(), (pi.companyName || '').trim(), (pi.clientName || '').trim()];
  completion.projectInfo = Math.round((piFields.filter(f => f).length / piFields.length) * 100);

  // XRF Data: has any readings (FIX 3: array guard)
  completion.xrfData = ((state.xrfData || []).length > 0) ? 100 : 0;

  // Lab Results: has dust or soil samples (FIX 3: array guards)
  completion.labResults = (((state.dustWipeSamples || []).length > 0) || ((state.soilSamples || []).length > 0)) ? 100 : 0;

  // Hazard Analysis: has hazards generated (FIX 3: array guard)
  completion.hazardAnalysis = ((state.hazards || []).length > 0) ? 100 : 0;

  // Photos: has at least 4 photos (exterior sides minimum) (FIX 3: array guard)
  const photoCount = (state.photos || []).length;
  completion.photos = Math.min(100, Math.round((photoCount / 7) * 100));

  // AI Photo Tags: has AI analyses (FIX 3: array guard)
  completion.aiPhotoTags = ((state.aiAnalyses || []).length > 0) ? 100 : 0;

  // Building Survey: has populated fields
  const bs = state.buildingSurvey || {};
  const bsKeys = Object.keys(bs).filter(k => bs[k] !== '' && bs[k] !== null && bs[k] !== undefined);
  completion.buildingSurvey = bsKeys.length >= 5 ? 100 : Math.round((bsKeys.length / 5) * 100);

  // Resident Interview: has populated fields
  const ri = state.residentInterview || {};
  const riKeys = Object.keys(ri).filter(k => ri[k] !== '' && ri[k] !== null && ri[k] !== undefined && ri[k] !== false);
  completion.residentInterview = riKeys.length >= 5 ? 100 : Math.round((riKeys.length / 5) * 100);

  // Floor Plans: has any elements on any floor (FIX 3: array guard)
  const fp = state.floorPlans?.floors || {};
  const hasElements = Object.values(fp).some(f => (f.elements || []).length > 0);
  completion.floorPlans = hasElements ? 100 : 0;

  // Signatures: inspector signed
  completion.signatures = state.signatures?.inspector ? 100 : 0;

  // Lab PDF Import: (optional, 0 if no imports)
  completion.labPdfImport = 0;

  // Property Records: has record
  completion.propertyRecords = state.propertyRecord ? 100 : 0;

  // MI Registry: check key fields (FIX 3: array guard)
  completion.miRegistry = ((state.registrySubmissions || []).length > 0) ? 100 : 0;

  // Compliance: manual checks
  const ccKeys = Object.keys(state.complianceChecks || {}).filter(k => state.complianceChecks[k]);
  completion.compliance = ccKeys.length >= 5 ? 100 : Math.round((ccKeys.length / 5) * 100);

  // Assumed Positives: has entries (optional) (FIX 3: array guard)
  completion.assumedPositives = ((state.assumedPositives || []).length > 0) ? 100 : 0;

  // Thresholds: always 100 (defaults loaded)
  completion.thresholds = 100;

  // AI Report Writer: has NLG text
  const nlg = state.nlgText || {};
  completion.aiReportWriter = ((nlg.executiveSummary || '').length > 50) ? 100 : 0;

  // QA Review: has results
  completion.qaReview = state.qaResults ? 100 : 0;

  // Generate Report: always available
  completion.generateReport = 0;

  // Overall
  const values = Object.values(completion);
  completion._overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return completion;
}

function saveInspection(id, stateData) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([INSPECTIONS_STORE], 'readwrite');
      const store = transaction.objectStore(INSPECTIONS_STORE);

      const tabCompletion = calculateTabCompletion(stateData);

      const inspection = {
        id,
        stateData,
        lastSaved: new Date().toISOString(),
        // Enhanced metadata for the dashboard listing
        propertyAddress: stateData?.projectInfo?.propertyAddress || '',
        city: stateData?.projectInfo?.city || '',
        inspectionType: stateData?.projectInfo?.inspectionType || '',
        programType: stateData?.projectInfo?.programType || '',
        yearBuilt: stateData?.projectInfo?.yearBuilt || '',
        inspectorName: stateData?.projectInfo?.inspectorName || '',
        createdAt: stateData?._createdAt || new Date().toISOString(),
        tabCompletion: tabCompletion,
      };

      const request = store.put(inspection);

      request.onerror = () => {
        console.error('Failed to save inspection:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(inspection);
      };
    });
  });
}

function loadInspection(id) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([INSPECTIONS_STORE], 'readonly');
      const store = transaction.objectStore(INSPECTIONS_STORE);
      const request = store.get(id);

      request.onerror = () => {
        console.error('Failed to load inspection:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  });
}

function listInspections() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([INSPECTIONS_STORE], 'readonly');
      const store = transaction.objectStore(INSPECTIONS_STORE);
      const request = store.getAll();

      request.onerror = () => {
        console.error('Failed to list inspections:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const inspections = request.result.map((inspection) => ({
          id: inspection.id,
          propertyAddress: inspection.propertyAddress || inspection.stateData?.projectInfo?.propertyAddress || 'Untitled Inspection',
          city: inspection.city || '',
          inspectionType: inspection.inspectionType || '',
          programType: inspection.programType || '',
          yearBuilt: inspection.yearBuilt || '',
          inspectorName: inspection.inspectorName || '',
          lastSaved: inspection.lastSaved,
          createdAt: inspection.createdAt || inspection.lastSaved,
          tabCompletion: inspection.tabCompletion || {},
        }));
        // Sort by lastSaved descending
        inspections.sort((a, b) => new Date(b.lastSaved) - new Date(a.lastSaved));
        resolve(inspections);
      };
    });
  });
}

function deleteInspection(id) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([INSPECTIONS_STORE], 'readwrite');
      const store = transaction.objectStore(INSPECTIONS_STORE);
      const request = store.delete(id);

      request.onerror = () => {
        console.error('Failed to delete inspection:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  });
}

function addPendingSync(action) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PENDING_SYNC_STORE], 'readwrite');
      const store = transaction.objectStore(PENDING_SYNC_STORE);

      const syncItem = {
        action,
        timestamp: new Date().toISOString(),
        retries: 0
      };

      const request = store.add(syncItem);

      request.onerror = () => {
        console.error('Failed to add pending sync:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  });
}

function getPendingSync() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PENDING_SYNC_STORE], 'readonly');
      const store = transaction.objectStore(PENDING_SYNC_STORE);
      const request = store.getAll();

      request.onerror = () => {
        console.error('Failed to get pending sync items:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  });
}

function clearPendingSync() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PENDING_SYNC_STORE], 'readwrite');
      const store = transaction.objectStore(PENDING_SYNC_STORE);
      const request = store.clear();

      request.onerror = () => {
        console.error('Failed to clear pending sync:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  });
}

function isOnline() {
  return navigator.onLine;
}

export {
  openDB,
  saveInspection,
  loadInspection,
  listInspections,
  deleteInspection,
  addPendingSync,
  getPendingSync,
  clearPendingSync,
  isOnline,
  calculateTabCompletion
};
