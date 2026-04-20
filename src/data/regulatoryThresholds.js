export const REGULATORY_THRESHOLDS = [
  {
    id: 'xrf_paint',
    medium: 'Paint (XRF)',
    threshold: 1.0,
    unit: 'mg/cm²',
    source: 'EPA 40 CFR 745.65 / HUD 24 CFR 35',
    effectiveDate: '1999-01-01',
    category: 'paint',
    description: 'XRF reading at or above this level identifies lead-based paint',
    appliesTo: ['LIRA', 'EBL', 'Clearance', 'LBP Inspection'],
    notes: '1.0 mg/cm² is the hazard identification threshold per EPA 2024 Final Rule'
  },
  {
    id: 'xrf_inconclusive',
    medium: 'Paint (XRF - Inconclusive Range)',
    threshold: 0.7,
    unit: 'mg/cm²',
    source: 'EPA 2024 Final Rule',
    effectiveDate: '2025-01-13',
    category: 'paint',
    description: 'XRF readings between 0.7 and 1.0 mg/cm² are inconclusive',
    appliesTo: ['LIRA', 'EBL', 'LBP Inspection'],
    notes: 'Inconclusive range requires additional lab analysis or multiple XRF readings for confirmation'
  },
  {
    id: 'paint_lab_percent',
    medium: 'Paint (Lab - % weight)',
    threshold: 0.5,
    unit: '% by weight',
    source: 'EPA 40 CFR 745.65',
    effectiveDate: '1999-01-01',
    category: 'paint',
    description: 'Laboratory paint chip analysis threshold by weight percentage',
    appliesTo: ['LIRA', 'EBL', 'Clearance', 'LBP Inspection'],
    notes: 'Equivalent to 5,000 ppm'
  },
  {
    id: 'paint_lab_ppm',
    medium: 'Paint (Lab - ppm)',
    threshold: 5000,
    unit: 'ppm',
    source: 'EPA 40 CFR 745.65',
    effectiveDate: '1999-01-01',
    category: 'paint',
    description: 'Laboratory paint chip analysis threshold by concentration',
    appliesTo: ['LIRA', 'EBL', 'Clearance', 'LBP Inspection'],
    notes: 'Equivalent to 0.5% by weight'
  },
  {
    id: 'dust_floor',
    medium: 'Dust - Floors (DLRL)',
    threshold: null,
    thresholdLabel: 'Any Reportable Level',
    unit: 'µg/ft²',
    source: '40 CFR 745.65(b); 89 FR 89416 (Nov 12, 2024)',
    effectiveDate: '2025-01-13',
    category: 'dust',
    description: 'Dust-Lead Reportable Level (DLRL) for floors',
    appliesTo: ['LIRA', 'EBL'],
    notes: 'EPA Reconsideration Rule (eff. Jan 13, 2025): renamed DLHS→DLRL. Any lab-reportable value from an NLLAP-recognized lab constitutes a dust-lead hazard. Previous numeric standard (10 µg/ft²) retired.'
  },
  {
    id: 'dust_sill',
    medium: 'Dust - Interior Window Sills (DLRL)',
    threshold: null,
    thresholdLabel: 'Any Reportable Level',
    unit: 'µg/ft²',
    source: '40 CFR 745.65(b); 89 FR 89416 (Nov 12, 2024)',
    effectiveDate: '2025-01-13',
    category: 'dust',
    description: 'Dust-Lead Reportable Level (DLRL) for interior window sills',
    appliesTo: ['LIRA', 'EBL'],
    notes: 'EPA Reconsideration Rule (eff. Jan 13, 2025): any NLLAP-lab reportable value is a hazard. Previous numeric standard (100 µg/ft²) retired.'
  },
  {
    id: 'dust_trough',
    medium: 'Dust - Window Troughs',
    threshold: 100,
    unit: 'µg/ft²',
    source: 'HUD',
    effectiveDate: '2004-09-15',
    category: 'dust',
    description: 'Dust-lead hazard standard for window troughs',
    appliesTo: ['LIRA', 'EBL'],
    notes: 'HUD-specific standard, not in EPA rule'
  },
  {
    id: 'dust_porch',
    medium: 'Dust - Porches',
    threshold: 40,
    unit: 'µg/ft²',
    source: 'HUD',
    effectiveDate: '2004-09-15',
    category: 'dust',
    description: 'Dust-lead hazard standard for porch floors',
    appliesTo: ['LIRA', 'EBL'],
    notes: 'HUD-specific standard for porch/exterior floors'
  },
  {
    id: 'clearance_floor',
    medium: 'Clearance - Floors (DLAL)',
    threshold: 5,
    unit: 'µg/ft²',
    source: '40 CFR 745.227(e)(8)(viii); 89 FR 89416',
    effectiveDate: '2025-01-13',
    category: 'clearance',
    description: 'Dust-Lead Action Level (DLAL) for floors — post-abatement clearance must be < this value',
    appliesTo: ['Clearance'],
    notes: 'EPA Reconsideration Rule renamed DLCL→DLAL; lowered from 10 µg/ft². Clearance achieved only if < 5 µg/ft².'
  },
  {
    id: 'clearance_sill',
    medium: 'Clearance - Interior Window Sills (DLAL)',
    threshold: 40,
    unit: 'µg/ft²',
    source: '40 CFR 745.227(e)(8)(viii); 89 FR 89416',
    effectiveDate: '2025-01-13',
    category: 'clearance',
    description: 'Dust-Lead Action Level (DLAL) for interior window sills — clearance must be < this value',
    appliesTo: ['Clearance'],
    notes: 'EPA Reconsideration Rule renamed DLCL→DLAL; lowered from 100 µg/ft².'
  },
  {
    id: 'clearance_trough',
    medium: 'Clearance - Window Troughs (DLAL)',
    threshold: 100,
    unit: 'µg/ft²',
    source: '40 CFR 745.227(e)(8)(viii); 89 FR 89416',
    effectiveDate: '2025-01-13',
    category: 'clearance',
    description: 'Dust-Lead Action Level (DLAL) for window troughs — clearance must be < this value',
    appliesTo: ['Clearance'],
    notes: 'EPA Reconsideration Rule renamed DLCL→DLAL; lowered from 400 µg/ft².'
  },
  {
    id: 'de_minimis_interior',
    medium: 'De Minimis - Interior Components',
    threshold: 2,
    unit: 'sq ft per component per room',
    source: 'EPA 2024 Final Rule',
    effectiveDate: '2025-01-13',
    category: 'de_minimis',
    description: 'Maximum interior component area exempt from abatement',
    appliesTo: ['LIRA', 'EBL', 'Abatement'],
    notes: 'Interior de minimis applies per component per room; exterior is 20 sq ft per component'
  },
  {
    id: 'soil_play',
    medium: 'Soil - Play Areas',
    threshold: 400,
    unit: 'ppm',
    source: 'EPA 40 CFR 745.65 / HUD',
    effectiveDate: '2001-03-06',
    category: 'soil',
    description: 'Soil-lead hazard standard for bare soil in children\'s play areas',
    appliesTo: ['LIRA', 'EBL'],
    notes: 'Composite of bare soil samples in play area'
  },
  {
    id: 'soil_yard',
    medium: 'Soil - Rest of Yard',
    threshold: 1200,
    unit: 'ppm',
    source: 'EPA 40 CFR 745.65 / HUD',
    effectiveDate: '2001-03-06',
    category: 'soil',
    description: 'Soil-lead hazard standard for bare soil outside play areas',
    appliesTo: ['LIRA', 'EBL'],
    notes: 'Average of bare soil samples from non-play areas'
  },
  // ─── MIOSHA occupational thresholds (Michigan Part 603 / Part 310) ───
  // Michigan is stricter than federal OSHA on blood-lead medical removal and return-to-work.
  {
    id: 'miosha_action_level',
    medium: 'Air - Action Level (8-hr TWA)',
    threshold: 30,
    unit: 'µg/m³',
    source: 'MIOSHA Part 603 R 325.51922; 29 CFR 1926.62(b)',
    effectiveDate: '2021-03-29',
    category: 'occupational',
    description: 'Action Level for airborne lead exposure (8-hour time-weighted average)',
    appliesTo: ['LIRA', 'EBL', 'Clearance', 'LBP Inspection'],
    notes: 'Triggers exposure assessment, medical surveillance, and training under MIOSHA Part 603 / federal 29 CFR 1926.62'
  },
  {
    id: 'miosha_pel',
    medium: 'Air - Permissible Exposure Limit (8-hr TWA)',
    threshold: 50,
    unit: 'µg/m³',
    source: 'MIOSHA Part 603 R 325.51923; 29 CFR 1926.62(c)(1)',
    effectiveDate: '2021-03-29',
    category: 'occupational',
    description: 'Permissible Exposure Limit for airborne lead (8-hour time-weighted average)',
    appliesTo: ['LIRA', 'EBL', 'Clearance', 'LBP Inspection'],
    notes: 'Exposures above PEL require respiratory protection, engineering controls, and written compliance program'
  },
  {
    id: 'miosha_medical_removal_single',
    medium: 'Blood Lead - Medical Removal (single)',
    threshold: 30,
    unit: 'µg/dL',
    source: 'MIOSHA Part 603 R 325.51988',
    effectiveDate: '2018-12-11',
    category: 'occupational',
    description: 'Michigan-specific: single confirmed BLL at or above this level triggers medical removal',
    appliesTo: ['LIRA', 'EBL', 'Clearance', 'LBP Inspection'],
    notes: 'STRICTER than federal OSHA (60 µg/dL). Michigan was the first state to lower this threshold (Dec 2018).'
  },
  {
    id: 'miosha_medical_removal_avg',
    medium: 'Blood Lead - Medical Removal (6-mo avg)',
    threshold: 20,
    unit: 'µg/dL',
    source: 'MIOSHA Part 603 R 325.51988',
    effectiveDate: '2018-12-11',
    category: 'occupational',
    description: 'Michigan-specific: 3-test 6-month average at or above this level triggers medical removal',
    appliesTo: ['LIRA', 'EBL', 'Clearance', 'LBP Inspection'],
    notes: 'STRICTER than federal OSHA (50 µg/dL).'
  },
  {
    id: 'miosha_return_to_work',
    medium: 'Blood Lead - Return to Work',
    threshold: 15,
    unit: 'µg/dL',
    source: 'MIOSHA Part 603 R 325.51988',
    effectiveDate: '2018-12-11',
    category: 'occupational',
    description: 'Michigan-specific: two consecutive BLLs must be below this value to return a removed worker',
    appliesTo: ['LIRA', 'EBL', 'Clearance', 'LBP Inspection'],
    notes: 'STRICTER than federal OSHA (40 µg/dL). Requires 2 consecutive tests below threshold.'
  },
  {
    id: 'miosha_annual_exam',
    medium: 'Blood Lead - Annual Exam Trigger',
    threshold: 15,
    unit: 'µg/dL',
    source: 'MIOSHA Part 603 R 325.51988',
    effectiveDate: '2018-12-11',
    category: 'occupational',
    description: 'Any BLL at or above this level in past 12 months triggers annual medical exam',
    appliesTo: ['LIRA', 'EBL', 'Clearance', 'LBP Inspection'],
    notes: 'Michigan-specific medical surveillance trigger'
  },
  {
    id: 'mdhhs_ebl_case_definition',
    medium: 'Blood Lead - MDHHS EBL Case Definition (pediatric)',
    threshold: 3.5,
    unit: 'µg/dL',
    source: 'MDHHS Lead Services Section policy (2022–current)',
    effectiveDate: '2022-01-01',
    category: 'occupational',
    description: 'Michigan: confirmed pediatric BLL at or above this value triggers LIRA-EBL response',
    appliesTo: ['EBL'],
    notes: 'Lowered from 5 µg/dL in 2022 to align with CDC Blood Lead Reference Value. Triggers the LIRA-EBL inspection pathway.'
  }
];

