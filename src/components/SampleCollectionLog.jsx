import React, { useState } from 'react';

function SampleCollectionLog({ state, dispatch }) {
  const [entry, setEntry] = useState({
    sampleId: '',
    type: 'Dust Wipe',
    room: '',
    surface: '',
    areaType: 'Floor',
    collectionTime: new Date().toISOString().slice(0, 16),
    collectorName: state.projectInfo.inspectorName || '',
    collectorLicense: '',
    collectorFirm: '',
    wipeAreaCm2: 40,
    wipeAreaStandard: true,
    wipeAreaNonStandardReason: '',
    collectionMethod: 'Wet Wipe (standard)',
    sampleCondition: 'Good',
    storageCondition: 'Room Temperature',
    cocNumber: '',
    dateShippedToLab: '',
    shippingMethod: 'Hand delivered',
    custodySealIntact: true,
    personReceivingAtLab: '',
    labName: '',
    labAccreditationNumber: '',
    labAddress: '',
    notes: ''
  });

  // Get area type options based on sample type
  const getAreaTypeOptions = () => {
    if (entry.type === 'Dust Wipe') {
      return ['Floor', 'Window Sill', 'Window Trough', 'Porch'];
    } else if (entry.type === 'Soil Sample') {
      return ['Play Area', 'Dripline', 'Rest of Yard'];
    }
    return [];
  };

  const handleAddSample = () => {
    if (!entry.sampleId || !entry.room || !entry.surface) {
      alert('Please fill in Sample ID, Room/Location, and Surface/Description');
      return;
    }
    if (!entry.labName || !entry.labAccreditationNumber || !entry.labAddress) {
      alert('Please fill in all required Lab Information fields (Lab Name, Accreditation Number, and Address)');
      return;
    }

    const payload = {
      id: 'sl_' + Date.now(),
      sampleId: entry.sampleId,
      type: entry.type,
      room: entry.room,
      surface: entry.surface,
      areaType: entry.areaType || null,
      collectionTime: entry.collectionTime,
      collectorName: entry.collectorName,
      collectorLicense: entry.collectorLicense || null,
      collectorFirm: entry.collectorFirm || null,
      wipeAreaCm2: entry.type === 'Dust Wipe' ? (entry.wipeAreaStandard ? 40 : parseFloat(entry.wipeAreaCm2)) : null,
      wipeAreaStandard: entry.type === 'Dust Wipe' ? entry.wipeAreaStandard : null,
      wipeAreaNonStandardReason: entry.type === 'Dust Wipe' && !entry.wipeAreaStandard ? entry.wipeAreaNonStandardReason : null,
      collectionMethod: entry.type === 'Dust Wipe' ? entry.collectionMethod : null,
      sampleCondition: entry.sampleCondition || null,
      storageCondition: entry.storageCondition || null,
      cocNumber: entry.cocNumber || null,
      dateShippedToLab: entry.dateShippedToLab || null,
      shippingMethod: entry.shippingMethod || null,
      custodySealIntact: entry.custodySealIntact,
      personReceivingAtLab: entry.personReceivingAtLab || null,
      labName: entry.labName,
      labAccreditationNumber: entry.labAccreditationNumber,
      labAddress: entry.labAddress,
      notes: entry.notes || null
    };

    dispatch({
      type: 'ADD_SAMPLE_LOG',
      payload
    });

    // Reset form
    setEntry({
      sampleId: '',
      type: 'Dust Wipe',
      room: '',
      surface: '',
      areaType: 'Floor',
      collectionTime: new Date().toISOString().slice(0, 16),
      collectorName: state.projectInfo.inspectorName || '',
      collectorLicense: '',
      collectorFirm: '',
      wipeAreaCm2: 40,
      wipeAreaStandard: true,
      wipeAreaNonStandardReason: '',
      collectionMethod: 'Wet Wipe (standard)',
      sampleCondition: 'Good',
      storageCondition: 'Room Temperature',
      cocNumber: '',
      dateShippedToLab: '',
      shippingMethod: 'Hand delivered',
      custodySealIntact: true,
      personReceivingAtLab: '',
      labName: '',
      labAccreditationNumber: '',
      labAddress: '',
      notes: ''
    });
  };

  const handleDeleteSample = (id) => {
    dispatch({
      type: 'DELETE_SAMPLE_LOG',
      payload: id
    });
  };

  // Format date for display
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

  // Sort samples by collection time (newest first)
  const sortedSamples = [...state.sampleLog].sort((a, b) => {
    return new Date(b.collectionTime) - new Date(a.collectionTime);
  });

  const purpleAccent = '#553c9a';

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Section Header */}
      <div
        style={{
          backgroundColor: purpleAccent,
          color: 'white',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
          Sample Collection Log
          {state.sampleLog.length > 0 && (
            <span
              style={{
                marginLeft: '0.75rem',
                display: 'inline-block',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '9999px',
                padding: '0.25rem 0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {state.sampleLog.length}
            </span>
          )}
        </h3>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
          Track when and where samples were collected for chain of custody documentation
        </p>
      </div>

      {/* Entry Form */}
      <div style={{ backgroundColor: '#f9f5ff', padding: '1.5rem', borderRadius: '0.5rem', border: `1px solid ${purpleAccent}30`, marginBottom: '1.5rem' }}>
        <h4 style={{ marginTop: 0, marginBottom: '1.25rem', fontWeight: '600' }}>Log New Sample</h4>

        {/* Basic Sample Information */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Sample ID */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Sample ID <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., DW-001, SS-001"
              value={entry.sampleId}
              onChange={(e) => setEntry({ ...entry, sampleId: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Sample Type */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Sample Type <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={entry.type}
              onChange={(e) => {
                const newType = e.target.value;
                const newAreaType = newType === 'Dust Wipe' ? 'Floor' : newType === 'Soil Sample' ? 'Play Area' : '';
                setEntry({ ...entry, type: newType, areaType: newAreaType });
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            >
              <option>Dust Wipe</option>
              <option>Soil Sample</option>
              <option>Paint Chip</option>
            </select>
          </div>

          {/* Room/Location */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Room/Location <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Living Room, Kitchen"
              value={entry.room}
              onChange={(e) => setEntry({ ...entry, room: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Surface/Description */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Surface/Description <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Living room floor, Front yard"
              value={entry.surface}
              onChange={(e) => setEntry({ ...entry, surface: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Area Type (conditional) */}
          {(entry.type === 'Dust Wipe' || entry.type === 'Soil Sample') && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Area Type <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={entry.areaType}
                onChange={(e) => setEntry({ ...entry, areaType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              >
                {getAreaTypeOptions().map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          )}

          {/* Collection Date/Time */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Collection Date/Time <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={entry.collectionTime}
              onChange={(e) => setEntry({ ...entry, collectionTime: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Lab Information Section (Required) */}
        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '0.375rem', padding: '1rem', marginBottom: '1.5rem' }}>
          <h5 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: '#92400e' }}>
            Lab Information <span style={{ color: 'red' }}>*</span> (Required)
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Lab Name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., ABC Testing Lab"
                value={entry.labName}
                onChange={(e) => setEntry({ ...entry, labName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                NLLAP Accreditation # <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., NLLAP-12345"
                value={entry.labAccreditationNumber}
                onChange={(e) => setEntry({ ...entry, labAccreditationNumber: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Lab Address <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Street address"
                value={entry.labAddress}
                onChange={(e) => setEntry({ ...entry, labAddress: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Collector Credentials */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Collector Name */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Collector Name
            </label>
            <input
              type="text"
              placeholder="Inspector name"
              value={entry.collectorName}
              onChange={(e) => setEntry({ ...entry, collectorName: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Collector License/Certification */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Collector License/Certification #
            </label>
            <input
              type="text"
              placeholder="License number"
              value={entry.collectorLicense}
              onChange={(e) => setEntry({ ...entry, collectorLicense: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Collector Firm */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Collector Firm Name
            </label>
            <input
              type="text"
              placeholder="Firm/Company name"
              value={entry.collectorFirm}
              onChange={(e) => setEntry({ ...entry, collectorFirm: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Collection Method (Dust Wipe Only) */}
        {entry.type === 'Dust Wipe' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h5 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600' }}>
              Collection Method & Area
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {/* Collection Method */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Collection Method
                </label>
                <select
                  value={entry.collectionMethod}
                  onChange={(e) => setEntry({ ...entry, collectionMethod: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                >
                  <option>Wet Wipe (standard)</option>
                  <option>Dry Wipe</option>
                  <option>Vacuum</option>
                </select>
              </div>
            </div>

            {/* Wipe Area Selection */}
            <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
              <p style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '500' }}>Wipe Area</p>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <input
                    type="radio"
                    name="wipeArea"
                    checked={entry.wipeAreaStandard}
                    onChange={() => setEntry({ ...entry, wipeAreaStandard: true, wipeAreaCm2: 40 })}
                    style={{ cursor: 'pointer' }}
                  />
                  Standard 40 cm²
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <input
                    type="radio"
                    name="wipeArea"
                    checked={!entry.wipeAreaStandard}
                    onChange={() => setEntry({ ...entry, wipeAreaStandard: false })}
                    style={{ cursor: 'pointer' }}
                  />
                  Non-standard area
                </label>
              </div>
            </div>

            {/* Non-standard area fields */}
            {!entry.wipeAreaStandard && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Wipe Area (cm²)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter area"
                    value={entry.wipeAreaCm2}
                    onChange={(e) => setEntry({ ...entry, wipeAreaCm2: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Reason for Non-standard Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Limited accessible surface"
                    value={entry.wipeAreaNonStandardReason}
                    onChange={(e) => setEntry({ ...entry, wipeAreaNonStandardReason: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sample Condition */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Sample Condition at Collection
            </label>
            <select
              value={entry.sampleCondition}
              onChange={(e) => setEntry({ ...entry, sampleCondition: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            >
              <option>Good</option>
              <option>Compromised</option>
              <option>Contaminated</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Storage Condition
            </label>
            <select
              value={entry.storageCondition}
              onChange={(e) => setEntry({ ...entry, storageCondition: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            >
              <option>Room Temperature</option>
              <option>Refrigerated</option>
              <option>Frozen</option>
            </select>
          </div>
        </div>

        {/* Chain of Custody Transfer */}
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #86efac', borderRadius: '0.375rem', padding: '1rem', marginBottom: '1.5rem' }}>
          <h5 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: '#166534' }}>
            Chain of Custody Transfer
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {/* Chain of Custody Number */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Chain of Custody #
              </label>
              <input
                type="text"
                placeholder="CoC number"
                value={entry.cocNumber}
                onChange={(e) => setEntry({ ...entry, cocNumber: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Date Shipped */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Date Shipped to Lab
              </label>
              <input
                type="date"
                value={entry.dateShippedToLab}
                onChange={(e) => setEntry({ ...entry, dateShippedToLab: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Shipping Method */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Shipping Method
              </label>
              <select
                value={entry.shippingMethod}
                onChange={(e) => setEntry({ ...entry, shippingMethod: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              >
                <option>Hand delivered</option>
                <option>USPS</option>
                <option>FedEx</option>
                <option>UPS</option>
                <option>Courier</option>
              </select>
            </div>

            {/* Person Receiving at Lab */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Person Receiving at Lab
              </label>
              <input
                type="text"
                placeholder="Name of recipient"
                value={entry.personReceivingAtLab}
                onChange={(e) => setEntry({ ...entry, personReceivingAtLab: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Custody Seal Intact */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input
              type="checkbox"
              checked={entry.custodySealIntact}
              onChange={(e) => setEntry({ ...entry, custodySealIntact: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            Custody seal intact upon receipt at lab
          </label>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
            Notes
          </label>
          <textarea
            placeholder="Additional observations, conditions, etc."
            value={entry.notes}
            onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
            rows="3"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Log Sample Button */}
        <button
          onClick={handleAddSample}
          style={{
            backgroundColor: purpleAccent,
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = '#452a7a')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = purpleAccent)}
        >
          Log Sample
        </button>
      </div>

      {/* Sample Log Table */}
      {sortedSamples.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
              backgroundColor: 'white'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: `2px solid ${purpleAccent}` }}>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
                  Sample ID
                </th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
                  Type
                </th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
                  Room
                </th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
                  Date/Time
                </th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
                  Collector
                </th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
                  Lab Name
                </th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
                  Condition
                </th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
                  Shipped
                </th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSamples.map((sample) => (
                <tr key={sample.id} style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.75rem' }}>
                    <span style={{ fontWeight: '500', color: purpleAccent }}>
                      {sample.sampleId}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.75rem' }}>
                    {sample.type}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.75rem' }}>
                    {sample.room}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.75rem', fontSize: '0.8rem' }}>
                    {formatDateTime(sample.collectionTime)}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.75rem' }}>
                    {sample.collectorName || '-'}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.75rem', fontSize: '0.8rem' }}>
                    {sample.labName || '-'}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.75rem', fontSize: '0.8rem' }}>
                    <span style={{
                      backgroundColor: sample.sampleCondition === 'Good' ? '#d1fae5' : sample.sampleCondition === 'Compromised' ? '#fed7aa' : '#fecaca',
                      color: sample.sampleCondition === 'Good' ? '#065f46' : sample.sampleCondition === 'Compromised' ? '#92400e' : '#7f1d1d',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      display: 'inline-block'
                    }}>
                      {sample.sampleCondition || '-'}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.75rem', fontSize: '0.8rem' }}>
                    {sample.dateShippedToLab ? new Date(sample.dateShippedToLab).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDeleteSample(sample.id)}
                      style={{
                        color: '#dc2626',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'color 0.2s',
                        fontSize: '0.8rem'
                      }}
                      onMouseEnter={(e) => (e.target.style.color = '#991b1b')}
                      onMouseLeave={(e) => (e.target.style.color = '#dc2626')}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {sortedSamples.length === 0 && (
        <div
          style={{
            backgroundColor: '#f3f4f6',
            border: `2px dashed ${purpleAccent}30`,
            borderRadius: '0.5rem',
            padding: '2rem',
            textAlign: 'center',
            color: '#6b7280'
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            No samples logged yet. Use the form above to add your first sample.
          </p>
        </div>
      )}
    </div>
  );
}

export default SampleCollectionLog;
