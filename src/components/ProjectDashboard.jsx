import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useProject } from '../hooks/useProject.js';
import { useTeam } from '../hooks/useTeam.js';
import { apiCall } from '../api/apiConfig.js';
import LicenseVerificationModal from './LicenseVerificationModal.jsx';
import { listInspections, loadInspection, deleteInspection } from '../utils/offlineStorage';

const DESIGNATION_LABELS = {
  lead_inspector: 'Lead Inspector',
  lead_risk_assessor: 'Lead Risk Assessor',
  ebl_investigator: 'EBL Investigator',
  clearance_technician: 'Clearance Technician',
  abatement_supervisor: 'Lead Abatement Supervisor',
  abatement_worker: 'Lead Abatement Worker',
  project_designer: 'Lead Project Designer',
};

const DESIGNATION_OPTIONS = [
  { key: 'lead_inspector', label: 'Lead Inspector' },
  { key: 'lead_risk_assessor', label: 'Lead Risk Assessor' },
  { key: 'ebl_investigator', label: 'EBL Investigator' },
  { key: 'clearance_technician', label: 'Clearance Technician' },
  { key: 'abatement_supervisor', label: 'Lead Abatement Supervisor' },
  { key: 'abatement_worker', label: 'Lead Abatement Worker' },
  { key: 'project_designer', label: 'Lead Project Designer' },
];

