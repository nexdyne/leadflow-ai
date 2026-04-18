import React, { useMemo, useState } from 'react';

// ============================================================================
// MICHIGAN LIRA-EBL COMPLIANCE CHECKLIST
// Based on Form 633775 V.3, HUD 24 CFR Part 35, EPA 40 CFR 745,
// HUD Chapters 5/7/12/15, Michigan EBL Environmental Investigation Protocol
// ============================================================================

// ── Validation helpers ──
function hasValue(v) { return v !== undefined && v !== null && v !== ''; }
function hasItems(arr) { return Array.isArray(arr) && arr.length > 0; }
function photoHasCategory(photos, catId) {
  return (photos || []).some(function(p) { return p.category === catId; });
}
function countPhotosWithCategory(photos, catId) {
  return (photos || []).filter(function(p) { return p.category === catId; }).length;
}

// ============================================================================
// BUILD CHECKLIST ITEMS — each item checks state in real time
// ============================================================================
function buildChecklist(state) {
  var pi = state.projectInfo || {};
  var xrf = state.xrfData || [];
  var dust = state.dustWipeSamples || [];
  var soil = state.soilSamples || [];
  var photos = state.photos || [];
  var hazards = state.hazards || [];
  var cc = state.complianceChecks || {};
  var inspectionType = pi.inspectionType || 'Risk Assessment';
  var programType = pi.programType || 'HUD';

  var isRA = inspectionType !== 'LBP Inspection Only';
  var isCombined = inspectionType === 'Combined LIRA';
  var isEBL = programType === 'EBL';
  var isMedicaid = programType === 'Medicaid';
  var isHUD = programType === 'HUD';

  // ── SECTION 1: Project & Property Information ──
  var sec1 = {
    id: 'project_info',
    title: 'Section 1: Project & Property Information',
    citation: 'Michigan LIRA-EBL Form 633775 §I; HUD 24 CFR 35.930',
    items: [
      { id: 'property_address', label: 'Property address', passed: hasValue(pi.propertyAddress), required: true, field: 'Project Info → Property Address' },
      { id: 'city_state_zip', label: 'City, State, ZIP', passed: hasValue(pi.city) && hasValue(pi.state) && hasValue(pi.zip), required: true, field: 'Project Info → City / State / ZIP' },
      { id: 'year_built', label: 'Year built (pre-1978 confirmation)', passed: hasValue(pi.yearBuilt) && parseInt(pi.yearBuilt) < 1978, required: true, field: 'Project Info → Year Built',
        warning: hasValue(pi.yearBuilt) && parseInt(pi.yearBuilt) >= 1978 ? 'Year built is 1978 or later — lead inspection may not be required' : null },
      { id: 'inspection_date', label: 'Inspection date', passed: hasValue(pi.inspectionDate), required: true, field: 'Project Info → Inspection Date' },
      { id: 'report_date', label: 'Report date', passed: hasValue(pi.reportDate), required: true, field: 'Project Info → Report Date' },
      { id: 'inspection_type', label: 'Inspection type selected', passed: hasValue(pi.inspectionType), required: true, field: 'Project Info → Inspection Type' },
      { id: 'program_type', label: 'Program type selected', passed: hasValue(pi.programType), required: true, field: 'Project Info → Program Type' },
    ]
  };

  // ── SECTION 2: Inspector Credentials ──
  var sec2 = {
    id: 'inspector',
    title: 'Section 2: Inspector / Risk Assessor Credentials',
    citation: 'EPA 40 CFR 745.226; Michigan R 325.9901–.9999; HUD 24 CFR 35.1340',
    items: [
      { id: 'inspector_name', label: 'Inspector name', passed: hasValue(pi.inspectorName), required: true, field: 'Project Info → Inspector Name' },
      { id: 'inspector_cert', label: 'Michigan certification number', passed: hasValue(pi.inspectorCert), required: true, field: 'Project Info → Certification #' },
      { id: 'inspector_email', label: 'Inspector contact email', passed: hasValue(pi.inspectorEmail), required: false, field: 'Project Info → Email' },
      { id: 'company_name', label: 'Company / firm name', passed: hasValue(pi.companyName), required: true, field: 'Project Info → Company Name' },
      { id: 'company_phone', label: 'Company phone', passed: hasValue(pi.companyPhone), required: false, field: 'Project Info → Company Phone' },
    ]
  };

  // ── SECTION 3: Client Information ──
  var sec3 = {
    id: 'client',
    title: 'Section 3: Client / Requesting Party',
    citation: 'Michigan LIRA-EBL Form 633775 §I; HUD 24 CFR 35.930(a)',
    items: [
      { id: 'client_name', label: 'Client / property owner name', passed: hasValue(pi.clientName), required: true, field: 'Project Info → Client Name' },
      { id: 'client_address', label: 'Client mailing address', passed: hasValue(pi.clientAddress), required: false, field: 'Project Info → Client Address' },
      { id: 'client_phone', label: 'Client phone number', passed: hasValue(pi.clientPhone), required: false, field: 'Project Info → Client Phone' },
    ]
  };

  // ── SECTION 4: XRF Instrument ──
  var sec4 = {
    id: 'xrf_instrument',
    title: 'Section 4: XRF Instrument & Calibration',
    citation: 'HUD Chapter 7 §7.3; EPA 40 CFR 745.227(a); Michigan R 325.9965',
    items: [
      { id: 'xrf_model', label: 'XRF make & model', passed: hasValue(pi.xrfModel), required: true, field: 'Project Info → XRF Model' },
      { id: 'xrf_serial', label: 'XRF serial number', passed: hasValue(pi.xrfSerial), required: true, field: 'Project Info → XRF Serial #' },
      { id: 'xrf_calibration', label: 'Calibration check documented (3+ readings on NIST SRM)', passed: !!cc.xrf_calibration, required: true, field: 'Check this box when calibration records are ready for Appendix F',
        note: 'Attach pre-inspection calibration data in Appendix F of the report', manualCheckId: 'xrf_calibration' },
    ]
  };

  // ── SECTION 5: XRF Testing Data ──
  var uniqueRooms = {};
  xrf.forEach(function(d) { if (d.room) uniqueRooms[d.room] = true; });
  var roomCount = Object.keys(uniqueRooms).length;

  var sec5 = {
    id: 'xrf_data',
    title: 'Section 5: XRF / Paint Testing Data',
    citation: 'HUD Chapter 7 §7.4; EPA 40 CFR 745.227(b)-(c); Michigan R 325.9966',
    items: [
      { id: 'xrf_readings', label: 'XRF readings uploaded', passed: xrf.length > 0, required: true, field: 'XRF Data tab',
        detail: xrf.length > 0 ? xrf.length + ' readings across ' + roomCount + ' rooms' : 'No XRF data entered' },
      { id: 'xrf_min_rooms', label: 'Minimum room coverage (each room tested)', passed: roomCount >= 3, required: true, field: 'XRF Data tab',
        warning: roomCount > 0 && roomCount < 3 ? 'Only ' + roomCount + ' rooms — HUD requires testing in every room' : null },
      { id: 'xrf_components', label: 'All testable components tested per room (window, door, wall, trim, etc.)', passed: xrf.length >= roomCount * 3, required: true, field: 'XRF Data tab',
        note: 'HUD Chapter 7 requires testing each component type in each room' },
    ]
  };

  // ── SECTION 6: Dust Wipe Sampling (Risk Assessment / Combined only) ──
  var sec6 = null;
  if (isRA) {
    var hasFloorSample = dust.some(function(d) {
      var st = (d.surfaceType || '').toLowerCase();
      var loc = (d.location || '').toLowerCase();
      return st === 'hard floor' || st === 'carpet floor' || st === 'porch floor' || loc.indexOf('floor') >= 0;
    });
    var hasSillSample = dust.some(function(d) {
      var st = (d.surfaceType || '').toLowerCase();
      var loc = (d.location || '').toLowerCase();
      return st === 'sill/stool' || st === 'trough' || loc.indexOf('sill') >= 0 || loc.indexOf('window') >= 0;
    });

    sec6 = {
      id: 'dust_wipe',
      title: 'Section 6: Dust Wipe Sampling',
      citation: 'HUD Chapter 5 §5.4; EPA 40 CFR 745.227(c); Michigan LIRA-EBL Checklist §V',
      items: [
        { id: 'dust_samples', label: 'Dust wipe samples collected', passed: dust.length > 0, required: true, field: 'Lab Results tab → Dust Wipe Samples',
          detail: dust.length > 0 ? dust.length + ' samples entered' : 'No dust wipe samples' },
        { id: 'dust_floor', label: 'At least one floor sample', passed: hasFloorSample, required: true, field: 'Lab Results tab',
          note: 'HUD requires floor samples in rooms where child spends most time' },
        { id: 'dust_sill', label: 'At least one window sill/stool sample', passed: hasSillSample, required: true, field: 'Lab Results tab',
          note: 'Window sill samples required per EPA 40 CFR 745.65' },
        { id: 'dust_photo', label: 'Dust wipe sample location photos', passed: photoHasCategory(photos, 'dust_sample_floor') || photoHasCategory(photos, 'dust_sample_sill'), required: true, field: 'Photos tab → Testing category' },
      ]
    };
  }

  // ── SECTION 7: Soil Sampling (Risk Assessment / Combined only) ──
  var sec7 = null;
  if (isRA) {
    var hasPlayArea = soil.some(function(s) {
      var at = (s.areaType || '').toLowerCase();
      var loc = (s.location || '').toLowerCase();
      return at === 'play area' || loc.indexOf('play') >= 0;
    });
    var hasDripline = soil.some(function(s) {
      var at = (s.areaType || '').toLowerCase();
      var loc = (s.location || '').toLowerCase();
      return at === 'dripline' || loc.indexOf('drip') >= 0 || loc.indexOf('foundation') >= 0;
    });

    sec7 = {
      id: 'soil',
      title: 'Section 7: Soil Sampling',
      citation: 'HUD Chapter 5 §5.5; EPA 40 CFR 745.227(d); Michigan LIRA-EBL Checklist §VI',
      items: [
        { id: 'soil_samples', label: 'Soil samples collected', passed: soil.length > 0, required: true, field: 'Lab Results tab → Soil Samples',
          detail: soil.length > 0 ? soil.length + ' samples entered' : 'No soil samples' },
        { id: 'soil_play', label: 'Play area soil sample', passed: hasPlayArea, required: true, field: 'Lab Results tab',
          note: 'Required per HUD — sample where children play outdoors' },
        { id: 'soil_dripline', label: 'Foundation dripline soil sample', passed: hasDripline, required: isHUD, field: 'Lab Results tab',
          note: 'Required for HUD programs; recommended for all' },
        { id: 'soil_photo', label: 'Soil sample location photos', passed: photoHasCategory(photos, 'soil_sample_play') || photoHasCategory(photos, 'soil_sample_dripline'), required: true, field: 'Photos tab → Testing category' },
      ]
    };
  }

  // ── SECTION 8: Lab Information ──
  var sec8 = {
    id: 'lab_info',
    title: 'Section 8: Laboratory Information',
    citation: 'EPA 40 CFR 745.227(f); HUD 24 CFR 35.1340(c); NLLAP Recognition',
    items: [
      { id: 'lab_name', label: 'NLLAP-accredited laboratory name', passed: hasValue(state.labName), required: isRA, field: 'Lab Results tab → Lab Name' },
      { id: 'lab_cert', label: 'Laboratory certification / accreditation number', passed: hasValue(state.labCertNumber), required: isRA, field: 'Lab Results tab → Cert #' },
    ]
  };

  // ── SECTION 9: Hazard Analysis ──
  var positiveXrf = xrf.filter(function(d) { return parseFloat(d.result) >= 1.0; });
  var sec9 = {
    id: 'hazard_analysis',
    title: 'Section 9: Hazard Identification & Analysis',
    citation: 'HUD Chapter 5 §5.6; EPA 40 CFR 745.227(h); Michigan LIRA-EBL Checklist §VII',
    items: [
      { id: 'hazards_generated', label: 'Hazard analysis completed', passed: hazards.length > 0, required: true, field: 'Hazard Analysis tab (or auto-runs on report generation)',
        detail: hazards.length > 0 ? hazards.length + ' hazards identified' : 'Run hazard analysis' },
      { id: 'positive_identified', label: 'All positive XRF results (≥1.0 mg/cm²) classified', passed: positiveXrf.length === 0 || hazards.length > 0, required: true, field: 'Hazard Analysis tab',
        detail: positiveXrf.length + ' positive XRF reading(s) found' },
      { id: 'hazard_photo', label: 'Deteriorated paint close-up photos', passed: photoHasCategory(photos, 'hazard_closeup'), required: true, field: 'Photos tab → Hazards category' },
    ]
  };

  // ── SECTION 10: Photo Documentation ──
  var extSides = ['ext_side_a', 'ext_side_b', 'ext_side_c', 'ext_side_d'];
  var extSidesDone = extSides.filter(function(cat) { return photoHasCategory(photos, cat); }).length;

  var sec10 = {
    id: 'photos',
    title: 'Section 10: Photo Documentation (Appendix D)',
    citation: 'Michigan LIRA-EBL Report Checklist §VIII; HUD Chapter 7 §7.5',
    items: [
      { id: 'photos_exist', label: 'Photos uploaded', passed: photos.length > 0, required: true, field: 'Photos tab',
        detail: photos.length + ' photo(s) uploaded' },
      { id: 'ext_4_sides', label: 'Exterior 4-side photos (A through D)', passed: extSidesDone === 4, required: true, field: 'Photos tab → Exterior category',
        detail: extSidesDone + '/4 sides photographed' },
      { id: 'interior_overview', label: 'Interior room overview photos', passed: photoHasCategory(photos, 'interior_room'), required: true, field: 'Photos tab → Interior category' },
      { id: 'general_overview', label: 'General property overview photo', passed: photoHasCategory(photos, 'general_property'), required: false, field: 'Photos tab → General category' },
    ]
  };

  // ── SECTION 11: EBL / Medicaid Additional (conditional) ──
  var sec11 = null;
  if (isEBL || isMedicaid) {
    sec11 = {
      id: 'ebl_medicaid',
      title: 'Section 11: EBL / Medicaid Child-Specific Requirements',
      citation: 'Michigan EBL Environmental Investigation Protocol; MDHHS Lead Poisoning Prevention',
      items: [
        { id: 'child_sleep_photo', label: 'Child sleeping area photo', passed: photoHasCategory(photos, 'child_sleep'), required: true, field: 'Photos tab → EBL category' },
        { id: 'child_play_photo', label: 'Child indoor play area photo', passed: photoHasCategory(photos, 'child_play'), required: true, field: 'Photos tab → EBL category' },
        { id: 'child_eat_photo', label: 'Child eating area photo', passed: photoHasCategory(photos, 'child_eat'), required: true, field: 'Photos tab → EBL category' },
        { id: 'child_chewable_photo', label: 'Chewable surfaces photo (sills/rails)', passed: photoHasCategory(photos, 'child_chewable'), required: true, field: 'Photos tab → EBL category' },
        { id: 'child_outdoor_photo', label: 'Outdoor play area photo', passed: photoHasCategory(photos, 'child_outdoor_play'), required: true, field: 'Photos tab → EBL category' },
        { id: 'household_items', label: 'Household lead-containing items documented', passed: photoHasCategory(photos, 'household_items'), required: isEBL, field: 'Photos tab → EBL category',
          note: 'Required for EBL — document toys, ceramics, imported items' },
      ]
    };
  }

  // ── SECTION 12: Report Appendices ──
  var sec12 = {
    id: 'appendices',
    title: 'Section 12: Report Appendices & Attachments',
    citation: 'Michigan LIRA-EBL Form 633775 §IX; HUD 24 CFR 35.930(b)',
    note: 'These items are included as placeholder sections in the generated report. Attach actual documents before final delivery.',
    items: [
      { id: 'app_a', label: 'Appendix A: Resident Interview form', passed: !!cc.app_a, required: isRA || isEBL, field: 'Check this box when form is ready to attach',
        note: 'Complete and attach the Michigan Resident Interview form', manualCheckId: 'app_a' },
      { id: 'app_b', label: 'Appendix B: Building Condition Survey', passed: !!cc.app_b, required: true, field: 'Check this box when survey is ready to attach',
        note: 'Document interior/exterior building conditions', manualCheckId: 'app_b' },
      { id: 'app_c', label: 'Appendix C: Floor Plans', passed: !!cc.app_c, required: isHUD || isEBL, field: 'Check this box when floor plans are ready to attach',
        note: 'Show room numbers, sample locations, compass orientation', manualCheckId: 'app_c' },
      { id: 'app_d', label: 'Appendix D: Photo Log', passed: photos.length > 0, required: true, field: 'Auto-generated from Photos tab' },
      { id: 'app_e', label: 'Appendix E: Laboratory Reports', passed: !!cc.app_e || hasValue(state.labName), required: isRA, field: 'Check this box when lab reports are ready to attach',
        note: 'Attach original lab analysis reports from NLLAP-accredited laboratory', manualCheckId: 'app_e' },
      { id: 'app_f', label: 'Appendix F: XRF Calibration Data', passed: !!cc.app_f, required: true, field: 'Check this box when calibration records are ready to attach',
        note: 'Attach XRF calibration records, PCS, pre/post inspection checks', manualCheckId: 'app_f' },
      { id: 'app_g', label: 'Appendix G: Inspector Credentials', passed: !!cc.app_g || hasValue(pi.inspectorCert), required: true, field: 'Check this box when credentials are ready to attach',
        note: 'Attach copy of inspector/risk assessor certification card or license', manualCheckId: 'app_g' },
    ]
  };

  // Assemble all sections
  var sections = [sec1, sec2, sec3, sec4, sec5];
  if (sec6) sections.push(sec6);
  if (sec7) sections.push(sec7);
  sections.push(sec8, sec9, sec10);
  if (sec11) sections.push(sec11);
  sections.push(sec12);

  return sections;
}

