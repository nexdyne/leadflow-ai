/**
 * Natural Language Generation Engine for LeadFlow AI
 * Generates professional report text from structured inspection data
 * No external AI API required - uses intelligent template-based generation
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a date string (YYYY-MM-DD) to readable format
 */
function formatDate(dateStr) {
  if (!dateStr) return '[date not provided]';
  const date = new Date(dateStr + 'T00:00:00');
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Safe property access with fallback
 */
function safe(obj, path, fallback = '') {
  const value = path.split('.').reduce((acc, part) => acc?.[part], obj);
  return value || fallback;
}

/**
 * Get regulation text based on program type
 */
function getRegulationFromProgram(programType) {
  const regulations = {
    'HUD': '24 CFR Part 35 (Lead-Based Paint Disclosure Rule)',
    'EPA': '40 CFR Part 745 (Lead-Based Paint Rule)',
    'LIRA': 'Michigan LIRA-EBL (Lead-Based Paint Assessment Requirements)',
    'RRP': '40 CFR Part 63 (Renovation, Repair and Painting Rule)',
    'LBP': 'EPA Lead-Based Paint Rule (40 CFR Part 745)',
  };
  return regulations[programType] || '40 CFR Part 745 (EPA Lead-Based Paint Rule)';
}

// ============================================================================
// 1. EXECUTIVE SUMMARY
// ============================================================================

export function generateExecutiveSummary(state) {
  const pi = state.projectInfo;
  const hazards = state.hazards || [];

  // Extract key numbers
  const xrfPositives = hazards.filter(h => h.hazardType === 'xrf').length;
  const dustExceedances = hazards.filter(h => h.hazardType === 'dust').length;
  const soilExceedances = hazards.filter(h => h.hazardType === 'soil').length;
  const severity1Count = hazards.filter(h => h.severity === 1).length;

  // Build opening paragraph
  const inspectionType = pi.inspectionType || 'Lead-Based Paint Risk Assessment';
  const address = safe(pi, 'propertyAddress', '[address]');
  const city = safe(pi, 'city', '[city]');
  const zip = safe(pi, 'zip', '[zip]');
  const yearBuilt = safe(pi, 'yearBuilt', '[year]');
  const inspectionDate = formatDate(safe(pi, 'inspectionDate'));
  const dwellingType = safe(pi, 'dwellingType', 'residential');

  let summary = `A ${inspectionType} was conducted at ${address}, ${city}, Michigan ${zip} on ${inspectionDate}. `;
  summary += `The property is a ${yearBuilt}-constructed ${dwellingType} structure.\n\n`;

  // Build findings paragraph
  if (xrfPositives > 0 || dustExceedances > 0 || soilExceedances > 0) {
    summary += 'Findings:\n';

    if (xrfPositives > 0) {
      summary += `XRF testing identified ${xrfPositives} surface(s) with lead-based paint at or above the hazard identification threshold of 1.0 mg/cm². `;
    }

    if (dustExceedances > 0) {
      // Display specific thresholds for dust hazards
      const floorDustHazards = hazards.filter(h => h.hazardType === 'dust' && h.surfaceType === 'floor');
      const sillDustHazards = hazards.filter(h => h.hazardType === 'dust' && (h.surfaceType === 'sill' || h.surfaceType === 'windowsill'));

      if (floorDustHazards.length > 0) {
        summary += `${floorDustHazards.length} floor dust sample(s) exceeded the EPA hazard standard of 10 µg/ft². `;
      }
      if (sillDustHazards.length > 0) {
        summary += `${sillDustHazards.length} sill dust sample(s) exceeded the EPA hazard standard of 100 µg/ft². `;
      }
    }

    if (soilExceedances > 0) {
      const soilThreshold = 400; // standard EPA threshold
      summary += `${soilExceedances} soil sample(s) exceeded the ${soilThreshold} ppm hazard threshold. `;
    }

    summary += '\n\n';
  } else {
    summary += `Findings:\nNo lead-based paint was identified during the inspection.\n\n`;
  }

  // Build recommendations paragraph
  if (severity1Count > 0) {
    summary += `Immediate interim controls are recommended for ${severity1Count} deteriorated lead-based paint surface(s) in occupied living spaces. `;
  } else if (hazards.length > 0) {
    // HUD Chapter 11 language conditional on inspection type
    const isRiskAssessment = inspectionType.toLowerCase().includes('risk assessment') ||
                             inspectionType.toLowerCase().includes('lira') ||
                             inspectionType.toLowerCase().includes('combined');
    if (isRiskAssessment) {
      summary += 'Lead-based paint was identified in intact condition. Ongoing maintenance and monitoring per HUD Chapter 11 is recommended. ';
    } else {
      summary += 'Lead-based paint was identified in intact condition. Ongoing maintenance and monitoring is recommended. ';
    }
  }

  // Re-evaluation schedule
  if (hazards.length > 0) {
    summary += 'Re-evaluation of this property is recommended within 2 years per Michigan LIRA-EBL requirements. ';
  }

  summary += '\n\n';

  // Closing
  const regulation = getRegulationFromProgram(pi.programType);
  summary += `This report was prepared in accordance with ${regulation}.`;

  return summary;
}

// ============================================================================
// 2. HAZARD DESCRIPTIONS
// ============================================================================

export function generateHazardDescriptions(hazards, state) {
  if (!hazards || !Array.isArray(hazards)) {
    return [];
  }

  return hazards.map((hazard, index) => {
    let description = '';
    const hazardId = hazard.id || `hazard_${index}`;

    switch (hazard.hazardType) {
      case 'xrf':
        description = generateXRFHazardDescription(hazard);
        break;
      case 'dust':
        description = generateDustHazardDescription(hazard);
        break;
      case 'soil':
        description = generateSoilHazardDescription(hazard);
        break;
      default:
        description = `Hazard identified: ${hazard.room || '[room]'}, ${hazard.component || '[component]'}`;
    }

    return {
      hazardId,
      description
    };
  });
}

function generateXRFHazardDescription(hazard) {
  const component = capitalize(safe(hazard, 'component', 'surface'));
  const room = capitalize(safe(hazard, 'room', '[room]'));
  const side = safe(hazard, 'side', 'unknown side');
  const result = (hazard.result || 0).toFixed(2);
  const condition = safe(hazard, 'condition', 'unknown');
  const severityLabel = getSeverityLabel(hazard.severity);

  let desc = `Lead-based paint was identified on the ${component} in ${room}, ${side}. `;
  desc += `The XRF reading of ${result} mg/cm² exceeds the EPA/HUD hazard identification threshold of 1.0 mg/cm². `;
  desc += `The paint was observed to be in ${condition} condition. `;

  if (condition === 'deteriorated' || condition === 'damaged' || condition === 'chipping') {
    desc += `Given the deteriorated condition, this surface represents an active lead hazard requiring ${severityLabel} attention. `;
    desc += 'Recommended actions include: encapsulation, enclosure, or component replacement with certified lead-safe practices.';
  } else {
    desc += 'This intact surface may be managed through maintenance and monitoring protocols.';
  }

  return desc;
}

function generateDustHazardDescription(hazard) {
  const sampleId = safe(hazard, 'sampleId', 'unknown');
  const surface = capitalize(safe(hazard, 'surfaceType', 'floor surface'));
  const location = capitalize(safe(hazard, 'location', '[location]'));
  const result = (hazard.result || 0).toFixed(1);

  // Validate and display correct threshold based on surface type
  let threshold;
  let surfaceTypeNormalized = (safe(hazard, 'surfaceType', '')).toLowerCase();

  if (surfaceTypeNormalized === 'floor') {
    threshold = 10;
  } else if (surfaceTypeNormalized === 'sill' || surfaceTypeNormalized === 'windowsill') {
    threshold = 100;
  } else if (surfaceTypeNormalized === 'trough') {
    threshold = 100;
  } else {
    threshold = hazard.threshold || 40;
  }

  let desc = `Dust wipe sample ${sampleId} collected from the ${surface} in ${location} yielded a result of ${result} µg/ft², `;
  desc += `exceeding the EPA hazard standard of ${threshold} µg/ft². `;
  desc += 'Per EPA 2024 Final Rule (40 CFR 745.65), any reportable level of lead in dust constitutes a hazard. ';
  desc += 'This indicates lead-contaminated dust is present and requires remediation including cleaning and source control.';

  return desc;
}

function generateSoilHazardDescription(hazard) {
  const location = capitalize(safe(hazard, 'location', '[location]'));
  const result = (hazard.result || 0).toFixed(0);
  const threshold = hazard.threshold || 400;
  const depth = safe(hazard, 'depth', '[depth]');

  let desc = `Soil sample collected from ${location} at ${depth} depth yielded ${result} ppm, `;
  desc += `exceeding the EPA hazard standard of ${threshold} ppm. `;
  desc += 'Recommended actions include: soil remediation, capping, or containment measures as appropriate.';

  return desc;
}

function getSeverityLabel(severity) {
  const labels = {
    1: 'immediate',
    2: 'prompt',
    3: 'routine'
  };
  return labels[severity] || 'routine';
}

// ============================================================================
// 3. PROPERTY DESCRIPTION
// ============================================================================

export function generatePropertyDescription(state) {
  const pi = state.projectInfo;
  const bs = state.buildingSurvey || {};

  const stories = safe(bs, 'stories', '[number of]');
  const constructionType = safe(bs, 'constructionType', 'residential');
  const yearBuilt = safe(pi, 'yearBuilt', '[year]');
  const exteriorCladding = safe(bs, 'exteriorCladding', 'vinyl');
  const claddingCondition = safe(bs, 'claddingCondition', 'fair');
  const windowType = safe(bs, 'windowType', 'single-hung');
  const windowCondition = safe(bs, 'windowCondition', 'fair');
  const hasGarage = safe(bs, 'hasGarage', false);
  const garageType = safe(bs, 'garageType', 'detached');
  const garageCondition = safe(bs, 'garageCondition', 'fair');
  const roofType = safe(bs, 'roofType', '[type]');
  const roofCondition = safe(bs, 'roofCondition', 'fair');

  let description = `The subject property is a ${stories}-story ${constructionType} structure built in approximately ${yearBuilt}. `;

  // Features/layout
  const bedrooms = safe(bs, 'bedrooms', '');
  const bathrooms = safe(bs, 'bathrooms', '');
  let layout = [];
  if (bedrooms) layout.push(`${bedrooms} bedroom(s)`);
  if (bathrooms) layout.push(`${bathrooms} bathroom(s)`);
  if (layout.length > 0) {
    description += `The property features ${layout.join(', ')}. `;
  }

  // Exterior
  description += `Exterior cladding consists of ${exteriorCladding} in ${claddingCondition} condition. `;
  description += `Windows are ${windowType} in ${windowCondition} condition. `;
  description += `The roof is ${roofType} in ${roofCondition} condition. `;

  // Garage
  if (hasGarage) {
    description += `A ${garageType} garage is present in ${garageCondition} condition. `;
  }

  return description.trim();
}

// ============================================================================
// 4. RECOMMENDATIONS
// ============================================================================

export function generateRecommendations(hazards, state) {
  if (!hazards || !Array.isArray(hazards)) {
    return '';
  }

  const severity1 = hazards.filter(h => h.severity === 1);
  const severity2 = hazards.filter(h => h.severity === 2);
  const severity3 = hazards.filter(h => h.severity === 3);

  // Determine inspection type for conditional recommendations
  const inspectionType = safe(state, 'projectInfo.inspectionType', '').toLowerCase();
  const isRiskAssessment = inspectionType.includes('risk assessment') ||
                            inspectionType.includes('lira') ||
                            inspectionType.includes('combined');

  let recommendations = '';

  // Severity 1 (Immediate)
  if (severity1.length > 0) {
    recommendations += `SEVERITY 1 (IMMEDIATE ATTENTION REQUIRED):\n`;
    recommendations += `${severity1.length} hazard(s) require immediate interim control or abatement:\n`;

    const xrfHazards = severity1.filter(h => h.hazardType === 'xrf');
    const dustHazards = severity1.filter(h => h.hazardType === 'dust');

    if (xrfHazards.length > 0) {
      recommendations += `- ${xrfHazards.length} deteriorated lead-based paint surface(s): Encapsulation, enclosure, or component replacement recommended\n`;
    }
    if (dustHazards.length > 0) {
      recommendations += `- ${dustHazards.length} contaminated dust area(s): Professional cleaning and source control required\n`;
    }

    recommendations += `\n`;
  }

  // Severity 2 (Prompt)
  if (severity2.length > 0) {
    recommendations += `SEVERITY 2 (PROMPT ACTION RECOMMENDED):\n`;
    recommendations += `${severity2.length} hazard(s) should be addressed within 6-12 months:\n`;
    recommendations += `- Interim controls including cleaning, paint stabilization, or containment\n`;
    recommendations += `- Regular monitoring and maintenance\n\n`;
  }

  // Severity 3 (Routine)
  if (severity3.length > 0) {
    recommendations += `SEVERITY 3 (ROUTINE MANAGEMENT):\n`;
    recommendations += `${severity3.length} hazard(s) can be managed through ongoing maintenance:\n`;
    recommendations += `- Maintain intact lead-based paint surfaces in good condition\n`;
    recommendations += `- Implement lead-safe maintenance practices per HUD guidelines\n`;
    recommendations += `- Regular inspection and cleaning to control lead-contaminated dust\n\n`;
  }

  // General recommendations
  recommendations += `GENERAL RECOMMENDATIONS:\n`;
  recommendations += `- Clearance testing must be conducted by an independent certified inspector following hazard control activities per 40 CFR 745.227(e)\n`;

  // Conditional language for Risk Assessment vs LBP Inspection Only
  if (isRiskAssessment) {
    recommendations += `- Re-evaluation of lead-based paint conditions is recommended within 2 years per Michigan LIRA-EBL requirements\n`;
    recommendations += `- All work must comply with 24 CFR Part 35 (HUD Lead-Safe Housing Rule) disclosure and notification requirements\n`;
  } else {
    recommendations += `- Lead-based paint inspection should be followed by risk assessment or combination LIRA evaluation for comprehensive hazard characterization\n`;
  }

  recommendations += `- Occupants must receive copies of all lead assessment reports and recommendations\n`;
  recommendations += `- Maintain documentation of all hazard control activities and clearance test results\n`;

  return recommendations.trim();
}

// ============================================================================
// 5. DISCLOSURE LANGUAGE
// ============================================================================

export function generateDisclosureLanguage(state) {
  const programType = safe(state, 'projectInfo.programType', 'EPA');

  let disclosure = '';

  // Standard EPA/HUD disclosure
  disclosure += `FEDERAL LEAD-BASED PAINT DISCLOSURE\n\n`;

  disclosure += `Property Address: ${safe(state, 'projectInfo.propertyAddress', '[address not provided]')}, `;
  disclosure += `${safe(state, 'projectInfo.city', '[city]')}, Michigan ${safe(state, 'projectInfo.zip', '[zip]')}\n\n`;

  disclosure += `Notification of Lead-Based Paint and/or Lead-Based Paint Hazards (40 CFR 745.113):\n\n`;

  // EXACT statutory language from 40 CFR 745.113
  disclosure += `Every purchaser of any interest in residential real property on which a residential dwelling was built prior to 1978 is notified that such property may present exposure to lead from lead-based paint that may place young children at risk of developing lead poisoning. Lead poisoning in young children may produce permanent neurological damage, including learning disabilities, reduced intelligence quotient, behavioral problems, and impaired memory. Lead poisoning also poses a particular risk to pregnant women. The seller of any interest in residential real property is required to provide the buyer with any information on lead-based paint hazards from risk assessments or inspections in the seller's possession and notify the buyer of any known lead-based paint hazards. A risk assessment or inspection for possible lead-based paint hazards is recommended prior to purchase.\n\n`;

  // Michigan-specific citation
  disclosure += `Michigan Lead-Based Paint Assessment Notification:\n`;
  disclosure += `This inspection was conducted in accordance with the Michigan Lead Abatement Act (Public Health Code, Act 368 of 1978, Part 54A, MCL 333.5451 – 333.5477) and Michigan Administrative Rules R 325.99101 – R 325.99403. `;
  disclosure += `This property has been assessed for lead-based paint in accordance with Michigan Lead-Based Paint Assessment Standards (LIRA-EBL). `;
  disclosure += `All XRF testing, dust wipe sampling, and soil testing were conducted by a Michigan-licensed lead-based paint inspector using EPA-approved methods. `;
  disclosure += `Hazard assessment and recommendations follow HUD Chapter 11 standards and 40 CFR Part 745 requirements.\n\n`;

  // Regulation-specific language
  if (programType === 'HUD') {
    disclosure += `Lead-Based Paint Disclosure (24 CFR Part 35):\n`;
    disclosure += `This property has been inspected for the presence of lead-based paint hazards by a certified lead-based paint inspector in accordance `;
    disclosure += `with 24 CFR Part 35 (Lead-Based Paint Disclosure Rule). The seller/owner is required to provide copies of any available records or reports pertaining `;
    disclosure += `to the presence of lead-based paint or lead-based paint hazards in the property.\n\n`;
  }

  disclosure += `EPA Lead-Based Paint Rule (40 CFR Part 745):\n`;
  disclosure += `Any person who is subject to this rule must: (1) provide the lead-based paint disclosure form to purchasers or lessees; `;
  disclosure += `(2) provide all available records and reports on the presence of lead-based paint; and (3) allow the purchaser or lessee a period `;
  disclosure += `of time to conduct a lead-based paint inspection.\n\n`;

  disclosure += `Occupant/Owner Acknowledgment:\n`;
  disclosure += `The owner/occupant has been provided with this lead-based paint hazard assessment report and is responsible for making `;
  disclosure += `all appropriate notifications to current and future occupants as required by federal and state law.`;

  return disclosure.trim();
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export default {
  generateExecutiveSummary,
  generateHazardDescriptions,
  generatePropertyDescription,
  generateRecommendations,
  generateDisclosureLanguage,
};
