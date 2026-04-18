import { query } from '../../db/connection.js';

// ─── Designation → LARA license type mapping ──────────────
// Maps our internal designation keys to the license type names
// used by Michigan LARA's Accela verification portal
const DESIGNATION_TO_LARA_TYPE = {
  lead_inspector:       'Lead Inspector',
  lead_risk_assessor:   'Lead Risk Assessor',
  ebl_investigator:     'Elevated Blood Lead (EBL) Investigator',
  clearance_technician: 'Clearance Technician',
  abatement_supervisor: 'Lead Abatement Supervisor',
  abatement_worker:     'Lead Abatement Worker',
  project_designer:     'Lead Project Designer',
};

const VALID_DESIGNATIONS = Object.keys(DESIGNATION_TO_LARA_TYPE);

// ─── Michigan LARA License Verification ───────────────────
// Attempts to verify a license by querying the public LARA
// Verify-A-License (VAL) portal and Accela portal.
//
// Michigan LARA license numbers for lead professionals
// typically start with "P-" followed by digits.
// ──────────────────────────────────────────────────────────

async function queryLARA(licenseNumber, designation) {
  const laraType = DESIGNATION_TO_LARA_TYPE[designation];
  if (!laraType) {
    return { verified: false, status: 'error', message: 'Unknown designation type' };
  }

  // Clean up license number — accept with or without P- prefix
  const cleanNumber = licenseNumber.trim().toUpperCase();

  // Strategy 1: Query the VAL (Verify-A-License) portal search
  try {
    const valUrl = `https://val.apps.lara.state.mi.us/Search/Result?licenseNumber=${encodeURIComponent(cleanNumber)}`;

    const response = await fetch(valUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'LeadFlow-AI/1.0 License-Verification',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const html = await response.text();
      return parseLARAResponse(html, cleanNumber, laraType);
    }
  } catch (err) {
    console.log('[LARA-VAL] Search attempt failed:', err.message);
  }

  // Strategy 2: Try the Accela Citizen Access portal
  try {
    const accelaUrl = `https://aca-prod.accela.com/MILARA/GeneralProperty/PropertyLookUp.aspx?isLicensee=Y&TabName=APO`;

    const searchResponse = await fetch(accelaUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'LeadFlow-AI/1.0 License-Verification',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (searchResponse.ok) {
      const html = await searchResponse.text();
      // Check if the page loaded (indicates the portal is accessible)
      if (html.includes('LicenseeNumber') || html.includes('PropertyLookUp')) {
        // The Accela portal uses ASP.NET ViewState for form submissions.
        // We can extract viewstate and submit a search form.
        return await submitAccelaSearch(html, searchResponse.url, cleanNumber, laraType);
      }
    }
  } catch (err) {
    console.log('[LARA-Accela] Search attempt failed:', err.message);
  }

  // Strategy 3: Try direct LARA state licensing portal
  try {
    const stateUrl = `https://statelicensing.apps.lara.state.mi.us/search?license=${encodeURIComponent(cleanNumber)}`;

    const response = await fetch(stateUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'LeadFlow-AI/1.0 License-Verification',
        'Accept': 'text/html,application/xhtml+xml,application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const text = await response.text();
      // Try JSON parse first (some endpoints return JSON)
      try {
        const data = JSON.parse(text);
        if (data && (data.status || data.licenseStatus)) {
          return interpretStatus(data.status || data.licenseStatus, cleanNumber);
        }
      } catch {
        // HTML response — parse it
        return parseLARAResponse(text, cleanNumber, laraType);
      }
    }
  } catch (err) {
    console.log('[LARA-State] Search attempt failed:', err.message);
  }

  // All strategies failed — return pending for manual review
  return {
    verified: false,
    status: 'pending',
    message: 'Unable to connect to Michigan LARA verification portal. License saved for manual verification.',
    licenseNumber: cleanNumber,
  };
}

// Parse HTML response from LARA portals
function parseLARAResponse(html, licenseNumber, expectedType) {
  const htmlLower = html.toLowerCase();

  // Check if license number appears in the results
  const numberFound = htmlLower.includes(licenseNumber.toLowerCase());

  // Look for common status indicators in LARA pages
  const activePatterns = [
    /status[:\s]*<[^>]*>?\s*active/i,
    /license\s*status[:\s]*active/i,
    /class="[^"]*active[^"]*"[^>]*>.*?active/i,
    />active</i,
    /good\s*standing/i,
    /status.*?active/i,
  ];

  const inactivePatterns = [
    /status[:\s]*<[^>]*>?\s*inactive/i,
    /status[:\s]*<[^>]*>?\s*expired/i,
    /status[:\s]*<[^>]*>?\s*revoked/i,
    /status[:\s]*<[^>]*>?\s*suspended/i,
    />inactive</i,
    />expired</i,
    />revoked</i,
    />suspended</i,
    /not\s*in\s*good\s*standing/i,
  ];

  const notFoundPatterns = [
    /no\s*records?\s*found/i,
    /no\s*results?\s*found/i,
    /no\s*matching/i,
    /0\s*results/i,
    /license\s*not\s*found/i,
  ];

  // Check not found first
  for (const pattern of notFoundPatterns) {
    if (pattern.test(html)) {
      return {
        verified: false,
        status: 'not_found',
        message: `License number ${licenseNumber} was not found in the Michigan LARA database.`,
        licenseNumber,
      };
    }
  }

  // Check for active status
  if (numberFound) {
    for (const pattern of activePatterns) {
      if (pattern.test(html)) {
        // Also check if the license type matches
        const typeMatch = html.toLowerCase().includes(expectedType.toLowerCase());
        if (typeMatch) {
          return {
            verified: true,
            status: 'active',
            message: `License ${licenseNumber} verified as ${expectedType} — Active/Good Standing.`,
            licenseNumber,
            licenseType: expectedType,
          };
        } else {
          return {
            verified: true,
            status: 'active',
            message: `License ${licenseNumber} found and Active, but the license type on file may differ from ${expectedType}. Proceeding with verification.`,
            licenseNumber,
            licenseType: expectedType,
            typeWarning: true,
          };
        }
      }
    }

    // Check for inactive/expired/revoked
    for (const pattern of inactivePatterns) {
      if (pattern.test(html)) {
        return {
          verified: false,
          status: 'inactive',
          message: `License ${licenseNumber} was found but is NOT active or in good standing. Cannot proceed with this designation.`,
          licenseNumber,
        };
      }
    }
  }

  // License number found but couldn't determine status definitively
  if (numberFound) {
    return {
      verified: false,
      status: 'pending',
      message: `License ${licenseNumber} found in records but status could not be automatically determined. Saved for manual verification.`,
      licenseNumber,
    };
  }

  // Page loaded but license not found in results
  return {
    verified: false,
    status: 'not_found',
    message: `License number ${licenseNumber} was not found in the Michigan LARA database for ${expectedType}.`,
    licenseNumber,
  };
}

// Submit search to Accela portal (ASP.NET WebForms)
async function submitAccelaSearch(pageHtml, pageUrl, licenseNumber, laraType) {
  // Extract __VIEWSTATE and __EVENTVALIDATION from the form
  const viewstateMatch = pageHtml.match(/name="__VIEWSTATE"\s+value="([^"]*)"/);
  const eventValMatch = pageHtml.match(/name="__EVENTVALIDATION"\s+value="([^"]*)"/);
  const viewstateGenMatch = pageHtml.match(/name="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/);

  if (!viewstateMatch) {
    return {
      verified: false,
      status: 'pending',
      message: 'LARA Accela portal structure changed. License saved for manual verification.',
      licenseNumber,
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('__VIEWSTATE', viewstateMatch[1]);
    if (eventValMatch) formData.append('__EVENTVALIDATION', eventValMatch[1]);
    if (viewstateGenMatch) formData.append('__VIEWSTATEGENERATOR', viewstateGenMatch[1]);
    formData.append('ctl00$PlaceHolderMain$generalSearchForm$txtGSLicenseNumber', licenseNumber);
    formData.append('ctl00$PlaceHolderMain$generalSearchForm$txtGSLicenseType', laraType);
    formData.append('ctl00$PlaceHolderMain$btnNewSearch', 'Search');

    const searchResponse = await fetch(pageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'LeadFlow-AI/1.0 License-Verification',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (searchResponse.ok) {
      const resultHtml = await searchResponse.text();
      return parseLARAResponse(resultHtml, licenseNumber, laraType);
    }
  } catch (err) {
    console.log('[Accela] Form submission failed:', err.message);
  }

  return {
    verified: false,
    status: 'pending',
    message: 'Could not complete Accela portal search. License saved for manual verification.',
    licenseNumber,
  };
}

function interpretStatus(rawStatus, licenseNumber) {
  const s = (rawStatus || '').toLowerCase().trim();
  if (['active', 'good standing', 'current'].includes(s)) {
    return { verified: true, status: 'active', message: `License ${licenseNumber} is Active.`, licenseNumber };
  }
  if (['expired', 'inactive', 'revoked', 'suspended', 'lapsed'].includes(s)) {
    return { verified: false, status: 'inactive', message: `License ${licenseNumber} status: ${rawStatus}. Not eligible.`, licenseNumber };
  }
  return { verified: false, status: 'pending', message: `License ${licenseNumber} status: ${rawStatus}. Requires manual review.`, licenseNumber };
}

// ═══════════════════════════════════════════════════════════
//  API ENDPOINTS
// ═══════════════════════════════════════════════════════════

// POST /api/license/verify  — verify a license number against LARA
export async function verifyLicense(req, res) {
  const { licenseNumber, designation } = req.body;

  if (!licenseNumber || !licenseNumber.trim()) {
    return res.status(400).json({ error: 'License number is required', code: 'VALIDATION_ERROR' });
  }
  if (!designation || !VALID_DESIGNATIONS.includes(designation)) {
    return res.status(400).json({ error: 'Valid designation is required', code: 'VALIDATION_ERROR' });
  }

  // Validate license number format (P- followed by digits, or just digits)
  const clean = licenseNumber.trim().toUpperCase();
  if (!/^P?-?\d{3,10}$/.test(clean.replace(/\s/g, ''))) {
    return res.status(400).json({
      error: 'License number format invalid. Expected format: P-12345 or similar.',
      code: 'INVALID_FORMAT',
    });
  }

  try {
    const result = await queryLARA(clean, designation);
    res.json(result);
  } catch (err) {
    console.error('[License Verify] Error:', err);
    res.json({
      verified: false,
      status: 'pending',
      message: 'Verification service temporarily unavailable. License saved for manual review.',
      licenseNumber: clean,
    });
  }
}

// PUT /api/license/set-own — Admin sets their own designation + license (with verification)
export async function setOwnLicense(req, res) {
  const userId = req.user.userId;
  const { designation, licenseNumber } = req.body;

  if (!designation || !VALID_DESIGNATIONS.includes(designation)) {
    return res.status(400).json({ error: 'Valid designation is required', code: 'VALIDATION_ERROR' });
  }
  if (!licenseNumber || !licenseNumber.trim()) {
    return res.status(400).json({ error: 'License number is required', code: 'VALIDATION_ERROR' });
  }

  // Verify the user is an inspector (not client)
  const userResult = await query('SELECT role, is_primary_admin FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'inspector') {
    return res.status(403).json({ error: 'Only inspectors can set designations', code: 'FORBIDDEN' });
  }

  const clean = licenseNumber.trim().toUpperCase();

  // Query LARA for verification
  let verification;
  try {
    verification = await queryLARA(clean, designation);
  } catch (err) {
    console.error('[License SetOwn] LARA error:', err);
    verification = { verified: false, status: 'pending', message: 'Verification service unavailable.' };
  }

  // If license is explicitly inactive/not_found, block it
  if (verification.status === 'inactive') {
    return res.status(400).json({
      error: verification.message,
      code: 'LICENSE_INACTIVE',
      verification,
    });
  }
  if (verification.status === 'not_found') {
    return res.status(400).json({
      error: verification.message,
      code: 'LICENSE_NOT_FOUND',
      verification,
    });
  }

  // For 'active' or 'pending' (could not verify but not explicitly bad), allow it
  const isVerified = verification.status === 'active';

  await query(
    `UPDATE users SET
       designation = $1,
       license_number = $2,
       license_verified = $3,
       license_verification_status = $4,
       license_verified_at = NOW(),
       updated_at = NOW()
     WHERE id = $5`,
    [designation, clean, isVerified, verification.status, userId]
  );

  res.json({
    success: true,
    designation,
    licenseNumber: clean,
    verification,
  });
}

// PUT /api/license/set-member — Admin sets a team member's designation + license
export async function setMemberLicense(req, res) {
  const adminUserId = req.user.userId;
  const { teamId, memberId, designation, licenseNumber } = req.body;

  if (!teamId || !memberId) {
    return res.status(400).json({ error: 'teamId and memberId are required', code: 'VALIDATION_ERROR' });
  }
  if (!designation || !VALID_DESIGNATIONS.includes(designation)) {
    return res.status(400).json({ error: 'Valid designation is required', code: 'VALIDATION_ERROR' });
  }
  if (!licenseNumber || !licenseNumber.trim()) {
    return res.status(400).json({ error: 'License number is required', code: 'VALIDATION_ERROR' });
  }

  // Verify caller is admin of this team
  const adminCheck = await query(
    'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
    [teamId, adminUserId]
  );
  if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
    return res.status(403).json({ error: 'Only team admins can assign designations', code: 'FORBIDDEN' });
  }

  // Verify target member exists
  const memberCheck = await query(
    'SELECT id, user_id FROM team_members WHERE id = $1 AND team_id = $2',
    [memberId, teamId]
  );
  if (memberCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Team member not found', code: 'NOT_FOUND' });
  }

  const clean = licenseNumber.trim().toUpperCase();

  // Query LARA for verification
  let verification;
  try {
    verification = await queryLARA(clean, designation);
  } catch (err) {
    console.error('[License SetMember] LARA error:', err);
    verification = { verified: false, status: 'pending', message: 'Verification service unavailable.' };
  }

  // Block if explicitly inactive or not found
  if (verification.status === 'inactive') {
    return res.status(400).json({
      error: verification.message,
      code: 'LICENSE_INACTIVE',
      verification,
    });
  }
  if (verification.status === 'not_found') {
    return res.status(400).json({
      error: verification.message,
      code: 'LICENSE_NOT_FOUND',
      verification,
    });
  }

  const isVerified = verification.status === 'active';

  await query(
    `UPDATE team_members SET
       designation = $1,
       license_number = $2,
       license_verified = $3,
       license_verification_status = $4,
       license_verified_at = NOW()
     WHERE id = $5`,
    [designation, clean, isVerified, verification.status, memberId]
  );

  res.json({
    success: true,
    memberId: parseInt(memberId),
    designation,
    licenseNumber: clean,
    verification,
  });
}

// GET /api/license/status — get verification status of own license
export async function getLicenseStatus(req, res) {
  const userId = req.user.userId;

  const result = await query(
    `SELECT designation, license_number, license_verified, license_verification_status, license_verified_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
  }

  const u = result.rows[0];
  res.json({
    designation: u.designation,
    licenseNumber: u.license_number,
    licenseVerified: u.license_verified,
    verificationStatus: u.license_verification_status,
    verifiedAt: u.license_verified_at,
  });
}
