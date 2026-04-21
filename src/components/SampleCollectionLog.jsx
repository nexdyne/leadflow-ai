import React, { useState } from 'react';

// ============================================================================
// SAMPLE COLLECTION LOG
// Compliance basis:
//   - HUD Guidelines for the Evaluation and Control of Lead-Based Paint Hazards
//     in Housing (2012 revision), Chapter 7 — Lead-Based Paint Inspection
//   - ASTM E1728: Standard Practice for Collection of Settled Dust Samples
//     Using Wipe Sampling Methods (default wipe area = 1 ft² / 929 cm²)
//   - ASTM E1729: Standard Practice for Field Collection of Dried Paint Samples
//     by Abrasive Means (mass, substrate, painted area captured)
//   - 40 CFR 745.227(b)(4) / §745.227(h): report contents + 3-yr retention
//   - Michigan R 325.99207: required elements of a lead hazard report
//   - MIOSHA Part 603 / 29 CFR 1926.62(d): collector identification
// ============================================================================

function SampleCollectionLog({ state, dispatch }) {
  const [entry, setEntry] = useState({
    sampleId: '',
    sampleCategory: 'Field Sample',       // Field Sample | Field Blank | Field Duplicate
    parentSampleId: '',                   // for Field Duplicate: link to parent
    type: 'Dust Wipe',
    room: '',
    surface: '',
    areaType: 'Floor',
    collectionTime: new Date().toISOString().slice(0, 16),
    collectorName: state.projectInfo.inspectorName || '',
    collectorLicense: '',
    collectorFirm: '',
    // Dust wipe — default to HUD/ASTM E1728 standard of 1 ft² (929 cm²)
    wipeAreaCm2: 929,
    wipeAreaStandard: true,
    wipeAreaNonStandardReason: '',
    collectionMethod: 'Wet Wipe (standard)',
    // Paint chip fields — ASTM E1729
    paintChipMassG: '',
    paintChipSubstrate: 'Wood',
    paintChipPaintedAreaCm2: '',
    paintChipLayerDepth: 'Intact paint only (no substrate)',
    sampleCondition: 'Good',
    storageCondition: 'Room Temperature',
    cocNumber: '',
    dateShippedToLab: '',
    shippingMethod: 'Hand delivered',
    custodySealIntact: true,
    // Chain-of-custody dual signatures (40 CFR 745.227(h))
    relinquishedByName: '',
    relinquishedByDateTime: '',
    receivedByName: '',
    receivedByDateTime: '',
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

  // Parent sample candidates for duplicate linkage — other field samples of same type
  const parentSampleCandidates = (state.sampleLog || []).filter(
    s => s.sampleCategory === 'Field Sample' && s.type === entry.type
  );

  // QC guidance thresholds (HUD Ch 7 App 13.1 / ASTM E1728 §11)
  const fieldSampleCount = (state.sampleLog || []).filter(s => s.sampleCategory === 'Field Sample').length;
  const fieldBlankCount = (state.sampleLog || []).filter(s => s.sampleCategory === 'Field Blank').length;
  const fieldDuplicateCount = (state.sampleLog || []).filter(s => s.sampleCategory === 'Field Duplicate').length;
  const recommendedBlanks = Math.max(1, Math.ceil(fieldSampleCount / 20));
  const recommendedDuplicates = Math.max(1, Math.ceil(fieldSampleCount / 10));
  const blankShortage = fieldSampleCount > 0 && fieldBlankCount < recommendedBlanks;
  const duplicateShortage = fieldSampleCount >= 10 && fieldDuplicateCount < recommendedDuplicates;

  const handleAddSample = () => {
    if (!entry.sampleId) {
      alert('Please fill in Sample ID');
      return;
    }
    if (entry.sampleCategory === 'Field Sample' && (!entry.room || !entry.surface)) {
      alert('Please fill in Room/Location and Surface/Description for field samples');
      return;
    }
    if (entry.sampleCategory === 'Field Duplicate' && !entry.parentSampleId) {
      alert('Field Duplicate samples must be linked to a parent Field Sample (ASTM E1728 §11).');
      return;
    }
    if (!entry.labName || !entry.labAccreditationNumber || !entry.labAddress) {
      alert('Please fill in all required Lab Information fields (Lab Name, Accreditation Number, and Address)');
      return;
    }
    // Paint Chip validation — ASTM E1729 requires mass and substrate
    if (entry.sampleCategory === 'Field Sample' && entry.type === 'Paint Chip') {
      if (!entry.paintChipMassG) {
        alert('Paint chip samples must report mass in grams (ASTM E1729 §8).');
        return;
      }
      if (!entry.paintChipPaintedAreaCm2) {
        alert('Paint chip samples must report painted area in cm² for mg/cm² calculation (HUD Ch 7).');
        return;
      }
    }

    const isBlank = entry.sampleCategory === 'Field Blank';
    const isDuplicate = entry.sampleCategory === 'Field Duplicate';

    const payload = {
      id: 'sl_' + Date.now(),
      sampleId: entry.sampleId,
      sampleCategory: entry.sampleCategory,
      parentSampleId: isDuplicate ? entry.parentSampleId : null,
      type: entry.type,
      room: isBlank ? 'N/A (Field Blank)' : entry.room,
      surface: isBlank ? 'Unopened wipe media — blank QC' : entry.surface,
      areaType: (entry.type === 'Dust Wipe' || entry.type === 'Soil Sample') && !isBlank ? entry.areaType : null,
      collectionTime: entry.collectionTime,
      collectorName: entry.collectorName,
      collectorLicense: entry.collectorLicense || null,
      collectorFirm: entry.collectorFirm || null,
      wipeAreaCm2: entry.type === 'Dust Wipe' && !isBlank
        ? (entry.wipeAreaStandard ? 929 : parseFloat(entry.wipeAreaCm2))
        : null,
      wipeAreaStandard: entry.type === 'Dust Wipe' && !isBlank ? entry.wipeAreaStandard : null,
      wipeAreaNonStandardReason:
        entry.type === 'Dust Wipe' && !entry.wipeAreaStandard && !isBlank
          ? entry.wipeAreaNonStandardReason
          : null,
      collectionMethod: entry.type === 'Dust Wipe' && !isBlank ? entry.collectionMethod : null,
      // Paint chip specifics — ASTM E1729
      paintChipMassG: entry.type === 'Paint Chip' && !isBlank ? parseFloat(entry.paintChipMassG) || null : null,
      paintChipSubstrate: entry.type === 'Paint Chip' && !isBlank ? entry.paintChipSubstrate : null,
      paintChipPaintedAreaCm2: entry.type === 'Paint Chip' && !isBlank
        ? parseFloat(entry.paintChipPaintedAreaCm2) || null
        : null,
      paintChipLayerDepth: entry.type === 'Paint Chip' && !isBlank ? entry.paintChipLayerDepth : null,
      sampleCondition: entry.sampleCondition || null,
      storageCondition: entry.storageCondition || null,
      cocNumber: entry.cocNumber || null,
      dateShippedToLab: entry.dateShippedToLab || null,
      shippingMethod: entry.shippingMethod || null,
      custodySealIntact: entry.custodySealIntact,
      // Dual-signature CoC transfer (40 CFR 745.227(h))
      relinquishedByName: entry.relinquishedByName || null,
      relinquishedByDateTime: entry.relinquishedByDateTime || null,
      receivedByName: entry.receivedByName || null,
      receivedByDateTime: entry.receivedByDateTime || null,
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
      sampleCategory: 'Field Sample',
      parentSampleId: '',
      type: 'Dust Wipe',
      room: '',
      surface: '',
      areaType: 'Floor',
      collectionTime: new Date().toISOString().slice(0, 16),
      collectorName: state.projectInfo.inspectorName || '',
      collectorLicense: '',
      collectorFirm: '',
      wipeAreaCm2: 929,
      wipeAreaStandard: true,
      wipeAreaNonStandardReason: '',
      collectionMethod: 'Wet Wipe (standard)',
      paintChipMassG: '',
      paintChipSubstrate: 'Wood',
      paintChipPaintedAreaCm2: '',
      paintChipLayerDepth: 'Intact paint only (no substrate)',
      sampleCondition: 'Good',
      storageCondition: 'Room Temperature',
      cocNumber: '',
      dateShippedToLab: '',
      shippingMethod: 'Hand delivered',
      custodySealIntact: true,
      relinquishedByName: '',
      relinquishedByDateTime: '',
      receivedByName: '',
      receivedByDateTime: '',
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
  const sortedSamples = [...(state.sampleLog || [])].sort((a, b) => {
    return new Date(b.collectionTime) - new Date(a.collectionTime);
  });

  const purpleAccent = '#553c9a';

  const fieldStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    boxSizing: 'border-box'
  };
  const labelStyle = { display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' };

  const isBlankEntry = entry.sampleCategory === 'Field Blank';
  const isDuplicateEntry = entry.sampleCategory === 'Field Duplicate';

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
          {(state.sampleLog || []).length > 0 && (
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
              {(state.sampleLog || []).length}
            </span>
          )}
        </h3>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
          Chain-of-custody log per 40 CFR 745.227(h), HUD Ch. 7, ASTM E1728/E1729, and Michigan R 325.99207.
        </p>
      </div>

      {/* QC guidance banner — HUD Ch 7 App 13.1 / ASTM E1728 §11 */}
      {(blankShortage || duplicateShortage) && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderLeft: '5px solid #d97706',
          borderRadius: '0.375rem',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          color: '#92400e'
        }}>
          <strong>QC Reminder (ASTM E1728 §11 / HUD Ch 7 App 13.1):</strong>{' '}
          {blankShortage && (
            <>You have {fieldSampleCount} field sample(s) but only {fieldBlankCount} blank(s). HUD/ASTM recommends at least {recommendedBlanks} field blank per 20 samples (or 1 per sampling event).{' '}</>
          )}
          {duplicateShortage && (
            <>Field duplicates are {fieldDuplicateCount} of recommended {recommendedDuplicates} (1 per 10 field samples).</>
          )}
        </div>
      )}

      {/* Entry Form */}
      <div style={{ backgroundColor: '#f9f5ff', padding: '1.5rem', borderRadius: '0.5rem', border: `1px solid ${purpleAccent}30`, marginBottom: '1.5rem' }}>
        <h4 style={{ marginTop: 0, marginBottom: '1.25rem', fontWeight: '600' }}>Log New Sample</h4>

        {/* Sample Category — QC classification */}
        <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <label style={labelStyle}>Sample Category <span style={{ color: 'red' }}>*</span></label>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {['Field Sample', 'Field Blank', 'Field Duplicate'].map(cat => (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="sampleCategory"
                  checked={entry.sampleCategory === cat}
                  onChange={() => setEntry({ ...entry, sampleCategory: cat })}
                />
                {cat}
                {cat === 'Field Blank' && (
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    (unopened media, tracks lab/media contamination)
                  </span>
                )}
                {cat === 'Field Duplicate' && (
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    (side-by-side second wipe, tracks sampling precision)
                  </span>
                )}
              </label>
            ))}
          </div>

          {/* Parent sample link for duplicates */}
          {isDuplicateEntry && (
            <div style={{ marginTop: '0.75rem' }}>
              <label style={labelStyle}>Parent Field Sample ID <span style={{ color: 'red' }}>*</span></label>
              <select
                value={entry.parentSampleId}
                onChange={(e) => setEntry({ ...entry, parentSampleId: e.target.value })}
                style={fieldStyle}
              >
                <option value="">-- Select parent sample --</option>
                {parentSampleCandidates.map(p => (
                  <option key={p.id} value={p.sampleId}>
                    {p.sampleId} — {p.room} / {p.surface}
                  </option>
                ))}
              </select>
              {parentSampleCandidates.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
                  No matching {entry.type} field samples yet. Log the parent sample first.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Basic Sample Information */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={labelStyle}>
              Sample ID <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              placeholder={
                isBlankEntry ? 'e.g., FB-001' :
                isDuplicateEntry ? 'e.g., DW-001-DUP' :
                'e.g., DW-001, SS-001'
              }
              value={entry.sampleId}
              onChange={(e) => setEntry({ ...entry, sampleId: e.target.value })}
              style={fieldStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Sample Type <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={entry.type}
              onChange={(e) => {
                const newType = e.target.value;
                const newAreaType = newType === 'Dust Wipe' ? 'Floor' : newType === 'Soil Sample' ? 'Play Area' : '';
                setEntry({ ...entry, type: newType, areaType: newAreaType });
              }}
              style={fieldStyle}
            >
              <option>Dust Wipe</option>
              <option>Soil Sample</option>
              <option>Paint Chip</option>
            </select>
          </div>

          {!isBlankEntry && (
            <>
              <div>
                <label style={labelStyle}>
                  Room/Location <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Living Room, Kitchen"
                  value={entry.room}
                  onChange={(e) => setEntry({ ...entry, room: e.target.value })}
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Surface/Description <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Living room floor, Front yard"
                  value={entry.surface}
                  onChange={(e) => setEntry({ ...entry, surface: e.target.value })}
                  style={fieldStyle}
                />
              </div>

              {(entry.type === 'Dust Wipe' || entry.type === 'Soil Sample') && (
                <div>
                  <label style={labelStyle}>
                    Area Type <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    value={entry.areaType}
                    onChange={(e) => setEntry({ ...entry, areaType: e.target.value })}
                    style={fieldStyle}
                  >
                    {getAreaTypeOptions().map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label style={labelStyle}>
              Collection Date/Time <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={entry.collectionTime}
              onChange={(e) => setEntry({ ...entry, collectionTime: e.target.value })}
              style={fieldStyle}
            />
          </div>
        </div>

        {/* Lab Information Section (Required) */}
        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '0.375rem', padding: '1rem', marginBottom: '1.5rem' }}>
          <h5 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: '#92400e' }}>
            Lab Information <span style={{ color: 'red' }}>*</span> (Required — NLLAP / AIHA-LAP per HUD Ch. 7)
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Lab Name <span style={{ color: 'red' }}>*</span></label>
              <input type="text" placeholder="e.g., ABC Testing Lab" value={entry.labName}
                onChange={(e) => setEntry({ ...entry, labName: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>NLLAP Accreditation # <span style={{ color: 'red' }}>*</span></label>
              <input type="text" placeholder="e.g., NLLAP-12345" value={entry.labAccreditationNumber}
                onChange={(e) => setEntry({ ...entry, labAccreditationNumber: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Lab Address <span style={{ color: 'red' }}>*</span></label>
              <input type="text" placeholder="Street address" value={entry.labAddress}
                onChange={(e) => setEntry({ ...entry, labAddress: e.target.value })} style={fieldStyle} />
            </div>
          </div>
        </div>

        {/* Collector Credentials */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Collector Name</label>
            <input type="text" placeholder="Inspector name" value={entry.collectorName}
              onChange={(e) => setEntry({ ...entry, collectorName: e.target.value })} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Collector License/Certification #</label>
            <input type="text" placeholder="License number" value={entry.collectorLicense}
              onChange={(e) => setEntry({ ...entry, collectorLicense: e.target.value })} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Collector Firm Name</label>
            <input type="text" placeholder="Firm/Company name" value={entry.collectorFirm}
              onChange={(e) => setEntry({ ...entry, collectorFirm: e.target.value })} style={fieldStyle} />
          </div>
        </div>

        {/* Collection Method (Dust Wipe Only, not for blanks) */}
        {entry.type === 'Dust Wipe' && !isBlankEntry && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h5 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600' }}>
              Collection Method &amp; Area
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Collection Method</label>
                <select value={entry.collectionMethod}
                  onChange={(e) => setEntry({ ...entry, collectionMethod: e.target.value })} style={fieldStyle}>
                  <option>Wet Wipe (standard)</option>
                  <option>Dry Wipe</option>
                  <option>Vacuum</option>
                </select>
              </div>
            </div>

            {/* Wipe Area Selection — HUD Ch 7 / ASTM E1728 default 1 ft² (929 cm²) */}
            <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
              <p style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Wipe Area <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400 }}>
                  (HUD Ch. 7 / ASTM E1728 default is 1 ft² = 929 cm²)
                </span>
              </p>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <input
                    type="radio"
                    name="wipeArea"
                    checked={entry.wipeAreaStandard}
                    onChange={() => setEntry({ ...entry, wipeAreaStandard: true, wipeAreaCm2: 929 })}
                    style={{ cursor: 'pointer' }}
                  />
                  Standard 1 ft² (929 cm²)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <input
                    type="radio"
                    name="wipeArea"
                    checked={!entry.wipeAreaStandard}
                    onChange={() => setEntry({ ...entry, wipeAreaStandard: false })}
                    style={{ cursor: 'pointer' }}
                  />
                  Non-standard area (narrow sill, trough, other constraint)
                </label>
              </div>
            </div>

            {/* Non-standard area fields */}
            {!entry.wipeAreaStandard && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Wipe Area (cm²)</label>
                  <input type="number" step="0.1" placeholder="Enter measured area"
                    value={entry.wipeAreaCm2}
                    onChange={(e) => setEntry({ ...entry, wipeAreaCm2: e.target.value })} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Reason for Non-standard Area <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" placeholder="e.g., Window sill < 1 ft²; accessible area limited"
                    value={entry.wipeAreaNonStandardReason}
                    onChange={(e) => setEntry({ ...entry, wipeAreaNonStandardReason: e.target.value })} style={fieldStyle} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paint Chip specifics — ASTM E1729 §8 */}
        {entry.type === 'Paint Chip' && !isBlankEntry && (
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '0.375rem', padding: '1rem', marginBottom: '1.5rem' }}>
            <h5 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: '#1e40af' }}>
              Paint Chip Details (ASTM E1729)
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Sample Mass (g) <span style={{ color: 'red' }}>*</span></label>
                <input type="number" step="0.0001" min="0"
                  placeholder="e.g., 0.0500"
                  value={entry.paintChipMassG}
                  onChange={(e) => setEntry({ ...entry, paintChipMassG: e.target.value })} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Substrate</label>
                <select value={entry.paintChipSubstrate}
                  onChange={(e) => setEntry({ ...entry, paintChipSubstrate: e.target.value })} style={fieldStyle}>
                  <option>Wood</option>
                  <option>Drywall / Plaster</option>
                  <option>Metal</option>
                  <option>Concrete / Masonry</option>
                  <option>Brick</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Painted Area Sampled (cm²) <span style={{ color: 'red' }}>*</span></label>
                <input type="number" step="0.1" min="0"
                  placeholder="e.g., 25"
                  value={entry.paintChipPaintedAreaCm2}
                  onChange={(e) => setEntry({ ...entry, paintChipPaintedAreaCm2: e.target.value })} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Layer Depth</label>
                <select value={entry.paintChipLayerDepth}
                  onChange={(e) => setEntry({ ...entry, paintChipLayerDepth: e.target.value })} style={fieldStyle}>
                  <option>Intact paint only (no substrate)</option>
                  <option>All paint layers to bare substrate</option>
                  <option>Partial (note in comments)</option>
                </select>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.75rem', marginBottom: 0 }}>
              Lab reports Pb as mg/cm² (area-basis) and/or % by weight (mass-basis). EPA action level for
              paint: 1.0 mg/cm² or 0.5 % by weight (40 CFR 745.103).
            </p>
          </div>
        )}

        {/* Sample Condition */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Sample Condition at Collection</label>
            <select value={entry.sampleCondition}
              onChange={(e) => setEntry({ ...entry, sampleCondition: e.target.value })} style={fieldStyle}>
              <option>Good</option>
              <option>Compromised</option>
              <option>Contaminated</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Storage Condition</label>
            <select value={entry.storageCondition}
              onChange={(e) => setEntry({ ...entry, storageCondition: e.target.value })} style={fieldStyle}>
              <option>Room Temperature</option>
              <option>Refrigerated</option>
              <option>Frozen</option>
            </select>
          </div>
        </div>

        {/* Chain of Custody Transfer — dual signature per 40 CFR 745.227(h) */}
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #86efac', borderRadius: '0.375rem', padding: '1rem', marginBottom: '1.5rem' }}>
          <h5 style={{ marginTop: 0, marginBottom: '0.25rem', fontSize: '0.95rem', fontWeight: '600', color: '#166534' }}>
            Chain of Custody Transfer
          </h5>
          <p style={{ fontSize: '0.75rem', color: '#166534', marginTop: 0, marginBottom: '0.75rem' }}>
            Relinquished-by / received-by signatures required for unbroken custody (40 CFR 745.227(h), ASTM D4840).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Chain of Custody #</label>
              <input type="text" placeholder="CoC number" value={entry.cocNumber}
                onChange={(e) => setEntry({ ...entry, cocNumber: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date Shipped to Lab</label>
              <input type="date" value={entry.dateShippedToLab}
                onChange={(e) => setEntry({ ...entry, dateShippedToLab: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Shipping Method</label>
              <select value={entry.shippingMethod}
                onChange={(e) => setEntry({ ...entry, shippingMethod: e.target.value })} style={fieldStyle}>
                <option>Hand delivered</option>
                <option>USPS</option>
                <option>FedEx</option>
                <option>UPS</option>
                <option>Courier</option>
              </select>
            </div>
          </div>

          {/* Relinquished-by / Received-by */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ border: '1px solid #bbf7d0', borderRadius: '0.375rem', padding: '0.75rem', backgroundColor: 'white' }}>
              <p style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>
                Relinquished By (custody transferor)
              </p>
              <label style={labelStyle}>Name</label>
              <input type="text" placeholder="Printed name"
                value={entry.relinquishedByName}
                onChange={(e) => setEntry({ ...entry, relinquishedByName: e.target.value })}
                style={{ ...fieldStyle, marginBottom: '0.5rem' }} />
              <label style={labelStyle}>Date/Time</label>
              <input type="datetime-local"
                value={entry.relinquishedByDateTime}
                onChange={(e) => setEntry({ ...entry, relinquishedByDateTime: e.target.value })}
                style={fieldStyle} />
            </div>

            <div style={{ border: '1px solid #bbf7d0', borderRadius: '0.375rem', padding: '0.75rem', backgroundColor: 'white' }}>
              <p style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>
                Received By (lab or courier)
              </p>
              <label style={labelStyle}>Name</label>
              <input type="text" placeholder="Printed name"
                value={entry.receivedByName}
                onChange={(e) => setEntry({ ...entry, receivedByName: e.target.value })}
                style={{ ...fieldStyle, marginBottom: '0.5rem' }} />
              <label style={labelStyle}>Date/Time</label>
              <input type="datetime-local"
                value={entry.receivedByDateTime}
                onChange={(e) => setEntry({ ...entry, receivedByDateTime: e.target.value })}
                style={fieldStyle} />
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
          <label style={labelStyle}>Notes</label>
          <textarea
            placeholder="Additional observations, conditions, etc."
            value={entry.notes}
            onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
            rows="3"
            style={{ ...fieldStyle, fontFamily: 'inherit' }}
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
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Sample ID</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Category</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Type</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Room</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Date/Time</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Collector</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Lab Name</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>CoC Signed</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Shipped</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedSamples.map((sample) => {
                const cocSigned = !!(sample.relinquishedByName && sample.receivedByName);
                const catBg =
                  sample.sampleCategory === 'Field Blank' ? '#fef3c7' :
                  sample.sampleCategory === 'Field Duplicate' ? '#e0e7ff' : '#d1fae5';
                const catColor =
                  sample.sampleCategory === 'Field Blank' ? '#92400e' :
                  sample.sampleCategory === 'Field Duplicate' ? '#3730a3' : '#065f46';
                return (
                  <tr key={sample.id} style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ border: '1px solid #e5e7eb', padding: '0.75rem' }}>
                      <span style={{ fontWeight: '500', color: purpleAccent }}>
                        {sample.sampleId}
                      </span>
                      {sample.parentSampleId && (
                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                          dup of {sample.parentSampleId}
                        </div>
                      )}
                    </td>
                    <td style={{ border: '1px solid #e5e7eb', padding: '0.75rem', fontSize: '0.8rem' }}>
                      <span style={{
                        backgroundColor: catBg,
                        color: catColor,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 500
                      }}>
                        {sample.sampleCategory || 'Field Sample'}
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
                        backgroundColor: cocSigned ? '#d1fae5' : '#fecaca',
                        color: cocSigned ? '#065f46' : '#7f1d1d',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem'
                      }}>
                        {cocSigned ? 'Signed' : 'Missing'}
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
                );
              })}
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
