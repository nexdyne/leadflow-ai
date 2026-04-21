import React, { useMemo } from 'react';

const ResidentInterviewTab = ({ state, dispatch }) => {
  const interview = state.residentInterview || {};

  const handleChange = (key, value) => {
    dispatch({
      type: 'UPDATE_RESIDENT_INTERVIEW',
      payload: { [key]: value }
    });
  };

  // Calculate completion percentage
  const requiredFields = [
    'interviewDate',
    'intervieweeName',
    'intervieweeRelationship',
    'numberOfOccupants',
    'numberOfChildrenUnder6',
    'pregnantWomenPresent',
    'childrenPrimaryPlayAreas',
    'childrenPlayOutside',
    'childEverTestedForLead',
    'childOnMedicaid',
    'healthConcernsReported',
    'occupationalLeadExposure',
    'hobbyLeadExposure',
    'previousLeadInspection',
    'previousLeadAbatement',
    'recentRenovation',
    'paintChipsOrDust',
    'windowsEasyToOpenClose',
    'cleaningFrequency',
    'cleaningMethod',
    'dustAccumulation',
    'petsPresent',
    'waterSource',
    'waterPipeMaterial',
    'usesWaterFilter',
    'usesImportedFoods',
    'usesTraditionalRemedies',
    'intervieweeCooperative',
    'leadDustFromOutdoors',
    'soilTrackingIntohome',
    'vintageToysOrFurniture',
    'interpreterUsed'
  ];

  const completionPercentage = useMemo(() => {
    const filled = requiredFields.filter(field => interview[field] !== undefined && interview[field] !== null && interview[field] !== '').length;
    return Math.round((filled / requiredFields.length) * 100);
  }, [interview]);

  // Styles
  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f9f9f9',
      minHeight: '100vh',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#2c3e50',
      margin: 0
    },
    completionBadge: {
      backgroundColor: '#667eea',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '600'
    },
    section: {
      backgroundColor: 'white',
      borderRadius: '8px',
      marginBottom: '24px',
      overflow: 'hidden',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    sectionHeader: {
      backgroundColor: '#7c3aed',
      color: 'white',
      padding: '16px 20px',
      fontSize: '16px',
      fontWeight: '700',
      borderLeft: '5px solid #6d28d9',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    sectionContent: {
      padding: '20px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginBottom: '20px'
    },
    gridFullWidth: {
      gridColumn: '1 / -1'
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    required: {
      color: '#e74c3c',
      fontWeight: '700'
    },
    optional: {
      color: '#95a5a6',
      fontSize: '12px',
      fontStyle: 'italic'
    },
    input: {
      padding: '10px 12px',
      border: '1px solid #bdc3c7',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'inherit',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box'
    },
    inputFocus: {
      outline: 'none',
      borderColor: '#7c3aed',
      boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.1)'
    },
    select: {
      padding: '10px 12px',
      border: '1px solid #bdc3c7',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'inherit',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box'
    },
    textarea: {
      padding: '10px 12px',
      border: '1px solid #bdc3c7',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'inherit',
      minHeight: '100px',
      resize: 'vertical',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box'
    },
    infoBox: {
      backgroundColor: '#e8f4f8',
      borderLeft: '4px solid #3498db',
      padding: '12px 16px',
      marginBottom: '20px',
      borderRadius: '4px',
      fontSize: '13px',
      color: '#2c5f7f'
    },
    infoIcon: {
      marginRight: '8px',
      fontSize: '16px'
    },
    checkboxGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '6px'
    },
    checkbox: {
      cursor: 'pointer',
      width: '18px',
      height: '18px',
      accentColor: '#7c3aed'
    },
    conditionalField: {
      backgroundColor: '#f5f7fa',
      padding: '12px',
      borderLeft: '3px solid #f39c12',
      borderRadius: '4px',
      fontSize: '13px'
    }
  };

  const InputField = ({ label, field, type = 'text', required = false, options = null, placeholder = '' }) => {
    return (
      <div style={styles.fieldGroup}>
        <label style={styles.label}>
          {label}
          {required && <span style={styles.required}>*</span>}
          {!required && <span style={styles.optional}>(optional)</span>}
        </label>
        {options ? (
          <select
            style={styles.select}
            value={interview[field] || ''}
            onChange={(e) => handleChange(field, e.target.value)}
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => Object.assign(e.target.style, { outline: 'none' })}
          >
            <option value="">-- Select --</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            style={styles.textarea}
            value={interview[field] || ''}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder={placeholder}
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => Object.assign(e.target.style, { outline: 'none' })}
          />
        ) : (
          <input
            type={type}
            style={styles.input}
            value={interview[field] || ''}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder={placeholder}
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => Object.assign(e.target.style, { outline: 'none' })}
          />
        )}
      </div>
    );
  };

  const ConditionalField = ({ label, field, type = 'text', required = false, options = null, placeholder = '', condition = true }) => {
    if (!condition) return null;
    return (
      <div style={{ ...styles.fieldGroup, ...styles.conditionalField }}>
        <label style={styles.label}>
          {label}
          {required && <span style={styles.required}>*</span>}
        </label>
        {options ? (
          <select
            style={{...styles.select, marginTop: '6px'}}
            value={interview[field] || ''}
            onChange={(e) => handleChange(field, e.target.value)}
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => Object.assign(e.target.style, { outline: 'none' })}
          >
            <option value="">-- Select --</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            style={{...styles.textarea, marginTop: '6px'}}
            value={interview[field] || ''}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder={placeholder}
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => Object.assign(e.target.style, { outline: 'none' })}
          />
        ) : (
          <input
            type={type}
            style={{...styles.input, marginTop: '6px'}}
            value={interview[field] || ''}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder={placeholder}
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => Object.assign(e.target.style, { outline: 'none' })}
          />
        )}
      </div>
    );
  };

  const numChildren = parseInt(interview.numberOfChildrenUnder6) || 0;
  const hasChildren = numChildren > 0;

  // Elevated Blood Lead flag (CDC 2021 BLRV & MDHHS EBL threshold per MCL 333.5474 = 3.5 µg/dL)
  const bloodLeadNumeric = parseFloat(interview.bloodLeadLevel);
  const isEBL = !isNaN(bloodLeadNumeric) && bloodLeadNumeric >= 3.5;

  // Lead Service Line flag per EPA Lead and Copper Rule Improvements (LCRI, Oct 2024,
  // 89 FR 86502; 40 CFR Part 141 Subpart I) — all lead/galvanized-requiring-replacement
  // service lines to be replaced within 10 years (by 2037 compliance deadline).
  const hasLeadServiceLine = interview.waterPipeMaterial === 'Lead';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Resident Interview</h1>
        <div style={styles.completionBadge}>{completionPercentage}% Complete</div>
      </div>

      {/* Privacy Notice — HIPAA 45 CFR 160/164 + Michigan Mental Health Code
          + MCL 333.5474 EBL reporting. This is intentionally specific: a vague
          "federal privacy regulations" clause does not satisfy HIPAA §164.520 NPP
          obligations when the inspector is a covered-entity business associate. */}
      <div style={{
        backgroundColor: '#dbeafe',
        borderLeft: '5px solid #2563eb',
        padding: '16px 20px',
        marginBottom: '24px',
        borderRadius: '4px',
        fontSize: '13px',
        color: '#1e40af',
        lineHeight: '1.6'
      }}>
        <div style={{display: 'flex', gap: '12px'}}>
          <span style={{fontSize: '18px', flexShrink: 0}}>🔒</span>
          <div>
            <strong>Privacy Notice:</strong> Health information collected in this
            interview (including blood-lead test results, Medicaid status, and medical
            history) may be protected health information under <strong>HIPAA 45 CFR
            Parts 160 and 164</strong> when the inspector operates as a business
            associate of a covered entity. It is also subject to <strong>Michigan
            Public Health Code Act 368 of 1978, Part 54A (MCL 333.5451&ndash;5477)</strong>,
            including <strong>MCL 333.5474</strong> mandatory reporting of elevated
            blood lead levels to MDHHS. Interview data will be used solely for lead
            hazard identification, report delivery to the property owner and HUD
            (where applicable), and MDHHS EBL follow-up. Disclosure to third parties
            outside these purposes requires the occupant&apos;s written authorization.
          </div>
        </div>
      </div>

      {/* Elevated Blood Lead Level banner — MDHHS EBL = ≥ 3.5 µg/dL (MCL 333.5474,
          CDC 2021 Blood Lead Reference Value). MDHHS Form 633775 LIRA-EBL trigger. */}
      {isEBL && hasChildren && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #dc2626',
          borderLeft: '6px solid #991b1b',
          padding: '16px 20px',
          marginBottom: '24px',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#7f1d1d',
          lineHeight: '1.6'
        }}>
          <div style={{display: 'flex', gap: '12px'}}>
            <span style={{fontSize: '20px', flexShrink: 0}}>⚠️</span>
            <div>
              <strong style={{fontSize: '14px', display: 'block', marginBottom: '4px'}}>
                ELEVATED BLOOD LEAD LEVEL (EBL) &mdash; reported BLL {bloodLeadNumeric} µg/dL
              </strong>
              This reading meets or exceeds the MDHHS EBL threshold of 3.5 µg/dL
              (<strong>MCL 333.5474</strong>, CDC 2021 Blood Lead Reference Value).
              An <strong>LIRA-EBL investigation (MDHHS Form 633775)</strong> is
              required under Part 54A. Confirm the family&apos;s pediatrician or the
              child&apos;s local health department has been notified, and document
              case management referrals. The final report must flag this unit as a
              Michigan EBL investigation, not a routine lead hazard screen.
            </div>
          </div>
        </div>
      )}

      {/* Lead Service Line notice — EPA LCRI (89 FR 86502, Oct 30 2024). 10-year
          LSL replacement deadline; interim tap-water sampling requirements. */}
      {hasLeadServiceLine && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '2px solid #f59e0b',
          borderLeft: '6px solid #b45309',
          padding: '16px 20px',
          marginBottom: '24px',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#78350f',
          lineHeight: '1.6'
        }}>
          <div style={{display: 'flex', gap: '12px'}}>
            <span style={{fontSize: '20px', flexShrink: 0}}>🚰</span>
            <div>
              <strong style={{fontSize: '14px', display: 'block', marginBottom: '4px'}}>
                LEAD SERVICE LINE IDENTIFIED &mdash; water is a significant Pb exposure route
              </strong>
              The occupant reports a <strong>lead water service line</strong>. Under
              the <strong>EPA Lead and Copper Rule Improvements (LCRI), 40 CFR Part
              141 Subpart I, 89 FR 86502 (Oct 30 2024)</strong>, the water system
              must replace all lead and galvanized-requiring-replacement service lines
              within <strong>10 years</strong> (baseline compliance Oct 16 2027).
              Add a <strong>first-draw tap-water sampling</strong> recommendation to
              the report (EPA action level 10 µg/L), and consider an NSF/ANSI 53
              lead-certified point-of-use filter as an interim measure. Note the
              LSL materially increases cumulative Pb intake even when paint/dust
              are in compliance.
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Household Information */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span>📋</span> Section 1: Household Information
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.infoBox}>
            <span style={styles.infoIcon}>ℹ️</span>
            Collect basic information about the household and interview details.
          </div>
          <div style={styles.grid}>
            <InputField label="Interview Date" field="interviewDate" type="date" required />
            <InputField label="Interviewee Name" field="intervieweeName" required placeholder="Full name" />
            <InputField
              label="Interviewee Relationship"
              field="intervieweeRelationship"
              required
              options={['Owner', 'Tenant', 'Property Manager', 'Guardian', 'Other']}
            />
            <InputField label="Number of Occupants" field="numberOfOccupants" type="number" required placeholder="Total people in home" />
            <InputField label="Number of Children Under 6" field="numberOfChildrenUnder6" type="number" required placeholder="0" />
            <InputField label="Children Ages" field="childrenAges" placeholder="e.g., 2, 4, 5 (comma-separated)" />
            <InputField label="Pregnant Women Present" field="pregnantWomenPresent" required options={['Yes', 'No']} />
            <InputField label="Length of Residency" field="lengthOfResidency" required placeholder="e.g., 3 years" />
            <InputField label="Interpreter Used" field="interpreterUsed" required options={['Yes', 'No']} />
            <ConditionalField label="Interpreter Language" field="interpreterLanguage" condition={interview.interpreterUsed === 'Yes'} placeholder="Language (e.g., Spanish, Mandarin, etc.)" />
          </div>
        </div>
      </div>

      {/* Section 2: Children's Activities & Risk Factors */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span>🎯</span> Section 2: Children's Activities & Risk Factors
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.infoBox}>
            <span style={styles.infoIcon}>ℹ️</span>
            Document where and how children play, and their exposure to potential lead hazards.
          </div>
          <div style={styles.grid}>
            <ConditionalField label="Children's Primary Play Areas" field="childrenPrimaryPlayAreas" required={hasChildren} condition={hasChildren} placeholder="Inside, outside, both?" />
            <ConditionalField label="Children Play Outside" field="childrenPlayOutside" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'N/A']} />
            <ConditionalField label="Specific Outside Play Areas" field="outsidePlayAreas" condition={interview.childrenPlayOutside === 'Yes'} placeholder="Sandbox, deck, yard, etc." />
            <ConditionalField label="Lead Dust from Outdoors/Yard Concern" field="leadDustFromOutdoors" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'Unknown']} />
            <ConditionalField label="Soil Tracking into Home" field="soilTrackingIntohome" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'Unknown']} />
            <ConditionalField label="Vintage Toys/Painted Furniture Present" field="vintageToysOrFurniture" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'Unknown']} />

            <ConditionalField label="Children Put Things in Mouth" field="childrenPutThingsInMouth" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'N/A']} />
            <ConditionalField label="Child Chews Windowsills" field="childChewsWindowsills" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'N/A']} />
            <ConditionalField label="Child Chews Painted Surfaces" field="childChewsPaintedSurfaces" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'N/A']} />

            <ConditionalField label="Child Plays Near Windows/Wells" field="childPlaysNearWindowsWells" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'N/A']} />
            <ConditionalField label="Child Contacts Bare Soil" field="childContactsBareSoil" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'N/A']} />
            <ConditionalField label="Child Eats Outside" field="childEatsOutside" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'N/A']} />
            <ConditionalField label="Child Washes Hands Before Eating" field="childWashesHandsBeforeEating" required={hasChildren} condition={hasChildren} options={['Always', 'Sometimes', 'Rarely', 'N/A']} />

            <ConditionalField label="Child Exhibits Pica Behavior (eats non-food items) *" field="childPicaBehavior" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'Unknown']} />
            <ConditionalField label="Pica Details" field="picaDetails" condition={interview.childPicaBehavior === 'Yes' && hasChildren} placeholder="What items? (dirt, paint chips, plaster, etc.)" />

            <ConditionalField label="Child Cared For Outside the Home *" field="childCaredOutsideHome" required={hasChildren} condition={hasChildren} options={['Yes - Daycare/Preschool', 'Yes - Relative/Babysitter', 'Yes - Multiple Locations', 'No']} />
            <ConditionalField label="Outside Care Location Details" field="outsideCareDetails" condition={interview.childCaredOutsideHome && interview.childCaredOutsideHome !== 'No' && hasChildren} placeholder="Address, facility name..." />
            <ConditionalField label="Outside Care Facility Type" field="outsideCareFacilityType" condition={interview.childCaredOutsideHome && interview.childCaredOutsideHome !== 'No' && hasChildren} options={['Daycare', 'Preschool', 'Relative Care', 'School', 'Multiple Locations', 'Other']} />
            <ConditionalField label="Outside Care Facility Year Built" field="outsideCareFacilityYearBuilt" condition={interview.childCaredOutsideHome && interview.childCaredOutsideHome !== 'No' && hasChildren} type="number" placeholder="Year (if known)" />

            <ConditionalField label="Floor Type in Child Play Areas" field="floorTypeChildAreas" required={hasChildren} condition={hasChildren} options={['Carpet', 'Hardwood', 'Tile', 'Vinyl/Linoleum', 'Mixed']} />
          </div>
        </div>
      </div>

      {/* Section 3: Lead Exposure History */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span>🔬</span> Section 3: Lead Exposure History
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.infoBox}>
            <span style={styles.infoIcon}>ℹ️</span>
            Identify any documented lead exposure, medical history, and occupational/hobby exposure.
          </div>
          <div style={styles.grid}>
            <ConditionalField label="Child Ever Tested for Lead" field="childEverTestedForLead" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'Unknown']} />
            <ConditionalField label="Blood Lead Test Date" field="bloodLeadTestDate" condition={interview.childEverTestedForLead === 'Yes' && hasChildren} type="date" placeholder="Date of test" />
            <ConditionalField label="Blood Lead Level (µg/dL)" field="bloodLeadLevel" condition={interview.childEverTestedForLead === 'Yes' && hasChildren} type="number" step="0.1" placeholder="e.g., 8.5" />
            <ConditionalField label="Test Results (BLL)" field="testResults" condition={interview.childEverTestedForLead === 'Yes' && hasChildren} placeholder="e.g., 8 µg/dL" />

            <ConditionalField label="Child on Medicaid" field="childOnMedicaid" required={hasChildren} condition={hasChildren} options={['Yes', 'No', 'Unknown']} />
            <InputField label="Health Concerns Reported" field="healthConcernsReported" required options={['Yes', 'No']} />
            <ConditionalField label="Health Concerns Details" field="healthConcernsDetails" condition={interview.healthConcernsReported === 'Yes'} type="textarea" placeholder="Describe any developmental, behavioral, or health issues..." />

            <InputField label="Occupational Lead Exposure" field="occupationalLeadExposure" required options={['Yes', 'No', 'Unknown']} />
            <ConditionalField label="Occupational Details" field="occupationalDetails" condition={interview.occupationalLeadExposure === 'Yes'} placeholder="Job type, protective equipment..." />
            <ConditionalField label="Years Employed in Lead-Related Occupation" field="yearsLeadOccupation" condition={interview.occupationalLeadExposure === 'Yes'} type="number" step="0.5" placeholder="Years" />
            <ConditionalField label="Work Clothes Washed Separately" field="workClothedWashedSeparately" condition={interview.occupationalLeadExposure === 'Yes'} options={['Yes', 'No', 'Sometimes']} />

            <InputField label="Hobby-Related Lead Exposure" field="hobbyLeadExposure" required options={['Yes', 'No']} />
            <ConditionalField label="Hobby Details" field="hobbyDetails" condition={interview.hobbyLeadExposure === 'Yes'} placeholder="e.g., fishing (tackle), ceramics, stained glass..." />
          </div>
        </div>
      </div>

      {/* Section 4: Property History & Maintenance */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span>🏠</span> Section 4: Property History & Maintenance
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.infoBox}>
            <span style={styles.infoIcon}>ℹ️</span>
            Document renovation history, previous inspections, and current visible hazards.
          </div>
          <div style={styles.grid}>
            <InputField label="Previous Lead Inspection" field="previousLeadInspection" required options={['Yes', 'No', 'Unknown']} />
            <ConditionalField label="Inspection Details" field="previousInspectionDetails" condition={interview.previousLeadInspection === 'Yes'} placeholder="Year, results, contractor..." />

            <InputField label="Previous Lead Abatement" field="previousLeadAbatement" required options={['Yes', 'No', 'Unknown']} />
            <ConditionalField label="Abatement Details" field="abatementDetails" condition={interview.previousLeadAbatement === 'Yes'} placeholder="What was done, when..." />

            <InputField label="Recent Renovation/Repair" field="recentRenovation" required options={['Yes', 'No']} />
            <ConditionalField label="Renovation Details" field="renovationDetails" condition={interview.recentRenovation === 'Yes'} placeholder="What rooms, when (month/year)..." />
            <ConditionalField label="Renovation Method" field="renovationMethod" condition={interview.recentRenovation === 'Yes'} options={['Contained/Wet Methods', 'Dry Sanding/Scraping', 'Professional Contractor', 'Unknown', 'N/A']} />

            <InputField label="Visible Paint Chips or Dust" field="paintChipsOrDust" required options={['Yes', 'No']} />
            <ConditionalField label="Paint Chip/Dust Locations" field="paintChipLocations" condition={interview.paintChipsOrDust === 'Yes'} placeholder="Windows, doors, walls, etc." />

            <InputField label="Windows Easy to Open/Close" field="windowsEasyToOpenClose" required options={['Yes', 'No', 'Some']} />
            <ConditionalField label="Window Problems" field="windowProblems" condition={interview.windowsEasyToOpenClose !== 'Yes'} placeholder="Stuck, broken, deteriorated seals..." />
          </div>
        </div>
      </div>

      {/* Section 5: Housekeeping Practices */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span>🧹</span> Section 5: Housekeeping Practices
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.infoBox}>
            <span style={styles.infoIcon}>ℹ️</span>
            Assess dust control practices and their effectiveness in reducing lead exposure.
          </div>
          <div style={styles.grid}>
            <InputField label="Cleaning Frequency" field="cleaningFrequency" required options={['Daily', '2-3 times/week', 'Weekly', 'Less than weekly']} />
            <InputField label="Cleaning Method" field="cleaningMethod" required options={['Wet mop/cloth', 'Vacuum with HEPA', 'Regular vacuum', 'Dry sweep', 'Mixed']} />
            <InputField label="Dust Accumulation" field="dustAccumulation" required options={['Minimal', 'Moderate', 'Heavy']} />
            <ConditionalField label="Dust Accumulation Locations" field="dustAccumulationLocations" condition={interview.dustAccumulation !== 'Minimal'} placeholder="Windowsills, corners, shelves..." />

            <InputField label="Shoes Removed at Door" field="shoesRemovedAtDoor" options={['Always', 'Sometimes', 'Never']} />

            <InputField label="Pets Present" field="petsPresent" required options={['Yes', 'No']} />
            <ConditionalField label="Pet Details" field="petDetails" condition={interview.petsPresent === 'Yes'} placeholder="Type (dog, cat, etc.), indoor/outdoor..." />
          </div>
        </div>
      </div>

      {/* Section 6: Water & Food */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span>💧</span> Section 6: Water & Food
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.infoBox}>
            <span style={styles.infoIcon}>ℹ️</span>
            Evaluate secondary lead exposure routes through water and food sources.
          </div>
          <div style={styles.grid}>
            <InputField label="Water Source" field="waterSource" required options={['Municipal', 'Well', 'Both', 'Unknown']} />
            <InputField label="Water Pipe Material" field="waterPipeMaterial" required options={['Copper', 'Lead', 'PVC', 'Unknown', 'Mixed']} />
            <InputField label="Uses Water Filter" field="usesWaterFilter" required options={['Yes', 'No']} />

            <InputField label="Cookware Type" field="cookwareType" placeholder="Material(s) used: stainless, ceramic, imported..." />
            <InputField label="Uses Imported Foods/Spices" field="usesImportedFoods" required options={['Yes', 'No']} />

            <InputField label="Uses Traditional/Herbal Remedies" field="usesTraditionalRemedies" required options={['Yes', 'No']} />
            <ConditionalField label="Remedy Details" field="remedyDetails" condition={interview.usesTraditionalRemedies === 'Yes'} placeholder="Types used, frequency..." />
            <ConditionalField label="Remedies/Cosmetics Country of Origin" field="remediesCountryOfOrigin" condition={interview.usesTraditionalRemedies === 'Yes'} placeholder="Country where obtained/produced (e.g., India, Mexico, etc.)" />

            <InputField label="Uses Cosmetics Containing Lead (kohl, surma, sindoor)" field="usesLeadCosmetics" required options={['Yes', 'No', 'Unknown']} />
            <ConditionalField label="Cosmetic Details" field="cosmeticDetails" condition={interview.usesLeadCosmetics === 'Yes'} placeholder="Product name, frequency, who uses it..." />

            <InputField label="Uses Imported Pottery/Ceramics for Food" field="usesImportedPottery" options={['Yes', 'No', 'Unknown']} />
          </div>
        </div>
      </div>

      {/* Section 7: Interview Notes */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span>📝</span> Section 7: Interview Notes & Observations
        </div>
        <div style={styles.sectionContent}>
          <div style={styles.infoBox}>
            <span style={styles.infoIcon}>ℹ️</span>
            Document additional concerns, observations, and interview quality.
          </div>
          <div style={styles.grid}>
            <div style={{...styles.fieldGroup, ...styles.gridFullWidth}}>
              <label style={styles.label}>
                Additional Concerns
                <span style={styles.optional}>(optional)</span>
              </label>
              <textarea
                style={styles.textarea}
                value={interview.additionalConcerns || ''}
                onChange={(e) => handleChange('additionalConcerns', e.target.value)}
                placeholder="Any other concerns or information not covered above..."
                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={(e) => Object.assign(e.target.style, { outline: 'none' })}
              />
            </div>

            <div style={{...styles.fieldGroup, ...styles.gridFullWidth}}>
              <label style={styles.label}>
                Interviewer's Observations
                <span style={styles.optional}>(optional)</span>
              </label>
              <textarea
                style={styles.textarea}
                value={interview.interviewerNotes || ''}
                onChange={(e) => handleChange('interviewerNotes', e.target.value)}
                placeholder="Inspector's notes on condition, household practices, cooperation level, etc..."
                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={(e) => Object.assign(e.target.style, { outline: 'none' })}
              />
            </div>

            <InputField label="Interviewee Cooperative" field="intervieweeCooperative" required options={['Yes', 'Partially', 'No']} />

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Interview Refused</label>
              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={interview.interviewRefused || false}
                  onChange={(e) => handleChange('interviewRefused', e.target.checked)}
                  id="interviewRefused"
                />
                <label htmlFor="interviewRefused" style={{cursor: 'pointer', fontSize: '14px', margin: 0}}>
                  Resident refused to complete interview
                </label>
              </div>
            </div>

            <ConditionalField label="Reason for Refusal" field="refusalReason" condition={interview.interviewRefused} type="textarea" placeholder="Document why interview was refused..." />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentInterviewTab;