export const REGULATORY_FRAMEWORKS = [
  {
    id: 'federal_hud',
    name: 'HUD Lead Safe Housing Rule',
    citation: '24 CFR Part 35',
    scope: 'Federal',
    description: 'Requirements for lead-based paint hazard evaluation and reduction in federally-assisted housing',
    chapters: [
      { number: '5', title: 'Risk Assessment', key: true },
      { number: '7', title: 'Lead-Based Paint Inspection', key: true },
      { number: '11', title: 'Ongoing Lead-Based Paint Maintenance', key: false },
      { number: '12', title: 'Abatement', key: false },
      { number: '15', title: 'Clearance', key: true }
    ]
  },
  {
    id: 'federal_epa',
    name: 'EPA Lead-Based Paint Program',
    citation: '40 CFR Part 745',
    scope: 'Federal',
    description: 'EPA requirements for lead-based paint activities including training, certification, and work practice standards',
    subparts: [
      { letter: 'D', title: 'Lead-Based Paint Hazards', key: true },
      { letter: 'E', title: 'Residential Property Renovation', key: false },
      { letter: 'L', title: 'Lead-Based Paint Activities', key: true },
      { letter: 'Q', title: 'State and Indian Tribal Programs', key: false }
    ]
  },
  {
    id: 'state_michigan_lead_act',
    name: 'Michigan Lead Abatement Act',
    citation: 'Public Health Code, Act 368 of 1978, Part 54A (MCL 333.5451 – 333.5477)',
    scope: 'State',
    description: 'Michigan statutory authority for lead-based paint abatement, inspector/risk assessor licensing, and LIRA program'
  },
  {
    id: 'state_michigan_admin_rules',
    name: 'Michigan Administrative Rules - Lead Hazard Control Program',
    citation: 'Mich. Admin. Code R 325.99101 – R 325.99403',
    scope: 'State',
    description: 'Michigan administrative rules promulgated under MCL 333.5451+ governing lead activities, licensing, certification, and recordkeeping'
  },
  {
    id: 'state_michigan_lira_ebl',
    name: 'Michigan LIRA-EBL Report Guide & Checklist',
    citation: 'MDHHS LIRA-EBL Report Guide (Form 633775 V.2/V.3)',
    scope: 'State',
    description: 'Official MDHHS guide for Lead Inspection Risk Assessment triggered by a confirmed Elevated Blood Lead case (pediatric BLL ≥ 3.5 µg/dL)'
  },
  {
    id: 'state_miosha_part603',
    name: 'MIOSHA Part 603 - Lead Exposure in Construction',
    citation: 'Mich. Admin. Code R 325.51901 – R 325.51998 (MIOSHA-STD-1403)',
    scope: 'State',
    description: 'Michigan occupational lead standard for construction — stricter than federal OSHA on medical removal and return-to-work BLLs',
    subparts: [
      { letter: '1922', title: 'Action Level (30 µg/m³)', key: true },
      { letter: '1923', title: 'Permissible Exposure Limit (50 µg/m³)', key: true },
      { letter: '1988', title: 'Medical Surveillance & Removal (BLL triggers)', key: true },
      { letter: '1994', title: 'Recordkeeping (30-year exposure / employment + 30-year medical)', key: false }
    ]
  },
  {
    id: 'federal_osha_1926_62',
    name: 'OSHA Lead in Construction',
    citation: '29 CFR 1926.62',
    scope: 'Federal',
    description: 'Federal occupational lead exposure standard for construction activities including LBP abatement and renovation',
    subparts: [
      { letter: 'b', title: 'Action Level (30 µg/m³ 8-hr TWA)', key: true },
      { letter: 'c', title: 'Permissible Exposure Limit (50 µg/m³ 8-hr TWA)', key: true },
      { letter: 'j', title: 'Medical Surveillance & Biological Monitoring', key: true },
      { letter: 'k', title: 'Medical Removal Protection', key: true },
      { letter: 'l', title: 'Training (initial + annual)', key: false }
    ]
  },
  {
    id: 'program_medicaid',
    name: 'Medicaid Investigation Protocol',
    citation: 'MDHHS Lead Poisoning Prevention',
    scope: 'Program',
    description: 'Requirements for Medicaid-funded lead investigations in Michigan'
  }
];

export function getThreshold(id) {
  return REGULATORY_THRESHOLDS.find(function(t) { return t.id === id; });
}

export function getThresholdsByCategory(category) {
  return REGULATORY_THRESHOLDS.filter(function(t) { return t.category === category; });
}

export function getThresholdsForInspectionType(inspectionType) {
  return REGULATORY_THRESHOLDS.filter(function(t) {
    return t.appliesTo.some(function(a) { return inspectionType.includes(a); });
  });
}

export function getFrameworksByScope(scope) {
  return REGULATORY_FRAMEWORKS.filter(function(f) { return f.scope === scope; });
}

export function getDefaultThresholds() {
  return REGULATORY_THRESHOLDS.map(function(t) {
    return { id: t.id, threshold: t.threshold };
  });
}
