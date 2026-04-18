import React, { useState } from 'react';
import {
  REGULATORY_THRESHOLDS,
  REGULATORY_FRAMEWORKS,
  getThresholdsByCategory,
  getThresholdsForInspectionType,
  getFrameworksByScope,
  getDefaultThresholds
} from '../data/regulatoryThresholds';

const ThresholdManager = ({ state, dispatch }) => {
  const [activeTab, setActiveTab] = useState('thresholds');
  const [editMode, setEditMode] = useState(false);
  const [filterByInspection, setFilterByInspection] = useState(true);
  const [editedThresholds, setEditedThresholds] = useState({});

  const inspectionType = state.inspectionType || 'LIRA';
  const programType = state.programType || '';
  const customThresholds = state.customThresholds || {};

  // Get thresholds to display
  const displayThresholds = filterByInspection
    ? getThresholdsForInspectionType(inspectionType)
    : REGULATORY_THRESHOLDS;

  // Group thresholds by category
  const groupedThresholds = {};
  displayThresholds.forEach(threshold => {
    if (!groupedThresholds[threshold.category]) {
      groupedThresholds[threshold.category] = [];
    }
    groupedThresholds[threshold.category].push(threshold);
  });

  const categoryColors = {
    paint: 'bg-orange-100',
    dust: 'bg-blue-100',
    clearance: 'bg-green-100',
    soil: 'bg-amber-100'
  };

  const categoryHeaderColors = {
    paint: 'bg-orange-500',
    dust: 'bg-blue-500',
    clearance: 'bg-green-500',
    soil: 'bg-amber-600'
  };

  // Check if custom thresholds differ from defaults
  const hasCustomThresholds = Object.keys(customThresholds).length > 0 &&
    Object.keys(customThresholds).some(id => {
      const defaultThreshold = REGULATORY_THRESHOLDS.find(t => t.id === id);
      return defaultThreshold && customThresholds[id] !== defaultThreshold.threshold;
    });

  // Get actual threshold value (custom or default)
  const getThresholdValue = (thresholdId) => {
    return customThresholds[thresholdId] !== undefined
      ? customThresholds[thresholdId]
      : REGULATORY_THRESHOLDS.find(t => t.id === thresholdId)?.threshold;
  };

  // Handle threshold edit
  const handleThresholdChange = (id, newValue) => {
    const numValue = parseFloat(newValue);
    setEditedThresholds(prev => ({
      ...prev,
      [id]: isNaN(numValue) ? '' : numValue
    }));
  };

  // Save edited thresholds
  const saveThresholds = () => {
    const newCustomThresholds = { ...customThresholds };
    Object.entries(editedThresholds).forEach(([id, value]) => {
      if (value !== '') {
        newCustomThresholds[id] = value;
      }
    });
    dispatch({ type: 'UPDATE_CUSTOM_THRESHOLDS', payload: newCustomThresholds });
    setEditedThresholds({});
    setEditMode(false);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    dispatch({ type: 'UPDATE_CUSTOM_THRESHOLDS', payload: {} });
    setEditedThresholds({});
    setEditMode(false);
  };

  // Render thresholds tab
  const renderThresholdsTab = () => {
    return (
      <div className="space-y-4">
        {/* Filter and edit controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterByInspection}
                onChange={(e) => setFilterByInspection(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Active thresholds for this inspection</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editMode ? 'Cancel' : 'Edit Thresholds'}
            </button>
            {editMode && (
              <>
                <button
                  onClick={saveThresholds}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={resetToDefaults}
                  className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Reset to Defaults
                </button>
              </>
            )}
          </div>
        </div>

        {/* Custom threshold warning */}
        {hasCustomThresholds && (
          <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md flex items-start gap-2">
            <span className="text-yellow-700 font-semibold">⚠</span>
            <p className="text-sm text-yellow-800">
              Custom thresholds in use — differs from regulatory defaults
            </p>
          </div>
        )}

        {/* Thresholds table by category */}
        <div className="space-y-6">
          {Object.entries(groupedThresholds).map(([category, thresholds]) => (
            <div key={category}>
              {/* Category header */}
              <div className={`${categoryHeaderColors[category]} text-white font-bold px-4 py-2 rounded-t-lg`}>
                {category.charAt(0).toUpperCase() + category.slice(1)} Thresholds
              </div>

              {/* Threshold rows */}
              <div className={`${categoryColors[category]} rounded-b-lg overflow-hidden border border-gray-200`}>
                <table className="w-full text-sm">
                  <thead className="bg-gray-200 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Medium/Surface</th>
                      <th className="px-4 py-2 text-left font-semibold">Threshold</th>
                      <th className="px-4 py-2 text-left font-semibold">Unit</th>
                      <th className="px-4 py-2 text-left font-semibold">Source</th>
                      <th className="px-4 py-2 text-left font-semibold">Effective Date</th>
                      <th className="px-4 py-2 text-left font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {thresholds.map(threshold => {
                      const displayValue = editedThresholds[threshold.id] !== undefined
                        ? editedThresholds[threshold.id]
                        : getThresholdValue(threshold.id);

                      return (
                        <tr key={threshold.id} className="border-b border-gray-300 hover:bg-white/50">
                          <td className="px-4 py-3 font-medium text-gray-900">{threshold.medium}</td>
                          <td className="px-4 py-3">
                            {editMode ? (
                              <input
                                type="number"
                                step="0.1"
                                value={displayValue}
                                onChange={(e) => handleThresholdChange(threshold.id, e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-400 rounded"
                              />
                            ) : (
                              <span className="font-semibold">{displayValue}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{threshold.unit}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{threshold.source}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {new Date(threshold.effectiveDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{threshold.notes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {displayThresholds.length === 0 && (
          <div className="p-4 bg-gray-100 rounded text-center text-gray-600">
            No thresholds apply to the current inspection type.
          </div>
        )}
      </div>
    );
  };

  // Render regulatory framework tab
  const renderFrameworkTab = () => {
    const scopeOrder = ['Federal', 'State', 'Program'];
    const frameworks = REGULATORY_FRAMEWORKS.slice().sort((a, b) => {
      return scopeOrder.indexOf(a.scope) - scopeOrder.indexOf(b.scope);
    });

    const scopeColors = {
      'Federal': 'bg-blue-50 border-l-4 border-blue-600',
      'State': 'bg-green-50 border-l-4 border-green-600',
      'Program': 'bg-purple-50 border-l-4 border-purple-600'
    };

    const scopeBadgeColors = {
      'Federal': 'bg-blue-200 text-blue-900',
      'State': 'bg-green-200 text-green-900',
      'Program': 'bg-purple-200 text-purple-900'
    };

    return (
      <div className="grid grid-cols-1 gap-6">
        {frameworks.map(framework => (
          <div key={framework.id} className={`p-4 rounded-lg ${scopeColors[framework.scope]}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900">{framework.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{framework.description}</p>
              </div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ml-4 ${scopeBadgeColors[framework.scope]}`}>
                {framework.scope}
              </span>
            </div>

            {/* Citation */}
            <div className="mt-3 mb-3 flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Reference:</span>
              <span className="text-sm text-blue-700 font-mono">{framework.citation}</span>
            </div>

            {/* Chapters/Subparts */}
            {(framework.chapters || framework.subparts) && (
              <details className="mt-3 pt-3 border-t border-gray-300">
                <summary className="cursor-pointer font-semibold text-gray-800 hover:text-gray-900">
                  {framework.chapters ? 'Key Chapters' : 'Key Subparts'}
                </summary>
                <div className="mt-2 ml-4 space-y-1">
                  {(framework.chapters || framework.subparts || []).map((item, idx) => {
                    const label = framework.chapters ? `Chapter ${item.number}` : `Subpart ${item.letter}`;
                    const keyBadge = item.key ? (
                      <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">KEY</span>
                    ) : null;
                    return (
                      <div key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="font-mono font-semibold">{label}:</span>
                        <span>{item.title}</span>
                        {keyBadge}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <h2 className="text-2xl font-bold text-blue-900 mb-6">Regulatory Thresholds & Framework</h2>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('thresholds')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
            activeTab === 'thresholds'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          Thresholds
        </button>
        <button
          onClick={() => setActiveTab('framework')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
            activeTab === 'framework'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          Regulatory Framework
        </button>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'thresholds' && renderThresholdsTab()}
        {activeTab === 'framework' && renderFrameworkTab()}
      </div>
    </div>
  );
};

export default ThresholdManager;
