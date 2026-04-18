import React, { useState } from 'react';

function PublicRecordsLookup({ state, dispatch }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('address');
  const [selectedCounty, setSelectedCounty] = useState('Wayne');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [toast, setToast] = useState(null);

  const michiganCounties = [
    'Wayne', 'Oakland', 'Macomb', 'Genesee', 'Washtenaw', 'Kent', 'Ingham',
    'Saginaw', 'Kalamazoo', 'Muskegon', 'Bay', 'Berrien', 'Calhoun',
    'Jackson', 'St. Clair', 'Livingston'
  ];

  // Mock data generator
  const generateMockRecord = (address, city, county, ownerName) => {
    const cities = {
      Wayne: ['Detroit', 'Dearborn', 'Lincoln Park', 'Westland'],
      Oakland: ['Pontiac', 'Troy', 'Farmington', 'Bloomfield'],
      Macomb: ['Sterling Heights', 'Warren', 'Clinton', 'Harrison'],
      Genesee: ['Flint', 'Burton', 'Grand Blanc', 'Swartz Creek'],
      Washtenaw: ['Ann Arbor', 'Ypsilanti', 'Saline', 'Chelsea'],
      Kent: ['Grand Rapids', 'Kentwood', 'Cascade', 'Comstock'],
      Ingham: ['Lansing', 'East Lansing', 'Mason', 'Okemos'],
      Saginaw: ['Saginaw', 'Midland', 'Bay City', 'Carrollton'],
      Kalamazoo: ['Kalamazoo', 'Portage', 'Mattawan', 'Schoolcraft'],
      Muskegon: ['Muskegon', 'Muskegon Heights', 'Norton Shores', 'Fruitport'],
      Bay: ['Bay City', 'Essexville', 'Kawkawlin', 'Bangor'],
      Berrien: ['Benton Harbor', 'St. Joseph', 'Niles', 'Bridgman'],
      Calhoun: ['Battle Creek', 'Albion', 'Cereal City', 'Marengo'],
      Jackson: ['Jackson', 'Concord', 'Grass Lake', 'Hanover'],
      'St. Clair': ['Port Huron', 'Marine City', 'Marysville', 'Algonac'],
      Livingston: ['Howell', 'Brighton', 'Fowlerville', 'Pinckney']
    };

    const selectedCity = city || cities[county][Math.floor(Math.random() * cities[county].length)];
    const yearBuilt = 1950 + Math.floor(Math.random() * 40);
    const sqft = 800 + Math.floor(Math.random() * 3200);
    const lotSize = (0.2 + Math.random() * 0.6).toFixed(2);
    const taxableValue = 80000 + Math.floor(Math.random() * 250000);
    const assessedValue = Math.floor(taxableValue * 1.4);

    const hasLeadHistory = yearBuilt < 1978 && Math.random() > 0.4;

    return {
      parcelId: `${Math.floor(Math.random() * 99)}-${Math.floor(Math.random() * 99)}-${Math.floor(Math.random() * 999)}-${Math.floor(Math.random() * 999)}`,
      address: address || `${Math.floor(Math.random() * 9000) + 100} ${['Main', 'Oak', 'Elm', 'Pine', 'Maple', 'Cedar'][Math.floor(Math.random() * 6)]} St`,
      city: selectedCity,
      county: county,
      zip: `${4 + Math.floor(Math.random() * 5)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`,
      ownerName: ownerName || ['John Smith', 'Mary Johnson', 'Robert Williams', 'Patricia Brown', 'Michael Davis'][Math.floor(Math.random() * 5)],
      ownerAddress: `${Math.floor(Math.random() * 9000) + 100} Owner Ave, ${selectedCity}, MI`,
      yearBuilt: yearBuilt,
      squareFootage: sqft,
      lotSize: lotSize + ' acres',
      propertyClass: ['Residential', 'Commercial', 'Mixed Use'][Math.floor(Math.random() * 3)],
      taxableValue: taxableValue,
      assessedValue: assessedValue,
      schoolDistrict: selectedCity + ' Schools',
      zoningCode: ['R-1', 'R-2', 'C-1', 'C-2', 'M-1'][Math.floor(Math.random() * 5)],
      buildingPermits: [
        {
          date: '2022-06-15',
          type: 'Renovation',
          description: 'Roof replacement and interior painting',
          status: 'Completed'
        },
        {
          date: '2019-03-20',
          type: 'Addition',
          description: 'Addition of covered deck',
          status: 'Completed'
        }
      ],
      previousInspections: [
        {
          date: '2021-05-10',
          type: 'General Home Inspection',
          result: 'No major issues',
          inspector: 'Licensed Inspector'
        },
        {
          date: '2018-08-22',
          type: 'Electrical Inspection',
          result: 'Passed',
          inspector: 'County Inspector'
        }
      ],
      leadInspectionHistory: hasLeadHistory ? [
        {
          date: '2023-02-14',
          result: 'Positive findings - Lead hazards detected',
          company: 'Michigan Lead Abatement Corp'
        },
        {
          date: '2020-11-08',
          result: 'Positive findings - Lead paint present',
          company: 'EPA Certified Inspector'
        }
      ] : []
    };
  };

  // Simulate API search
  const simulatePropertySearch = (query, county) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let searchResults = [];

        // If searching by address that matches projectInfo
        if (searchType === 'address' && state.projectInfo?.propertyAddress &&
            query.toLowerCase() === state.projectInfo.propertyAddress.toLowerCase()) {
          searchResults.push(generateMockRecord(
            state.projectInfo.propertyAddress,
            state.projectInfo.city,
            county,
            ''
          ));
        } else {
          // Generate 1-3 mock results
          const numResults = Math.floor(Math.random() * 3) + 1;
          for (let i = 0; i < numResults; i++) {
            searchResults.push(generateMockRecord('', '', county, ''));
          }
        }

        resolve(searchResults);
      }, 1500);
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const searchResults = await simulatePropertySearch(searchQuery, selectedCounty);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching records');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandedSection = (cardIndex, section) => {
    const key = `${cardIndex}-${section}`;
    setExpandedCards(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleImportPropertyData = (record) => {
    dispatch({
      type: 'UPDATE_PROJECT_INFO',
      payload: {
        propertyAddress: record.address,
        city: record.city,
        zip: record.zip,
        yearBuilt: record.yearBuilt.toString()
      }
    });

    dispatch({
      type: 'SAVE_PROPERTY_RECORD',
      payload: record
    });

    setToast('Property data imported to Project Info');
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch_KeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Blue Notice Banner */}
      <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
        <p className="text-blue-900 font-medium">
          Michigan BS&A Property Records — This module will connect to county assessor databases when API access is established. Currently showing preview data for demonstration.
        </p>
      </div>

      {/* Search Interface */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Search Public Records</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Search Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search By</label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="address">Property Address</option>
              <option value="parcelid">Parcel ID</option>
              <option value="owner">Owner Name</option>
            </select>
          </div>

          {/* County Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">County/Jurisdiction</label>
            <select
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {michiganCounties.map(county => (
                <option key={county} value={county}>{county} County</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input and Button */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder={
              searchType === 'address' ? 'Enter property address...' :
              searchType === 'parcelid' ? 'Enter parcel ID...' :
              'Enter owner name...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearch_KeyPress}
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className={`px-6 py-2 rounded font-medium text-white transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded relative">
          <span className="block sm:inline">{toast}</span>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {results.map((record, cardIndex) => (
          <div key={cardIndex} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Card Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900">{record.address}</h4>
                  <p className="text-sm text-gray-600">{record.city}, MI {record.zip}</p>
                </div>
                {record.yearBuilt < 1978 && (
                  <span className="ml-2 bg-yellow-200 border border-yellow-400 text-yellow-800 text-xs font-semibold px-3 py-1 rounded">
                    Pre-1978 — Lead Risk
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Year Built</p>
                  <p className="text-gray-900 font-bold text-lg">{record.yearBuilt}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Parcel ID</p>
                  <p className="text-gray-900 text-sm font-mono">{record.parcelId}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Owner</p>
                  <p className="text-gray-900 text-sm">{record.ownerName}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">County</p>
                  <p className="text-gray-900 text-sm">{record.county}</p>
                </div>
              </div>
            </div>

            {/* Card Body - Expandable Sections */}
            <div className="p-4 space-y-3">
              {/* Building Details */}
              <div className="border border-gray-200 rounded">
                <button
                  onClick={() => toggleExpandedSection(cardIndex, 'building')}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition-colors"
                >
                  <span>Building Details</span>
                  <span className={`transform transition-transform ${expandedCards[`${cardIndex}-building`] ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedCards[`${cardIndex}-building`] && (
                  <div className="px-4 py-3 space-y-2 text-sm bg-blue-50">
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Square Footage:</span>
                      <span className="text-gray-900">{record.squareFootage.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Lot Size:</span>
                      <span className="text-gray-900">{record.lotSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Property Class:</span>
                      <span className="text-gray-900">{record.propertyClass}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Zoning Code:</span>
                      <span className="text-gray-900">{record.zoningCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">School District:</span>
                      <span className="text-gray-900">{record.schoolDistrict}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tax Info */}
              <div className="border border-gray-200 rounded">
                <button
                  onClick={() => toggleExpandedSection(cardIndex, 'tax')}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition-colors"
                >
                  <span>Tax Information</span>
                  <span className={`transform transition-transform ${expandedCards[`${cardIndex}-tax`] ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedCards[`${cardIndex}-tax`] && (
                  <div className="px-4 py-3 space-y-2 text-sm bg-blue-50">
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Taxable Value:</span>
                      <span className="text-gray-900">${record.taxableValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Assessed Value:</span>
                      <span className="text-gray-900">${record.assessedValue.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Permit History */}
              <div className="border border-gray-200 rounded">
                <button
                  onClick={() => toggleExpandedSection(cardIndex, 'permits')}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900 transition-colors"
                >
                  <span>Building Permits ({record.buildingPermits.length})</span>
                  <span className={`transform transition-transform ${expandedCards[`${cardIndex}-permits`] ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedCards[`${cardIndex}-permits`] && (
                  <div className="px-4 py-3 space-y-3 bg-blue-50">
                    {record.buildingPermits.map((permit, idx) => (
                      <div key={idx} className="pb-3 border-b border-blue-200 last:border-b-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-gray-900">{permit.type}</span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{permit.status}</span>
                        </div>
                        <p className="text-sm text-gray-700">{permit.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{permit.date}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lead Inspection History */}
              {record.leadInspectionHistory.length > 0 && (
                <div className="border border-yellow-300 rounded">
                  <button
                    onClick={() => toggleExpandedSection(cardIndex, 'lead')}
                    className="w-full px-4 py-3 bg-yellow-50 hover:bg-yellow-100 flex items-center justify-between font-medium text-gray-900 transition-colors"
                  >
                    <span>Lead Inspection History</span>
                    <span className={`transform transition-transform ${expandedCards[`${cardIndex}-lead`] ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {expandedCards[`${cardIndex}-lead`] && (
                    <div className="px-4 py-3 space-y-3 bg-yellow-50">
                      {record.leadInspectionHistory.map((inspection, idx) => (
                        <div key={idx} className="pb-3 border-b border-yellow-200 last:border-b-0">
                          <div className="flex items-start gap-2">
                            <span className="text-red-600 font-bold mt-1">●</span>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{inspection.result}</p>
                              <p className="text-sm text-gray-700 mt-1">{inspection.company}</p>
                              <p className="text-xs text-gray-500 mt-1">{inspection.date}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-gray-600 italic mt-3 pt-2 border-t border-yellow-200">
                        Lead inspection history from Michigan DHHS records (when API available)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {record.leadInspectionHistory.length === 0 && record.yearBuilt < 1978 && (
                <div className="bg-blue-50 border border-blue-200 rounded px-4 py-3 text-sm text-blue-800">
                  No previous lead inspection records found. Consider ordering a lead inspection for this pre-1978 property.
                </div>
              )}
            </div>

            {/* Card Footer - Import Button */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
              <button
                onClick={() => handleImportPropertyData(record)}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Import Property Data
              </button>
            </div>
          </div>
        ))}

        {results.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <p>No results yet. Use the search form above to find properties.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicRecordsLookup;
