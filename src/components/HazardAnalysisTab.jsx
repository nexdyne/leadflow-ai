import React from 'react';
import { HAZARD_SEVERITY, HAZARD_PRIORITY } from '../engine/constants';
import { generateHazards } from '../engine/hazardAnalysis';

function HazardAnalysisTab({ state, dispatch }) {
  const runHazardAnalysis = () => {
    const hazards = generateHazards(state.xrfData, state.dustWipeSamples, state.soilSamples);
    dispatch({ type: 'GENERATE_HAZARDS', payload: hazards });
  };

  const severity1Count = state.hazards.filter(h => h.severity === 1).length;
  const severity2Count = state.hazards.filter(h => h.severity === 2).length;
  const severity3Count = state.hazards.filter(h => h.severity === 3).length;

  return (
    <div className="space-y-6">
      <button
        onClick={runHazardAnalysis}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition text-lg"
      >
        Run Hazard Analysis
      </button>

      {state.hazards.length > 0 && (
        <div>
          <div className="mb-4 p-4 bg-red-100 rounded-lg border border-red-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-900">{state.hazards.length}</div>
                <div className="text-sm text-red-700">Total Hazards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{severity1Count}</div>
                <div className="text-sm text-red-600">Severity 1</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{severity2Count}</div>
                <div className="text-sm text-orange-600">Severity 2</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{severity3Count}</div>
                <div className="text-sm text-yellow-600">Severity 3</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {state.hazards.map((hazard, idx) => (
              <div key={hazard.id} className={`p-4 rounded-lg border-2 ${HAZARD_PRIORITY[hazard.priority].borderColor}`}>
                <div className={`p-3 rounded mb-3 ${HAZARD_PRIORITY[hazard.priority].color}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-lg">{hazard.component} - {hazard.location}</h4>
                      <p className="text-sm">{hazard.type} | Result: {hazard.result.toFixed(2)} {hazard.unit}</p>
                    </div>
                    <div className={`px-3 py-1 rounded font-bold text-white ${HAZARD_SEVERITY[hazard.severity].color}`}>
                      {HAZARD_SEVERITY[hazard.severity].label}
                    </div>
                  </div>
                  <p className="text-sm font-medium">{hazard.cause}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Abatement Options</label>
                    <select
                      defaultValue={0}
                      onChange={(e) => {
                        dispatch({
                          type: 'UPDATE_HAZARD',
                          payload: {
                            index: idx,
                            updates: { selectedAbatement: e.target.value }
                          }
                        });
                      }}
                      className="border rounded px-3 py-2 w-full text-sm"
                    >
                      {hazard.abatementOptions.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Interim Control</label>
                    <textarea
                      value={hazard.selectedInterimControl || hazard.interimControlOptions}
                      onChange={(e) => {
                        dispatch({
                          type: 'UPDATE_HAZARD',
                          payload: {
                            index: idx,
                            updates: { selectedInterimControl: e.target.value }
                          }
                        });
                      }}
                      className="border rounded px-3 py-2 w-full text-sm h-20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Severity</label>
                    <select
                      value={hazard.severity}
                      onChange={(e) => {
                        dispatch({
                          type: 'UPDATE_HAZARD',
                          payload: {
                            index: idx,
                            updates: { severity: parseInt(e.target.value) }
                          }
                        });
                      }}
                      className="border rounded px-3 py-2 w-full"
                    >
                      <option value={1}>Severity 1 (Highest)</option>
                      <option value={2}>Severity 2 (Medium)</option>
                      <option value={3}>Severity 3 (Intact)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Priority</label>
                    <select
                      value={hazard.priority}
                      onChange={(e) => {
                        dispatch({
                          type: 'UPDATE_HAZARD',
                          payload: {
                            index: idx,
                            updates: { priority: parseInt(e.target.value) }
                          }
                        });
                      }}
                      className="border rounded px-3 py-2 w-full"
                    >
                      <option value={1}>Priority 1 (High)</option>
                      <option value={2}>Priority 2 (Medium)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HazardAnalysisTab;
