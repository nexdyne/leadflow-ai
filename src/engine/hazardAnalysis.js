import {
  THRESHOLDS,
  ABATEMENT_OPTIONS,
  INTERIM_CONTROL_OPTIONS
} from './constants';

export function getComponentCategory(component) {
  if (!component) return 'general';
  const comp = component.toLowerCase();
  if (comp.includes('window') || comp.includes('casing')) return 'windows';
  if (comp.includes('door')) return 'doors';
  if (comp.includes('wall')) return 'walls';
  if (comp.includes('porch') || comp.includes('rail')) return 'porch';
  if (comp.includes('soil')) return 'soil';
  return 'general';
}

export function getAbatementOptions(component) {
  const category = getComponentCategory(component);
  return ABATEMENT_OPTIONS[category] || ABATEMENT_OPTIONS.general;
}

export function getInterimControlOptions(component) {
  const category = getComponentCategory(component);
  if (category === 'windows' || category === 'doors') return INTERIM_CONTROL_OPTIONS.windows_doors;
  if (category === 'walls') return INTERIM_CONTROL_OPTIONS.walls;
  if (category === 'soil') return INTERIM_CONTROL_OPTIONS.soil;
  return INTERIM_CONTROL_OPTIONS.windows_doors;
}

export function determineSeverity(condition, component) {
  // Severity 1: deteriorated + accessible/friction/impact surfaces
  // Severity 2: deteriorated + exterior/inaccessible
  // Severity 3: intact positive

  if (!condition || condition.toLowerCase() === 'intact') return 3;

  const comp = component?.toLowerCase() || '';
  if (comp.includes('porch') || comp.includes('exterior')) return 2;

  return 1; // deteriorated, accessible
}

export function determinePriority(severity, component) {
  // Priority 1: high - active hazards in living spaces
  // Priority 2: medium - exterior/less accessible
  return severity === 1 ? 1 : 2;
}

export function generateHazards(xrfData, dustWipeSamples, soilSamples) {
  const hazards = [];

  // XRF positive readings
  xrfData.forEach((reading) => {
    if (reading.result >= THRESHOLDS.xrf_paint) {
      const severity = determineSeverity(reading.condition, reading.component);
      const priority = determinePriority(severity, reading.component);

      hazards.push({
        id: `xrf_${hazards.length}`,
        type: 'XRF Paint',
        component: reading.component || 'Unknown',
        location: `${reading.room} - ${reading.side || ''}`,
        result: reading.result,
        unit: 'mg/cm²',
        condition: reading.condition,
        severity,
        priority,
        cause: `Lead-based paint identified on ${reading.component} (${reading.result.toFixed(2)} mg/cm²)${reading.condition === 'Deteriorated' ? ' - DETERIORATED' : ''}`,
        abatementOptions: getAbatementOptions(reading.component),
        interimControlOptions: getInterimControlOptions(reading.component)
      });
    }
  });

  // Dust wipe hazards
  dustWipeSamples.forEach((sample) => {
    let threshold = THRESHOLDS.dust_floor;
    let hazardType = 'Unknown';

    if (sample.surfaceType === 'Hard Floor') threshold = THRESHOLDS.dust_floor;
    else if (sample.surfaceType === 'Carpet Floor') threshold = THRESHOLDS.dust_floor;
    else if (sample.surfaceType === 'Trough') threshold = THRESHOLDS.dust_sill_trough;
    else if (sample.surfaceType === 'Sill/Stool') threshold = THRESHOLDS.dust_sill_trough;
    else if (sample.surfaceType === 'Porch Floor') threshold = THRESHOLDS.dust_porch;

    if (sample.result >= threshold) {
      hazards.push({
        id: `dust_${hazards.length}`,
        type: 'Dust Wipe',
        component: `${sample.surfaceType} - ${sample.sampleId}`,
        location: sample.location,
        result: sample.result,
        unit: 'µg/ft²',
        severity: 1,
        priority: 1,
        cause: `Lead in dust on ${sample.surfaceType} exceeds hazard standard (${sample.result} µg/ft², threshold: ${threshold} µg/ft²)`,
        abatementOptions: [
          `1) Clean dust using wet methods and detergent`,
          `2) Replace or cover the surface`,
          `3) Stabilize the source of contamination`
        ],
        interimControlOptions: 'Damp clean using detergent and water, re-clean as needed'
      });
    }
  });

  // Soil hazards
  soilSamples.forEach((sample) => {
    let threshold = THRESHOLDS.soil_yard;

    if (sample.areaType === 'Play Area') threshold = THRESHOLDS.soil_play;

    if (sample.result >= threshold) {
      hazards.push({
        id: `soil_${hazards.length}`,
        type: 'Soil Lead',
        component: `Soil - ${sample.areaType}`,
        location: sample.location,
        result: sample.result,
        unit: 'ppm',
        severity: 1,
        priority: 1,
        cause: `Lead in soil exceeds hazard standard (${sample.result} ppm, threshold: ${threshold} ppm)${sample.areaType === 'Play Area' ? ' - PLAY AREA' : ''}`,
        abatementOptions: ABATEMENT_OPTIONS.soil,
        interimControlOptions: INTERIM_CONTROL_OPTIONS.soil
      });
    }
  });

  return hazards.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.severity - b.severity;
  });
}
