import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { THRESHOLDS } from '../engine/constants';

// Device detection function
const detectXRFDevice = (headers, xmlContent = null) => {
  if (!headers) headers = [];

  const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());

  // Heuresis (PBXL+): Look for "Reading #", "PbLa", "PbLb", "Duration"
  if (lowerHeaders.some(h => h.includes('reading #') || h.includes('reading#'))) {
    if (lowerHeaders.some(h => h.includes('pbla') || h.includes('pblb'))) {
      return 'Heuresis';
    }
  }

  // Olympus (Vanta): CSV with "Spectrum Number", "Pb K", "Pb L", "Matrix"
  if (lowerHeaders.some(h => h.includes('spectrum number'))) {
    if (lowerHeaders.some(h => h.includes('pb k') || h.includes('pb l'))) {
      return 'Olympus';
    }
  }

  // SciAps (X-200): CSV with "Test No", "Lead (ppm)", "Duration (s)"
  if (lowerHeaders.some(h => h.includes('test no') || h.includes('test#'))) {
    if (lowerHeaders.some(h => h.includes('lead') && h.includes('ppm'))) {
      return 'SciAps';
    }
  }

  // RMD (LPA-1): Headers include "Test#", "Result_mgcm2"
  if (lowerHeaders.some(h => h.includes('test#') || h.includes('test num'))) {
    if (lowerHeaders.some(h => h.includes('result') && h.includes('mgcm'))) {
      return 'RMD';
    }
  }

  // Viken (Pb200): XML with <Sample> elements or CSV headers with "Channel", "Concentration"
  if (xmlContent && xmlContent.includes('<Sample')) {
    return 'Viken';
  }
  if (lowerHeaders.some(h => h.includes('channel')) && lowerHeaders.some(h => h.includes('concentration'))) {
    return 'Viken';
  }

  return 'Generic';
};

// XML Parser function for XRF data
const parseXMLFile = (xmlText) => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    // Check for parser errors
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      return { data: null, error: 'Invalid XML format' };
    }

    const xrfData = [];

    // Try multiple XML structure patterns
    let readings = [];

    // Pattern 1: <Reading> elements (standard format)
    readings = Array.from(xmlDoc.getElementsByTagName('Reading'));

    // Pattern 2: <Sample> elements (Viken-style)
    if (readings.length === 0) {
      readings = Array.from(xmlDoc.getElementsByTagName('Sample'));
    }

    // Pattern 3: <Record> elements (alternative)
    if (readings.length === 0) {
      readings = Array.from(xmlDoc.getElementsByTagName('Record'));
    }

    // Pattern 4: <Data> elements (generic)
    if (readings.length === 0) {
      readings = Array.from(xmlDoc.getElementsByTagName('Data'));
    }

    if (readings.length === 0) {
      return { data: null, error: 'No data readings found in XML' };
    }

    readings.forEach((reading, idx) => {
      // Helper to get text content or attribute value
      const getTextOrAttr = (tagName, attrName) => {
        // Try as element first
        const element = reading.getElementsByTagName(tagName)[0];
        if (element) {
          return element.textContent?.trim() || '';
        }
        // Try as attribute
        return reading.getAttribute(attrName) || reading.getAttribute(tagName) || '';
      };

      // Extract fields with fallbacks
      const readingNum = getTextOrAttr('ReadingNumber', 'id') ||
                         getTextOrAttr('reading', 'id') ||
                         `Reading ${idx + 1}`;

      const dateTime = getTextOrAttr('DateTime', 'timestamp') ||
                       getTextOrAttr('Date', 'date') ||
                       getTextOrAttr('Time', 'timestamp') ||
                       '';

      const room = getTextOrAttr('Building', 'room') ||
                   getTextOrAttr('Room', 'room') ||
                   getTextOrAttr('Location', 'room') ||
                   '';

      const component = getTextOrAttr('Component', 'component') ||
                        getTextOrAttr('Surface', 'component') ||
                        getTextOrAttr('Member', 'component') ||
                        '';

      const substrate = getTextOrAttr('Substrate', 'substrate') ||
                        getTextOrAttr('Material', 'substrate') ||
                        '';

      const side = getTextOrAttr('Side', 'side') ||
                   getTextOrAttr('Wall', 'side') ||
                   '';

      const condition = getTextOrAttr('Condition', 'condition') ||
                        getTextOrAttr('Status', 'condition') ||
                        'Intact';

      const result = parseFloat(
        getTextOrAttr('Result', 'result') ||
        getTextOrAttr('Reading', 'result') ||
        getTextOrAttr('Value', 'result') ||
        '0'
      );

      // Split date and time if combined
      let date = '';
      let time = '';
      if (dateTime) {
        if (dateTime.includes('T')) {
          const parts = dateTime.split('T');
          date = parts[0];
          time = parts[1].substring(0, 5); // HH:MM
        } else if (dateTime.includes(' ')) {
          const parts = dateTime.split(' ');
          date = parts[0];
          time = parts[1];
        } else {
          date = dateTime;
        }
      }

      if (!isNaN(result)) {
        xrfData.push({
          reading: readingNum,
          date: date,
          time: time,
          room: room,
          component: component,
          substrate: substrate,
          side: side,
          condition: condition,
          result: result
        });
      }
    });

    if (xrfData.length === 0) {
      return { data: null, error: 'No valid readings could be extracted from XML' };
    }

    return { data: xrfData, error: null };
  } catch (err) {
    return { data: null, error: `Error parsing XML: ${err.message}` };
  }
};

