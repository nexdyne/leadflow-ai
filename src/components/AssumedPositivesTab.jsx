import React, { useState, useMemo } from 'react';
import { ChevronDown, Trash2, Check, X } from 'lucide-react';

const COMPONENT_OPTIONS = [
  'Window Sash',
  'Window Frame',
  'Window Casing',
  'Window Stool',
  'Window Well',
  'Door Panel',
  'Door Frame',
  'Door Casing',
  'Baseboard',
  'Crown Molding',
  'Wall',
  'Ceiling',
  'Porch Rail',
  'Porch Deck',
  'Porch Column',
  'Porch Ceiling',
  'Porch Steps',
  'Other'
];

const SUBSTRATE_OPTIONS = ['Wood', 'Metal', 'Plaster', 'Drywall', 'Concrete', 'Brick', 'Other'];
const SIDE_OPTIONS = ['A', 'B', 'C', 'D', 'Interior', 'Exterior'];

export default function AssumedPositivesTab({ state, dispatch }) {
  const [formData, setFormData] = useState({
    room: '',
    component: '',
    substrate: '',
    side: '',
    reason: '',
    linkedReadingId: ''
  });

  const [showAutoDetect, setShowAutoDetect] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [sortBy, setSortBy] = useState('room');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Get positive XRF readings (>= 1.0 mg/cm²)
  const positiveReadings = useMemo(() => {
    return (state.xrfData || []).filter(reading => reading.result >= 1.0);
  }, [state.xrfData]);

  // Get all rooms with their components
  const roomsWithComponents = useMemo(() => {
    const map = {};
    (state.xrfData || []).forEach(reading => {
      if (!map[reading.room]) {
        map[reading.room] = {};
      }
      if (!map[reading.component]) {
        map[reading.component] = new Set();
      }
      map[reading.room][reading.component] = true;
    });
    return map;
  }, [state.xrfData]);

  // Auto-detect assumed positives
  const handleAutoDetect = () => {
    const newCandidates = [];
    const existingIds = new Set((state.assumedPositives || []).map(ap => ap.id));

    positiveReadings.forEach(positiveReading => {
      // Strategy 1: Same room, same component, different side, untested
      (state.xrfData || []).forEach(otherReading => {
        if (
          otherReading.room === positiveReading.room &&
          otherReading.component === positiveReading.component &&
          otherReading.side !== positiveReading.side &&
          (otherReading.result < 1.0 || otherReading.result === null) &&
          !existingIds.has(`${otherReading.room}-${otherReading.component}-${otherReading.substrate}-${otherReading.side}`)
        ) {
          const candidateId = `${otherReading.room}-${otherReading.component}-${otherReading.substrate}-${otherReading.side}`;
          if (!newCandidates.find(c => c.id === candidateId)) {
            newCandidates.push({
              id: candidateId,
              room: otherReading.room,
              component: otherReading.component,
              substrate: otherReading.substrate || '',
              side: otherReading.side,
              reason: `Same painting history as positive ${positiveReading.component} Side ${positiveReading.side} in ${positiveReading.room}`,
              linkedReadingId: positiveReading.id,
              type: 'same-room-component'
            });
          }
        }
      });

      // Strategy 2: Same component and substrate across different rooms
      (state.xrfData || []).forEach(otherReading => {
        if (
          otherReading.room !== positiveReading.room &&
          otherReading.component === positiveReading.component &&
          otherReading.substrate === positiveReading.substrate &&
          (otherReading.result < 1.0 || otherReading.result === null) &&
          !existingIds.has(`${otherReading.room}-${otherReading.component}-${otherReading.substrate}-${otherReading.side}`)
        ) {
          const candidateId = `${otherReading.room}-${otherReading.component}-${otherReading.substrate}-${otherReading.side}`;
          if (!newCandidates.find(c => c.id === candidateId)) {
            newCandidates.push({
              id: candidateId,
              room: otherReading.room,
              component: otherReading.component,
              substrate: otherReading.substrate || '',
              side: otherReading.side,
              reason: `Same component type and substrate as positive ${positiveReading.component} in ${positiveReading.room}`,
              linkedReadingId: positiveReading.id,
              type: 'cross-room'
            });
          }
        }
      });
    });

    setCandidates(newCandidates);
    setShowAutoDetect(true);
    setSelectedCandidates(new Set());
  };

  const handleAddCandidates = () => {
    selectedCandidates.forEach(candidateId => {
      const candidate = candidates.find(c => c.id === candidateId);
      if (candidate) {
        const { type, ...assumedPositive } = candidate;
        assumedPositive.id = Date.now().toString() + Math.random();
        dispatch({
          type: 'ADD_ASSUMED_POSITIVE',
          payload: assumedPositive
        });
      }
    });
    setShowAutoDetect(false);
    setCandidates([]);
    setSelectedCandidates(new Set());
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddAssumedPositive = () => {
    if (!formData.room || !formData.component || !formData.substrate || !formData.side) {
      alert('Please fill in all required fields');
      return;
    }

    const newAssumedPositive = {
      id: Date.now().toString() + Math.random(),
      room: formData.room,
      component: formData.component,
      substrate: formData.substrate,
      side: formData.side,
      reason: formData.reason,
      linkedReadingId: formData.linkedReadingId
    };

    dispatch({
      type: 'ADD_ASSUMED_POSITIVE',
      payload: newAssumedPositive
    });

    setFormData({
      room: '',
      component: '',
      substrate: '',
      side: '',
      reason: '',
      linkedReadingId: ''
    });
  };

  const handleDeleteAssumedPositive = (id) => {
    dispatch({
      type: 'DELETE_ASSUMED_POSITIVE',
      payload: id
    });
    setShowDeleteConfirm(null);
  };

  // Sort assumed positives
  const sortedAssumedPositives = useMemo(() => {
    const sorted = [...(state.assumedPositives || [])];
    sorted.sort((a, b) => {
      if (sortBy === 'room') {
        return a.room.localeCompare(b.room);
      }
      return 0;
    });
    return sorted;
  }, [state.assumedPositives, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const assumedPositives = state.assumedPositives || [];
    const byComponent = {};
    const byRoom = {};

    assumedPositives.forEach(ap => {
      byComponent[ap.component] = (byComponent[ap.component] || 0) + 1;
      byRoom[ap.room] = (byRoom[ap.room] || 0) + 1;
    });

    return { byComponent, byRoom };
  }, [state.assumedPositives]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Assumed Positives</h1>
        <p className="text-gray-700">
          Manage building components that are assumed lead-based paint positive based on shared painting history with confirmed positive readings.
        </p>
      </div>

      {/* Auto-Detection Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-blue-900 mb-4">Auto-Detection</h2>
        <button
          onClick={handleAutoDetect}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Auto-Detect Assumed Positives
        </button>

        {showAutoDetect && candidates.length > 0 && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Found {candidates.length} Candidate(s)
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {candidates.map(candidate => (
                <div
                  key={candidate.id}
                  className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCandidates.has(candidate.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedCandidates);
                      if (e.target.checked) {
                        newSelected.add(candidate.id);
                      } else {
                        newSelected.delete(candidate.id);
                      }
                      setSelectedCandidates(newSelected);
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="ml-4 flex-grow">
                    <p className="font-semibold text-gray-900">
                      {candidate.room} - {candidate.component} (Side {candidate.side})
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{candidate.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">Substrate: {candidate.substrate}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddCandidates}
                disabled={selectedCandidates.size === 0}
                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Add Selected ({selectedCandidates.size})
              </button>
              <button
                onClick={() => {
                  setShowAutoDetect(false);
                  setCandidates([]);
                  setSelectedCandidates(new Set());
                }}
                className="px-6 py-2 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showAutoDetect && candidates.length === 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">No new candidates found. All similar components may already be recorded.</p>
            <button
              onClick={() => setShowAutoDetect(false)}
              className="mt-3 px-4 py-2 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Manual Entry Form */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-blue-900 mb-6">Manual Entry</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Room */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Room <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.room}
              onChange={(e) => handleFormChange('room', e.target.value)}
              placeholder="e.g., Kitchen, Living Room"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          {/* Component */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Component <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.component}
              onChange={(e) => handleFormChange('component', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="">Select a component</option>
              {COMPONENT_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Substrate */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Substrate <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.substrate}
              onChange={(e) => handleFormChange('substrate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="">Select a substrate</option>
              {SUBSTRATE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Side */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Side <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.side}
              onChange={(e) => handleFormChange('side', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="">Select a side</option>
              {SIDE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Reason
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleFormChange('reason', e.target.value)}
              placeholder="e.g., Same painting history as positive Window Sash Side A in Kitchen"
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          {/* Linked Reading ID */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Linked Positive Reading (Optional)
            </label>
            <select
              value={formData.linkedReadingId}
              onChange={(e) => handleFormChange('linkedReadingId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="">Select a reading</option>
              {positiveReadings.map(reading => (
                <option key={reading.id} value={reading.id}>
                  {reading.room} - {reading.component} (Side {reading.side}) - {reading.result.toFixed(2)} mg/cm²
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleAddAssumedPositive}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Assumed Positive
          </button>
        </div>
      </div>

      {/* Assumed Positives Table */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-blue-900">Recorded Assumed Positives</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-900">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="room">Room</option>
            </select>
          </div>
        </div>

        {sortedAssumedPositives.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No assumed positives recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-50 border-b-2 border-blue-900">
                  <th className="px-4 py-3 text-left text-sm font-bold text-blue-900">Room</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-blue-900">Component</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-blue-900">Substrate</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-blue-900">Side</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-blue-900">Reason</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-blue-900">Linked Reading</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-blue-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedAssumedPositives.map((ap, index) => {
                  const linkedReading = (state.xrfData || []).find(r => r.id === ap.linkedReadingId);
                  return (
                    <tr
                      key={ap.id}
                      className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{ap.room}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{ap.component}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ap.substrate}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ap.side}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ap.reason}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {linkedReading ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                            {linkedReading.result.toFixed(2)} mg/cm²
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setShowDeleteConfirm(ap.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          <Trash2 size={16} />
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

        {/* Row count */}
        <div className="mt-4 text-sm text-gray-600">
          Total: <span className="font-semibold">{sortedAssumedPositives.length}</span> assumed positive component(s)
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow-lg p-8 border-l-4 border-blue-900">
        <h2 className="text-2xl font-bold text-blue-900 mb-6">Summary & Regulatory Notes</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Count */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-sm text-gray-600 font-semibold mb-2">Total Assumed Positives</p>
            <p className="text-4xl font-bold text-blue-900">{(state.assumedPositives || []).length}</p>
          </div>

          {/* By Component */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-sm text-gray-600 font-semibold mb-3">By Component Type</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Object.keys(stats.byComponent).length === 0 ? (
                <p className="text-sm text-gray-500">None recorded</p>
              ) : (
                Object.entries(stats.byComponent).map(([component, count]) => (
                  <div key={component} className="flex justify-between text-sm">
                    <span className="text-gray-700">{component}</span>
                    <span className="font-semibold text-blue-900">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* By Room */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-sm text-gray-600 font-semibold mb-3">By Room</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Object.keys(stats.byRoom).length === 0 ? (
                <p className="text-sm text-gray-500">None recorded</p>
              ) : (
                Object.entries(stats.byRoom).map(([room, count]) => (
                  <div key={room} className="flex justify-between text-sm">
                    <span className="text-gray-700">{room}</span>
                    <span className="font-semibold text-blue-900">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Regulatory Note */}
        <div className="bg-blue-900 text-white rounded-lg p-6">
          <p className="font-bold text-lg mb-2">EPA/HUD Regulation 40 CFR 745.227(b)(2)</p>
          <p className="text-sm leading-relaxed">
            All building components with common painting histories that share a positive lead-based paint result must be assumed lead-based paint positive. An assumed positive status requires disclosure and compliance with EPA RRP regulations and state-specific requirements. Components listed above should be treated as containing lead-based paint for all regulatory and remediation purposes.
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this assumed positive? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeleteAssumedPositive(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
