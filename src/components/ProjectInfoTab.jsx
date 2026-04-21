import React, { useMemo } from 'react';

/**
 * ProjectInfoTab
 * ----------------------------------------------------------------------------
 * Collects the core project / property / inspector metadata that drives every
 * downstream artifact (XRF data, hazards, report, clearance determination).
 *
 * Regulatory anchors — these drive the live validations below:
 *  - 40 CFR 745.223             Target Housing = pre-1978 residential
 *  - 40 CFR 745.227(b)          XRF daily pre/post calibration check (PCS)
 *  - 40 CFR 745.227(d)          Risk Assessment requirements
 *  - 40 CFR 745.81 / 745.223    Child-Occupied Facility (RRP trigger)
 *  - 40 CFR 745.226             Federal certification — 3-year cycle
 *  - Michigan R 325.99207       Report content requirements
 *  - Michigan R 325.99308       State licensing categories + annual renewal
 *  - MCL 333.5474 / MDHHS       EBL investigation authority
 *  - HUD 24 CFR 35.930          Risk assessment sample size per unit
 *
 * This tab does NOT enforce — it surfaces data-quality signals so the inspector
 * can correct the record before it propagates into the report.
 */
function ProjectInfoTab({ state, dispatch }) {
  const { projectInfo } = state;

  const handleChange = (field, value) => {
    dispatch({
      type: 'UPDATE_PROJECT_INFO',
      payload: { [field]: value }
    });
  };

  // ------------------------------------------------------------------------
  // Derived validations — all read-only, all tied to a citation
  // ------------------------------------------------------------------------
  const validations = useMemo(() => {
    const yb = parseInt(projectInfo.yearBuilt, 10);
    const yearBuiltValid = !isNaN(yb) && yb >= 1800 && yb <= new Date().getFullYear();
    const isPost1978 = yearBuiltValid && yb >= 1978;
    const isTargetHousing = yearBuiltValid && yb < 1978;

    const insp = projectInfo.inspectionDate ? new Date(projectInfo.inspectionDate) : null;
    const rpt = projectInfo.reportDate ? new Date(projectInfo.reportDate) : null;
    const inspectionBeforeYearBuilt = insp && yearBuiltValid && insp.getFullYear() < yb;
    const reportBeforeInspection = insp && rpt && rpt < insp;

    // Program/inspection-type mismatch — HUD clearance and EBL specifically
    // require tighter scopes than a bare "LBP Inspection Only"
    const progType = projectInfo.programType || '';
    const inspType = projectInfo.inspectionType || '';
    const hudNeedsRA = progType === 'HUD' && inspType === 'LBP Inspection Only';
    const eblNeedsInvestigation = progType === 'EBL' && inspType !== 'Combined LIRA' && inspType !== 'Risk Assessment';

    // Michigan ZIPs are 48xxx–49xxx. Flag MI+non-MI-ZIP as a likely typo.
    const zipStr = (projectInfo.zip || '').trim();
    const zip5 = zipStr.slice(0, 5);
    const miZipMismatch = projectInfo.state === 'MI' && /^\d{5}$/.test(zip5) && !(zip5 >= '48000' && zip5 <= '49999');

    // Email sanity (light check — browser type=email does the rest)
    const email = (projectInfo.inspectorEmail || '').trim();
    const emailMalformed = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // Certification expiration (optional field — if present, warn when near/past)
    const certExp = projectInfo.inspectorCertExpiration ? new Date(projectInfo.inspectorCertExpiration) : null;
    let certState = 'na';
    let certDaysLeft = null;
    if (certExp && !isNaN(certExp.getTime())) {
      const now = new Date();
      certDaysLeft = Math.floor((certExp - now) / (1000 * 60 * 60 * 24));
      if (certDaysLeft < 0) certState = 'expired';
      else if (certDaysLeft <= 30) certState = 'critical';
      else if (certDaysLeft <= 90) certState = 'warning';
      else certState = 'ok';
    }

    // XRF daily calibration status (40 CFR 745.227(b) — start + finish of each day)
    const todayISO = new Date().toISOString().split('T')[0];
    const calToday = (state.calibrationReadings || []).filter(r => {
      const d = r && (r.date || r.timestamp);
      if (!d) return false;
      const iso = typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
      return iso === todayISO;
    });
    const calStartDone = calToday.some(r => (r.type || '').toLowerCase().includes('start') || (r.label || '').toLowerCase().includes('start'));
    const calEndDone = calToday.some(r => (r.type || '').toLowerCase().includes('end') || (r.label || '').toLowerCase().includes('end') || (r.type || '').toLowerCase().includes('post'));

    return {
      yearBuiltValid,
      isPost1978,
      isTargetHousing,
      inspectionBeforeYearBuilt,
      reportBeforeInspection,
      hudNeedsRA,
      eblNeedsInvestigation,
      miZipMismatch,
      emailMalformed,
      certState,
      certDaysLeft,
      calCount: calToday.length,
      calStartDone,
      calEndDone
    };
  }, [projectInfo, state.calibrationReadings]);

  // ------------------------------------------------------------------------
  // Compact UI helpers
  // ------------------------------------------------------------------------
  const Banner = ({ tone, title, children }) => {
    const tones = {
      info: 'bg-blue-50 border-blue-200 text-blue-900',
      warning: 'bg-yellow-50 border-yellow-300 text-yellow-900',
      critical: 'bg-red-50 border-red-300 text-red-900',
      ok: 'bg-green-50 border-green-300 text-green-900'
    };
    return (
      <div className={`p-3 rounded-lg border ${tones[tone] || tones.info} text-sm`}>
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div className="text-xs leading-relaxed">{children}</div>
      </div>
    );
  };

  const SectionHeader = ({ title, cite }) => (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-blue-900 mb-1">{title}</h3>
      {cite && <div className="text-xs text-blue-800 opacity-80">{cite}</div>}
    </div>
  );

  const certBadge = () => {
    const s = validations.certState;
    if (s === 'na') return null;
    const colors = {
      ok: 'bg-green-100 text-green-800 border-green-300',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      critical: 'bg-orange-100 text-orange-800 border-orange-300',
      expired: 'bg-red-100 text-red-800 border-red-300'
    };
    const label = s === 'expired'
      ? `Expired ${Math.abs(validations.certDaysLeft)}d ago`
      : s === 'ok'
        ? `Valid ${validations.certDaysLeft}d`
        : `${validations.certDaysLeft}d until renewal`;
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs border ${colors[s]}`}>{label}</span>
    );
  };

  return (
    <div className="space-y-6">

      {/* ================================================================== */}
      {/* Data-quality banners (only render when there's something to flag)   */}
      {/* ================================================================== */}
      {validations.isPost1978 && (
        <Banner tone="warning" title="Post-1978 property">
          Year built {projectInfo.yearBuilt} is after the EPA Target Housing cutoff
          (40 CFR 745.223). Federal LBP inspection/RA rules do not apply unless this
          is an EBL investigation or a child-occupied facility built with pre-1978
          materials. Confirm inspection scope before proceeding.
        </Banner>
      )}

      {validations.isTargetHousing && (
        <Banner tone="ok" title="Target Housing (pre-1978)">
          40 CFR 745.223 — federal LBP rules apply. HUD 24 CFR Part 35 applies
          if federally funded.
        </Banner>
      )}

      {validations.inspectionBeforeYearBuilt && (
        <Banner tone="critical" title="Date inconsistency">
          Inspection date ({projectInfo.inspectionDate}) is before the property
          was built ({projectInfo.yearBuilt}). Correct one of these values.
        </Banner>
      )}

      {validations.reportBeforeInspection && (
        <Banner tone="critical" title="Report predates inspection">
          Report date ({projectInfo.reportDate}) is earlier than inspection date
          ({projectInfo.inspectionDate}). Michigan R 325.99207 requires the report
          to be generated after the inspection.
        </Banner>
      )}

      {validations.hudNeedsRA && (
        <Banner tone="warning" title="HUD program / inspection scope mismatch">
          HUD-funded work under 24 CFR Part 35 typically requires a Risk
          Assessment or Combined LIRA — not an inspection-only scope. If this is
          a clearance-only visit, switch Program Type accordingly.
        </Banner>
      )}

      {validations.eblNeedsInvestigation && (
        <Banner tone="warning" title="EBL program / scope mismatch">
          An EBL investigation under MCL 333.5474 is typically a Risk Assessment
          or Combined LIRA focused on the child's environment. Confirm scope.
        </Banner>
      )}

      {projectInfo.propertyInfoIsMockData && (
        <Banner tone="critical" title="Simulated property data in record">
          Property fields were populated from the Public Records Lookup demo.
          Replace with field-verified data before generating a final report
          (40 CFR 745.227(h) — factual accuracy).
        </Banner>
      )}

      {/* ================================================================== */}
      {/* Property Information                                                */}
      {/* ================================================================== */}
      <SectionHeader
        title="Property Information"
        cite="40 CFR 745.227(e)(8) — identifying info for the subject property"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Street Address"
          value={projectInfo.propertyAddress}
          onChange={(e) => handleChange('propertyAddress', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="City"
          value={projectInfo.city}
          onChange={(e) => handleChange('city', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <select
          value={projectInfo.state}
          onChange={(e) => handleChange('state', e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option>MI</option>
          <option>OH</option>
          <option>IN</option>
        </select>
        <div>
          <input
            type="text"
            placeholder="ZIP"
            value={projectInfo.zip}
            onChange={(e) => handleChange('zip', e.target.value)}
            className={`border rounded px-3 py-2 w-full ${validations.miZipMismatch ? 'border-yellow-400' : ''}`}
          />
          {validations.miZipMismatch && (
            <div className="text-xs text-yellow-800 mt-1">
              ZIP {projectInfo.zip} is not in Michigan's 48xxx–49xxx range — verify state/ZIP.
            </div>
          )}
        </div>
        <div>
          <input
            type="number"
            placeholder="Year Built"
            value={projectInfo.yearBuilt}
            onChange={(e) => handleChange('yearBuilt', e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
          {!projectInfo.yearBuilt && (
            <div className="text-xs text-gray-600 mt-1">
              Required — determines 40 CFR 745.223 Target Housing status.
            </div>
          )}
        </div>
        <div>
          <input
            type="number"
            placeholder="Number of Dwelling Units"
            value={projectInfo.numberOfUnits || ''}
            onChange={(e) => handleChange('numberOfUnits', e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
          <div className="text-xs text-gray-600 mt-1">
            HUD 24 CFR 35.930 — sample size scales with unit count.
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded border border-gray-200 flex items-center gap-3">
        <input
          id="childOccupiedFacility"
          type="checkbox"
          checked={!!projectInfo.childOccupiedFacility}
          onChange={(e) => handleChange('childOccupiedFacility', e.target.checked)}
        />
        <label htmlFor="childOccupiedFacility" className="text-sm">
          <span className="font-medium">Child-Occupied Facility</span>
          <span className="text-xs text-gray-600 ml-2">
            — pre-1978 building where a child under 6 is present ≥ 3 hours/day,
            ≥ 2 days/week, ≥ 60 days/year (40 CFR 745.223). Triggers EPA RRP rules.
          </span>
        </label>
      </div>

      {/* ================================================================== */}
      {/* Inspection Details                                                  */}
      {/* ================================================================== */}
      <SectionHeader
        title="Inspection Details"
        cite="40 CFR 745.227(d)–(e); Michigan R 325.99207"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Inspection Date</label>
          <input
            type="date"
            value={projectInfo.inspectionDate}
            onChange={(e) => handleChange('inspectionDate', e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Report Date</label>
          <input
            type="date"
            value={projectInfo.reportDate}
            onChange={(e) => handleChange('reportDate', e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Inspection Type</label>
          <select
            value={projectInfo.inspectionType}
            onChange={(e) => handleChange('inspectionType', e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option>LBP Inspection Only</option>
            <option>Risk Assessment</option>
            <option>Combined LIRA</option>
            <option>Clearance</option>
            <option>EBL Investigation</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Program Type</label>
          <select
            value={projectInfo.programType}
            onChange={(e) => handleChange('programType', e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option>HUD</option>
            <option>Medicaid</option>
            <option>Private</option>
            <option>EBL</option>
          </select>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Inspector Information                                               */}
      {/* ================================================================== */}
      <SectionHeader
        title="Inspector Information"
        cite="40 CFR 745.226 (federal, 3-yr cert); Michigan R 325.99308 (state license, annual)"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Inspector Name"
          value={projectInfo.inspectorName}
          onChange={(e) => handleChange('inspectorName', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <div>
          <label className="block text-sm font-medium mb-1">License Type</label>
          <select
            value={projectInfo.inspectorLicenseType || ''}
            onChange={(e) => handleChange('inspectorLicenseType', e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">— Select —</option>
            <option value="lead_inspector">Lead Inspector</option>
            <option value="lead_risk_assessor">Lead Risk Assessor</option>
            <option value="abatement_supervisor">Abatement Supervisor</option>
            <option value="abatement_worker">Abatement Worker</option>
            <option value="clearance_technician">Clearance Technician</option>
            <option value="ebl_investigator">EBL Investigator</option>
            <option value="project_designer">Project Designer</option>
          </select>
        </div>
        <input
          type="text"
          placeholder="Certification / License Number"
          value={projectInfo.inspectorCert}
          onChange={(e) => handleChange('inspectorCert', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <div>
          <div className="flex items-baseline justify-between">
            <label className="block text-sm font-medium mb-1">License Expiration</label>
            {certBadge()}
          </div>
          <input
            type="date"
            value={projectInfo.inspectorCertExpiration || ''}
            onChange={(e) => handleChange('inspectorCertExpiration', e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
          <div className="text-xs text-gray-600 mt-1">
            Federal cert renews every 3 years with refresher (40 CFR 745.225(c)(2)).
            Michigan license renews annually.
          </div>
        </div>
        <div>
          <input
            type="email"
            placeholder="Email"
            value={projectInfo.inspectorEmail}
            onChange={(e) => handleChange('inspectorEmail', e.target.value)}
            className={`border rounded px-3 py-2 w-full ${validations.emailMalformed ? 'border-yellow-400' : ''}`}
          />
          {validations.emailMalformed && (
            <div className="text-xs text-yellow-800 mt-1">Email format looks off — check for typo.</div>
          )}
        </div>
        <input
          type="text"
          placeholder="Company Name"
          value={projectInfo.companyName}
          onChange={(e) => handleChange('companyName', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="tel"
          placeholder="Company Phone"
          value={projectInfo.companyPhone}
          onChange={(e) => handleChange('companyPhone', e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      {/* ================================================================== */}
      {/* Client Information                                                  */}
      {/* ================================================================== */}
      <SectionHeader
        title="Client Information"
        cite="40 CFR 745.227(e)(8)(i); R 325.99207 — report recipient"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Client/Prepared For"
          value={projectInfo.clientName}
          onChange={(e) => handleChange('clientName', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Client Address"
          value={projectInfo.clientAddress}
          onChange={(e) => handleChange('clientAddress', e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="tel"
          placeholder="Client Phone"
          value={projectInfo.clientPhone}
          onChange={(e) => handleChange('clientPhone', e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      {/* ================================================================== */}
      {/* XRF Device Information + daily calibration status                   */}
      {/* ================================================================== */}
      <SectionHeader
        title="XRF Device Information"
        cite="40 CFR 745.227(b) — daily pre- and post-inspection calibration check"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          value={projectInfo.xrfModel}
          onChange={(e) => handleChange('xrfModel', e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option>Heuresis Pb200i</option>
          <option>Viken Pb200e</option>
          <option>Olympus Vanta</option>
          <option>SciAps X-250</option>
          <option>RMD LPA-1</option>
          <option>Other</option>
        </select>
        <input
          type="text"
          placeholder="XRF Serial Number"
          value={projectInfo.xrfSerial}
          onChange={(e) => handleChange('xrfSerial', e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
        <div className="font-medium mb-1">Today's calibration log</div>
        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-0.5 rounded text-xs border ${validations.calStartDone ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
            {validations.calStartDone ? 'Start-of-day: done' : 'Start-of-day: pending'}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs border ${validations.calEndDone ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
            {validations.calEndDone ? 'End-of-day: done' : 'End-of-day: pending'}
          </span>
          <span className="px-2 py-0.5 rounded text-xs border bg-white text-gray-700 border-gray-300">
            {validations.calCount} reading(s) today
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-2">
          40 CFR 745.227(b) requires a Performance Characteristic Sheet (PCS)
          calibration check at start and finish of each inspection day. Log entries
          on the XRF Data tab flow into this summary.
        </div>
      </div>
    </div>
  );
}

export default ProjectInfoTab;