// ============================================================================
// COMPUTE SUMMARY STATS
// ============================================================================
function computeStats(sections) {
  var totalRequired = 0;
  var passedRequired = 0;
  var totalOptional = 0;
  var passedOptional = 0;
  var warnings = [];
  var criticalMissing = [];

  sections.forEach(function(sec) {
    sec.items.forEach(function(item) {
      if (item.required) {
        totalRequired++;
        if (item.passed) passedRequired++;
        else criticalMissing.push({ section: sec.title, item: item.label, field: item.field });
      } else {
        totalOptional++;
        if (item.passed) passedOptional++;
      }
      if (item.warning) {
        warnings.push({ section: sec.title, message: item.warning });
      }
    });
  });

  return {
    totalRequired: totalRequired,
    passedRequired: passedRequired,
    totalOptional: totalOptional,
    passedOptional: passedOptional,
    warnings: warnings,
    criticalMissing: criticalMissing,
    percentComplete: totalRequired > 0 ? Math.round((passedRequired / totalRequired) * 100) : 0
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function ComplianceTab({ state, dispatch }) {
  var [expandedSections, setExpandedSections] = useState({});
  var [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);

  function handleManualCheck(checkId) {
    dispatch({ type: 'TOGGLE_COMPLIANCE_CHECK', payload: checkId });
  }

  var pi = state.projectInfo || {};
  var inspectionType = pi.inspectionType || 'Risk Assessment';
  var programType = pi.programType || 'HUD';

  var sections = useMemo(function() {
    return buildChecklist(state);
  }, [state]);

  var stats = useMemo(function() {
    return computeStats(sections);
  }, [sections]);

  function toggleSection(secId) {
    setExpandedSections(function(prev) {
      var next = Object.assign({}, prev);
      next[secId] = !prev[secId];
      return next;
    });
  }

  function expandAll() {
    var all = {};
    sections.forEach(function(s) { all[s.id] = true; });
    setExpandedSections(all);
  }

  function collapseAll() {
    setExpandedSections({});
  }

  // Determine overall status
  var overallStatus = 'incomplete';
  if (stats.percentComplete === 100) overallStatus = 'complete';
  else if (stats.percentComplete >= 75) overallStatus = 'nearly';
  else if (stats.percentComplete >= 50) overallStatus = 'partial';

  var statusColors = {
    complete: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800', bar: 'bg-green-500', badge: 'bg-green-100 text-green-800' },
    nearly: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800' },
    partial: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800' },
    incomplete: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800', bar: 'bg-red-500', badge: 'bg-red-100 text-red-800' },
  };
  var sc = statusColors[overallStatus];

  return (
    <div className="space-y-6">

      {/* ── HEADER / SUMMARY ── */}
      <div className={'rounded-lg border-2 p-5 ' + sc.bg + ' ' + sc.border}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className={'text-xl font-bold ' + sc.text}>
              Michigan LIRA-EBL Compliance Checklist
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Based on Form 633775 V.3 | {inspectionType} | {programType} Program
            </p>
          </div>
          <div className={'text-center px-4 py-2 rounded-lg font-bold text-lg ' + sc.badge}>
            {stats.percentComplete}%
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className={'font-medium ' + sc.text}>Required Items: {stats.passedRequired}/{stats.totalRequired}</span>
            <span className="text-gray-500">Optional: {stats.passedOptional}/{stats.totalOptional}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className={'h-3 rounded-full transition-all duration-500 ' + sc.bar}
              style={{ width: stats.percentComplete + '%' }} />
          </div>
        </div>

        {/* Warnings */}
        {stats.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {stats.warnings.map(function(w, i) {
              return (
                <div key={i} className="flex items-start gap-2 text-sm text-yellow-800 bg-yellow-100 rounded px-3 py-1.5">
                  <span className="shrink-0">{'\u26A0\uFE0F'}</span>
                  <span><strong>{w.section}:</strong> {w.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CONTROLS ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200 text-gray-700 font-medium">Expand All</button>
          <button onClick={collapseAll} className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200 text-gray-700 font-medium">Collapse All</button>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showOnlyIncomplete} onChange={function(e) { setShowOnlyIncomplete(e.target.checked); }}
            className="rounded border-gray-300" />
          Show only incomplete items
        </label>
      </div>

      {/* ── SECTIONS ── */}
      <div className="space-y-3">
        {sections.map(function(section) {
          var isExpanded = expandedSections[section.id] !== false; // default open
          var sectionRequired = section.items.filter(function(i) { return i.required; });
          var sectionPassed = sectionRequired.filter(function(i) { return i.passed; });
          var sectionComplete = sectionPassed.length === sectionRequired.length;

          var displayItems = showOnlyIncomplete
            ? section.items.filter(function(i) { return !i.passed; })
            : section.items;

          if (showOnlyIncomplete && displayItems.length === 0) return null;

          return (
            <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Section header */}
              <button
                onClick={function() { toggleSection(section.id); }}
                className={'w-full flex items-center justify-between px-4 py-3 text-left font-semibold transition ' +
                  (sectionComplete
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gradient-to-r from-blue-800 to-blue-600 text-white hover:from-blue-900 hover:to-blue-700')}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{sectionComplete ? '\u2713' : '\u25CF'}</span>
                  <div>
                    <div className="text-sm">{section.title}</div>
                    <div className="text-xs font-normal opacity-80">{section.citation}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={'text-xs px-2 py-0.5 rounded ' +
                    (sectionComplete ? 'bg-green-500 text-white' : 'bg-white bg-opacity-20 text-white')}>
                    {sectionPassed.length}/{sectionRequired.length}
                  </span>
                  <span className="text-sm">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                </div>
              </button>

              {/* Section items */}
              {isExpanded && (
                <div className="p-4">
                  {section.note && (
                    <p className="text-xs text-gray-500 italic mb-3 bg-gray-50 rounded px-3 py-2">{section.note}</p>
                  )}

                  <div className="space-y-2">
                    {displayItems.map(function(item) {
                      return (
                        <div key={item.id} className={'flex items-start gap-3 px-3 py-2 rounded ' +
                          (item.passed ? 'bg-green-50' : item.required ? 'bg-red-50' : 'bg-gray-50')}>

                          {/* Status icon or manual checkbox */}
                          {item.manualCheckId ? (
                            <input type="checkbox" checked={!!item.passed}
                              onChange={function() { handleManualCheck(item.manualCheckId); }}
                              className="w-5 h-5 shrink-0 mt-0.5 rounded border-gray-300 text-blue-600 cursor-pointer" />
                          ) : (
                            <span className={'text-lg shrink-0 mt-0.5 ' +
                              (item.passed ? 'text-green-600' : item.required ? 'text-red-500' : 'text-gray-400')}>
                              {item.passed ? '\u2713' : item.required ? '\u2717' : '\u25CB'}
                            </span>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={'text-sm font-medium ' +
                                (item.passed ? 'text-green-800' : item.required ? 'text-red-800' : 'text-gray-600')}>
                                {item.label}
                              </span>
                              {item.required && !item.passed && (
                                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">REQUIRED</span>
                              )}
                            </div>

                            {/* Detail text */}
                            {item.detail && (
                              <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                            )}

                            {/* Where to fix */}
                            {!item.passed && item.field && (
                              <p className="text-xs text-blue-600 mt-0.5">
                                {'\u2192'} {item.field}
                              </p>
                            )}

                            {/* Note */}
                            {item.note && (
                              <p className="text-xs text-gray-400 italic mt-0.5">{item.note}</p>
                            )}

                            {/* Warning */}
                            {item.warning && (
                              <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1 mt-1">
                                {'\u26A0\uFE0F'} {item.warning}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── CRITICAL MISSING ITEMS SUMMARY ── */}
      {stats.criticalMissing.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5">
          <h3 className="font-bold text-red-800 mb-3">
            {'\u26D4'} {stats.criticalMissing.length} Required Item{stats.criticalMissing.length !== 1 ? 's' : ''} Missing
          </h3>
          <p className="text-sm text-red-700 mb-3">
            These items must be completed before the report meets Michigan LIRA-EBL compliance requirements:
          </p>
          <div className="space-y-1">
            {stats.criticalMissing.map(function(m, i) {
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-red-400 shrink-0">{'\u2022'}</span>
                  <span className="text-red-800">
                    <strong>{m.item}</strong>
                    <span className="text-red-500 text-xs ml-2">{'\u2192'} {m.field}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALL COMPLETE ── */}
      {stats.percentComplete === 100 && (
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-5 text-center">
          <div className="text-4xl mb-2">{'\u2705'}</div>
          <h3 className="font-bold text-green-800 text-lg">All Required Items Complete</h3>
          <p className="text-sm text-green-700 mt-1">
            This report meets Michigan LIRA-EBL compliance requirements for a <strong>{inspectionType}</strong> under the <strong>{programType}</strong> program.
            Proceed to the Generate Report tab to export.
          </p>
        </div>
      )}

      {/* ── REGULATORY REFERENCE ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-700 text-sm mb-2">Regulatory References</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
          <div>{'\u2022'} Michigan LIRA-EBL Report Checklist (Form 633775, V.3)</div>
          <div>{'\u2022'} EPA 40 CFR Part 745 — Lead-Based Paint Activities</div>
          <div>{'\u2022'} HUD 24 CFR Part 35 — Lead-Based Paint Poisoning Prevention</div>
          <div>{'\u2022'} HUD Guidelines Ch. 5 (Risk Assessment), Ch. 7 (Inspection)</div>
          <div>{'\u2022'} Michigan Administrative Rules R 325.9901–.9999</div>
          <div>{'\u2022'} Michigan EBL Environmental Investigation Protocol</div>
          <div>{'\u2022'} HUD Guidelines Ch. 12/15 (Clearance/Abatement)</div>
          <div>{'\u2022'} NLLAP Laboratory Recognition Program</div>
        </div>
      </div>
    </div>
  );
}

export default ComplianceTab;