function XRFDataTab({ state, dispatch }) {
  const [uploadMode, setUploadMode] = useState('csv');
  const [detectedDevice, setDetectedDevice] = useState('');
  const [manualEntry, setManualEntry] = useState({
    reading: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    room: '',
    component: '',
    substrate: 'Paint',
    side: '',
    condition: 'Intact',
    result: ''
  });
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [showMapping, setShowMapping] = useState(false);
  const fileInputRef = useRef(null);

  // Calibration state
  const [calibrationExpanded, setCalibrationExpanded] = useState(true);
  const [calibrationEntry, setCalibrationEntry] = useState({
    measuredValue: '',
    notes: ''
  });

  // Helper functions for calibration
  const getCalibrationStatus = () => {
    if (!state.calibrationReadings || state.calibrationReadings.length === 0) {
      return { status: 'RED', reason: 'No calibration on record' };
    }

    const lastReading = state.calibrationReadings[state.calibrationReadings.length - 1];
    const hoursSinceCalibration = (Date.now() - new Date(lastReading.timestamp).getTime()) / (1000 * 60 * 60);
    const recalibrationHours = state.calibrationConfig?.recalibrationHours || 4;

    if (hoursSinceCalibration > recalibrationHours) {
      return { status: 'RED', reason: `Overdue (${hoursSinceCalibration.toFixed(1)} hours ago)` };
    }
    if (!lastReading.withinTolerance) {
      return { status: 'RED', reason: 'Last reading outside tolerance' };
    }
    if (hoursSinceCalibration > recalibrationHours - 1) {
      return { status: 'YELLOW', reason: `Approaching deadline (${hoursSinceCalibration.toFixed(1)} hours ago)` };
    }
    return { status: 'GREEN', reason: `Within tolerance (${hoursSinceCalibration.toFixed(1)} hours ago)` };
  };

  const handleAddCalibration = () => {
    if (!calibrationEntry.measuredValue) {
      alert('Please enter a measured value');
      return;
    }

    const measured = parseFloat(calibrationEntry.measuredValue);
    const standard = state.calibrationConfig?.standardValue || 1.02;
    const tolerance = state.calibrationConfig?.tolerancePercent || 10;
    const deviation = ((measured - standard) / standard) * 100;
    const withinTolerance = Math.abs(deviation) <= tolerance;

    dispatch({
      type: 'ADD_CALIBRATION_READING',
      payload: {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        standardValue: standard,
        measuredValue: measured,
        withinTolerance: withinTolerance,
        deviationPercent: deviation,
        notes: calibrationEntry.notes
      }
    });

    setCalibrationEntry({ measuredValue: '', notes: '' });
  };

  const handleDeleteCalibration = (id) => {
    if (window.confirm('Delete this calibration reading?')) {
      dispatch({ type: 'DELETE_CALIBRATION_READING', payload: id });
    }
  };

  const getStatusColor = () => {
    const { status } = getCalibrationStatus();
    if (status === 'GREEN') return '#10b981';
    if (status === 'YELLOW') return '#f59e0b';
    return '#ef4444';
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const autoDetectColumns = (headers, device = 'Generic') => {
    const mapping = {};
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());

    // Device-specific column mapping presets
    var deviceMaps = {
      'Heuresis': {
        reading: ['reading #', 'reading#', 'reading'],
        date: ['date'],
        time: ['time'],
        room: ['location', 'room'],
        component: ['component', 'surface'],
        substrate: ['substrate', 'material'],
        side: ['side'],
        condition: ['condition'],
        result: ['pbla', 'pblb', 'pb', 'result']
      },
      'Olympus': {
        reading: ['spectrum number', 'spectrum', 'reading'],
        date: ['date'],
        time: ['time'],
        room: ['room', 'location'],
        component: ['component', 'element'],
        substrate: ['matrix', 'substrate'],
        side: ['side'],
        condition: ['condition'],
        result: ['pb k', 'pb l', 'pb', 'lead']
      },
      'SciAps': {
        reading: ['test no', 'test#', 'test'],
        date: ['date'],
        time: ['time', 'duration (s)'],
        room: ['room', 'location'],
        component: ['component'],
        substrate: ['substrate', 'material'],
        side: ['side'],
        condition: ['condition'],
        result: ['lead (ppm)', 'lead', 'result']
      },
      'RMD': {
        reading: ['test#', 'test num', 'test'],
        date: ['date'],
        time: ['time'],
        room: ['room', 'location'],
        component: ['component'],
        substrate: ['substrate'],
        side: ['side'],
        condition: ['condition'],
        result: ['result_mgcm2', 'result', 'reading']
      },
      'Viken': {
        reading: ['sample', 'reading', 'test'],
        date: ['date'],
        time: ['time'],
        room: ['room', 'location'],
        component: ['component'],
        substrate: ['substrate'],
        side: ['side'],
        condition: ['condition'],
        result: ['concentration', 'pb', 'result', 'channel']
      },
      'Generic': {
        reading: ['reading', 'no.', 'number', '#', 'test'],
        date: ['date'],
        time: ['time'],
        room: ['room', 'building', 'apartment', 'location'],
        component: ['component', 'structure', 'member', 'surface'],
        substrate: ['substrate', 'material'],
        side: ['side', 'wall'],
        condition: ['condition', 'status'],
        result: ['result', 'reading value', 'pb', 'lead', 'value']
      }
    };

    var columnMaps = deviceMaps[device] || deviceMaps['Generic'];

    Object.keys(columnMaps).forEach(key => {
      const headerIndex = lowerHeaders.findIndex(h =>
        columnMaps[key].some(term => h.includes(term))
      );
      if (headerIndex >= 0) {
        mapping[key] = headerIndex;
      }
    });

    return mapping;
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isXML = file.name.toLowerCase().endsWith('.xml') || file.type === 'application/xml' || file.type === 'text/xml';

    if (isXML) {
      // Handle XML file
      const reader = new FileReader();
      reader.onload = (e) => {
        const xmlText = e.target?.result;
        if (typeof xmlText === 'string') {
          var device = detectXRFDevice([], xmlText);
          setDetectedDevice(device);
          const { data: xrfData, error } = parseXMLFile(xmlText);
          if (error) {
            alert(`Error parsing XML: ${error}`);
          } else if (xrfData) {
            dispatch({ type: 'SET_XRF_DATA', payload: xrfData });
            setShowMapping(false);
          }
        }
      };
      reader.onerror = () => {
        alert('Error reading file');
      };
      reader.readAsText(file);
    } else {
      // Handle CSV file
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length > 1) {
            const headers = results.data[0];
            var device = detectXRFDevice(headers);
            setDetectedDevice(device);
            setCsvHeaders(headers);
            const mapping = autoDetectColumns(headers, device);
            dispatch({ type: 'SET_COLUMN_MAPPING', payload: mapping });
            setShowMapping(true);
          }
        }
      });
    }
  };

  const handleColumnMappingConfirm = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const mapping = state.columnMapping;
        const xrfData = [];

        for (let i = 1; i < results.data.length; i++) {
          const row = results.data[i];
          const result = parseFloat(row[mapping.result] || '0');

          if (!isNaN(result)) {
            xrfData.push({
              reading: row[mapping.reading] || `Reading ${i}`,
              date: row[mapping.date] || '',
              time: row[mapping.time] || '',
              room: row[mapping.room] || '',
              component: row[mapping.component] || '',
              substrate: row[mapping.substrate] || '',
              side: row[mapping.side] || '',
              condition: row[mapping.condition] || 'Intact',
              result: result
            });
          }
        }

        dispatch({ type: 'SET_XRF_DATA', payload: xrfData });
        setShowMapping(false);
      }
    });
  };

  const handleAddManualEntry = () => {
    if (manualEntry.result && manualEntry.room && manualEntry.component) {
      dispatch({
        type: 'ADD_XRF_READING',
        payload: {
          ...manualEntry,
          result: parseFloat(manualEntry.result)
        }
      });
      setManualEntry({
        reading: '',
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        room: '',
        component: '',
        substrate: 'Paint',
        side: '',
        condition: 'Intact',
        result: ''
      });
    }
  };

  const positiveCount = state.xrfData.filter(d => d.result >= THRESHOLDS.xrf_paint).length;
  const negativeCount = state.xrfData.length - positiveCount;

  return (
    <div className="space-y-6">
      {/* Calibration Check Section */}
      <div style={{ border: '2px solid #553c9a', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f9f5ff' }}>
        <button
          onClick={() => setCalibrationExpanded(!calibrationExpanded)}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#553c9a',
            color: 'white',
            border: 'none',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>XRF Calibration Check</span>
          <span style={{ fontSize: '20px' }}>{calibrationExpanded ? '▼' : '▶'}</span>
        </button>

        {calibrationExpanded && (
          <div style={{ padding: '20px' }}>
            {/* Status Display */}
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: getStatusColor()
                  }}
                />
                <div>
                  <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Status</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {getCalibrationStatus().status === 'GREEN' ? '✓ Calibrated' : getCalibrationStatus().status === 'YELLOW' ? '⚠ Approaching deadline' : '✗ Recalibration needed'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                    {getCalibrationStatus().reason}
                  </div>
                </div>
              </div>

              {state.calibrationReadings && state.calibrationReadings.length > 0 && (
                <div style={{ fontSize: '13px', color: '#555', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #d1d5db' }}>
                  Last calibration: {formatDateTime(state.calibrationReadings[state.calibrationReadings.length - 1].timestamp)}
                </div>
              )}
            </div>

            {/* Calibration Entry Form */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>Record Calibration Reading</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
                    Standard Value (mg/cm²)
                  </label>
                  <input
                    type="number"
                    disabled
                    value={state.calibrationConfig?.standardValue || 1.02}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: '#f3f4f6',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
                    Measured Value (mg/cm²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Enter measured value"
                    value={calibrationEntry.measuredValue}
                    onChange={(e) => setCalibrationEntry({ ...calibrationEntry, measuredValue: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
                    Timestamp
                  </label>
                  <input
                    type="text"
                    disabled
                    value={new Date().toLocaleString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: '#f3f4f6',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Add any notes about this calibration..."
                  value={calibrationEntry.notes}
                  onChange={(e) => setCalibrationEntry({ ...calibrationEntry, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    minHeight: '60px'
                  }}
                />
              </div>
              <button
                onClick={handleAddCalibration}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#553c9a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Record Calibration
              </button>
            </div>

            {/* Calibration History Table */}
            {state.calibrationReadings && state.calibrationReadings.length > 0 && (
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                  Calibration History (Last {Math.min(10, state.calibrationReadings.length)} readings)
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e5e7eb' }}>
                        <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'left' }}>Time</th>
                        <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center' }}>Standard (mg/cm²)</th>
                        <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center' }}>Measured (mg/cm²)</th>
                        <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center' }}>Deviation %</th>
                        <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center' }}>Within Tolerance</th>
                        <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'left' }}>Notes</th>
                        <th style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.calibrationReadings.slice(-10).reverse().map((reading) => (
                        <tr key={reading.id} style={{ backgroundColor: reading.withinTolerance ? '#f0fdf4' : '#fef2f2', borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ border: '1px solid #d1d5db', padding: '10px' }}>{formatDateTime(reading.timestamp)}</td>
                          <td style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center' }}>{reading.standardValue.toFixed(3)}</td>
                          <td style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center', fontWeight: '600' }}>{reading.measuredValue.toFixed(3)}</td>
                          <td style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center', fontWeight: '600', color: reading.withinTolerance ? '#16a34a' : '#dc2626' }}>
                            {reading.deviationPercent.toFixed(1)}%
                          </td>
                          <td style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center', fontSize: '16px' }}>
                            {reading.withinTolerance ? '✓' : '✗'}
                          </td>
                          <td style={{ border: '1px solid #d1d5db', padding: '10px', color: '#666' }}>{reading.notes || '—'}</td>
                          <td style={{ border: '1px solid #d1d5db', padding: '10px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleDeleteCalibration(reading.id)}
                              style={{
                                backgroundColor: 'transparent',
                                color: '#dc2626',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                textDecoration: 'underline'
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(!state.calibrationReadings || state.calibrationReadings.length === 0) && (
              <div style={{ textAlign: 'center', padding: '32px', color: '#666', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px' }}>No calibration readings recorded yet. Start by entering your first calibration reading above.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setUploadMode('csv')}
          className={`px-4 py-2 rounded font-medium transition ${
            uploadMode === 'csv'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Upload Data (CSV/XML)
        </button>
        <button
          onClick={() => setUploadMode('manual')}
          className={`px-4 py-2 rounded font-medium transition ${
            uploadMode === 'manual'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Manual Entry
        </button>
      </div>

      {detectedDevice && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#166534' }}>Detected XRF Device: <strong>{detectedDevice}</strong></span>
        </div>
      )}

      {uploadMode === 'csv' && !showMapping && (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xml,.txt"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
          >
            Choose XRF Data File or Drag & Drop
          </button>
          <p className="text-sm text-gray-600 mt-2">CSV or XML files with XRF data (Viken, Olympus, SciAps formats supported)</p>
        </div>
      )}

      {showMapping && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <h3 className="font-semibold mb-4">Map CSV Columns</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {['reading', 'date', 'time', 'room', 'component', 'substrate', 'side', 'condition', 'result'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-1 capitalize">{field}</label>
                <select
                  value={state.columnMapping[field] ?? -1}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    dispatch({
                      type: 'SET_COLUMN_MAPPING',
                      payload: { ...state.columnMapping, [field]: idx }
                    });
                  }}
                  className="border rounded px-2 py-1 w-full text-sm"
                >
                  <option value={-1}>-- Not mapped --</option>
                  {csvHeaders.map((header, idx) => (
                    <option key={idx} value={idx}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={handleColumnMappingConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium transition"
          >
            Confirm & Import
          </button>
        </div>
      )}

      {uploadMode === 'manual' && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
          <h3 className="font-semibold mb-4">Add Manual XRF Reading</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Room"
              value={manualEntry.room}
              onChange={(e) => setManualEntry({ ...manualEntry, room: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Component (e.g., Window, Door, Wall)"
              value={manualEntry.component}
              onChange={(e) => setManualEntry({ ...manualEntry, component: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Side"
              value={manualEntry.side}
              onChange={(e) => setManualEntry({ ...manualEntry, side: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <select
              value={manualEntry.substrate}
              onChange={(e) => setManualEntry({ ...manualEntry, substrate: e.target.value })}
              className="border rounded px-3 py-2"
            >
              <option>Paint</option>
              <option>Wood</option>
              <option>Metal</option>
              <option>Drywall</option>
              <option>Plaster</option>
              <option>Concrete</option>
            </select>
            <select
              value={manualEntry.condition}
              onChange={(e) => setManualEntry({ ...manualEntry, condition: e.target.value })}
              className="border rounded px-3 py-2"
            >
              <option>Intact</option>
              <option>Fair</option>
              <option>Deteriorated</option>
            </select>
            <input
              type="number"
              placeholder="Result (mg/cm²)"
              step="0.1"
              value={manualEntry.result}
              onChange={(e) => setManualEntry({ ...manualEntry, result: e.target.value })}
              className="border rounded px-3 py-2"
            />
          </div>
          <button
            onClick={handleAddManualEntry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition"
          >
            Add Reading
          </button>
        </div>
      )}

      {state.xrfData.length > 0 && (
        <div>
          <div className="mb-4 p-4 bg-blue-100 rounded-lg border border-blue-300">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-900">{state.xrfData.length}</div>
                <div className="text-sm text-blue-700">Total Readings</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{positiveCount}</div>
                <div className="text-sm text-red-600">Positive (≥1.0)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{negativeCount}</div>
                <div className="text-sm text-green-600">Negative (&lt;1.0)</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-left">Room</th>
                  <th className="border p-2 text-left">Component</th>
                  <th className="border p-2 text-left">Side</th>
                  <th className="border p-2 text-left">Condition</th>
                  <th className="border p-2 text-right">Result (mg/cm²)</th>
                  <th className="border p-2 text-center">Status</th>
                  <th className="border p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {state.xrfData.map((reading, idx) => (
                  <tr key={idx} className="hover:bg-gray-100">
                    <td className="border p-2">{reading.room}</td>
                    <td className="border p-2">{reading.component}</td>
                    <td className="border p-2">{reading.side}</td>
                    <td className="border p-2">{reading.condition}</td>
                    <td className="border p-2 text-right font-semibold">{reading.result.toFixed(2)}</td>
                    <td className="border p-2 text-center">
                      {reading.result >= THRESHOLDS.xrf_paint ? (
                        <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-sm font-medium">
                          POSITIVE
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium">
                          NEGATIVE
                        </span>
                      )}
                    </td>
                    <td className="border p-2 text-center">
                      <button
                        onClick={() => dispatch({ type: 'DELETE_XRF_READING', payload: idx })}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default XRFDataTab;
