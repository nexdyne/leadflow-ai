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
    medium: 'Dust - Floors',
    threshold: 10,
    unit: 'µg/ft²',
    source: 'EPA 2024 Final Rule',
    effectiveDate: '2025-01-13',
    category: 'dust',
    description: 'Dust-lead hazard standard for floors',
    appliesTo: ['LIRA', 'EBL'],
    notes: 'EPA 2024 Final Rule lowered from 40 µg/ft². Note: EPA also establishes "any reportable level" as hazard trigger.'
  },
  {
    id: 'dust_sill',
    medium: 'Dust - Window Sills/Stools',
    threshold: 100,
    unit: 'µg/ft²',
    source: 'EPA 2024 Final Rule',
    effectiveDate: '2025-01-13',
    category: 'dust',
    description: 'Dust-lead hazard standard for window sills and stools',
    appliesTo: ['LIRA', 'EBL'],
    notes: 'EPA 2024 Final Rule lowered from 250 µg/ft²'
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
    medium: 'Clearance - Floors',
    threshold: 5,
    unit: 'µg/ft²',
    source: 'EPA 2024 Final Rule',
    effectiveDate: '2026-01-12',
    category: 'clearance',
    description: 'Post-abatement/interim control clearance level for floors',
    appliesTo: ['Clearance'],
    notes: 'Full compliance date Jan 12, 2026'
  },
  {
    id: 'clearance_sill',
    medium: 'Clearance - Window Sills',
    threshold: 40,
    unit: 'µg/ft²',
    source: 'EPA 2024 Final Rule',
    effectiveDate: '2026-01-12',
    category: 'clearance',
    description: 'Post-abatement/interim control clearance level for window sills',
    appliesTo: ['Clearance'],
    notes: 'Full compliance date Jan 12, 2026'
  },
  {
    id: 'clearance_trough',
    medium: 'Clearance - Window Troughs',
    threshold: 100,
    unit: 'µg/ft²',
    source: 'EPA 2024 Final Rule',
    effectiveDate: '2026-01-12',
    category: 'clearance',
    description: 'Post-abatement/interim control clearance level for window troughs',
    appliesTo: ['Clearance'],
    notes: 'Full compliance date Jan 12, 2026; per EPA 2024 Final Rule'
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
    citation: 'Act 219 of 1986',
    scope: 'State',
    description: 'Michigan statutory authority for lead-based paint abatement and licensing'
  },
  {
    id: 'state_michigan_admin_rules',
    name: 'Michigan Administrative Rules - Lead Abatement',
    citation: 'Michigan Admin Rules R 325.9901 – R 325.9975',
    scope: 'State',
    description: 'Michigan administrative rules governing lead-based paint activities, licensing, and certification'
  },
  {
    id: 'state_michigan_lira_ebl',
    name: 'Michigan LIRA-EBL Report Checklist',
    citation: 'LIRA-EBL Form 633775 V.3',
    scope: 'State',
    description: 'Official Michigan checklist for Lead Inspection/Risk Assessment and Elevated Blood Lead reports'
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
