import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTeam } from '../hooks/useTeam.js';
import { apiCall } from '../api/apiConfig.js';
import LicenseVerificationModal from './LicenseVerificationModal.jsx';

// ─── Tier display info ────────────────────────────────────
const TIER_INFO = {
  free:  { label: 'Free',  color: '#718096', maxMembers: 3,  maxProjects: 5   },
  pro:   { label: 'Pro',   color: '#38a169', maxMembers: 10, maxProjects: 50  },
  team:  { label: 'Team',  color: '#3182ce', maxMembers: 50, maxProjects: 200 },
};

// ─── Professional designations (Michigan LARA / EPA 40 CFR 745) ──
const DESIGNATION_LABELS = {
  lead_inspector: 'Lead Inspector',
  lead_risk_assessor: 'Lead Risk Assessor',
  ebl_investigator: 'EBL Investigator',
  clearance_technician: 'Clearance Technician',
  abatement_supervisor: 'Lead Abatement Supervisor',
  abatement_worker: 'Lead Abatement Worker',
  project_designer: 'Lead Project Designer',
};

export default function TeamManagement({ onBack }) {
  const { user, refreshProfile, setMemberLicense } = useAuth();
  const {
    teams, currentTeam, members, invites, loading, error,
    clearError,
    loadTeams, createTeam, loadTeam, updateTeam, switchTeam,
    loadMembers, updateMemberRole, removeMember, leaveTeam,
    loadInvites, createInvite, revokeInvite,
  } = useTeam();

  const [view, setView] = useState('list'); // list | create | detail
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [myRole, setMyRole] = useState(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('inspector');
  const [inviteMsg, setInviteMsg] = useState('');

  // Settings edit
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [actionMsg, setActionMsg] = useState('');

  // License verification modal state for member designation
  const [licenseModal, setLicenseModal] = useState(null); // { memberId, designation }

  // Designation selector for invite flow
  const [inviteDesignation, setInviteDesignation] = useState('');

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const openTeamDetail = useCallback(async (teamId) => {
    setSelectedTeamId(teamId);
    setView('detail');
    setActionMsg('');
    setInviteMsg('');
    try {
      const team = await loadTeam(teamId);
      setSelectedTeam(team);
      setEditName(team.name);
      setEditDesc(team.description || '');
      setMyRole(team.myRole);
      await Promise.all([loadMembers(teamId), loadInvites(teamId)]);
    } catch {}
  }, [loadTeam, loadMembers, loadInvites]);

  // ─── Create Team ────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    clearError();
    try {
      const team = await createTeam(newName, newDesc);
      setNewName('');
      setNewDesc('');
      await refreshProfile();
      openTeamDetail(team.id);
    } catch {}
  }

  // ─── Update Settings ───────────────────────────────────
  async function handleUpdateSettings(e) {
    e.preventDefault();
    clearError();
    try {
      await updateTeam(selectedTeamId, { name: editName, description: editDesc });
      setActionMsg('Team settings updated!');
      setShowSettings(false);
      await loadTeam(selectedTeamId);
      setSelectedTeam(prev => ({ ...prev, name: editName, description: editDesc }));
      setTimeout(() => setActionMsg(''), 3000);
    } catch {}
  }

  // ─── Invite ─────────────────────────────────────────────
  async function handleInvite(e) {
    e.preventDefault();
    clearError();
    setInviteMsg('');
    try {
      const invite = await createInvite(selectedTeamId, inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('inspector');
      const link = `${window.location.origin}/invite/${invite.token}`;
      setInviteMsg(`Invite created! Share this link: ${link}`);
    } catch {}
  }

  // ─── Role Change ────────────────────────────────────────
  async function handleRoleChange(memberId, newRole) {
    clearError();
    try {
      await updateMemberRole(selectedTeamId, memberId, newRole);
      setActionMsg('Role updated!');
      setTimeout(() => setActionMsg(''), 2000);
    } catch {}
  }

  // ─── Remove Member ──────────────────────────────────────
  async function handleRemove(memberId, name) {
    if (!window.confirm(`Remove ${name} from this team?`)) return;
    clearError();
    try {
      await removeMember(selectedTeamId, memberId);
      setActionMsg('Member removed.');
      setTimeout(() => setActionMsg(''), 2000);
    } catch {}
  }

  // ─── Leave ──────────────────────────────────────────────
  async function handleLeave() {
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    clearError();
    try {
      await leaveTeam(selectedTeamId);
      await refreshProfile();
      setView('list');
      loadTeams();
    } catch {}
  }

  // ─── Switch ─────────────────────────────────────────────
  async function handleSwitch(teamId) {
    clearError();
    try {
      await switchTeam(teamId);
      await refreshProfile();
      setActionMsg('Switched team!');
      setTimeout(() => setActionMsg(''), 2000);
    } catch {}
  }

  // ─── Revoke Invite ──────────────────────────────────────
  async function handleRevoke(inviteId) {
    clearError();
    try {
      await revokeInvite(selectedTeamId, inviteId);
      setActionMsg('Invite revoked.');
      setTimeout(() => setActionMsg(''), 2000);
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Error banner */}
      {error && (
        <div style={errorBanner}>{error}</div>
      )}
      {actionMsg && (
        <div style={successBanner}>{actionMsg}</div>
      )}

      {/* ─── TEAM LIST VIEW ──────────────────────────────── */}
      {view === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a365d', margin: 0 }}>
              My Teams
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {user?.isPrimaryAdmin && (
                <button onClick={() => { setView('create'); clearError(); }} style={btnPrimary}>
                  Create Team
                </button>
              )}
              <button onClick={onBack} style={btnSecondary}>Back</button>
            </div>
          </div>

          {loading && <div style={loadingText}>Loading teams...</div>}

          {!loading && teams.length === 0 && (
            <div style={emptyState}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>No teams yet</div>
              <div style={{ fontSize: '14px' }}>Create a team to collaborate with other inspectors</div>
            </div>
          )}

          {teams.map(t => {
            const tier = TIER_INFO[t.subscriptionTier] || TIER_INFO.free;
            return (
              <div key={t.id} style={cardStyle} onClick={() => openTeamDetail(t.id)}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '600', fontSize: '16px', color: '#2d3748' }}>{t.name}</span>
                    <span style={{ ...badge, background: tier.color, color: '#fff' }}>{tier.label}</span>
                    <span style={{ ...badge, background: '#edf2f7', color: '#4a5568' }}>{t.role}</span>
                  </div>
                  {t.description && (
                    <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>{t.description}</div>
                  )}
                  <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>
                    {t.memberCount} member{t.memberCount !== 1 ? 's' : ''} · {t.projectCount} project{t.projectCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ fontSize: '20px', color: '#cbd5e0' }}>›</div>
              </div>
            );
          })}
        </>
      )}

      {/* ─── CREATE TEAM VIEW ────────────────────────────── */}
      {view === 'create' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setView('list')} style={btnSecondary}>← Back</button>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a365d', margin: 0 }}>
              Create a New Team
            </h2>
          </div>

          <form onSubmit={handleCreate} style={formCard}>
            <label style={labelStyle}>Team Name *</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g., Smith Environmental"
              required
              style={inputStyle}
            />

            <label style={labelStyle}>Description</label>
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Optional description for your team"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />

            <div style={{ fontSize: '13px', color: '#718096', marginTop: '12px', padding: '10px', background: '#f7fafc', borderRadius: '6px' }}>
              Teams start on the <strong>Free</strong> tier (3 members, 5 projects).
              Upgrade to <strong>Pro</strong> (10 members, 50 projects) or <strong>Team</strong> (50 members, 200 projects) later.
            </div>

            <button type="submit" disabled={loading || !newName.trim()} style={{ ...btnPrimary, marginTop: '16px', width: '100%', padding: '10px' }}>
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </form>
        </>
      )}

      {/* ─── TEAM DETAIL VIEW ────────────────────────────── */}
      {view === 'detail' && selectedTeam && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => { setView('list'); setShowSettings(false); loadTeams(); }} style={btnSecondary}>← Back</button>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a365d', margin: 0 }}>
                {selectedTeam.name}
              </h2>
              <div style={{ fontSize: '13px', color: '#718096' }}>
                {TIER_INFO[selectedTeam.subscriptionTier]?.label || 'Free'} Plan · Your role: <strong>{myRole}</strong>
              </div>
            </div>
            {myRole !== 'admin' && (
              <button onClick={handleLeave} style={{ ...btnSecondary, color: '#c53030', borderColor: '#fed7d7' }}>
                Leave Team
              </button>
            )}
            {user?.isPrimaryAdmin && (
              <button onClick={async () => {
                if (!window.confirm(`Delete team "${selectedTeam.name}"? Members will NOT be deleted — they keep their accounts.`)) return;
                try {
                  await apiCall('DELETE', `/teams/${selectedTeamId}`);
                  await refreshProfile();
                  setView('list');
                  await loadTeams();
                  setActionMsg(`Team "${selectedTeam.name}" deleted. All members retained.`);
                  setTimeout(() => setActionMsg(''), 4000);
                } catch (err) { setActionMsg('Error: ' + err.message); }
              }} style={{ ...btnSecondary, color: '#c53030', borderColor: '#fed7d7' }}>
                Delete Team
              </button>
            )}
          </div>

          {/* Settings (admin only) */}
          {myRole === 'admin' && (
            <div style={{ marginBottom: '20px' }}>
              <button onClick={() => setShowSettings(!showSettings)} style={btnSecondary}>
                {showSettings ? 'Hide Settings' : 'Team Settings'}
              </button>

              {showSettings && (
                <form onSubmit={handleUpdateSettings} style={{ ...formCard, marginTop: '12px' }}>
                  <label style={labelStyle}>Team Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                    style={inputStyle}
                  />
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    rows={2}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                  <button type="submit" disabled={loading} style={{ ...btnPrimary, marginTop: '12px' }}>
                    Save Settings
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Members Section */}
          <div style={sectionCard}>
            <h3 style={sectionTitle}>
              Members ({members.length})
            </h3>
            {members.map(m => (
              <div key={m.id} style={{ ...memberRow, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '500', color: '#2d3748' }}>{m.fullName || m.email}</span>
                    {m.isPrimaryAdmin && (
                      <span style={{ ...badge, background: '#d69e2e', color: '#fff', fontSize: '10px' }}>PRIMARY ADMIN</span>
                    )}
                  </div>
                  {m.email && m.fullName && (
                    <div style={{ fontSize: '12px', color: '#a0aec0' }}>{m.email}</div>
                  )}
                  {m.designation ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#3182ce' }}>
                        {DESIGNATION_LABELS[m.designation] || m.designation}
                      </span>
                      {m.licenseNumber && (
                        <span style={{ fontSize: '10px', color: '#718096', fontFamily: 'monospace' }}>
                          ({m.licenseNumber})
                        </span>
                      )}
                      {m.licenseVerified ? (
                        <span style={{ ...badge, background: '#38a169', color: '#fff', fontSize: '9px' }}>VERIFIED</span>
                      ) : m.licenseStatus === 'pending' ? (
                        <span style={{ ...badge, background: '#d69e2e', color: '#fff', fontSize: '9px' }}>PENDING</span>
                      ) : null}
                    </div>
                  ) : myRole === 'admin' ? (
                    <div style={{ marginTop: '2px' }}>
                      <select
                        value=""
                        onChange={e => {
                          if (!e.target.value) return;
                          setLicenseModal({ memberId: m.id, designation: e.target.value });
                        }}
                        style={{ ...selectStyle, fontSize: '11px', padding: '2px 6px' }}
                      >
                        <option value="">Assign designation...</option>
                        {Object.entries(DESIGNATION_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>No designation set</div>
                  )}
                </div>
                {myRole === 'admin' && m.userId !== user?.id ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.id, e.target.value)}
                      style={selectStyle}
                    >
                      <option value="admin">Admin</option>
                      <option value="inspector">Inspector</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    {m.designation && (
                      <select
                        value=""
                        onChange={e => {
                          if (!e.target.value) return;
                          setLicenseModal({ memberId: m.id, designation: e.target.value });
                        }}
                        style={{ ...selectStyle, fontSize: '11px' }}
                      >
                        <option value="">Change designation...</option>
                        {Object.entries(DESIGNATION_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    )}
                    <button onClick={() => handleRemove(m.id, m.fullName || m.email)} style={btnDanger}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <span style={{ ...badge, background: '#edf2f7', color: '#4a5568' }}>{m.role}</span>
                )}
              </div>
            ))}
          </div>

          {/* Invite Section (admin only) */}
          {myRole === 'admin' && (
            <div style={sectionCard}>
              <h3 style={sectionTitle}>Invite Members</h3>
              <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@company.com"
                  required
                  style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  style={selectStyle}
                >
                  <option value="inspector">Inspector</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" disabled={loading} style={btnPrimary}>Send Invite</button>
              </form>
              {inviteMsg && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: '#276749', background: '#c6f6d5', padding: '8px 12px', borderRadius: '6px', wordBreak: 'break-all' }}>
                  {inviteMsg}
                </div>
              )}

              {/* Pending Invites */}
              {invites.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '8px' }}>
                    Pending Invites
                  </div>
                  {invites.map(inv => (
                    <div key={inv.id} style={memberRow}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '14px', color: '#2d3748' }}>{inv.email}</span>
                        <span style={{ ...badge, background: '#edf2f7', color: '#4a5568', marginLeft: '8px' }}>{inv.role}</span>
                        <span style={{ fontSize: '12px', color: '#a0aec0', marginLeft: '8px' }}>
                          expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button onClick={() => handleRevoke(inv.id)} style={btnDanger}>Revoke</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* License Verification Modal for member designation */}
          {licenseModal && (
            <LicenseVerificationModal
              designation={licenseModal.designation}
              title={`Verify License for Team Member`}
              onVerify={async (designation, licenseNumber) => {
                return await setMemberLicense(selectedTeamId, licenseModal.memberId, designation, licenseNumber);
              }}
              onClose={() => setLicenseModal(null)}
              onSuccess={() => {
                setLicenseModal(null);
                setActionMsg('Designation set with license verification!');
                loadMembers(selectedTeamId);
                setTimeout(() => setActionMsg(''), 3000);
              }}
            />
          )}

          {/* Tier Info + Switching */}
          <div style={sectionCard}>
            <h3 style={sectionTitle}>Subscription Plan</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {Object.entries(TIER_INFO).map(([key, info]) => {
                const isCurrent = (selectedTeam.subscriptionTier || 'free') === key;
                return (
                  <div key={key} style={{
                    flex: 1, minWidth: '140px',
                    padding: '14px', borderRadius: '8px',
                    border: isCurrent ? `2px solid ${info.color}` : '1px solid #e2e8f0',
                    background: isCurrent ? '#f7fafc' : '#fff',
                  }}>
                    <div style={{ fontWeight: '700', color: info.color, marginBottom: '4px' }}>
                      {info.label} {isCurrent && '(Current)'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#718096' }}>
                      Up to {info.maxMembers} member{info.maxMembers > 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '13px', color: '#718096' }}>
                      Up to {info.maxProjects} projects
                    </div>
                    {!isCurrent && myRole === 'admin' && (
                      <button
                        onClick={async () => {
                          try {
                            await apiCall('PUT', `/teams/${selectedTeamId}/tier`, { tier: key });
                            // Refresh team data from server to get updated limits
                            const updatedTeam = await loadTeam(selectedTeamId);
                            setSelectedTeam(updatedTeam);
                            await loadMembers(selectedTeamId);
                            setActionMsg(`Plan switched to ${info.label}!`);
                            setTimeout(() => setActionMsg(''), 3000);
                          } catch (err) { setActionMsg('Error: ' + err.message); }
                        }}
                        style={{
                          marginTop: '8px', padding: '4px 10px', border: 'none',
                          borderRadius: '4px', background: info.color, color: '#fff',
                          fontSize: '11px', fontWeight: '600', cursor: 'pointer', width: '100%',
                        }}
                      >
                        Switch to {info.label}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────
const btnPrimary = {
  padding: '6px 14px', background: '#2c5282', color: '#fff', border: 'none',
  borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
};
const btnSecondary = {
  padding: '6px 14px', background: '#edf2f7', color: '#2d3748', border: '1px solid #e2e8f0',
  borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
};
const btnDanger = {
  padding: '4px 10px', background: '#fff5f5', color: '#c53030', border: '1px solid #fed7d7',
  borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
};
const badge = {
  fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '600',
};
const cardStyle = {
  display: 'flex', alignItems: 'center', padding: '14px 16px', marginBottom: '8px',
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer',
  transition: 'border-color 0.15s',
};
const sectionCard = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '16px', marginBottom: '16px',
};
const sectionTitle = {
  fontSize: '15px', fontWeight: '600', color: '#2d3748', marginTop: 0, marginBottom: '12px',
};
const formCard = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px',
};
const memberRow = {
  display: 'flex', alignItems: 'center', padding: '8px 0',
  borderBottom: '1px solid #f7fafc',
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
  padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: '6px',
  fontSize: '13px', background: '#fff', cursor: 'pointer',
};
const loadingText = { textAlign: 'center', padding: '20px', color: '#718096' };
const emptyState = {
  textAlign: 'center', padding: '40px 20px', color: '#718096',
  background: '#f7fafc', borderRadius: '8px', border: '2px dashed #e2e8f0',
};
const errorBanner = {
  padding: '8px 14px', borderRadius: '6px', marginBottom: '12px',
  background: '#fed7d7', color: '#c53030', fontSize: '13px',
};
const successBanner = {
  padding: '8px 14px', borderRadius: '6px', marginBottom: '12px',
  background: '#c6f6d5', color: '#276749', fontSize: '13px',
};
