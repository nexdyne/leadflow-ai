import React, { useState } from 'react';

function MichiganRegistryPanel({ state, dispatch }) {
  const [submissionData, setSubmissionData] = useState({
    // Property Information
    propertyAddress: state.projectInfo?.propertyAddress || '',
    city: state.projectInfo?.city || '',
    county: '',
    zip: state.projectInfo?.zip || '',
    parcelId: '',
    dwellingType: 'single-family',
    yearBuilt: state.projectInfo?.yearBuilt || '',
    numberOfUnits: '1',

    // Inspection Information
    inspectionDate: state.projectInfo?.inspectionDate || new Date().toISOString().split('T')[0],
    reportDate: state.projectInfo?.reportDate || new Date().toISOString().split('T')[0],
    inspectionType: 'LIRA',
    programFundingSource: state.projectInfo?.programType || 'HUD',

    // Inspector Information
    inspectorName: state.projectInfo?.inspectorName || '',
    inspectorCompany: state.projectInfo?.companyName || '',
    firmName: state.projectInfo?.companyName || '',
    firmLicenseNumber: '',
    michiganCertNumber: '',
    epaCertNumber: '',

    // Child Information (for EBL)
    childName: '',
    childDOB: '',
    bloodLeadLevel: '',
    caseNumber: '',

    // Results Summary
    leadPaintSurfacesFound: state.xrfData?.filter(r => r.result >= 1.0).length || 0,
    dustWipeResult: 'fail',
    soilResult: 'fail',
    hazardControlMethod: '',

    // Hazard Findings Category
    leadBasedPaintIdentified: false,
    dustLeadHazardsIdentified: false,
    soilLeadHazardsIdentified: false,
    paintHazardDeterioration: false,
    frictionImpactSurfaceHazards: false,
    noLeadHazardsIdentified: false,

    // Abatement/Interim Controls
    abatementOrderIssued: 'no',
    orderDate: '',
    complianceDeadline: '',
    interimControlsRequired: 'no',
    plannedActions: '',
    expectedCompletionDate: '',
    contractorName: '',
    contractorPhone: '',

    // Occupant Notification
    occupantNotified: 'no',
    notificationDate: '',
    notificationMethod: 'in-person'
  });

  const [validationErrors, setValidationErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [autoFilledFields, setAutoFilledFields] = useState({
    propertyAddress: true,
    city: true,
    zip: true,
    yearBuilt: true,
    inspectionDate: true,
    reportDate: true,
    inspectorName: true,
    inspectorCompany: true,
    firmName: true,
    leadPaintSurfacesFound: true,
    programFundingSource: true
  });

  // Calculate summary statistics
  const positiveXrfCount = state.xrfData?.filter(r => r.result >= 1.0).length || 0;
  const dustWipePass = state.dustWipeSamples?.every(s => s.result < 10);
  const soilPass = state.soilSamples?.every(s => s.result < 400);

  const handleInputChange = (field, value) => {
    setSubmissionData(prev => ({
      ...prev,
      [field]: value
    }));
    // Mark field as manually edited (no longer auto-filled)
    setAutoFilledFields(prev => ({
      ...prev,
      [field]: false
    }));
  };

  const validateSubmission = () => {
    const errors = [];

    // Required property fields
    if (!submissionData.propertyAddress.trim()) errors.push('Property address is required');
    if (!submissionData.city.trim()) errors.push('City is required');
    if (!submissionData.county.trim()) errors.push('County is required');
    if (!submissionData.zip.trim()) errors.push('ZIP code is required');
    if (!submissionData.dwellingType) errors.push('Dwelling type is required');

    // Required inspection fields
    if (!submissionData.inspectionDate) errors.push('Inspection date is required');
    if (!submissionData.reportDate) errors.push('Report date is required');
    if (!submissionData.inspectionType) errors.push('Inspection type is required');

    // Required inspector fields
    if (!submissionData.inspectorName.trim()) errors.push('Inspector name is required');
    if (!submissionData.inspectorCompany.trim()) errors.push('Inspector company is required');
    if (!submissionData.firmName.trim()) errors.push('Firm name is required');
    if (!submissionData.firmLicenseNumber.trim()) errors.push('Firm license number is required');
    if (!submissionData.michiganCertNumber.trim()) errors.push('Michigan certification number is required');

    // Hazard findings validation
    const hasHazards = submissionData.leadBasedPaintIdentified || submissionData.dustLeadHazardsIdentified ||
                       submissionData.soilLeadHazardsIdentified || submissionData.paintHazardDeterioration ||
                       submissionData.frictionImpactSurfaceHazards || submissionData.noLeadHazardsIdentified;
    if (!hasHazards) errors.push('At least one hazard category must be selected');

    // Abatement order validation
    if (submissionData.abatementOrderIssued === 'yes') {
      if (!submissionData.orderDate) errors.push('Order date is required when abatement order is issued');
      if (!submissionData.complianceDeadline) errors.push('Compliance deadline is required when abatement order is issued');
    }

    // Occupant notification validation
    if (!submissionData.occupantNotified) errors.push('Occupant notification status is required');
    if (submissionData.occupantNotified === 'yes') {
      if (!submissionData.notificationDate) errors.push('Notification date is required when occupant is notified');
    }

    // EBL-specific validations
    if (submissionData.inspectionType === 'EBL') {
      if (!submissionData.childName.trim()) errors.push('Child name is required for EBL inspections');
      if (!submissionData.childDOB) errors.push('Child DOB is required for EBL inspections');
      if (!submissionData.bloodLeadLevel) errors.push('Blood lead level is required for EBL inspections');
      if (!submissionData.caseNumber.trim()) errors.push('Case number is required for EBL inspections');
    }

    // Results validation
    if (submissionData.hazardControlMethod.trim() === '') errors.push('Hazard control method is required');

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Mock API simulation
  const simulateRegistrySubmission = (data) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const confirmationNumber = `MI-LR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
        resolve({
          confirmationNumber,
          submittedAt: new Date().toISOString(),
          status: 'pending_review'
        });
      }, 2000);
    });
  };

  const handleSubmit = async () => {
    if (!validateSubmission()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const confirmation = await simulateRegistrySubmission(submissionData);
      setConfirmationData(confirmation);

      // Save to Redux state
      dispatch({
        type: 'SAVE_REGISTRY_SUBMISSION',
        payload: confirmation
      });
    } catch (error) {
      setValidationErrors(['An error occurred during submission. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    // Generate printable HTML view
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Michigan Lead Registry Submission</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            h1 { color: #1a365d; border-bottom: 2px solid #2c5282; padding-bottom: 10px; }
            h2 { color: #2c5282; margin-top: 20px; font-size: 16px; background: #e6f2ff; padding: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            td { padding: 8px; border: 1px solid #ddd; }
            td:first-child { font-weight: bold; width: 40%; background: #f9f9f9; }
            .section { page-break-inside: avoid; margin-bottom: 20px; }
            .confirmation { background: #e8f5e9; border: 2px solid #4caf50; padding: 15px; border-radius: 4px; }
            .status-pending { color: #f57c00; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Michigan Lead Registry Submission</h1>

          <div class="section">
            <h2>Submission Details</h2>
            <table>
              <tr><td>Confirmation Number:</td><td>${confirmationData?.confirmationNumber || 'NOT YET SUBMITTED'}</td></tr>
              <tr><td>Submitted At:</td><td>${confirmationData?.submittedAt ? new Date(confirmationData.submittedAt).toLocaleString() : 'Not submitted'}</td></tr>
              <tr><td>Status:</td><td><span class="status-pending">${confirmationData?.status || 'Draft'}</span></td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Property Information</h2>
            <table>
              <tr><td>Address:</td><td>${submissionData.propertyAddress}</td></tr>
              <tr><td>City:</td><td>${submissionData.city}</td></tr>
              <tr><td>County:</td><td>${submissionData.county}</td></tr>
              <tr><td>ZIP:</td><td>${submissionData.zip}</td></tr>
              <tr><td>Parcel ID:</td><td>${submissionData.parcelId || 'N/A'}</td></tr>
              <tr><td>Dwelling Type:</td><td>${submissionData.dwellingType}</td></tr>
              <tr><td>Year Built:</td><td>${submissionData.yearBuilt}</td></tr>
              <tr><td>Number of Units:</td><td>${submissionData.numberOfUnits}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Inspection Information</h2>
            <table>
              <tr><td>Inspection Date:</td><td>${submissionData.inspectionDate}</td></tr>
              <tr><td>Report Date:</td><td>${submissionData.reportDate}</td></tr>
              <tr><td>Inspection Type:</td><td>${submissionData.inspectionType}</td></tr>
              <tr><td>Funding Source:</td><td>${submissionData.programFundingSource}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Inspector Information</h2>
            <table>
              <tr><td>Name:</td><td>${submissionData.inspectorName}</td></tr>
              <tr><td>Company:</td><td>${submissionData.inspectorCompany}</td></tr>
              <tr><td>Firm Name:</td><td>${submissionData.firmName}</td></tr>
              <tr><td>Firm License Number:</td><td>${submissionData.firmLicenseNumber}</td></tr>
              <tr><td>Michigan Cert #:</td><td>${submissionData.michiganCertNumber}</td></tr>
              <tr><td>EPA Cert #:</td><td>${submissionData.epaCertNumber || 'N/A'}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Results Summary</h2>
            <table>
              <tr><td>Lead Paint Surfaces Found:</td><td>${submissionData.leadPaintSurfacesFound}</td></tr>
              <tr><td>Dust Wipe Result:</td><td>${submissionData.dustWipeResult === 'pass' ? 'PASS' : 'FAIL'}</td></tr>
              <tr><td>Soil Result:</td><td>${submissionData.soilResult === 'pass' ? 'PASS' : 'FAIL'}</td></tr>
              <tr><td>Hazard Control Method:</td><td>${submissionData.hazardControlMethod}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Hazard Findings Category</h2>
            <table>
              <tr><td>Lead-Based Paint Identified:</td><td>${submissionData.leadBasedPaintIdentified ? 'Yes' : 'No'}</td></tr>
              <tr><td>Dust Lead Hazards Identified:</td><td>${submissionData.dustLeadHazardsIdentified ? 'Yes' : 'No'}</td></tr>
              <tr><td>Soil Lead Hazards Identified:</td><td>${submissionData.soilLeadHazardsIdentified ? 'Yes' : 'No'}</td></tr>
              <tr><td>Paint Hazard (Deteriorated LBP):</td><td>${submissionData.paintHazardDeterioration ? 'Yes' : 'No'}</td></tr>
              <tr><td>Friction/Impact Surface Hazards:</td><td>${submissionData.frictionImpactSurfaceHazards ? 'Yes' : 'No'}</td></tr>
              <tr><td>No Lead-Based Paint Hazards Identified:</td><td>${submissionData.noLeadHazardsIdentified ? 'Yes' : 'No'}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Abatement/Interim Controls</h2>
            <table>
              <tr><td>Abatement Order Issued:</td><td>${submissionData.abatementOrderIssued === 'yes' ? 'Yes' : 'No'}</td></tr>
              ${submissionData.abatementOrderIssued === 'yes' ? `
              <tr><td>Order Date:</td><td>${submissionData.orderDate || 'N/A'}</td></tr>
              <tr><td>Compliance Deadline:</td><td>${submissionData.complianceDeadline || 'N/A'}</td></tr>
              ` : ''}
              <tr><td>Interim Controls Required:</td><td>${submissionData.interimControlsRequired === 'yes' ? 'Yes' : 'No'}</td></tr>
              <tr><td>Planned Actions:</td><td>${submissionData.plannedActions || 'N/A'}</td></tr>
              <tr><td>Expected Completion:</td><td>${submissionData.expectedCompletionDate || 'N/A'}</td></tr>
              <tr><td>Contractor Name:</td><td>${submissionData.contractorName || 'N/A'}</td></tr>
              <tr><td>Contractor Phone:</td><td>${submissionData.contractorPhone || 'N/A'}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Occupant Notification</h2>
            <table>
              <tr><td>Occupant Notified of Findings:</td><td>${submissionData.occupantNotified === 'yes' ? 'Yes' : 'No'}</td></tr>
              ${submissionData.occupantNotified === 'yes' ? `
              <tr><td>Notification Date:</td><td>${submissionData.notificationDate || 'N/A'}</td></tr>
              <tr><td>Notification Method:</td><td>${
                submissionData.notificationMethod === 'in-person' ? 'In Person' :
                submissionData.notificationMethod === 'mail' ? 'Mail' :
                'Posted Notice'
              }</td></tr>
              ` : ''}
            </table>
          </div>

          <p style="margin-top: 30px; font-size: 12px; color: #999;">
            Generated on ${new Date().toLocaleString()} | LeadFlow AI v1.0
          </p>
        </body>
      </html>
    `;

    const newWindow = window.open();
    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };

  // Submission history (mock data for demo)
  const submissionHistory = [
    confirmationData ? {
      confirmationNumber: confirmationData.confirmationNumber,
      date: new Date(confirmationData.submittedAt).toLocaleDateString(),
      status: confirmationData.status,
      address: submissionData.propertyAddress
    } : null
  ].filter(Boolean);

  const renderFieldInput = (field, label, type = 'text', isRequired = false, options = null) => {
    const isAutoFilled = autoFilledFields[field];
    const bgClass = isAutoFilled ? 'bg-blue-100' : 'bg-white';

    return (
      <div key={field} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {isRequired && <span className="text-red-500">*</span>}
          {isAutoFilled && <span className="text-xs text-blue-600 ml-2">(auto-filled)</span>}
        </label>
        {options ? (
          <select
            value={submissionData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${bgClass}`}
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={submissionData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${bgClass}`}
            rows="3"
          />
        ) : (
          <input
            type={type}
            value={submissionData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${bgClass}`}
          />
        )}
      </div>
    );
  };

  const renderCheckbox = (field, label) => {
    return (
      <div key={field} className="flex items-center mb-3">
        <input
          type="checkbox"
          id={field}
          checked={submissionData[field]}
          onChange={(e) => handleInputChange(field, e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded cursor-pointer"
        />
        <label htmlFor={field} className="ml-2 text-sm text-gray-700 cursor-pointer">
          {label}
        </label>
      </div>
    );
  };

  const renderYesNoField = (field, label, isRequired = false) => {
    return (
      <div key={field} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        <div className="flex gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name={field}
              value="yes"
              checked={submissionData[field] === 'yes'}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className="h-4 w-4 text-blue-600 border-gray-300 cursor-pointer"
            />
            <span className="ml-2 text-sm text-gray-700">Yes</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name={field}
              value="no"
              checked={submissionData[field] === 'no'}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className="h-4 w-4 text-blue-600 border-gray-300 cursor-pointer"
            />
            <span className="ml-2 text-sm text-gray-700">No</span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Form Reference Banner */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Michigan Lead Information Registry</strong> — Per Michigan Lead Abatement Act (Act 219 of 1986) | LIRA-EBL Form 633775 V.3
        </p>
      </div>

      {/* Important Notice Banner */}
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
        <div className="flex items-start">
          <div className="text-yellow-600 mr-3 text-xl">!</div>
          <div>
            <h3 className="font-semibold text-yellow-900">Michigan Lead Registry Integration</h3>
            <p className="text-yellow-800 text-sm mt-1">
              This module prepares your submission data. When the Michigan DHHS API becomes available, submissions will be sent automatically. Currently operating in preview mode.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-2xl font-bold text-red-900">{positiveXrfCount}</div>
          <div className="text-sm text-red-700">Positive XRF Readings</div>
        </div>
        <div className={`p-4 rounded-lg border-2 ${dustWipePass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`text-lg font-bold ${dustWipePass ? 'text-green-900' : 'text-red-900'}`}>
            {dustWipePass ? 'PASS' : 'FAIL'}
          </div>
          <div className={`text-sm ${dustWipePass ? 'text-green-700' : 'text-red-700'}`}>Dust Wipe vs EPA</div>
        </div>
        <div className={`p-4 rounded-lg border-2 ${soilPass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`text-lg font-bold ${soilPass ? 'text-green-900' : 'text-red-900'}`}>
            {soilPass ? 'PASS' : 'FAIL'}
          </div>
          <div className={`text-sm ${soilPass ? 'text-green-700' : 'text-red-700'}`}>Soil vs EPA</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-900">{state.dustWipeSamples?.length || 0}</div>
          <div className="text-sm text-blue-700">Total Samples</div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <h4 className="font-semibold text-red-900 mb-2">Validation Errors:</h4>
          <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
            {validationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Confirmation Message */}
      {confirmationData && (
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">Submission Successful!</h4>
          <p className="text-green-800 mb-2">
            <strong>Confirmation Number:</strong> {confirmationData.confirmationNumber}
          </p>
          <p className="text-green-800 mb-2">
            <strong>Status:</strong> <span className="bg-yellow-200 px-2 py-1 rounded text-yellow-900">Pending Review</span>
          </p>
          <p className="text-green-700 text-sm">
            Submitted at {new Date(confirmationData.submittedAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* Loading Spinner */}
      {isSubmitting && (
        <div className="flex items-center justify-center py-8">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-900 rounded-full animate-spin"></div>
            <div className="absolute inset-1 bg-white rounded-full"></div>
          </div>
          <span className="ml-4 text-blue-900 font-medium">Submitting to Michigan Registry...</span>
        </div>
      )}

      {/* Submission Form */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        {/* Property Information Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-200">
            Property Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderFieldInput('propertyAddress', 'Street Address', 'text', true)}
            {renderFieldInput('city', 'City', 'text', true)}
            {renderFieldInput('county', 'County', 'text', true)}
            {renderFieldInput('zip', 'ZIP Code', 'text', true)}
            {renderFieldInput('parcelId', 'Parcel ID', 'text', false)}
            {renderFieldInput('dwellingType', 'Dwelling Type', 'text', true, [
              { value: 'single-family', label: 'Single-Family' },
              { value: 'multi-family', label: 'Multi-Family' },
              { value: 'childcare', label: 'Childcare Facility' }
            ])}
            {renderFieldInput('yearBuilt', 'Year Built', 'number', true)}
            {renderFieldInput('numberOfUnits', 'Number of Units', 'number', false)}
          </div>
        </div>

        {/* Multi-Unit Enhancement */}
        {parseInt(submissionData.numberOfUnits) > 1 && (
          <div className="mb-8 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <h3 className="text-base font-semibold text-blue-900 mb-4">Multi-Unit Property Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded border border-blue-200">
                <div className="text-sm text-gray-600">Total Units</div>
                <div className="text-2xl font-bold text-blue-900">{submissionData.numberOfUnits}</div>
              </div>
              <div className="bg-white p-3 rounded border border-blue-200">
                <div className="text-sm text-gray-600">Positive XRF Readings</div>
                <div className="text-2xl font-bold text-red-900">{positiveXrfCount}</div>
              </div>
              <div className="bg-white p-3 rounded border border-blue-200">
                <div className="text-sm text-gray-600">Per-Unit Average</div>
                <div className="text-2xl font-bold text-orange-900">
                  {(positiveXrfCount / parseInt(submissionData.numberOfUnits)).toFixed(1)}
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white rounded border border-blue-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Common Area Findings:</span> Inspections conducted across {submissionData.numberOfUnits} unit(s) with shared common areas evaluated for lead hazards.
              </p>
            </div>
          </div>
        )}

        {/* Inspection Information Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-200">
            Inspection Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderFieldInput('inspectionDate', 'Inspection Date', 'date', true)}
            {renderFieldInput('reportDate', 'Report Date', 'date', true)}
            {renderFieldInput('inspectionType', 'Inspection Type', 'text', true, [
              { value: 'LIRA', label: 'LIRA (Lead Inspection/Risk Assessment)' },
              { value: 'EBL', label: 'EBL (Elevated Blood Lead)' },
              { value: 'Clearance', label: 'Clearance' }
            ])}
            {renderFieldInput('programFundingSource', 'Program Funding Source', 'text', true, [
              { value: 'HUD', label: 'HUD' },
              { value: 'Medicaid', label: 'Medicaid' },
              { value: 'Private', label: 'Private' },
              { value: 'EBL', label: 'EBL' },
              { value: 'Other', label: 'Other' }
            ])}
          </div>
        </div>

        {/* Inspector Information Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-200">
            Inspector Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderFieldInput('inspectorName', 'Inspector Name', 'text', true)}
            {renderFieldInput('inspectorCompany', 'Company Name', 'text', true)}
            {renderFieldInput('michiganCertNumber', 'Michigan Certification #', 'text', true)}
            {renderFieldInput('epaCertNumber', 'EPA Certification #', 'text', false)}
          </div>

          {/* Firm Information */}
          <div className="mt-6 pt-6 border-t-2 border-blue-100">
            <h4 className="text-base font-semibold text-blue-800 mb-4">Firm Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFieldInput('firmName', 'Firm Name', 'text', true)}
              {renderFieldInput('firmLicenseNumber', 'Firm License Number', 'text', true)}
            </div>
          </div>
        </div>

        {/* Child Information Section (for EBL) */}
        {submissionData.inspectionType === 'EBL' && (
          <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-200">
              Child Information (EBL)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFieldInput('childName', 'Child Name', 'text', true)}
              {renderFieldInput('childDOB', 'Date of Birth', 'date', true)}
              {renderFieldInput('bloodLeadLevel', 'Blood Lead Level (µg/dL)', 'number', true)}
              {renderFieldInput('caseNumber', 'Case Number', 'text', true)}
            </div>
          </div>
        )}

        {/* Results Summary Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-200">
            Results Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lead-Based Paint Surfaces Found <span className="text-xs text-blue-600">(auto-calculated)</span>
              </label>
              <input
                type="number"
                value={submissionData.leadPaintSurfacesFound}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-blue-100 cursor-not-allowed"
              />
            </div>
            {renderFieldInput('dustWipeResult', 'Dust Wipe Result', 'text', true, [
              { value: 'pass', label: 'PASS (< 10 µg/ft²)' },
              { value: 'fail', label: 'FAIL (≥ 10 µg/ft²)' }
            ])}
            {renderFieldInput('soilResult', 'Soil Result', 'text', true, [
              { value: 'pass', label: 'PASS (< 400 mg/kg)' },
              { value: 'fail', label: 'FAIL (≥ 400 mg/kg)' }
            ])}
            {renderFieldInput('hazardControlMethod', 'Hazard Control Method', 'text', true)}
          </div>
        </div>

        {/* Hazard Findings Category Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-200">
            Hazard Findings Category <span className="text-red-500">*</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">Select all hazard types identified during inspection:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              {renderCheckbox('leadBasedPaintIdentified', 'Lead-based paint identified')}
              {renderCheckbox('dustLeadHazardsIdentified', 'Dust lead hazards identified')}
              {renderCheckbox('soilLeadHazardsIdentified', 'Soil lead hazards identified')}
            </div>
            <div>
              {renderCheckbox('paintHazardDeterioration', 'Paint hazard (deteriorated LBP)')}
              {renderCheckbox('frictionImpactSurfaceHazards', 'Friction/impact surface hazards')}
              {renderCheckbox('noLeadHazardsIdentified', 'No lead-based paint hazards identified')}
            </div>
          </div>
        </div>

        {/* Abatement Order Status */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-200">
            Abatement Order Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {renderYesNoField('abatementOrderIssued', 'Abatement Order Issued')}
          </div>
          {submissionData.abatementOrderIssued === 'yes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-blue-50 p-4 rounded-lg">
              {renderFieldInput('orderDate', 'Order Date', 'date', true)}
              {renderFieldInput('complianceDeadline', 'Compliance Deadline', 'date', true)}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderYesNoField('interimControlsRequired', 'Interim Controls Required')}
          </div>
        </div>

        {/* Abatement/Interim Controls Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-200">
            Abatement/Interim Controls Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderFieldInput('plannedActions', 'Planned Actions', 'textarea', false)}
            {renderFieldInput('expectedCompletionDate', 'Expected Completion Date', 'date', false)}
            {renderFieldInput('contractorName', 'Contractor Name', 'text', false)}
            {renderFieldInput('contractorPhone', 'Contractor Phone', 'tel', false)}
          </div>
        </div>

        {/* Occupant Notification Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-200">
            Occupant Notification <span className="text-red-500">*</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {renderYesNoField('occupantNotified', 'Occupant Notified of Findings', true)}
          </div>
          {submissionData.occupantNotified === 'yes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
              {renderFieldInput('notificationDate', 'Notification Date', 'date', true)}
              {renderFieldInput('notificationMethod', 'Notification Method', 'text', true, [
                { value: 'in-person', label: 'In Person' },
                { value: 'mail', label: 'Mail' },
                { value: 'posted-notice', label: 'Posted Notice' }
              ])}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={validateSubmission}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition border border-blue-700"
        >
          Validate Submission
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition border border-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit to Registry'}
        </button>
        <button
          onClick={handleDownloadPDF}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition border border-purple-700"
        >
          Download Submission PDF
        </button>
      </div>

      {/* Submission History */}
      {submissionHistory.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-200">
            Submission History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50">
                <tr className="border-b border-gray-300">
                  <th className="text-left px-4 py-2 font-semibold text-blue-900">Confirmation #</th>
                  <th className="text-left px-4 py-2 font-semibold text-blue-900">Date</th>
                  <th className="text-left px-4 py-2 font-semibold text-blue-900">Status</th>
                  <th className="text-left px-4 py-2 font-semibold text-blue-900">Property Address</th>
                </tr>
              </thead>
              <tbody>
                {submissionHistory.map((submission, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-600">{submission.confirmationNumber}</td>
                    <td className="px-4 py-3">{submission.date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded text-white text-xs font-semibold ${
                        submission.status === 'pending_review' ? 'bg-yellow-500' :
                        submission.status === 'accepted' ? 'bg-green-500' :
                        'bg-red-500'
                      }`}>
                        {submission.status === 'pending_review' ? 'Pending' :
                         submission.status === 'accepted' ? 'Accepted' :
                         'Rejected'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{submission.address}</td>
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

export default MichiganRegistryPanel;
