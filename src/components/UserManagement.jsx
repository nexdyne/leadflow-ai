import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiCall } from '../api/apiConfig.js';
import LicenseVerificationModal from './LicenseVerificationModal.jsx';

const DESIGNATION_LABELS = {
  lead_inspector: 'Lead Inspector',
  lead_risk_assessor: 'Lead Risk Assessor',
  ebl_investigator: 'EBL Investigator',
  clearance_technician: 'Clearance Technician',
  abatement_supervisor: 'Lead Abatement Supervisor',
  abatement_worker: 'Lead Abatement Worker',
  project_designer: 'Lead Project Designer',
};

// ────────────────────────────────────────────────────────────────────────────
// Regulatory compliance helpers
//
// Michigan Lead Abatement Act (Public Health Code Act 368 of 1978, Part 54A;
// R 325.99308) — individual certifications expire and must be renewed. EPA
// 40 CFR 745.225(c)(2) requires 8-hour annual refresher training for Lead-Based
// Paint Activities persons. MIOSHA Part 603 / OSHA 29 CFR 1926.62(j) requires
// medical surveillance when airborne Pb exposure ≥ 30 µg/m³ action level for
// 30+ days in any 12-month period (or any worker with BLL ≥ 40 µg/dL).
//
// The API may not yet return these fields — this UI degrades gracefully and
// surfaces a "Not on file" warning with the regulatory citation so the gap is
// visible. Values expected on each user (optional):
//   licenseExpirationDate    ISO date (e.g. "2027-06-30")
//   lastRefresherDate        ISO date — 8-hour annual refresher training
//   medicalSurveillanceDate  ISO date — last exam
//   bloodLeadLevel           number µg/dL from most recent surveillance
// ────────────────────────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;
const REG_CITATIONS = {
  license: 'Michigan R 325.99308 / MCL 333.5451–5477',
  refresher: '40 CFR 745.225(c)(2) — 8-hour annual refresher',
  medical: 'MIOSHA Part 603 / 29 CFR 1926.62(j) medical surveillance',
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((d.getTime() - Date.now()) / DAY_MS);
}
function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / DAY_MS);
}

function licenseStatus(u) {
  const d = daysUntil(u.licenseExpirationDate);
  if (d === null) return { state: 'missing', label: 'Expiration not on file', cite: REG_CITATIONS.license };
  if (d < 0) return { state: 'expired', label: `Expired ${Math.abs(d)} d ago`, cite: REG_CITATIONS.license };
  if (d < 30) return { state: 'critical', label: `Expires in ${d} d`, cite: REG_CITATIONS.license };
  if (d < 90) return { state: 'warning', label: `Expires in ${d} d`, cite: REG_CITATIONS.license };
  return { state: 'ok', label: `Valid (${d} d left)`, cite: REG_CITATIONS.license };
}
function refresherStatus(u) {
  const s = daysSince(u.lastRefresherDate);
  // Annual — warn at 11 mo, expire at 12 mo
  if (s === null) return { state: 'missing', label: 'Refresher not on file', cite: REG_CITATIONS.refresher };
  if (s > 365) return { state: 'expired', label: `Overdue by ${s - 365} d`, cite: REG_CITATIONS.refresher };
  if (s > 335) return { state: 'critical', label: `Due in ${365 - s} d`, cite: REG_CITATIONS.refresher };
  if (s > 275) return { state: 'warning', label: `Due in ${365 - s} d`, cite: REG_CITATIONS.refresher };
  return { state: 'ok', label: `Completed ${s} d ago`, cite: REG_CITATIONS.refresher };
}
function medicalStatus(u) {
  // Medical surveillance is annual when exposure triggers it. If the user is an
  // abatement worker/supervisor we assume it's required; for inspector/RA roles
  // who don't disturb paint it may legitimately be N/A.
  const triggerRoles = ['abatement_worker', 'abatement_supervisor', 'project_designer'];
  const required = triggerRoles.includes(u.designation);
  const s = daysSince(u.medicalSurveillanceDate);
  if (!required && s === null) return { state: 'na', label: 'N/A (no paint-disturbing work)', cite: REG_CITATIONS.medical };
  if (s === null) return { state: 'missing', label: 'Medical exam not on file', cite: REG_CITATIONS.medical };
  // MIOSHA — annual or more frequent if BLL ≥ 40 µg/dL
  const bll = parseFloat(u.bloodLeadLevel);
  const isElevated = !isNaN(bll) && bll >= 40;
  if (isElevated) return { state: 'critical', label: `BLL ${bll} µg/dL — remove from exposure`, cite: REG_CITATIONS.medical };
  if (s > 365) return { state: 'expired', label: `Overdue by ${s - 365} d`, cite: REG_CITATIONS.medical };
  if (s > 335) return { state: 'warning', label: `Due in ${365 - s} d`, cite: REG_CITATIONS.medical };
  return { state: 'ok', label: `Completed ${s} d ago`, cite: REG_CITATIONS.medical };
}

