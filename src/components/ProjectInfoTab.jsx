import React from 'react';

function ProjectInfoTab({ state, dispatch }) {
  const { projectInfo } = state;

  const handleChange = (field, value) => {
    dispatch({
      type: 'UPDATE_PROJECT_INFO',
      payload: { [field]: value }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Property Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Street Address"
          value={projectInfo.propertyAddress}
          onChange={(e) => handleChange('propertyAddress', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="City"
          value={projectInfo.city}
          onChange={(e) => handleChange('city', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <select
          value={projectInfo.state}
          onChange={(e) => handleChange('state', e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option>MI</option>
          <option>OH</option>
          <option>IN</option>
        </select>
        <input
          type="text"
          placeholder="ZIP"
          value={projectInfo.zip}
          onChange={(e) => handleChange('zip', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="number"
          placeholder="Year Built"
          value={projectInfo.yearBuilt}
          onChange={(e) => handleChange('yearBuilt', e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Inspection Details</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Inspection Date</label>
          <input
            type="date"
            value={projectInfo.inspectionDate}
            onChange={(e) => handleChange('inspectionDate', e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Report Date</label>
          <input
            type="date"
            value={projectInfo.reportDate}
            onChange={(e) => handleChange('reportDate', e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <select
          value={projectInfo.inspectionType}
          onChange={(e) => handleChange('inspectionType', e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option>LBP Inspection Only</option>
          <option>Risk Assessment</option>
          <option>Combined LIRA</option>
        </select>
        <select
          value={projectInfo.programType}
          onChange={(e) => handleChange('programType', e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option>HUD</option>
          <option>Medicaid</option>
          <option>Private</option>
          <option>EBL</option>
        </select>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Inspector Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Inspector Name"
          value={projectInfo.inspectorName}
          onChange={(e) => handleChange('inspectorName', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Certification Number"
          value={projectInfo.inspectorCert}
          onChange={(e) => handleChange('inspectorCert', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={projectInfo.inspectorEmail}
          onChange={(e) => handleChange('inspectorEmail', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Company Name"
          value={projectInfo.companyName}
          onChange={(e) => handleChange('companyName', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="tel"
          placeholder="Company Phone"
          value={projectInfo.companyPhone}
          onChange={(e) => handleChange('companyPhone', e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Client Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Client/Prepared For"
          value={projectInfo.clientName}
          onChange={(e) => handleChange('clientName', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Client Address"
          value={projectInfo.clientAddress}
          onChange={(e) => handleChange('clientAddress', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="tel"
          placeholder="Client Phone"
          value={projectInfo.clientPhone}
          onChange={(e) => handleChange('clientPhone', e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">XRF Device Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          value={projectInfo.xrfModel}
          onChange={(e) => handleChange('xrfModel', e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option>Heuresis Pb200i</option>
          <option>Viken Pb200e</option>
          <option>Olympus Vanta</option>
          <option>SciAps X-250</option>
          <option>RMD LPA-1</option>
          <option>Other</option>
        </select>
        <input
          type="text"
          placeholder="XRF Serial Number"
          value={projectInfo.xrfSerial}
          onChange={(e) => handleChange('xrfSerial', e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>
    </div>
  );
}

export default ProjectInfoTab;
