import React, { useState } from 'react';
import {
  generateExecutiveSummary,
  generateHazardDescriptions,
  generatePropertyDescription,
  generateRecommendations,
  generateDisclosureLanguage,
} from '../engine/nlgEngine';

function NLGPanel({ state, dispatch }) {
  const [sections, setSections] = useState({
    executiveSummary: { generated: '', modified: false },
    propertyDescription: { generated: '', modified: false },
    hazardDescriptions: { generated: [], modified: false },
    recommendations: { generated: '', modified: false },
    disclosureLanguage: { generated: '', modified: false },
  });

  const [editMode, setEditMode] = useState({
    executiveSummary: false,
    propertyDescription: false,
    recommendations: false,
    disclosureLanguage: false,
  });

  const [editValues, setEditValues] = useState({
    executiveSummary: '',
    propertyDescription: '',
    recommendations: '',
    disclosureLanguage: '',
  });

  // ========================================================================
  // GENERATE FUNCTIONS
  // ========================================================================

  const generateSection = (sectionKey) => {
    let generated = '';
    let hazardDescs = [];

    switch (sectionKey) {
      case 'executiveSummary':
        generated = generateExecutiveSummary(state);
        setSections(prev => ({
          ...prev,
          executiveSummary: { generated, modified: false }
        }));
        setEditValues(prev => ({ ...prev, executiveSummary: generated }));
        break;

      case 'propertyDescription':
        generated = generatePropertyDescription(state);
        setSections(prev => ({
          ...prev,
          propertyDescription: { generated, modified: false }
        }));
        setEditValues(prev => ({ ...prev, propertyDescription: generated }));
        break;

      case 'hazardDescriptions':
        hazardDescs = generateHazardDescriptions(state.hazards, state);
        setSections(prev => ({
          ...prev,
          hazardDescriptions: { generated: hazardDescs, modified: false }
        }));
        break;

      case 'recommendations':
        generated = generateRecommendations(state.hazards, state);
        setSections(prev => ({
          ...prev,
          recommendations: { generated, modified: false }
        }));
        setEditValues(prev => ({ ...prev, recommendations: generated }));
        break;

      case 'disclosureLanguage':
        generated = generateDisclosureLanguage(state);
        setSections(prev => ({
          ...prev,
          disclosureLanguage: { generated, modified: false }
        }));
        setEditValues(prev => ({ ...prev, disclosureLanguage: generated }));
        break;

      default:
        break;
    }
  };

  const generateAllSections = () => {
    generateSection('executiveSummary');
    generateSection('propertyDescription');
    generateSection('hazardDescriptions');
    generateSection('recommendations');
    generateSection('disclosureLanguage');
  };

  // ========================================================================
  // EDIT AND SAVE FUNCTIONS
  // ========================================================================

  const handleEditChange = (sectionKey, value) => {
    setEditValues(prev => ({ ...prev, [sectionKey]: value }));
    setSections(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], modified: true }
    }));
  };

  const handleSaveEdit = (sectionKey) => {
    const text = editValues[sectionKey];
    dispatch({
      type: 'SAVE_NLG_TEXT',
      payload: { section: sectionKey, text }
    });
    setEditMode(prev => ({ ...prev, [sectionKey]: false }));
    setSections(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], generated: text, modified: false }
    }));
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  // ========================================================================
  // STATUS ICON HELPER
  // ========================================================================

  const getStatusIcon = (sectionKey) => {
    const section = sections[sectionKey];
    if (!section || !section.generated) {
      return <span className="text-gray-400">-</span>;
    }
    if (section.modified) {
      return <span className="text-yellow-500">●</span>;
    }
    return <span className="text-green-500">✓</span>;
  };

  // ========================================================================
  // RENDER: SECTION COMPONENT
  // ========================================================================

  const SectionComponent = ({ title, sectionKey, showHazardList = false }) => {
    const section = sections[sectionKey];
    const isEditing = editMode[sectionKey];
    const text = editValues[sectionKey];
    const isGenerated = section && section.generated;

    return (
      <div className="border border-blue-300 rounded-lg p-6 bg-blue-50 mb-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-blue-900">{title}</h3>
            <span className="text-sm" title={isGenerated ? (section.modified ? 'Modified' : 'Generated') : 'Not generated'}>
              {getStatusIcon(sectionKey)}
            </span>
          </div>
          {!isEditing && (
            <div className="flex gap-2">
              <button
                onClick={() => generateSection(sectionKey)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
              >
                {isGenerated ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={text}
              onChange={(e) => handleEditChange(sectionKey, e.target.value)}
              className="w-full h-48 p-3 border border-blue-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveEdit(sectionKey)}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditMode(prev => ({ ...prev, [sectionKey]: false }));
                  setEditValues(prev => ({ ...prev, [sectionKey]: section.generated }));
                }}
                className="px-4 py-2 bg-gray-400 text-white rounded text-sm hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : isGenerated ? (
          <div className="space-y-2">
            {showHazardList ? (
              // Hazard descriptions list
              <div className="space-y-3">
                {section.generated.length > 0 ? (
                  section.generated.map((hazard, idx) => (
                    <div key={idx} className="p-3 bg-white border border-blue-200 rounded text-sm text-gray-700 break-words">
                      <div className="font-semibold text-blue-900 mb-1">{hazard.hazardId}</div>
                      <div>{hazard.description}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 italic">No hazards to describe</div>
                )}
              </div>
            ) : (
              // Regular text display with whitespace preservation
              <pre className="p-3 bg-white border border-blue-200 rounded text-sm text-gray-700 overflow-auto whitespace-pre-wrap break-words max-h-64">
                {section.generated}
              </pre>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditMode(prev => ({ ...prev, [sectionKey]: true }));
                  setEditValues(prev => ({ ...prev, [sectionKey]: section.generated }));
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleCopyToClipboard(
                  showHazardList
                    ? section.generated.map(h => h.description).join('\n\n')
                    : section.generated
                )}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
              >
                Copy to Report
              </button>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 italic p-3 bg-white border border-blue-200 rounded">
            Click "Generate" to create this section
          </div>
        )}
      </div>
    );
  };

  // ========================================================================
  // RENDER MAIN COMPONENT
  // ========================================================================

  return (
    <div className="p-6 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-blue-900 mb-2">AI Report Writer</h2>
        <p className="text-gray-600">
          Generate professional report sections from your inspection data. Edit and refine generated text as needed.
        </p>
      </div>

      {/* Status Legend */}
      <div className="mb-6 p-3 bg-blue-100 border border-blue-300 rounded flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-green-500">✓</span>
          <span>Generated</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">●</span>
          <span>Modified</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">-</span>
          <span>Not generated</span>
        </div>
      </div>

      {/* Generate All Button */}
      <div className="mb-6">
        <button
          onClick={generateAllSections}
          className="px-6 py-3 bg-blue-900 text-white font-bold rounded-lg hover:bg-blue-800 transition shadow-md"
        >
          Generate All Sections
        </button>
      </div>

      {/* Executive Summary Section */}
      <SectionComponent
        title="Executive Summary"
        sectionKey="executiveSummary"
      />

      {/* Property Description Section */}
      <SectionComponent
        title="Property Description"
        sectionKey="propertyDescription"
      />

      {/* Hazard Descriptions Section */}
      <SectionComponent
        title="Hazard Descriptions"
        sectionKey="hazardDescriptions"
        showHazardList={true}
      />

      {/* Recommendations Section */}
      <SectionComponent
        title="Recommendations"
        sectionKey="recommendations"
      />

      {/* Disclosure Language Section */}
      <SectionComponent
        title="Disclosure Language"
        sectionKey="disclosureLanguage"
      />

      {/* Footer Info */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-300 rounded text-sm text-gray-700">
        <p className="font-semibold text-blue-900 mb-1">Tips:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>All generated text is based on your inspection data and current app state</li>
          <li>Edit any section to customize the language for your specific situation</li>
          <li>Use "Copy to Report" to paste sections into your final report document</li>
          <li>Regenerate sections after updating inspection data to refresh the content</li>
        </ul>
      </div>
    </div>
  );
}

export default NLGPanel;
