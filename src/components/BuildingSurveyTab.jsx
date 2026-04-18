import React, { useMemo } from 'react';

// HUD 2012 Chapter 5/7 compliant building survey with friction surfaces, chewable surfaces,
// substrate tracking, and de minimis deteriorated paint area assessment per component per room
function BuildingSurveyTab({ state, dispatch }) {
  const { buildingSurvey = {}, projectInfo = {} } = state;

  const handleChange = (field, value) => {
    dispatch({
      type: 'UPDATE_BUILDING_SURVEY',
      payload: { [field]: value }
    });
  };

  // Define all fields for completion tracking
  const allFields = [
    // Section 1: General Property Information
    'propertyType', 'numberOfUnits', 'numberOfFloors', 'yearBuilt', 'squareFootage',
    'constructionType', 'foundationType', 'heatingType', 'occupied', 'childrenUnder6Present',
    // Section 2: Exterior Condition
    'roofCondition', 'roofType', 'guttersCondition', 'exteriorWallCondition',
    'exteriorWallMaterial', 'exteriorPaintCondition', 'exteriorDeterioratedPaintSqFt',
    'soffitFasciaCondition', 'windowCondition', 'windowType',
    'windowFrameMaterial', 'windowFrictionSurfaces', 'windowSashCondition', 'windowCasingCondition',
    'windowSillStoolCondition', 'windowWellTroughCondition', 'windowSubstrateType',
    'porchCondition', 'porchPaintCondition', 'porchDeckFloor', 'porchRailings',
    'porchColumns', 'porchCeilingSoffit', 'porchSteps',
    'garageOutbuildingPresent', 'garageOutbuildingCondition',
    'soilCondition', 'visiblePaintChipsDebris', 'drivewaySidewalkCondition',
    // Section 3: Interior General Condition
    'interiorWallCondition', 'interiorWallMaterial', 'ceilingCondition', 'floorCondition',
    'trimCondition', 'trimSubstrateType', 'doorCondition', 'doorFrameCondition', 'doorCasingCondition',
    'doorFrictionSurfaces', 'doorChewableSurface', 'doorSubstrateType',
    'baseboardCondition', 'baseboardSubstrateType', 'baseboardChewableSurface',
    'crownMoldingCondition', 'crownMoldingChewableSurface',
    'shelvingBuiltInCondition', 'shelvingChewableSurface',
    'windowSashConditionInt', 'windowCasingConditionInt', 'windowSillStoolConditionInt',
    'windowWellTroughConditionInt', 'windowChewableSurface',
    'stairCondition', 'interiorDeterioratedPaintSqFt', 'interiorDeterioratedPaintRoomNotes',
    'plumbingCondition', 'waterDamagePresent', 'waterDamageLocations', 'moistureProblem',
    'visibleMoldPresent', 'peelingPaintInterior', 'chalkingPaintPresent',
    'visibleDustChipsInterior',
    // Section 4: Common Areas
    'commonAreaHallway', 'commonAreaStairwell', 'commonAreaLaundry', 'commonAreaPaintCondition',
    // Section 5: Additional Observations
    'additionalNotes', 'recommendedFollowUp'
  ];

  const completedCount = useMemo(() => {
    return allFields.filter(field => {
      const value = buildingSurvey[field];
      if (Array.isArray(value)) return value.length > 0;
      return value && value !== '';
    }).length;
  }, [buildingSurvey]);

  const completionPercentage = Math.round((completedCount / allFields.length) * 100);

  // Checkbox handler for multiselect
  const handleCheckboxChange = (option) => {
    const current = buildingSurvey.recommendedFollowUp || [];
    const updated = current.includes(option)
      ? current.filter(item => item !== option)
      : [...current, option];
    handleChange('recommendedFollowUp', updated);
  };

  const SectionHeader = ({ title }) => (
    <div style={{
      background: '#553c9a',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '6px',
      marginTop: '24px',
      marginBottom: '16px',
      fontWeight: '600',
      fontSize: '16px'
    }}>
      {title}
    </div>
  );

  const FieldLabel = ({ label }) => (
    <label style={{
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '6px',
      color: '#333'
    }}>
      {label}
    </label>
  );

  const SelectInput = ({ value, onChange, options, placeholder = 'Select...' }) => (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        backgroundColor: '#fff',
        cursor: 'pointer'
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt}>{opt}</option>
      ))}
    </select>
  );

  const NumberInput = ({ value, onChange, placeholder = '' }) => (
    <input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px'
      }}
    />
  );

  const TextInput = ({ value, onChange, placeholder = '' }) => (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px'
      }}
    />
  );

  const TextArea = ({ value, onChange, placeholder = '', rows = 4 }) => (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        resize: 'vertical'
      }}
    />
  );

  const FieldRow = ({ label, children }) => (
    <div style={{ marginBottom: '16px' }}>
      <FieldLabel label={label} />
      {children}
    </div>
  );

  const TwoColumnGrid = ({ children }) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      marginBottom: '16px'
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ padding: '16px' }}>
      {/* Completion Counter */}
      <div style={{
        background: '#f0f0f0',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            Progress: {completedCount} of {allFields.length} fields completed
          </span>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#553c9a' }}>
            {completionPercentage}%
          </span>
        </div>
        <div style={{
          background: '#ddd',
          borderRadius: '8px',
          height: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: '#553c9a',
            height: '100%',
            width: `${completionPercentage}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* SECTION 1: General Property Information */}
      <SectionHeader title="Section 1: General Property Information" />

      <TwoColumnGrid>
        <FieldRow label="Property Type *">
          <SelectInput
            value={buildingSurvey.propertyType}
            onChange={(val) => handleChange('propertyType', val)}
            options={['Single Family', 'Multi-Family 2-4 Units', 'Multi-Family 5+ Units', 'Commercial', 'Mixed Use']}
          />
        </FieldRow>

        <FieldRow label="Number of Units">
          <NumberInput
            value={buildingSurvey.numberOfUnits}
            onChange={(val) => handleChange('numberOfUnits', val)}
            placeholder="Enter number of units"
          />
        </FieldRow>

        <FieldRow label="Number of Floors">
          <NumberInput
            value={buildingSurvey.numberOfFloors}
            onChange={(val) => handleChange('numberOfFloors', val)}
            placeholder="Enter number of floors"
          />
        </FieldRow>

        <FieldRow label="Year Built">
          <TextInput
            value={buildingSurvey.yearBuilt || projectInfo.yearBuilt}
            onChange={(val) => handleChange('yearBuilt', val)}
            placeholder="From project info"
          />
        </FieldRow>

        <FieldRow label="Square Footage">
          <NumberInput
            value={buildingSurvey.squareFootage}
            onChange={(val) => handleChange('squareFootage', val)}
            placeholder="Enter square footage"
          />
        </FieldRow>

        <FieldRow label="Construction Type">
          <SelectInput
            value={buildingSurvey.constructionType}
            onChange={(val) => handleChange('constructionType', val)}
            options={['Wood Frame', 'Masonry/Brick', 'Concrete Block', 'Steel Frame', 'Mixed']}
          />
        </FieldRow>

        <FieldRow label="Foundation Type">
          <SelectInput
            value={buildingSurvey.foundationType}
            onChange={(val) => handleChange('foundationType', val)}
            options={['Basement', 'Crawl Space', 'Slab', 'Pier/Post', 'Mixed']}
          />
        </FieldRow>

        <FieldRow label="Heating Type">
          <SelectInput
            value={buildingSurvey.heatingType}
            onChange={(val) => handleChange('heatingType', val)}
            options={['Forced Air', 'Radiator/Steam', 'Baseboard', 'Space Heater', 'None']}
          />
        </FieldRow>

        <FieldRow label="Occupied">
          <SelectInput
            value={buildingSurvey.occupied}
            onChange={(val) => handleChange('occupied', val)}
            options={['Yes', 'No', 'Partially']}
          />
        </FieldRow>

        <FieldRow label="Children Under 6 Present">
          <SelectInput
            value={buildingSurvey.childrenUnder6Present}
            onChange={(val) => handleChange('childrenUnder6Present', val)}
            options={['Yes', 'No', 'Unknown']}
          />
        </FieldRow>
      </TwoColumnGrid>

      {/* SECTION 2: Exterior Condition */}
      <SectionHeader title="Section 2: Exterior Condition" />

      <TwoColumnGrid>
        <FieldRow label="Roof Condition">
          <SelectInput
            value={buildingSurvey.roofCondition}
            onChange={(val) => handleChange('roofCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'Not Accessible']}
          />
        </FieldRow>

        <FieldRow label="Roof Type">
          <SelectInput
            value={buildingSurvey.roofType}
            onChange={(val) => handleChange('roofType', val)}
            options={['Asphalt Shingle', 'Metal', 'Flat/Built-up', 'Tile', 'Other']}
          />
        </FieldRow>

        <FieldRow label="Gutters Condition">
          <SelectInput
            value={buildingSurvey.guttersCondition}
            onChange={(val) => handleChange('guttersCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'None', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Exterior Wall Condition">
          <SelectInput
            value={buildingSurvey.exteriorWallCondition}
            onChange={(val) => handleChange('exteriorWallCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated']}
          />
        </FieldRow>

        <FieldRow label="Exterior Wall Material">
          <SelectInput
            value={buildingSurvey.exteriorWallMaterial}
            onChange={(val) => handleChange('exteriorWallMaterial', val)}
            options={['Wood Clapboard', 'Vinyl Siding', 'Aluminum Siding', 'Brick', 'Stucco', 'Other']}
          />
        </FieldRow>

        <FieldRow label="Exterior Paint Condition">
          <SelectInput
            value={buildingSurvey.exteriorPaintCondition}
            onChange={(val) => handleChange('exteriorPaintCondition', val)}
            options={['Intact', 'Fair - Minor Peeling', 'Poor - Major Peeling', 'Bare Wood Visible']}
          />
        </FieldRow>

        <FieldRow label="Exterior Deteriorated Paint Area (sq ft) *">
          <TextInput
            value={buildingSurvey.exteriorDeterioratedPaintSqFt}
            onChange={(val) => handleChange('exteriorDeterioratedPaintSqFt', val)}
            placeholder="Estimate sq ft (HUD de minimis: 20 sq ft exterior)"
          />
        </FieldRow>

        <FieldRow label="Soffit/Fascia/Eaves Condition">
          <SelectInput
            value={buildingSurvey.soffitFasciaCondition}
            onChange={(val) => handleChange('soffitFasciaCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Window Condition (General)">
          <SelectInput
            value={buildingSurvey.windowCondition}
            onChange={(val) => handleChange('windowCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated']}
          />
        </FieldRow>

        <FieldRow label="Window Type">
          <SelectInput
            value={buildingSurvey.windowType}
            onChange={(val) => handleChange('windowType', val)}
            options={['Single-Hung', 'Double-Hung', 'Casement', 'Sliding', 'Fixed']}
          />
        </FieldRow>

        <FieldRow label="Window Frame Material (Substrate Type) *">
          <SelectInput
            value={buildingSurvey.windowFrameMaterial}
            onChange={(val) => handleChange('windowFrameMaterial', val)}
            options={['Wood', 'Metal', 'Vinyl', 'Composite']}
          />
        </FieldRow>

        <FieldRow label="Window Substrate Type *">
          <SelectInput
            value={buildingSurvey.windowSubstrateType}
            onChange={(val) => handleChange('windowSubstrateType', val)}
            options={['Wood', 'Metal', 'Vinyl', 'Composite']}
          />
        </FieldRow>

        <FieldRow label="Window Sash Condition">
          <SelectInput
            value={buildingSurvey.windowSashCondition}
            onChange={(val) => handleChange('windowSashCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Window Casing Condition">
          <SelectInput
            value={buildingSurvey.windowCasingCondition}
            onChange={(val) => handleChange('windowCasingCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Window Sill/Stool Condition">
          <SelectInput
            value={buildingSurvey.windowSillStoolCondition}
            onChange={(val) => handleChange('windowSillStoolCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Window Well/Trough Condition">
          <SelectInput
            value={buildingSurvey.windowWellTroughCondition}
            onChange={(val) => handleChange('windowWellTroughCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Window Friction Surfaces (EPA Required) *">
          <SelectInput
            value={buildingSurvey.windowFrictionSurfaces}
            onChange={(val) => handleChange('windowFrictionSurfaces', val)}
            options={['No friction damage', 'Minor wear/rubbing marks', 'Moderate - paint worn in channels', 'Severe - bare substrate in friction areas']}
          />
        </FieldRow>

        <FieldRow label="Porch Condition">
          <SelectInput
            value={buildingSurvey.porchCondition}
            onChange={(val) => handleChange('porchCondition', val)}
            options={['Good', 'Fair', 'Poor', 'None']}
          />
        </FieldRow>

        <FieldRow label="Porch Paint Condition">
          <SelectInput
            value={buildingSurvey.porchPaintCondition}
            onChange={(val) => handleChange('porchPaintCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Porch Deck/Floor Condition">
          <SelectInput
            value={buildingSurvey.porchDeckFloor}
            onChange={(val) => handleChange('porchDeckFloor', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Porch Railings Condition">
          <SelectInput
            value={buildingSurvey.porchRailings}
            onChange={(val) => handleChange('porchRailings', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Porch Columns Condition">
          <SelectInput
            value={buildingSurvey.porchColumns}
            onChange={(val) => handleChange('porchColumns', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Porch Ceiling/Soffit Condition">
          <SelectInput
            value={buildingSurvey.porchCeilingSoffit}
            onChange={(val) => handleChange('porchCeilingSoffit', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Porch Steps Condition">
          <SelectInput
            value={buildingSurvey.porchSteps}
            onChange={(val) => handleChange('porchSteps', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Soil Condition">
          <SelectInput
            value={buildingSurvey.soilCondition}
            onChange={(val) => handleChange('soilCondition', val)}
            options={['Bare soil present', 'Mulch/Gravel covered', 'Grass/Vegetation covered', 'Paved']}
          />
        </FieldRow>

        <FieldRow label="Garage/Outbuilding Present">
          <SelectInput
            value={buildingSurvey.garageOutbuildingPresent}
            onChange={(val) => handleChange('garageOutbuildingPresent', val)}
            options={['Yes - Attached', 'Yes - Detached', 'Multiple Outbuildings', 'None']}
          />
        </FieldRow>

        <FieldRow label="Garage/Outbuilding Condition">
          <SelectInput
            value={buildingSurvey.garageOutbuildingCondition}
            onChange={(val) => handleChange('garageOutbuildingCondition', val)}
            options={['Good', 'Fair', 'Poor', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Visible Paint Chips/Debris on Ground *">
          <SelectInput
            value={buildingSurvey.visiblePaintChipsDebris}
            onChange={(val) => handleChange('visiblePaintChipsDebris', val)}
            options={['None observed', 'Minor - few chips', 'Moderate - scattered debris', 'Extensive - chips/dust on soil/surfaces']}
          />
        </FieldRow>

        <FieldRow label="Driveway/Sidewalk Condition">
          <SelectInput
            value={buildingSurvey.drivewaySidewalkCondition}
            onChange={(val) => handleChange('drivewaySidewalkCondition', val)}
            options={['Good', 'Fair', 'Poor', 'None']}
          />
        </FieldRow>
      </TwoColumnGrid>

      {/* SECTION 3: Interior General Condition */}
      <SectionHeader title="Section 3: Interior General Condition" />

      <TwoColumnGrid>
        <FieldRow label="Interior Wall Condition">
          <SelectInput
            value={buildingSurvey.interiorWallCondition}
            onChange={(val) => handleChange('interiorWallCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated']}
          />
        </FieldRow>

        <FieldRow label="Interior Wall Material">
          <SelectInput
            value={buildingSurvey.interiorWallMaterial}
            onChange={(val) => handleChange('interiorWallMaterial', val)}
            options={['Plaster', 'Drywall', 'Paneling', 'Mixed']}
          />
        </FieldRow>

        <FieldRow label="Ceiling Condition">
          <SelectInput
            value={buildingSurvey.ceilingCondition}
            onChange={(val) => handleChange('ceilingCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated']}
          />
        </FieldRow>

        <FieldRow label="Floor Condition">
          <SelectInput
            value={buildingSurvey.floorCondition}
            onChange={(val) => handleChange('floorCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated']}
          />
        </FieldRow>

        <FieldRow label="Trim Condition">
          <SelectInput
            value={buildingSurvey.trimCondition}
            onChange={(val) => handleChange('trimCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated']}
          />
        </FieldRow>

        <FieldRow label="Trim Substrate Type *">
          <SelectInput
            value={buildingSurvey.trimSubstrateType}
            onChange={(val) => handleChange('trimSubstrateType', val)}
            options={['Wood', 'Metal', 'Composite']}
          />
        </FieldRow>

        <FieldRow label="Door Panel Condition">
          <SelectInput
            value={buildingSurvey.doorCondition}
            onChange={(val) => handleChange('doorCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated']}
          />
        </FieldRow>

        <FieldRow label="Door Frame Condition">
          <SelectInput
            value={buildingSurvey.doorFrameCondition}
            onChange={(val) => handleChange('doorFrameCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Door Casing Condition">
          <SelectInput
            value={buildingSurvey.doorCasingCondition}
            onChange={(val) => handleChange('doorCasingCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Door Substrate Type *">
          <SelectInput
            value={buildingSurvey.doorSubstrateType}
            onChange={(val) => handleChange('doorSubstrateType', val)}
            options={['Wood', 'Metal', 'Composite']}
          />
        </FieldRow>

        <FieldRow label="Door - Chewable Surface? *">
          <SelectInput
            value={buildingSurvey.doorChewableSurface}
            onChange={(val) => handleChange('doorChewableSurface', val)}
            options={['Yes - Accessible to children <6', 'No - Not accessible', 'Unknown']}
          />
        </FieldRow>

        <FieldRow label="Door Friction/Impact Surfaces (EPA Required) *">
          <SelectInput
            value={buildingSurvey.doorFrictionSurfaces}
            onChange={(val) => handleChange('doorFrictionSurfaces', val)}
            options={['No friction damage', 'Minor wear on edges/frames', 'Moderate - paint worn at strike plates/hinges', 'Severe - bare substrate at friction points']}
          />
        </FieldRow>

        <FieldRow label="Baseboard Condition">
          <SelectInput
            value={buildingSurvey.baseboardCondition}
            onChange={(val) => handleChange('baseboardCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Baseboard Substrate Type">
          <SelectInput
            value={buildingSurvey.baseboardSubstrateType}
            onChange={(val) => handleChange('baseboardSubstrateType', val)}
            options={['Wood', 'MDF', 'Composite', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Baseboard - Chewable Surface? *">
          <SelectInput
            value={buildingSurvey.baseboardChewableSurface}
            onChange={(val) => handleChange('baseboardChewableSurface', val)}
            options={['Yes - Accessible to children <6', 'No - Not accessible', 'Unknown', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Crown Molding Condition">
          <SelectInput
            value={buildingSurvey.crownMoldingCondition}
            onChange={(val) => handleChange('crownMoldingCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Crown Molding - Chewable Surface?">
          <SelectInput
            value={buildingSurvey.crownMoldingChewableSurface}
            onChange={(val) => handleChange('crownMoldingChewableSurface', val)}
            options={['Yes - Accessible to children <6', 'No - Not accessible', 'Unknown', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Shelving/Built-in Condition">
          <SelectInput
            value={buildingSurvey.shelvingBuiltInCondition}
            onChange={(val) => handleChange('shelvingBuiltInCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Shelving/Built-in - Chewable Surface?">
          <SelectInput
            value={buildingSurvey.shelvingChewableSurface}
            onChange={(val) => handleChange('shelvingChewableSurface', val)}
            options={['Yes - Accessible to children <6', 'No - Not accessible', 'Unknown', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Window Sash Condition (Interior)">
          <SelectInput
            value={buildingSurvey.windowSashConditionInt}
            onChange={(val) => handleChange('windowSashConditionInt', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Window Casing Condition (Interior)">
          <SelectInput
            value={buildingSurvey.windowCasingConditionInt}
            onChange={(val) => handleChange('windowCasingConditionInt', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Window Sill/Stool Condition (Interior)">
          <SelectInput
            value={buildingSurvey.windowSillStoolConditionInt}
            onChange={(val) => handleChange('windowSillStoolConditionInt', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Window Well/Trough Condition (Interior)">
          <SelectInput
            value={buildingSurvey.windowWellTroughConditionInt}
            onChange={(val) => handleChange('windowWellTroughConditionInt', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Window - Chewable Surface? *">
          <SelectInput
            value={buildingSurvey.windowChewableSurface}
            onChange={(val) => handleChange('windowChewableSurface', val)}
            options={['Yes - Accessible to children <6', 'No - Not accessible', 'Unknown']}
          />
        </FieldRow>

        <FieldRow label="Stair Condition">
          <SelectInput
            value={buildingSurvey.stairCondition}
            onChange={(val) => handleChange('stairCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Interior Deteriorated Paint Area (sq ft per room) *">
          <TextInput
            value={buildingSurvey.interiorDeterioratedPaintSqFt}
            onChange={(val) => handleChange('interiorDeterioratedPaintSqFt', val)}
            placeholder="Estimate sq ft per room (HUD de minimis: 2 sq ft/room)"
          />
        </FieldRow>

        <FieldRow label="Interior De Minimis - Room-by-Room Notes">
          <TextArea
            value={buildingSurvey.interiorDeterioratedPaintRoomNotes}
            onChange={(val) => handleChange('interiorDeterioratedPaintRoomNotes', val)}
            placeholder="Document which rooms have deteriorated paint and estimated areas (track de minimis threshold: 2 sq ft per component per room)"
            rows={4}
          />
        </FieldRow>

        <FieldRow label="Plumbing Condition">
          <SelectInput
            value={buildingSurvey.plumbingCondition}
            onChange={(val) => handleChange('plumbingCondition', val)}
            options={['Intact - No leaks', 'Fair - Minor leaks present', 'Poor - Major leaks/water damage', 'Unknown']}
          />
        </FieldRow>

        <FieldRow label="Water Damage Present">
          <SelectInput
            value={buildingSurvey.waterDamagePresent}
            onChange={(val) => handleChange('waterDamagePresent', val)}
            options={['None', 'Minor', 'Moderate', 'Severe']}
          />
        </FieldRow>

        <FieldRow label="Water Damage Locations (if applicable)">
          <TextInput
            value={buildingSurvey.waterDamageLocations}
            onChange={(val) => handleChange('waterDamageLocations', val)}
            placeholder="Describe locations of water damage"
          />
        </FieldRow>

        <FieldRow label="Moisture Problem">
          <SelectInput
            value={buildingSurvey.moistureProblem}
            onChange={(val) => handleChange('moistureProblem', val)}
            options={['None', 'Active Leak', 'Past Damage', 'Condensation']}
          />
        </FieldRow>

        <FieldRow label="Visible Mold Present">
          <SelectInput
            value={buildingSurvey.visibleMoldPresent}
            onChange={(val) => handleChange('visibleMoldPresent', val)}
            options={['Yes', 'No']}
          />
        </FieldRow>

        <FieldRow label="Peeling Paint Interior">
          <SelectInput
            value={buildingSurvey.peelingPaintInterior}
            onChange={(val) => handleChange('peelingPaintInterior', val)}
            options={['None', 'Minimal (<2 sq ft)', 'Moderate (2-10 sq ft)', 'Extensive (>10 sq ft)']}
          />
        </FieldRow>

        <FieldRow label="Chalking Paint Present">
          <SelectInput
            value={buildingSurvey.chalkingPaintPresent}
            onChange={(val) => handleChange('chalkingPaintPresent', val)}
            options={['Yes', 'No', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Visible Dust/Paint Chips on Interior Surfaces *">
          <SelectInput
            value={buildingSurvey.visibleDustChipsInterior}
            onChange={(val) => handleChange('visibleDustChipsInterior', val)}
            options={['None observed', 'Minor - windowsills/wells only', 'Moderate - multiple surfaces', 'Extensive - floors, sills, and ledges']}
          />
        </FieldRow>
      </TwoColumnGrid>

      {/* SECTION 4: Common Areas (Multi-Unit) */}
      <SectionHeader title="Section 4: Common Areas (Multi-Unit Buildings)" />

      <TwoColumnGrid>
        <FieldRow label="Common Area Hallway">
          <SelectInput
            value={buildingSurvey.commonAreaHallway}
            onChange={(val) => handleChange('commonAreaHallway', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Common Area Stairwell">
          <SelectInput
            value={buildingSurvey.commonAreaStairwell}
            onChange={(val) => handleChange('commonAreaStairwell', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Common Area Laundry">
          <SelectInput
            value={buildingSurvey.commonAreaLaundry}
            onChange={(val) => handleChange('commonAreaLaundry', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>

        <FieldRow label="Common Area Paint Condition">
          <SelectInput
            value={buildingSurvey.commonAreaPaintCondition}
            onChange={(val) => handleChange('commonAreaPaintCondition', val)}
            options={['Intact', 'Fair', 'Poor', 'Deteriorated', 'N/A']}
          />
        </FieldRow>
      </TwoColumnGrid>

      {/* SECTION 5: Additional Observations */}
      <SectionHeader title="Section 5: Additional Observations" />

      <FieldRow label="Additional Notes About Building Condition">
        <TextArea
          value={buildingSurvey.additionalNotes}
          onChange={(val) => handleChange('additionalNotes', val)}
          placeholder="Enter any additional observations about the building condition, maintenance issues, or other relevant notes..."
          rows={6}
        />
      </FieldRow>

      <div style={{ marginBottom: '20px' }}>
        <FieldLabel label="Recommended Follow-Up Actions" />
        <div style={{ marginTop: '12px' }}>
          {['Abatement Required', 'Interim Controls Recommended', 'Monitoring Recommended', 'No Action Needed', 'Clearance Testing Required'].map((option) => (
            <label
              key={option}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '10px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <input
                type="checkbox"
                checked={(buildingSurvey.recommendedFollowUp || []).includes(option)}
                onChange={() => handleCheckboxChange(option)}
                style={{
                  marginRight: '8px',
                  cursor: 'pointer',
                  width: '18px',
                  height: '18px'
                }}
              />
              {option}
            </label>
          ))}
        </div>
      </div>

      {/* Spacing at bottom */}
      <div style={{ marginBottom: '40px' }} />
    </div>
  );
}

export default BuildingSurveyTab;
