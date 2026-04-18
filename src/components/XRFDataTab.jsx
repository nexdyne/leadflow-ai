import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { THRESHOLDS } from '../engine/constants';

function XRFDataTab({ state, dispatch }) {
  const [uploadMode, setUploadMode] = useState('csv');
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

  const autoDetectColumns = (headers) => {
    const mapping = {};
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());

    const columnMaps = {
      reading: ['reading', 'no.', 'number', '#'],
      date: ['date'],
      time: ['time'],
      room: ['room', 'building', 'apartment'],
      component: ['component', 'structure', 'member', 'surface'],
      substrate: ['substrate', 'material'],
      side: ['side', 'wall'],
      condition: ['condition', 'status'],
      result: ['result', 'reading value', 'pb', 'lead']
    };

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

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 1) {
          const headers = results.data[0];
          setCsvHeaders(headers);
          const mapping = autoDetectColumns(headers);
          dispatch({ type: 'SET_COLUMN_MAPPING', payload: mapping });
          setShowMapping(true);
        }
      }
    });
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
      <div className="flex gap-4">
        <button
          onClick={() => setUploadMode('csv')}
          className={`px-4 py-2 rounded font-medium transition ${
            uploadMode === 'csv'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          CSV Upload
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

      {uploadMode === 'csv' && !showMapping && (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
          >
            Choose CSV File or Drag & Drop
          </button>
          <p className="text-sm text-gray-600 mt-2">CSV files with XRF data</p>
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
