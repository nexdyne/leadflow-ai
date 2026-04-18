// ============================================================================
// HAZARD IDENTIFICATION THRESHOLDS
// Updated per EPA Final Rule (effective Jan 13, 2025; full compliance Jan 12, 2026)
// Michigan adopted via MDHHS Memo effective Dec 23, 2025
// ============================================================================
export const THRESHOLDS = {
  xrf_paint: 1.0, // mg/cm² - EPA/HUD standard (40 CFR 745.65)
  xrf_paint_lab: 0.5, // % by weight or 5000 ppm (lab paint chip analysis)

  // DUST-LEAD HAZARD STANDARDS (for hazard identification in risk assessments)
  // Per EPA 2024 Final Rule: "any reportable level" from NLLAP lab = hazard
  // The numeric thresholds below are EPA's PREVIOUS action levels, still used
  // as reference by many HUD programs. LeadFlow flags ANY detectable level.
  dust_floor: 10,          // µg/ft² - Legacy EPA/HUD action level
  dust_sill_trough: 100,   // µg/ft² - Legacy EPA/HUD action level
  dust_porch: 40,          // µg/ft² - Legacy HUD action level

  // DUST-LEAD CLEARANCE LEVELS (post-abatement/interim control)
  // Per EPA 2024 Final Rule effective Jan 12, 2026
  clearance_floor: 5,      // µg/ft²
  clearance_sill: 40,      // µg/ft²
  clearance_trough: 100,   // µg/ft²

  // SOIL HAZARD STANDARDS (unchanged)
  soil_play: 400,   // ppm - EPA/HUD bare soil play areas
  soil_yard: 1200   // ppm - EPA/HUD bare soil rest of yard
};

// Flag for new EPA "any reportable level" standard
export const USE_ANY_REPORTABLE_LEVEL = true;

export const HAZARD_SEVERITY = {
  1: { label: 'Severity 1 (Highest)', color: 'bg-red-500', textColor: 'text-red-700' },
  2: { label: 'Severity 2 (Medium)', color: 'bg-orange-500', textColor: 'text-orange-700' },
  3: { label: 'Severity 3 (Intact Positive)', color: 'bg-yellow-500', textColor: 'text-yellow-700' }
};

export const HAZARD_PRIORITY = {
  1: { label: 'Priority 1 (High)', color: 'bg-red-100', borderColor: 'border-red-300' },
  2: { label: 'Priority 2 (Medium)', color: 'bg-yellow-100', borderColor: 'border-yellow-300' }
};

export const ABATEMENT_OPTIONS = {
  windows: [
    '1) Remove and replace with new windows that comply with EPA requirements',
    '2) Replace individual components (sashes, frames, or panes)',
    '3) Enclose or cover the component with new materials',
    '4) Strip to substrate, stabilize, and repaint with EPA-approved encapsulant'
  ],
  doors: [
    '1) Remove and replace door systems that comply with EPA requirements',
    '2) Replace individual components (door panels, frames)',
    '3) Strip both sides to substrate, make necessary repairs, stabilize, and repaint'
  ],
  walls: [
    '1) Enclose with drywall or plywood',
    '2) Wet scrape/sand all surfaces, make necessary repairs, stabilize, and apply Michigan-approved encapsulant'
  ],
  porch: [
    '1) Remove and replace component',
    '2) Strip to substrate, make necessary repairs, stabilize, and repaint'
  ],
  soil: [
    '1) Remove top 6 inches and replace with clean soil, seed to grass',
    '2) Enclose with concrete or asphalt covering'
  ],
  general: [
    '1) Remove and replace',
    '2) Strip to substrate, stabilize, and repaint'
  ]
};

export const INTERIM_CONTROL_OPTIONS = {
  windows_doors: 'Wet scrape/sand all surfaces to remove loose paint, make necessary repairs, stabilize all surfaces and repaint with EPA-approved paint or encapsulant',
  walls: 'Wet scrape/sand all surfaces to remove loose paint, make necessary repairs, stabilize all surfaces and repaint with EPA-approved paint or encapsulant',
  soil: 'Remove paint chips and debris from surface, blend top 6 inches by tilling, cover with landscape fabric and groundcover'
};