export default function ProjectDashboard({ onOpenProject, onNewProject, onManageTeams, onManageUsers, onManageClients, onOpenBilling, currentState, unreadNotifCount = 0 }) {
  const { user, logout, currentTeam, teamCount, refreshProfile, updateDesignation, verifyAndSetDesignation } = useAuth();
  const { projects, loading, error, loadProjects, saveProject, loadProject, deleteProject, currentProjectId } = useProject();
  const { teams, loadTeams, switchTeam } = useTeam();

  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewMode, setViewMode] = useState('personal'); // personal | team | offline
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const [showDesigPicker, setShowDesigPicker] = useState(false);
  const [desigSaving, setDesigSaving] = useState(false);
  const [pendingDesignation, setPendingDesignation] = useState(null); // triggers license modal

  // Share with client
  const [shareModal, setShareModal] = useState(null); // { projectId, projectName }
  const [shareEmail, setShareEmail] = useState('');
  const [shareMsg, setShareMsg] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  // C50: refs for share modal a11y — auto-focus the email input on open,
  // restore focus to the opener (Rename/Share row button) on close.
  const shareEmailInputRef = useRef(null);
  const sharePreviousFocusRef = useRef(null);

  // C48: inline rename state — replaces the jarring window.alert() pattern
  // and surfaces errors/success in the dashboard UI like the share modal.
  // C49: single-timer auto-clear via useRef + useEffect. Previously each
  // rename attempt scheduled its own setTimeout inside handleRename;
  // overlapping attempts stacked timers and the oldest timer cleared a
  // newer banner before the user could read it (live-captured as the
  // "banner vanishes after ~3s instead of 5s" bug in the CASE 8 smoke
  // test on abatecomply.com). Browser background-tab throttling made it
  // worse. Now the timer lives in a ref, is reset on every renameError
  // change, and is cancelled on unmount via the cleanup fn.
  const [renameError, setRenameError] = useState('');
  const renameErrorTimerRef = useRef(null);

  useEffect(() => {
    if (!renameError) return undefined;
    if (renameErrorTimerRef.current) {
      clearTimeout(renameErrorTimerRef.current);
    }
    renameErrorTimerRef.current = setTimeout(() => {
      setRenameError('');
      renameErrorTimerRef.current = null;
    }, 5000);
    return () => {
      if (renameErrorTimerRef.current) {
        clearTimeout(renameErrorTimerRef.current);
        renameErrorTimerRef.current = null;
      }
    };
  }, [renameError]);

  // C50: share modal a11y — when the modal opens, remember what had
  // focus (usually the "Share" row button), move focus into the email
  // input so keyboard users don't have to Tab past the dashboard to
  // reach it, and wire Escape to close (matching the overlay click
  // behavior). On close, restore focus to the opener. No focus trap
  // here — the modal has only three focusable elements (email input,
  // Close, Share Project) and the overlay-click + Escape exits give
  // keyboard users a way out. We can tighten this later if needed.
  useEffect(() => {
    if (!shareModal) return undefined;
    sharePreviousFocusRef.current = document.activeElement;
    // Defer one tick so the input element is actually mounted.
    const focusTimer = setTimeout(() => {
      if (shareEmailInputRef.current) {
        shareEmailInputRef.current.focus();
      }
    }, 0);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShareModal(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      const prev = sharePreviousFocusRef.current;
      if (prev && typeof prev.focus === 'function') {
        try { prev.focus(); } catch (_) { /* opener may have unmounted */ }
      }
      sharePreviousFocusRef.current = null;
    };
  }, [shareModal]);

  // Offline inspections from IndexedDB
  const [offlineInspections, setOfflineInspections] = useState([]);
  const [loadingOffline, setLoadingOffline] = useState(false);
  const [confirmDeleteOffline, setConfirmDeleteOffline] = useState(null);

  // Load teams list when user has teams
  useEffect(() => {
    if (teamCount > 0) loadTeams();
  }, [teamCount, loadTeams]);

  // Load projects based on view mode
  useEffect(() => {
    if (viewMode === 'offline') {
      // Load offline inspections from IndexedDB
      setLoadingOffline(true);
      listInspections()
        .then(inspections => {
          setOfflineInspections(inspections);
        })
        .catch(err => {
          console.error('Failed to load offline inspections:', err);
          setOfflineInspections([]);
        })
        .finally(() => setLoadingOffline(false));
    } else if (viewMode === 'team' && currentTeam) {
      loadProjects('', currentTeam.id);
    } else {
      loadProjects('');
    }
  }, [viewMode, currentTeam, loadProjects]);

  function handleSearch(e) {
    e.preventDefault();
    if (viewMode === 'team' && currentTeam) {
      loadProjects(search, currentTeam.id);
    } else {
      loadProjects(search);
    }
  }

  async function handleSave() {
    if (!currentState) return;
    setSaving(true);
    setSaveMsg('');
    try {
      // C46: prefer inspector-assigned projectName, then property address,
      // then a generic fallback. Matches the priority shown in the list.
      const pi = currentState.projectInfo || {};
      const name = (pi.projectName && pi.projectName.trim())
        || (pi.propertyAddress && pi.propertyAddress.trim())
        || 'Untitled Project';
      const teamId = (viewMode === 'team' && currentTeam) ? currentTeam.id : null;
      await saveProject(name, currentState, true, teamId);
      setSaveMsg('Project saved successfully!');
      if (viewMode === 'team' && currentTeam) {
        loadProjects('', currentTeam.id);
      } else {
        loadProjects('');
      }
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleOpen(projectId) {
    try {
      const data = await loadProject(projectId);
      // C46: pass projectId up so subsequent saves UPDATE this row
      // instead of inserting a duplicate. data.stateData may or may not
      // carry the cloud id (legacy rows don't), so we pass it explicitly.
      //
      // C48: BUG FIX — heal column↔stateData drift on every open.
      // Before this fix, `handleRename` wrote only the `project_name`
      // column; `state_data.projectInfo.projectName` stayed empty. On
      // reopen, the editor's Project Name input read empty, and the
      // next Save Progress would overwrite the column via the
      // propertyAddress fallback in handleManualSave. We now merge the
      // column value (source of truth for the list) into
      // stateData.projectInfo.projectName before dispatching, so the
      // editor shows the correct name and the next save keeps it.
      const sd = (data && data.stateData) || data || {};
      const pi = sd.projectInfo || {};
      const columnName = data && typeof data.projectName === 'string' ? data.projectName : '';
      const mergedState = {
        ...sd,
        projectInfo: {
          ...pi,
          projectName: pi.projectName || columnName || '',
        },
      };
      onOpenProject(mergedState, projectId);
    } catch (err) {
      alert('Failed to load project: ' + err.message);
    }
  }

  // C46/C48: in-place rename from the My Projects list. C48 changes:
  //  (a) read-modify-write: GET the current stateData, patch
  //      projectInfo.projectName, then PUT both the column and the
  //      updated JSON. Stops future column↔JSON drift at write time
  //      instead of relying on the handleOpen merge alone.
  //  (b) enforce a max length so an over-long name can't 500 the
  //      backend's VARCHAR project_name column.
  //  (c) inline errors (setRenameError) instead of window.alert so the
  //      UX matches the share modal.
  async function handleRename(p) {
    const current = p.projectName || p.propertyAddress || '';
    const next = window.prompt('Rename this project (max 200 chars)', current);
    if (next === null) return; // cancelled
    const trimmed = next.trim();
    if (!trimmed) return; // don't allow blanking the name
    if (trimmed === current) return; // no-op
    if (trimmed.length > 200) {
      // C49: auto-clear handled by the useEffect above; no inline setTimeout.
      setRenameError('Project name is too long (max 200 characters). Please shorten and try again.');
      return;
    }
    try {
      // Read-modify-write: load the full project so we can patch
      // projectInfo.projectName inside stateData before writing back.
      let stateData = null;
      try {
        const full = await apiCall('GET', `/projects/${p.id}`);
        const sd = full.stateData || {};
        const pi = sd.projectInfo || {};
        stateData = { ...sd, projectInfo: { ...pi, projectName: trimmed } };
      } catch (_) {
        // If GET fails (e.g. offline), fall back to column-only PUT —
        // handleOpen will heal the drift next time the project opens.
        stateData = null;
      }
      const body = stateData
        ? { projectName: trimmed, stateData }
        : { projectName: trimmed };
      await apiCall('PUT', `/projects/${p.id}`, body);
      setRenameError('');
      if (viewMode === 'team' && currentTeam) loadProjects('', currentTeam.id);
      else loadProjects('');
    } catch (err) {
      // C49: auto-clear handled by the useEffect above; no inline setTimeout.
      setRenameError('Failed to rename project: ' + (err.message || 'unknown error'));
    }
  }

  async function handleDelete(projectId) {
    try {
      await deleteProject(projectId);
      setConfirmDelete(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  async function handleSwitchTeam(teamId) {
    try {
      await switchTeam(teamId);
      await refreshProfile();
      setViewMode('team');
      setShowTeamSwitcher(false); // FIX 6: Close team switcher after selection
    } catch (err) {
      alert('Failed to switch team: ' + err.message);
    }
  }

  async function handleOpenOffline(inspectionId) {
    try {
      const result = await loadInspection(inspectionId);
      onOpenProject(result.stateData || result);
    } catch (err) {
      alert('Failed to load inspection: ' + err.message);
    }
  }

  async function handleDeleteOffline(inspectionId) {
    try {
      await deleteInspection(inspectionId);
      setOfflineInspections(offlineInspections.filter(i => i.id !== inspectionId));
      setConfirmDeleteOffline(null);
    } catch (err) {
      alert('Failed to delete inspection: ' + err.message);
    }
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', background: '#1a365d', color: '#fff',
        borderRadius: '8px', marginBottom: '16px', flexWrap: 'wrap', gap: '8px',
      }}>
        <div>
          <span style={{ fontSize: '13px', opacity: 0.8 }}>Signed in as </span>
          <strong>{user?.fullName || user?.email}</strong>
          {user?.designation && (
            <span
              onClick={() => { if (user?.isPrimaryAdmin) setPendingDesignation('__change__'); }}
              style={{
                fontSize: '11px', background: '#ebf8ff', color: '#2c5282',
                padding: '2px 8px', borderRadius: '10px', marginLeft: '8px',
                fontWeight: '600',
                cursor: user?.isPrimaryAdmin ? 'pointer' : 'default',
              }}
              title={user?.isPrimaryAdmin ? 'Click to change designation' : ''}
            >
              {DESIGNATION_LABELS[user.designation] || user.designation}
              {user?.isPrimaryAdmin && (
                <span style={{ fontSize: '9px', marginLeft: '4px', opacity: 0.7 }}>(change)</span>
              )}
            </span>
          )}
          {user?.isPrimaryAdmin && (
            <span style={{
              fontSize: '11px', background: '#d69e2e', color: '#fff',
              padding: '2px 8px', borderRadius: '10px', marginLeft: '6px',
              fontWeight: '600',
            }}>PRIMARY ADMIN</span>
          )}
          {user?.companyName && (
            <span style={{ fontSize: '13px', opacity: 0.7, marginLeft: '8px' }}>({user.companyName})</span>
          )}
          {currentTeam && viewMode === 'team' && (
            <span style={{
              fontSize: '11px', background: '#38a169', color: '#fff',
              padding: '2px 8px', borderRadius: '10px', marginLeft: '10px',
              fontWeight: '600',
            }}>
              {currentTeam.name} · {currentTeam.role}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {currentState && (
            <button onClick={handleSave} disabled={saving} style={btnPrimary}>
              {saving ? 'Saving...' : (currentProjectId ? 'Update Project' : 'Save Project')}
            </button>
          )}
          <button onClick={onNewProject} style={btnSecondary}>New Inspection</button>
          {user?.isPrimaryAdmin && (
            <button onClick={onManageUsers} style={{ ...btnTeam, background: '#553c9a' }}>Manage Users</button>
          )}
          {teamCount > 0 && (
            <button onClick={onManageTeams} style={btnTeam}>Teams</button>
          )}
          {teamCount === 0 && user?.isPrimaryAdmin && (
            <button onClick={onManageTeams} style={btnTeam}>Create Team</button>
          )}
          {onManageClients && (
            <button onClick={onManageClients} style={{ ...btnTeam, background: '#2b6cb0' }}>
              Client Portal {unreadNotifCount > 0 && `(${unreadNotifCount})`}
            </button>
          )}
          {onOpenBilling && user?.isPrimaryAdmin && (
            <button onClick={onOpenBilling} style={{ ...btnTeam, background: '#b7791f' }}>
              Billing
            </button>
          )}
          <button onClick={logout} style={btnGhost}>Sign Out</button>
        </div>
      </div>

      {saveMsg && (
        <div style={{
          padding: '8px 14px', borderRadius: '6px', marginBottom: '12px',
          background: saveMsg.startsWith('Error') ? '#fed7d7' : '#c6f6d5',
          color: saveMsg.startsWith('Error') ? '#c53030' : '#276749',
          fontSize: '13px',
        }}>
          {saveMsg}
        </div>
      )}

      {/* C48: inline rename error — replaces the prior window.alert(). */}
      {renameError && (
        <div style={{
          padding: '8px 14px', borderRadius: '6px', marginBottom: '12px',
          background: '#fed7d7', color: '#c53030', fontSize: '13px',
        }}>
          {renameError}
        </div>
      )}

      {/* Designation Picker — shows when user has no designation set */}
      {user && !user.designation && (
        <div style={{
          padding: '14px 18px', borderRadius: '8px', marginBottom: '16px',
          background: 'linear-gradient(135deg, #ebf8ff 0%, #e9d8fd 100%)',
          border: '2px solid #90cdf4',
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        }}>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ fontWeight: '700', color: '#2c5282', fontSize: '14px', marginBottom: '2px' }}>
              Set Your Professional Designation
            </div>
            <div style={{ fontSize: '12px', color: '#4a5568' }}>
              Select your Michigan LARA / EPA certification to display on reports and team profiles.
            </div>
          </div>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              setPendingDesignation(e.target.value);
            }}
            style={{
              padding: '8px 12px', borderRadius: '6px', border: '1px solid #90cdf4',
              fontSize: '13px', background: '#fff', color: '#2d3748',
              cursor: 'pointer', minWidth: '220px',
            }}
          >
            <option value="">Select designation...</option>
            {DESIGNATION_OPTIONS.map(d => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* View Mode Toggle (Personal vs Team vs Offline) */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '16px',
        background: '#edf2f7', borderRadius: '8px', padding: '4px',
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setViewMode('personal')}
          style={{
            padding: '6px 16px', border: 'none', borderRadius: '6px',
            background: viewMode === 'personal' ? '#fff' : 'transparent',
            color: viewMode === 'personal' ? '#1a365d' : '#718096',
            fontWeight: viewMode === 'personal' ? '600' : '400',
            cursor: 'pointer', fontSize: '13px',
            boxShadow: viewMode === 'personal' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          My Projects
        </button>
        <button
          onClick={() => setViewMode('offline')}
          style={{
            padding: '6px 16px', border: 'none', borderRadius: '6px',
            background: viewMode === 'offline' ? '#fff' : 'transparent',
            color: viewMode === 'offline' ? '#1a365d' : '#718096',
            fontWeight: viewMode === 'offline' ? '600' : '400',
            cursor: 'pointer', fontSize: '13px',
            boxShadow: viewMode === 'offline' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          Drafts & Saved
        </button>
        {teamCount > 0 && (
          <button
            onClick={() => setViewMode('team')}
            style={{
              padding: '6px 16px', border: 'none', borderRadius: '6px',
              background: viewMode === 'team' ? '#fff' : 'transparent',
              color: viewMode === 'team' ? '#1a365d' : '#718096',
              fontWeight: viewMode === 'team' ? '600' : '400',
              cursor: 'pointer', fontSize: '13px',
              boxShadow: viewMode === 'team' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {currentTeam ? currentTeam.name : 'Team'} Projects
          </button>
        )}

        {/* Team Switcher dropdown */}
        {viewMode === 'team' && teams.length > 1 && (
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button
              onClick={() => setShowTeamSwitcher(!showTeamSwitcher)}
              style={{
                padding: '4px 10px', background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: '4px', fontSize: '12px', cursor: 'pointer', color: '#4a5568',
              }}
            >
              Switch Team ▾
            </button>
            {showTeamSwitcher && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '200px',
                overflow: 'hidden',
              }}>
                {teams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSwitchTeam(t.id)}
                    style={{
                      display: 'block', width: '100%', padding: '10px 14px',
                      border: 'none', background: currentTeam?.id === t.id ? '#ebf8ff' : '#fff',
                      textAlign: 'left', cursor: 'pointer', fontSize: '13px',
                      color: '#2d3748', borderBottom: '1px solid #f7fafc',
                    }}
                  >
                    <div style={{ fontWeight: '500' }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: '#a0aec0' }}>
                      {t.role} · {t.memberCount} member{t.memberCount !== 1 ? 's' : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      {viewMode !== 'offline' && (
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={viewMode === 'team' ? 'Search team projects...' : 'Search projects by address or name...'}
            style={{
              flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0',
              borderRadius: '6px', fontSize: '14px', outline: 'none',
            }}
          />
          <button type="submit" style={btnSecondary}>Search</button>
        </form>
      )}

      {/* Offline Inspections List */}
      {viewMode === 'offline' && (
        <>
          {loadingOffline && <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>Loading saved inspections...</div>}

          {!loadingOffline && offlineInspections.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 20px', color: '#718096',
              background: '#f7fafc', borderRadius: '8px', border: '2px dashed #e2e8f0',
            }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>No saved inspections</div>
              <div style={{ fontSize: '14px' }}>
                Start a new inspection and it will auto-save to this "Drafts & Saved" section as you work
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {offlineInspections.map(inspection => (
              <div
                key={inspection.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'stretch',
                  padding: '14px 16px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px', transition: 'all 0.15s',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>
                    {inspection.propertyAddress || 'Untitled Inspection'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#718096', marginBottom: '8px' }}>
                    {inspection.city}{inspection.city && inspection.inspectionType ? ' | ' : ''}{inspection.inspectionType}
                    {inspection.programType && ` | ${inspection.programType}`}
                    {' | '}
                    {new Date(inspection.lastSaved).toLocaleDateString()} {new Date(inspection.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: '13px', color: '#718096', marginBottom: '8px' }}>
                    Inspector: {inspection.inspectorName || 'Not set'}
                  </div>

                  {/* Progress Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: '1', background: '#e2e8f0', borderRadius: '4px', height: '6px', minWidth: '100px' }}>
                      <div
                        style={{
                          background: '#3182ce',
                          height: '6px',
                          borderRadius: '4px',
                          width: (inspection.tabCompletion._overall || 0) + '%',
                          transition: 'width 0.3s'
                        }}
                      ></div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#2d3748', minWidth: '35px' }}>
                      {inspection.tabCompletion._overall || 0}%
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginLeft: '16px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleOpenOffline(inspection.id)}
                    style={{
                      ...btnSmall,
                      background: '#3182ce',
                      color: '#fff',
                      fontWeight: '600',
                    }}
                  >
                    Resume
                  </button>
                  {confirmDeleteOffline === inspection.id ? (
                    <>
                      <button
                        onClick={() => handleDeleteOffline(inspection.id)}
                        style={{ ...btnSmall, background: '#c53030', color: '#fff' }}
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteOffline(null)}
                        style={btnSmall}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteOffline(inspection.id)}
                      style={{ ...btnSmall, color: '#c53030' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cloud Projects List */}
      {viewMode !== 'offline' && (
        <>
          {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>Loading projects...</div>}
          {error && <div style={{ color: '#c53030', padding: '10px' }}>{error}</div>}

          {!loading && projects.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 20px', color: '#718096',
              background: '#f7fafc', borderRadius: '8px', border: '2px dashed #e2e8f0',
            }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>
                {viewMode === 'team' ? 'No team projects yet' : 'No projects yet'}
              </div>
              <div style={{ fontSize: '14px' }}>
                {viewMode === 'team'
                  ? 'Start a new inspection and save it to this team'
                  : 'Click "New Inspection" to start your first project'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {projects.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px',
                  background: currentProjectId === p.id ? '#ebf8ff' : '#fff',
                  border: currentProjectId === p.id ? '2px solid #3182ce' : '1px solid #e2e8f0',
                  borderRadius: '8px', transition: 'all 0.15s',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#2d3748' }}>
                    {/* C46: prefer inspector-assigned projectName, then
                        property address, then a generic placeholder so
                        no project ever renders as just "undefined".
                        C48: explicit space before the DRAFT badge so
                        the title doesn't read "Untitled ProjectDRAFT". */}
                    {p.projectName || p.propertyAddress || 'Untitled Project'}
                    {p.isDraft && (
                      <>
                        {' '}
                        <span style={{
                          fontSize: '11px', background: '#fefcbf', color: '#975a16',
                          padding: '2px 6px', borderRadius: '4px', marginLeft: '8px',
                        }}>DRAFT</span>
                      </>
                    )}
                    {viewMode === 'team' && p.ownerName && (
                      <span style={{
                        fontSize: '11px', background: '#e9d8fd', color: '#553c9a',
                        padding: '2px 6px', borderRadius: '4px', marginLeft: '8px',
                      }}>by {p.ownerName}</span>
                    )}
                  </div>
                  {/* C46: when the name differs from the address, show the
                      address on the secondary line so inspectors can still
                      see which property a renamed project belongs to. */}
                  <div style={{ fontSize: '13px', color: '#718096', marginTop: '2px' }}>
                    {p.projectName && p.propertyAddress && p.propertyAddress !== p.projectName && (
                      <span style={{ color: '#4a5568' }}>{p.propertyAddress}{' | '}</span>
                    )}
                    {p.city}{p.city && p.stateCode ? ', ' : ''}{p.stateCode}
                    {p.inspectionType && ` | ${p.inspectionType}`}
                    {p.programType && ` | ${p.programType}`}
                    {' | '}
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleOpen(p.id)} style={btnSmall}>Open</button>
                  {/* C46: in-place rename */}
                  <button onClick={() => handleRename(p)} style={btnSmall}>Rename</button>
                  <button
                    onClick={() => {
                      setShareModal({ projectId: p.id, projectName: p.projectName || p.propertyAddress || 'Untitled Project' });
                      setShareEmail(''); setShareMsg(''); setShareError(''); // FIX 7: Clear stale error/message
                    }}
                    style={{ ...btnSmall, color: '#2c5282' }}
                  >
                    Share
                  </button>
                  {confirmDelete === p.id ? (
                    <>
                      <button onClick={() => handleDelete(p.id)} style={{ ...btnSmall, background: '#c53030', color: '#fff' }}>Confirm</button>
                      <button onClick={() => setConfirmDelete(null)} style={btnSmall}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(p.id)} style={{ ...btnSmall, color: '#c53030' }}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Share with Client Modal */}
      {shareModal && (
        <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) setShareModal(null); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
            style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
          >
            <div id="share-modal-title" style={{ fontWeight: '700', fontSize: '16px', color: '#1a365d', marginBottom: '4px' }}>
              Share Project with Client
            </div>
            <div style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
              {shareModal.projectName}
            </div>
            {shareError && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', background: '#fed7d7', color: '#c53030', fontSize: '13px' }}>
                {shareError}
              </div>
            )}
            {shareMsg && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', background: '#c6f6d5', color: '#276749', fontSize: '13px' }}>
                {shareMsg}
              </div>
            )}
            <form onSubmit={async (e) => {
              e.preventDefault();
              setShareError(''); setShareMsg(''); setShareLoading(true);
              try {
                // C50: surface both backend paths. The server returns
                // status='shared' or 're_shared' when the email belongs
                // to an existing client account, or status='invited'
                // when it had to send a /invite/client/:token link
                // email. Prior behavior said "Project shared with..."
                // unconditionally, which was misleading when the
                // actual outcome was an invite.
                const resp = await apiCall('POST', '/client/share', {
                  projectId: shareModal.projectId,
                  clientEmail: shareEmail,
                });
                if (resp && resp.status === 'invited') {
                  setShareMsg(`Invite email sent to ${shareEmail}. They'll get a link to create an account and see the project.`);
                } else if (resp && resp.status === 're_shared') {
                  setShareMsg(`${shareEmail} already had access — re-sent the notification.`);
                } else {
                  setShareMsg(`Project shared with ${shareEmail}!`);
                }
                setShareEmail('');
              } catch (err) {
                setShareError(err.message || 'Failed to share project');
              } finally {
                setShareLoading(false);
              }
            }}>
              <label htmlFor="share-modal-client-email" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '4px' }}>
                Client Email Address
              </label>
              <input
                ref={shareEmailInputRef}
                id="share-modal-client-email"
                name="clientEmail"
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="client@example.com"
                required
                autoComplete="email"
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                  borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px', marginBottom: '16px' }}>
                If the client already has a LeadFlow account we'll share it immediately. If not, we'll email them an invite link to create one.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setShareModal(null)} style={btnSecondary}>Close</button>
                <button type="submit" disabled={shareLoading} style={{ ...btnPrimary, opacity: shareLoading ? 0.6 : 1 }}>
                  {shareLoading ? 'Sharing...' : 'Share Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Designation change picker (when admin clicks existing badge) */}
      {pendingDesignation === '__change__' && (
        <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) setPendingDesignation(null); }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a365d', marginBottom: '12px' }}>
              Change Your Professional Designation
            </div>
            <div style={{ fontSize: '13px', color: '#718096', marginBottom: '12px' }}>
              Current: <strong>{DESIGNATION_LABELS[user?.designation] || 'None'}</strong>
            </div>
            {DESIGNATION_OPTIONS.map(d => (
              <button
                key={d.key}
                onClick={() => setPendingDesignation(d.key)}
                disabled={d.key === user?.designation}
                style={{
                  display: 'block', width: '100%', padding: '10px 14px', marginBottom: '6px',
                  border: d.key === user?.designation ? '2px solid #3182ce' : '1px solid #e2e8f0',
                  borderRadius: '8px', background: d.key === user?.designation ? '#ebf8ff' : '#fff',
                  textAlign: 'left', cursor: d.key === user?.designation ? 'default' : 'pointer',
                  fontSize: '14px', color: '#2d3748',
                }}
              >
                {d.label} {d.key === user?.designation && '(current)'}
              </button>
            ))}
            <button onClick={() => setPendingDesignation(null)} style={{ marginTop: '8px', padding: '8px 16px', background: '#edf2f7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* License Verification Modal — opens when a designation is selected */}
      {pendingDesignation && pendingDesignation !== '__change__' && (
        <LicenseVerificationModal
          designation={pendingDesignation}
          onVerify={verifyAndSetDesignation}
          onClose={() => setPendingDesignation(null)}
          onSuccess={() => {
            setPendingDesignation(null);
            refreshProfile();
          }}
        />
      )}
    </div>
  );
}

const btnPrimary = {
  padding: '6px 14px', background: '#38a169', color: '#fff', border: 'none',
  borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
};
const btnSecondary = {
  padding: '6px 14px', background: '#edf2f7', color: '#2d3748', border: '1px solid #e2e8f0',
  borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
};
const btnTeam = {
  padding: '6px 14px', background: '#2c5282', color: '#fff', border: 'none',
  borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
};
const btnGhost = {
  padding: '6px 14px', background: 'transparent', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
};
const btnSmall = {
  padding: '4px 10px', background: '#edf2f7', color: '#4a5568', border: '1px solid #e2e8f0',
  borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
};
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
};
