import React, { useState } from 'react';
import { THRESHOLDS } from '../engine/constants';

function LabResultsTab({ state, dispatch }) {
  const [dustEntry, setDustEntry] = useState({
    sampleId: '',
    location: '',
    surfaceType: 'Hard Floor',
    result: ''
  });

  const [soilEntry, setSoilEntry] = useState({
    sampleId: '',
    location: '',
    areaType: 'Rest of Yard',
    area: '',
    result: ''
  });

  const addDustSample = () => {
    if (dustEntry.sampleId && dustEntry.result) {
      dispatch({
        type: 'ADD_DUST_SAMPLE',
        payload: { ...dustEntry, result: parseFloat(dustEntry.result) }
      });
      setDustEntry({ sampleId: '', location: '', surfaceType: 'Hard Floor', result: '' });
    }
  };

  const addSoilSample = () => {
    if (soilEntry.sampleId && soilEntry.result) {
      dispatch({
        type: 'ADD_SOIL_SAMPLE',
        payload: { ...soilEntry, result: parseFloat(soilEntry.result) }
      });
      setSoilEntry({ sampleId: '', location: '', areaType: 'Rest of Yard', area: '', result: '' });
    }
  };

  const getDustThreshold = (surfaceType) => {
    if (surfaceType === 'Sill/Stool' || surfaceType === 'Trough') return THRESHOLDS.dust_sill_trough;
    if (surfaceType === 'Porch Floor') return THRESHOLDS.dust_porch;
    return THRESHOLDS.dust_floor;
  };

  const inspectionType = state.projectInfo.inspectionType || 'Risk Assessment';
  const isLBPOnly = inspectionType === 'LBP Inspection Only';

  return (
    <div className="space-y-8">
      {/* Inspection type context banner */}
      {isLBPOnly && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>LBP Inspection Only</strong> — Dust wipe and soil sampling are not required for this inspection type.
            These sections are available if you choose to collect samples, but they are optional for your report.
          </p>
        </div>
      )}

      <div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <h3 className="font-semibold text-blue-900">Dust Wipe Samples{isLBPOnly ? ' (Optional for LBP Only)' : ''}</h3>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 mb-4">
          <h4 className="font-semibold mb-4">Add Dust Wipe Sample</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Sample ID"
              value={dustEntry.sampleId}
              onChange={(e) => setDustEntry({ ...dustEntry, sampleId: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Location"
              value={dustEntry.location}
              onChange={(e) => setDustEntry({ ...dustEntry, location: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <select
              value={dustEntry.surfaceType}
              onChange={(e) => setDustEntry({ ...dustEntry, surfaceType: e.target.value })}
              className="border rounded px-3 py-2"
            >
              <option>Hard Floor</option>
              <option>Carpet Floor</option>
              <option>Sill/Stool</option>
              <option>Trough</option>
              <option>Porch Floor</option>
              <option>Other</option>
            </select>
            <input
              type="number"
              placeholder="Result (µg/ft²)"
              step="0.1"
              value={dustEntry.result}
              onChange={(e) => setDustEntry({ ...dustEntry, result: e.target.value })}
              className="border rounded px-3 py-2 md:col-span-2"
            />
          </div>
          <button
            onClick={addDustSample}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition"
          >
            Add Sample
          </button>
        </div>

        {state.dustWipeSamples.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-left">Sample ID</th>
                  <th className="border p-2 text-left">Location</th>
                  <th className="border p-2 text-left">Surface Type</th>
                  <th className="border p-2 text-right">Result (µg/ft²)</th>
                  <th className="border p-2 text-right">Threshold</th>
                  <th className="border p-2 text-center">Status</th>
                  <th className="border p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {state.dustWipeSamples.map((sample, idx) => {
                  const threshold = getDustThreshold(sample.surfaceType);
                  const isHazard = sample.result >= threshold;
                  return (
                    <tr key={idx} className="hover:bg-gray-100">
                      <td className="border p-2">{sample.sampleId}</td>
                      <td className="border p-2">{sample.location}</td>
                      <td className="border p-2">{sample.surfaceType}</td>
                      <td className="border p-2 text-right font-semibold">{sample.result.toFixed(1)}</td>
                      <td className="border p-2 text-right">{threshold}</td>
                      <td className="border p-2 text-center">
                        {isHazard ? (
                          <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-sm font-medium">
                            HAZARD
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => dispatch({ type: 'DELETE_DUST_SAMPLE', payload: idx })}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <h3 className="font-semibold text-blue-900">Soil Samples{isLBPOnly ? ' (Optional for LBP Only)' : ''}</h3>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 mb-4">
          <h4 className="font-semibold mb-4">Add Soil Sample</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Sample ID"
              value={soilEntry.sampleId}
              onChange={(e) => setSoilEntry({ ...soilEntry, sampleId: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Location"
              value={soilEntry.location}
              onChange={(e) => setSoilEntry({ ...soilEntry, location: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <select
              value={soilEntry.areaType}
              onChange={(e) => setSoilEntry({ ...soilEntry, areaType: e.target.value })}
              className="border rounded px-3 py-2"
            >
              <option>Play Area</option>
              <option>Dripline</option>
              <option>Rest of Yard</option>
              <option>Bare Soil</option>
            </select>
            <input
              type="number"
              placeholder="Area (sq ft)"
              value={soilEntry.area}
              onChange={(e) => setSoilEntry({ ...soilEntry, area: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <input
              type="number"
              placeholder="Result (ppm)"
              step="1"
              value={soilEntry.result}
              onChange={(e) => setSoilEntry({ ...soilEntry, result: e.target.value })}
              className="border rounded px-3 py-2"
            />
          </div>
          <button
            onClick={addSoilSample}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition"
          >
            Add Sample
          </button>
        </div>

        {state.soilSamples.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-left">Sample ID</th>
                  <th className="border p-2 text-left">Location</th>
                  <th className="border p-2 text-left">Area Type</th>
                  <th className="border p-2 text-right">Result (ppm)</th>
                  <th className="border p-2 text-right">Threshold</th>
                  <th className="border p-2 text-center">Status</th>
                  <th className="border p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {state.soilSamples.map((sample, idx) => {
                  const threshold = sample.areaType === 'Play Area' ? THRESHOLDS.soil_play : THRESHOLDS.soil_yard;
                  const isHazard = sample.result >= threshold;
                  return (
                    <tr key={idx} className="hover:bg-gray-100">
                      <td className="border p-2">{sample.sampleId}</td>
                      <td className="border p-2">{sample.location}</td>
                      <td className="border p-2">{sample.areaType}</td>
                      <td className="border p-2 text-right font-semibold">{sample.result}</td>
                      <td className="border p-2 text-right">{threshold}</td>
                      <td className="border p-2 text-center">
                        {isHazard ? (
                          <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-sm font-medium">
                            HAZARD
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => dispatch({ type: 'DELETE_SOIL_SAMPLE', payload: idx })}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
        <h4 className="font-semibold mb-4">Lab Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Lab Name"
            value={state.labName}
            onChange={(e) => dispatch({
              type: 'UPDATE_LAB_INFO',
              payload: { labName: e.target.value, labCertNumber: state.labCertNumber }
            })}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Lab Certification Number"
            value={state.labCertNumber}
            onChange={(e) => dispatch({
              type: 'UPDATE_LAB_INFO',
              payload: { labName: state.labName, labCertNumber: e.target.value }
            })}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>
    </div>
  );
}

export default LabResultsTab;