const STATE_COLORS = {
  ok:       { bg: '#c6f6d5', fg: '#22543d', icon: '✓' },
  warning:  { bg: '#fefcbf', fg: '#744210', icon: '⚠' },
  critical: { bg: '#feebc8', fg: '#7b341e', icon: '⚠' },
  expired:  { bg: '#fed7d7', fg: '#822727', icon: '✕' },
  missing:  { bg: '#edf2f7', fg: '#4a5568', icon: '○' },
  na:       { bg: '#e6fffa', fg: '#234e52', icon: '—' },
};

export default function UserManagement({ onBack }) {
  const { user: currentUser, verifyAndSetDesignation } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [view, setView] = useState('list'); // list | create | edit

  // Search/filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all | inspector | client
  const [filterStatus, setFilterStatus] = useState('all'); // all | active | inactive

  // Create user form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('inspector');
  const [newPassword, setNewPassword] = useState('');
  const [createdUser, setCreatedUser] = useState(null);
  const [showTempPwd, setShowTempPwd] = useState(true);

  // Edit user
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // License modal
  const [licenseModal, setLicenseModal] = useState(null); // { userId, designation }

  // Add to team modal
  const [addToTeamModal, setAddToTeamModal] = useState(null); // { userId, name, currentTeamIds }
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedTeamRole, setSelectedTeamRole] = useState('inspector');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall('GET', '/admin/users');
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const data = await apiCall('GET', '/teams');
      setTeams(data.teams);
    } catch {}
  }, []);

  useEffect(() => { loadUsers(); loadTeams(); }, [loadUsers, loadTeams]);

  function showMsg(msg) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  }

  // ─── Filtered users ────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          (u.fullName || '').toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.teamNames || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      // Role filter
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      // Status filter
      if (filterStatus === 'active' && !u.active) return false;
      if (filterStatus === 'inactive' && u.active) return false;
      return true;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  // ─── Regulatory compliance summary across inspectors ─────────
  const complianceGaps = useMemo(() => {
    const inspectors = users.filter(u => u.role === 'inspector' && u.active);
    let expiredOrExpiring = 0;
    let refresherGaps = 0;
    let medicalGaps = 0;
    inspectors.forEach(u => {
      const l = licenseStatus(u);
      if (l.state === 'expired' || l.state === 'critical' || l.state === 'missing') expiredOrExpiring++;
      const r = refresherStatus(u);
      if (r.state === 'expired' || r.state === 'critical' || r.state === 'missing') refresherGaps++;
      const m = medicalStatus(u);
      if (m.state === 'expired' || m.state === 'critical' || m.state === 'missing') medicalGaps++;
    });
    return { total: inspectors.length, expiredOrExpiring, refresherGaps, medicalGaps };
  }, [users]);

  // ─── Create User ──────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await apiCall('POST', '/admin/users', {
        email: newEmail, fullName: newName,
        phone: newPhone, role: newRole, tempPassword: newPassword || undefined,
      });
      setCreatedUser(data);
      setShowTempPwd(true);
      showMsg(`User ${data.email} created!`);
      setNewEmail(''); setNewName(''); setNewPhone(''); setNewPassword('');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  // ─── Update User ──────────────────────────────────────────
  async function handleUpdate(e) {
    e.preventDefault();
    setError('');
    try {
      await apiCall('PUT', `/admin/users/${editUser.id}`, {
        fullName: editName, phone: editPhone,
      });
      showMsg('User updated!');
      setView('list');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  // ─── Deactivate / Reactivate ──────────────────────────────
  async function handleToggleActive(userId, currentlyActive) {
    const action = currentlyActive ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await apiCall('PUT', `/admin/users/${userId}/${action}`);
      showMsg(`User ${action}d!`);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  // ─── Reset Password ───────────────────────────────────────
  async function handleResetPassword(userId, email) {
    const newPwd = prompt(`Reset password for ${email}? Enter new temporary password:`, 'ChangeMe123!');
    if (!newPwd) return;
    try {
      await apiCall('PUT', `/admin/users/${userId}/reset-password`, { newPassword: newPwd });
      showMsg(`Password reset for ${email}. Tell them the new temp password.`);
    } catch (err) {
      setError(err.message);
    }
  }

  // ─── Add to Team ──────────────────────────────────────────
  async function handleAddToTeam(e) {
    e.preventDefault();
    if (!selectedTeamId) return;
    try {
      await apiCall('POST', `/admin/users/${addToTeamModal.userId}/add-to-team`, {
        teamId: parseInt(selectedTeamId), role: selectedTeamRole,
      });
      showMsg('User added to team!');
      setAddToTeamModal(null);
      setSelectedTeamId('');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  // ─── Remove from Team ─────────────────────────────────────
  async function handleRemoveFromTeam(userId, teamId, teamName) {
    if (!window.confirm(`Remove user from "${teamName}"? They'll keep their account but lose access to this team's projects.`)) return;
    try {
      await apiCall('DELETE', `/admin/users/${userId}/remove-from-team`, { teamId });
      showMsg(`User removed from ${teamName}.`);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div style={{ maxWidth: '900px' }}>
      {error && <div style={errorBanner}>{error}</div>}
      {actionMsg && <div style={successBanner}>{actionMsg}</div>}

      {/* ─── LIST VIEW ──────────────────────────────────── */}
      {view === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#553c9a', margin: 0 }}>
              Manage Users ({filteredUsers.length}{filteredUsers.length !== users.length ? ` of ${users.length}` : ''})
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setView('create'); setCreatedUser(null); setError(''); }} style={btnPrimary}>
                Add User
              </button>
              <button onClick={onBack} style={btnSecondary}>Back</button>
            </div>
          </div>

          {/* Search & Filters */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, team..."
              style={{ ...inputStyle, flex: '1 1 250px' }}
            />
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ ...selectStyle, minWidth: '120px' }}>
              <option value="all">All Roles</option>
              <option value="inspector">Inspectors</option>
              <option value="client">Clients</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selectStyle, minWidth: '120px' }}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {loading && <div style={loadingText}>Loading users...</div>}

          {/* ─── Regulatory Compliance Summary ───────────────────────
              Shown at top of list; catches any inspector whose license,
              refresher training, or medical surveillance is missing,
              expiring, or overdue. Citations: R 325.99308, 40 CFR
              745.225(c)(2), MIOSHA Part 603 / 29 CFR 1926.62(j). */}
          {!loading && complianceGaps.total > 0 && (
            complianceGaps.expiredOrExpiring > 0 ||
            complianceGaps.refresherGaps > 0 ||
            complianceGaps.medicalGaps > 0
          ) && (
            <div style={{
              background: '#fffaf0',
              border: '2px solid #ed8936',
              borderLeft: '6px solid #c05621',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#7b341e',
              lineHeight: 1.5,
            }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                ⚠ Regulatory Documentation Gaps ({complianceGaps.total} active inspector{complianceGaps.total === 1 ? '' : 's'})
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px' }}>
                {complianceGaps.expiredOrExpiring > 0 && (
                  <span><strong>{complianceGaps.expiredOrExpiring}</strong> license(s) expired / expiring / not on file</span>
                )}
                {complianceGaps.refresherGaps > 0 && (
                  <span><strong>{complianceGaps.refresherGaps}</strong> refresher training gap(s)</span>
                )}
                {complianceGaps.medicalGaps > 0 && (
                  <span><strong>{complianceGaps.medicalGaps}</strong> medical surveillance gap(s)</span>
                )}
              </div>
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#975a16', fontStyle: 'italic' }}>
                Cites: Michigan R 325.99308 · 40 CFR 745.225(c)(2) · MIOSHA Part 603 / 29 CFR 1926.62(j)
              </div>
            </div>
          )}

          {filteredUsers.map(u => (
            <div key={u.id} style={{ ...cardStyle, opacity: u.active ? 1 : 0.5 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '600', color: '#2d3748' }}>{u.fullName || u.email}</span>
                  {u.isPrimaryAdmin && (
                    <span style={{ ...badge, background: '#d69e2e', color: '#fff' }}>PRIMARY ADMIN</span>
                  )}
                  {!u.active && (
                    <span style={{ ...badge, background: '#c53030', color: '#fff' }}>INACTIVE</span>
                  )}
                  {u.role === 'client' && (
                    <span style={{ ...badge, background: '#718096', color: '#fff' }}>CLIENT</span>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>{u.email}</div>

                {/* Designation Section */}
                {u.designation ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ ...badge, background: '#ebf8ff', color: '#2c5282' }}>
                      {DESIGNATION_LABELS[u.designation] || u.designation}
                    </span>
                    {u.licenseNumber && (
                      <span style={{ fontSize: '10px', color: '#718096', fontFamily: 'monospace' }}>
                        {u.licenseNumber}
                      </span>
                    )}
                    {u.licenseVerified ? (
                      <span style={{ ...badge, background: '#38a169', color: '#fff', fontSize: '9px' }}>VERIFIED</span>
                    ) : u.licenseStatus === 'pending' ? (
                      <span style={{ ...badge, background: '#d69e2e', color: '#fff', fontSize: '9px' }}>PENDING</span>
                    ) : null}
                    <button
                      onClick={() => setLicenseModal({ userId: u.id, designation: '__pick__' })}
                      style={{ fontSize: '10px', color: '#3182ce', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      change
                    </button>
                  </div>
                ) : u.role === 'inspector' ? (
                  <div style={{ marginTop: '4px' }}>
                    <select
                      value=""
                      onChange={e => {
                        if (!e.target.value) return;
                        setLicenseModal({ userId: u.id, designation: e.target.value });
                      }}
                      style={{ ...selectStyle, fontSize: '11px', padding: '2px 6px' }}
                    >
                      <option value="">Assign designation...</option>
                      {Object.entries(DESIGNATION_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {/* ─── Regulatory Compliance Strip (inspectors only) ─── */}
                {u.role === 'inspector' && (() => {
                  const l = licenseStatus(u);
                  const r = refresherStatus(u);
                  const m = medicalStatus(u);
                  const renderChip = (label, s) => {
                    const c = STATE_COLORS[s.state] || STATE_COLORS.missing;
                    return (
                      <span
                        title={`${label}: ${s.label}\n${s.cite}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px',
                          background: c.bg, color: c.fg, fontWeight: 500,
                        }}
                      >
                        <span style={{ fontSize: '11px' }}>{c.icon}</span>
                        <strong style={{ fontWeight: 600 }}>{label}:</strong>
                        <span>{s.label}</span>
                      </span>
                    );
                  };
                  return (
                    <div style={{
                      display: 'flex', gap: '6px', marginTop: '6px',
                      flexWrap: 'wrap', alignItems: 'center',
                    }}>
                      {renderChip('License', l)}
                      {renderChip('Refresher', r)}
                      {renderChip('Medical', m)}
                    </div>
                  );
                })()}

                {/* Team Memberships with per-team remove buttons */}
                {u.teams && u.teams.length > 0 ? (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {u.teams.map(t => (
                      <span key={t.teamId} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                        background: '#edf2f7', color: '#4a5568',
                      }}>
                        {t.teamName}
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>({t.teamRole})</span>
                        {/* Don't show remove on admin's own membership if they're the only admin */}
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveFromTeam(u.id, t.teamId, t.teamName); }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: '#c53030', fontSize: '12px', fontWeight: '700',
                              lineHeight: 1, padding: '0 2px', marginLeft: '2px',
                            }}
                            title={`Remove from ${t.teamName}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px', fontStyle: 'italic' }}>
                    No team memberships
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => {
                  setEditUser(u); setEditName(u.fullName || '');
                  setEditPhone(u.phone || '');
                  setView('edit');
                }} style={btnSmall}>Edit</button>

                {u.role === 'inspector' && (
                  <button onClick={() => {
                    const currentTeamIds = (u.teams || []).map(t => t.teamId);
                    setAddToTeamModal({ userId: u.id, name: u.fullName || u.email, currentTeamIds });
                    setSelectedTeamId('');
                    setSelectedTeamRole('inspector');
                  }} style={btnSmall}>
                    + Team
                  </button>
                )}

                {u.id !== currentUser?.id && (
                  <>
                    <button onClick={() => handleResetPassword(u.id, u.email)} style={btnSmall}>
                      Reset Pwd
                    </button>
                    <button
                      onClick={() => handleToggleActive(u.id, u.active)}
                      style={{ ...btnSmall, color: u.active ? '#c53030' : '#38a169' }}
                    >
                      {u.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {!loading && filteredUsers.length === 0 && users.length > 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
              No users match your search/filter criteria.
            </div>
          )}
        </>
      )}

      {/* ─── CREATE USER VIEW ────────────────────────────── */}
      {view === 'create' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setView('list')} style={btnSecondary}>← Back</button>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#553c9a', margin: 0 }}>Add New User</h2>
          </div>

          <form onSubmit={handleCreate} style={formCard}>
            <label style={labelStyle}>Email *</label>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required style={inputStyle} placeholder="user@company.com" />

            <label style={labelStyle}>Full Name</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} placeholder="John Smith" />

            <label style={labelStyle}>Phone</label>
            <input type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Role</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={selectStyle}>
              <option value="inspector">Inspector</option>
              <option value="client">Client</option>
            </select>

            <label style={labelStyle}>Temporary Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} placeholder="Leave blank for default" />
            <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>
              Default: ChangeMe123! — User should change it on first login.
            </div>

            <button type="submit" style={{ ...btnPrimary, marginTop: '16px', width: '100%', padding: '10px' }}>
              Create User
            </button>
          </form>

          {createdUser && showTempPwd && (
            <div style={{ ...successBanner, marginTop: '12px', position: 'relative' }}>
              User created: <strong>{createdUser.email}</strong>
              <br />Temporary password: <strong style={{ fontFamily: 'monospace' }}>{createdUser.tempPassword}</strong>
              <br /><span style={{ fontSize: '11px', color: '#276749' }}>Share these credentials securely. This password won't be shown again.</span>
              <button
                onClick={() => setShowTempPwd(false)}
                style={{
                  position: 'absolute', top: '6px', right: '8px',
                  background: 'none', border: 'none', fontSize: '16px',
                  color: '#276749', cursor: 'pointer', fontWeight: '700',
                }}
              >
                ×
              </button>
            </div>
          )}
          {createdUser && !showTempPwd && (
            <div style={{ ...successBanner, marginTop: '12px' }}>
              User <strong>{createdUser.email}</strong> created successfully.
            </div>
          )}
        </>
      )}

      {/* ─── EDIT USER VIEW ──────────────────────────────── */}
      {view === 'edit' && editUser && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setView('list')} style={btnSecondary}>← Back</button>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#553c9a', margin: 0 }}>
              Edit: {editUser.fullName || editUser.email}
            </h2>
          </div>

          <form onSubmit={handleUpdate} style={formCard}>
            <label style={labelStyle}>Email (cannot change)</label>
            <input type="text" value={editUser.email} disabled style={{ ...inputStyle, background: '#f7fafc', color: '#a0aec0' }} />

            <label style={labelStyle}>Full Name</label>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Phone</label>
            <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={inputStyle} />

            <button type="submit" style={{ ...btnPrimary, marginTop: '16px', width: '100%', padding: '10px' }}>
              Save Changes
            </button>
          </form>
        </>
      )}

      {/* ─── ADD TO TEAM MODAL ────────────────────────────── */}
      {addToTeamModal && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) setAddToTeamModal(null); }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a365d', marginBottom: '12px' }}>
              Add {addToTeamModal.name} to Team
            </div>
            {(() => {
              // Filter out teams the user is already in
              const availableTeams = teams.filter(t =>
                !(addToTeamModal.currentTeamIds || []).includes(t.id)
              );

              if (availableTeams.length === 0) {
                return (
                  <div>
                    <div style={{ padding: '12px', background: '#fefcbf', borderRadius: '6px', color: '#975a16', fontSize: '13px', marginBottom: '12px' }}>
                      This user is already a member of all available teams.
                    </div>
                    <button onClick={() => setAddToTeamModal(null)} style={btnSecondary}>Close</button>
                  </div>
                );
              }

              return (
                <form onSubmit={handleAddToTeam}>
                  <label style={labelStyle}>Select Team</label>
                  <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} required style={selectStyle}>
                    <option value="">Choose a team...</option>
                    {availableTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.subscriptionTier})</option>
                    ))}
                  </select>

                  <label style={labelStyle}>Role in Team</label>
                  <select value={selectedTeamRole} onChange={e => setSelectedTeamRole(e.target.value)} style={selectStyle}>
                    <option value="inspector">Inspector</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button type="button" onClick={() => setAddToTeamModal(null)} style={btnSecondary}>Cancel</button>
                    <button type="submit" style={btnPrimary}>Add to Team</button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── LICENSE VERIFICATION MODAL ───────────────────── */}
      {licenseModal && licenseModal.designation === '__pick__' && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) setLicenseModal(null); }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a365d', marginBottom: '12px' }}>
              Select New Designation
            </div>
            {Object.entries(DESIGNATION_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setLicenseModal({ ...licenseModal, designation: key })}
                style={{
                  display: 'block', width: '100%', padding: '10px 14px', marginBottom: '6px',
                  border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff',
                  textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#2d3748',
                }}
              >
                {label}
              </button>
            ))}
            <button onClick={() => setLicenseModal(null)} style={{ marginTop: '8px', padding: '8px 16px', background: '#edf2f7', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {licenseModal && licenseModal.designation && licenseModal.designation !== '__pick__' && (
        <LicenseVerificationModal
          designation={licenseModal.designation}
          title="Verify License for User"
          onVerify={async (designation, licenseNumber) => {
            // If it's the current user (admin changing own), use verifyAndSetDesignation
            if (licenseModal.userId === currentUser?.id) {
              return await verifyAndSetDesignation(designation, licenseNumber);
            }
            // For other users, use the admin designation endpoint
            return await apiCall('PUT', `/admin/users/${licenseModal.userId}/designation`, {
              designation, licenseNumber,
            });
          }}
          onClose={() => setLicenseModal(null)}
          onSuccess={() => {
            setLicenseModal(null);
            showMsg('Designation updated with license verification!');
            loadUsers();
          }}
        />
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────
const btnPrimary = {
  padding: '6px 14px', background: '#553c9a', color: '#fff', border: 'none',
  borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
};
const btnSecondary = {
  padding: '6px 14px', background: '#edf2f7', color: '#2d3748', border: '1px solid #e2e8f0',
  borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
};
const btnSmall = {
  padding: '4px 8px', background: '#edf2f7', color: '#4a5568', border: '1px solid #e2e8f0',
  borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
};
const badge = {
  fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '600',
};
const cardStyle = {
  display: 'flex', alignItems: 'flex-start', padding: '14px 16px', marginBottom: '8px',
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', gap: '12px',
  flexWrap: 'wrap',
};
const formCard = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px',
};
const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568',
  marginBottom: '4px', marginTop: '12px',
};
const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
  borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};
const selectStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
  borderRadius: '6px', fontSize: '14px', background: '#fff', cursor: 'pointer', boxSizing: 'border-box',
};
const errorBanner = {
  padding: '8px 14px', borderRadius: '6px', marginBottom: '12px',
  background: '#fed7d7', color: '#c53030', fontSize: '13px',
};
const successBanner = {
  padding: '8px 14px', borderRadius: '6px', marginBottom: '12px',
  background: '#c6f6d5', color: '#276749', fontSize: '13px',
};
const loadingText = { textAlign: 'center', padding: '20px', color: '#718096' };
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
};
