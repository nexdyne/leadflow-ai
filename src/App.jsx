import React, { useState, useReducer, useEffect } from 'react';
import { initialState, appReducer } from './data/initialState';
import { getSampleData } from './data/sampleData';
import { calculateTabCompletion, saveInspection, loadInspection } from './utils/offlineStorage';
import { apiCall } from './api/apiConfig.js';
import ProjectInfoTab from './components/ProjectInfoTab';
import XRFDataTab from './components/XRFDataTab';
import LabResultsTab from './components/LabResultsTab';
import HazardAnalysisTab from './components/HazardAnalysisTab';
import GenerateReportTab from './components/GenerateReportTab';
import PhotoUploadTab from './components/PhotoUploadTab';
import ComplianceTab from './components/ComplianceTab';
import BuildingSurveyTab from './components/BuildingSurveyTab';
import ResidentInterviewTab from './components/ResidentInterviewTab';
import FloorPlanSketcherTab from './components/FloorPlanSketcherTab';
import SignatureCollectionPanel from './components/SignatureCollectionPanel';
import MichiganRegistryPanel from './components/MichiganRegistryPanel';
import PublicRecordsLookup from './components/PublicRecordsLookup';
import AIPhotoTagger from './components/AIPhotoTagger';
import LabPDFImport from './components/LabPDFImport';
import OfflineStatusBar from './components/OfflineStatusBar';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './components/auth/LoginPage';
import PlatformAdminLoginPage from './components/auth/PlatformAdminLoginPage';
import ProjectDashboard from './components/ProjectDashboard';
import TeamManagement from './components/TeamManagement';
import InviteAcceptPage from './components/InviteAcceptPage';
import ClientPortal from './components/ClientPortal';
import UserManagement from './components/UserManagement';
import ChangePasswordModal from './components/ChangePasswordModal';
import NLGPanel from './components/NLGPanel';
import QAReviewPanel from './components/QAReviewPanel';
import ThresholdManager from './components/ThresholdManager';
import VoiceNotePanel from './components/VoiceNotePanel';
import AssumedPositivesTab from './components/AssumedPositivesTab';
import InspectorClientPanel from './components/InspectorClientPanel';
import PlatformAdminDashboard from './components/PlatformAdminDashboard';
import AnnouncementBanner from './components/AnnouncementBanner';
import BillingTab from './components/BillingTab';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import VerifyEmailPage from './components/auth/VerifyEmailPage';
import LandingPage from './components/LandingPage';

// Simple path-based routing helpers
function getInviteToken() {
  const path = window.location.pathname;
  const match = path.match(/^\/invite\/([a-f0-9]+)$/i);
  if (match) return match[1];
  const hash = window.location.hash;
  const hashMatch = hash.match(/^#\/invite\/([a-f0-9]+)$/i);
  if (hashMatch) return hashMatch[1];
  return null;
}

function isPortalPath() {
  return window.location.pathname.startsWith('/portal');
}

function isAdminPath() {
  return window.location.pathname.startsWith('/admin');
}

function getResetPasswordToken() {
  const params = new URLSearchParams(window.location.search);
  if (window.location.pathname === '/reset-password') return params.get('token');
  return null;
}

function getVerifyEmailToken() {
  const params = new URLSearchParams(window.location.search);
  if (window.location.pathname === '/verify-email') return params.get('token');
  return null;
}

function isLoginPath() {
  return window.location.pathname === '/login';
}

function isLandingPath() {
  const p = window.location.pathname;
  return p === '/' || p === '';
}

function shouldShowRegister() {
  const params = new URLSearchParams(window.location.search);
  return params.get('register') === 'true';
}

function AppContent() {
  const { user, isAuthenticated, loading: authLoading, logout, changePassword, currentTeam } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [activeTab, setActiveTab] = useState(0);
  const [currentView, setCurrentView] = useState('dashboard'); // FIX 5: dashboard | teamMgmt | userMgmt | clientPanel | inspection | billing
  const [inviteToken, setInviteToken] = useState(null);
  const [portalMode, setPortalMode] = useState(false);
  const [platformLoginMode, setPlatformLoginMode] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetPasswordToken, setResetPasswordToken] = useState(null);
  const [verifyEmailToken, setVerifyEmailToken] = useState(null);
  const [loginMode, setLoginMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Auto-save state
  const saveTimerRef = React.useRef(null);
  const [saveStatus, setSaveStatus] = React.useState('unsaved');
  const [tabCompletion, setTabCompletion] = React.useState({});
  const [showSaveToast, setShowSaveToast] = React.useState(false);
  const saveToastTimer = React.useRef(null);
  const isMetaUpdateRef = React.useRef(false);

  // Check URL on mount
  useEffect(() => {
    const token = getInviteToken();
    if (token) setInviteToken(token);
    if (isPortalPath()) setPortalMode(true);
    if (isAdminPath()) setPlatformLoginMode(true);
    if (isLoginPath()) setLoginMode(true);
    const resetToken = getResetPasswordToken();
    if (resetToken) setResetPasswordToken(resetToken);
    const verifyToken = getVerifyEmailToken();
    if (verifyToken) setVerifyEmailToken(verifyToken);
  }, []);

  // Poll unread notifications every 30 seconds on ALL views (skip for platform admin)
  useEffect(() => {
    if (user?.isPlatformAdmin || user?.role === 'platform_admin') return;

    const fetchUnreadCount = async () => {
      try {
        const result = await apiCall('GET', '/notifications/unread-count');
        setUnreadNotifCount(result.unreadCount || 0);
      } catch (err) {
        console.error('Failed to fetch notification count:', err);
      }
    };

    fetchUnreadCount(); // Initial fetch
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, [currentView, user]);

  // FIX 1: Fetch notifications when dropdown opens
  const handleNotificationBellClick = async () => {
    const willBeOpen = !showNotifDropdown;
    setShowNotifDropdown(willBeOpen);

    if (willBeOpen) {
      try {
        const result = await apiCall('GET', '/notifications');
        setNotifications(result.notifications || []);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        setNotifications([]);
      }
    }
  };

  const tabs = [
    { label: 'Project Info', component: ProjectInfoTab },
    { label: 'XRF Data', component: XRFDataTab },
    { label: 'Lab Results', component: LabResultsTab },
    { label: 'Hazard Analysis', component: HazardAnalysisTab },
    { label: 'Photos', component: PhotoUploadTab },
    { label: 'AI Photo Tags', component: AIPhotoTagger },
    { label: 'Building Survey', component: BuildingSurveyTab },
    { label: 'Resident Interview', component: ResidentInterviewTab },
    { label: 'Floor Plans', component: FloorPlanSketcherTab },
    { label: 'Signatures', component: SignatureCollectionPanel },
    { label: 'Lab PDF Import', component: LabPDFImport },
    { label: 'Property Records', component: PublicRecordsLookup },
    { label: 'MI Registry', component: MichiganRegistryPanel },
    { label: 'Compliance', component: ComplianceTab },
    { label: 'Assumed Positives', component: AssumedPositivesTab },
    { label: 'Thresholds', component: ThresholdManager },
    { label: 'AI Report Writer', component: NLGPanel },
    { label: 'QA Review', component: QAReviewPanel },
    { label: 'Generate Report', component: GenerateReportTab }
  ];

  const handleLoadSampleData = () => {
    const sampleData = getSampleData();
    dispatch({ type: 'LOAD_SAMPLE_DATA', payload: sampleData });
    setActiveTab(0);
    setCurrentView('inspection'); // FIX 5
  };

  const handleReset = () => {
    if (window.confirm('Reset all data? This cannot be undone.')) {
      dispatch({ type: 'RESET' });
    }
  };

  const handleOpenProject = (stateData) => {
    dispatch({ type: 'LOAD_INSPECTION', payload: stateData });
    setActiveTab(0);
    setCurrentView('inspection'); // FIX 5
  };

  const handleNewProject = () => {
    dispatch({ type: 'RESET' });
    setActiveTab(0);
    setCurrentView('inspection'); // FIX 5
  };

  const handleManualSave = async () => {
    if (!state._inspectionId) {
      const newId = 'insp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      dispatch({ type: 'SET_INSPECTION_META', payload: {
        _inspectionId: newId,
        _createdAt: new Date().toISOString()
      }});
      // Will re-trigger via useEffect once ID is set
      return;
    }
    try {
      setSaveStatus('saving');
      isMetaUpdateRef.current = true;
      await saveInspection(state._inspectionId, state);
      dispatch({ type: 'SET_INSPECTION_META', payload: { _lastSaved: new Date().toISOString() }});
      setSaveStatus('saved');
      setShowSaveToast(true);
      if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
      saveToastTimer.current = setTimeout(() => setShowSaveToast(false), 3000);
    } catch (err) {
      console.error('Manual save failed:', err);
      setSaveStatus('error');
    }
  };

  const handleBackToDashboard = async () => {
    if (state._inspectionId) {
      try {
        setSaveStatus('saving');
        await saveInspection(state._inspectionId, state);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save before dashboard:', err);
        setSaveStatus('error');
      }
    }
    setCurrentView('dashboard'); // FIX 5
  };

  // Auto-save: debounce 2s after any state change
  useEffect(() => {
    // Don't auto-save if we're on the dashboard or state is pristine
    if (currentView === 'dashboard') return;

    // Skip if this state change was just a metadata update (prevents infinite loop)
    if (isMetaUpdateRef.current) {
      isMetaUpdateRef.current = false;
      return;
    }

    // Generate inspection ID if this is a new inspection
    if (!state._inspectionId) {
      isMetaUpdateRef.current = true;
      const newId = 'insp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      dispatch({ type: 'SET_INSPECTION_META', payload: {
        _inspectionId: newId,
        _createdAt: new Date().toISOString()
      }});
      return; // Will re-trigger after meta is set
    }

    // Clear existing timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    setSaveStatus('saving');

    // Debounced save
    saveTimerRef.current = setTimeout(() => {
      saveInspection(state._inspectionId, state)
        .then(() => {
          setSaveStatus('saved');
          isMetaUpdateRef.current = true;
          dispatch({ type: 'SET_INSPECTION_META', payload: { _lastSaved: new Date().toISOString() }});
        })
        .catch((err) => {
          console.error('Auto-save failed:', err);
          setSaveStatus('error');
        });
    }, 2000);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [state, currentView]);

  // Update tab completion
  useEffect(() => {
    const completion = calculateTabCompletion(state);
    setTabCompletion(completion);
  }, [state]);

  const handleInviteDone = () => {
    setInviteToken(null);
    window.history.replaceState(null, '', '/');
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a365d, #2c5282)',
      }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  // ─── Password Reset (from email link) ───────────────────
  if (resetPasswordToken) {
    return <ResetPasswordPage token={resetPasswordToken} onDone={() => { setResetPasswordToken(null); window.history.replaceState(null, '', '/'); }} />;
  }

  // ─── Email Verification (from email link) ──────────────
  if (verifyEmailToken) {
    return <VerifyEmailPage token={verifyEmailToken} onDone={() => { setVerifyEmailToken(null); window.history.replaceState(null, '', '/'); }} />;
  }

  // ─── Forgot Password ──────────────────────────────────
  if (forgotPasswordMode) {
    return <ForgotPasswordPage onBack={() => setForgotPasswordMode(false)} />;
  }

  // ─── Invite flow ────────────────────────────────────────
  if (inviteToken) {
    if (!isAuthenticated) {
      return <LoginPage inviteMessage="Sign in or create an account to accept your team invitation." />;
    }
    return <InviteAcceptPage token={inviteToken} onDone={handleInviteDone} />;
  }

  // ─── Platform Admin ─────────────────────────────────────
  // /admin and /admin/* URLs route to the dedicated PlatformAdminLoginPage
  // (a visually distinct dark-themed surface — deliberately NOT reusing
  // the inspector LoginPage so there is zero chance an inspector lands
  // here by accident and thinks it's the regular sign-in).
  const isPlatformAdmin = user?.role === 'platform_admin' || user?.isPlatformAdmin;
  if (platformLoginMode && !isAuthenticated) {
    return (
      <PlatformAdminLoginPage
        onInspectorSwitch={() => {
          setPlatformLoginMode(false);
          // Drop the user onto the real inspector /login URL so the
          // inspector surface renders cleanly and the back button works.
          window.history.replaceState(null, '', '/login');
          setLoginMode(true);
        }}
      />
    );
  }
  if (isPlatformAdmin && isAuthenticated) {
    return <PlatformAdminDashboard onLogout={() => setPlatformLoginMode(true)} />;
  }

  // ─── Client Portal ──────────────────────────────────────
  // Show portal if: URL is /portal, OR user is logged in with client role
  // NOTE: no onPlatformSwitch prop — inspector/client surfaces never
  // expose a path to the admin console. Admins reach /admin by URL.
  const isClient = user?.role === 'client';
  if (portalMode || isClient) {
    if (!isAuthenticated) {
      return <LoginPage isClientPortal showPlatformAdminLink onPortalSwitch={() => setPortalMode(false)} onForgotPassword={() => setForgotPasswordMode(true)} />;
    }
    if (isClient) {
      return <ClientPortal />;
    }
    // Inspector accidentally went to /portal — redirect back
    setPortalMode(false);
  }

  // ─── Inspector login ────────────────────────────────────
  // Same rule as above: no onPlatformSwitch, no Platform Admin footer
  // link. The inspector login is strictly for inspectors.
  if (!isAuthenticated) {
    // Show landing page at root path, login page at /login
    if (!loginMode && isLandingPath()) {
      return <LandingPage />;
    }
    return <LoginPage showPlatformAdminLink onPortalSwitch={() => setPortalMode(true)} onForgotPassword={() => setForgotPasswordMode(true)} />;
  }

  // ─── Force password change for admin-created accounts ──
  const showPasswordChange = user?.mustChangePassword;

  const ActiveComponent = tabs[activeTab].component;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Offline Status Bar */}
      <OfflineStatusBar state={state} dispatch={dispatch} />

      {/* Force password change modal */}
      {showPasswordChange && (
        <ChangePasswordModal onChangePassword={changePassword} onLogout={logout} />
      )}

      {/* Viewer Read-Only Banner — FIX 3 */}
      {currentTeam?.role === 'viewer' && currentView === 'inspection' && (
        <div className="bg-red-600 text-white px-6 py-3 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span className="text-xl">⚠</span>
            <span className="font-semibold">View Only — You are viewing this project as a team viewer. Editing is disabled.</span>
          </div>
        </div>
      )}

      {/* FIX 2: Persistent error banner for save failures */}
      {saveStatus === 'error' && currentView === 'inspection' && (
        <div className="bg-red-600 text-white px-6 py-4 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <span className="text-xl">❌</span>
            <span>Save failed — your changes may not be persisted. Check your connection.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1
              className="text-4xl font-bold mb-1 cursor-pointer hover:text-blue-200 transition"
              onClick={() => { handleBackToDashboard(); }}
              title="Back to Dashboard"
            >
              LeadFlow AI
            </h1>
            <p className="text-blue-100">Lead Abatement Report Automation for Michigan Inspectors</p>
          </div>
          <div className="flex items-center gap-4">
            {currentView === 'inspection' && (
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === 'saving' && <span className="text-yellow-300">Saving...</span>}
                {saveStatus === 'saved' && <span className="text-green-300">Saved {state._lastSaved ? 'at ' + new Date(state._lastSaved).toLocaleTimeString() : ''}</span>}
                {saveStatus === 'error' && <span className="text-red-300">Save error</span>}
                {saveStatus === 'unsaved' && <span className="text-gray-400">Not saved</span>}
              </div>
            )}
            {/* Notification bell — visible on ALL views */}
            <div className="relative">
              <button
                onClick={handleNotificationBellClick}
                className="relative text-white hover:text-blue-200 transition"
                title="Notifications"
              >
                <span style={{ fontSize: '24px' }}>🔔</span>
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded-lg shadow-xl z-40 border border-gray-200 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 sticky top-0">
                    <span className="font-semibold text-sm text-gray-800">Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={async () => {
                          try {
                            await apiCall('PUT', '/notifications/read-all');
                            setUnreadNotifCount(0);
                            setNotifications(notifications.map(n => ({ ...n, read: true })));
                          } catch (err) {
                            console.error('Failed to mark all as read:', err);
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                  ) : (
                    notifications.map((notif, idx) => (
                      <div
                        key={idx}
                        onClick={async () => {
                          try {
                            await apiCall('PUT', `/notifications/${notif.id}/read`);
                            setNotifications(notifications.map((n, i) => i === idx ? { ...n, read: true } : n));
                            if (!notif.read) {
                              setUnreadNotifCount(Math.max(0, unreadNotifCount - 1));
                            }
                          } catch (err) {
                            console.error('Failed to mark notification as read:', err);
                          }
                        }}
                        className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${notif.read ? '' : 'bg-blue-50'}`}
                      >
                        <div className="flex gap-2 items-start">
                          <span style={{ fontSize: '16px' }}>
                            {notif.type === 'message' ? '💬' : notif.type === 'pending' ? '⏳' : '📢'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{notif.title}</div>
                            <div className="text-xs text-gray-500 mt-1">{notif.timeAgo}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {currentView === 'inspection' && (
              <button
                onClick={handleBackToDashboard}
                className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-600 font-medium transition border border-blue-500"
              >
                Dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Announcement Banner — CS26 */}
      <div className="max-w-7xl mx-auto pt-4">
        <AnnouncementBanner />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* User Management (admin) */}
        {currentView === 'userMgmt' && (
          <div className="mb-6">
            <UserManagement onBack={() => { setCurrentView('dashboard'); }} />
          </div>
        )}

        {/* Team Management */}
        {currentView === 'teamMgmt' && (
          <div className="mb-6">
            <TeamManagement onBack={() => { setCurrentView('dashboard'); }} />
          </div>
        )}

        {/* Inspector Client Panel */}
        {currentView === 'clientPanel' && (
          <div className="mb-6">
            <InspectorClientPanel />
            <button
              onClick={() => { setCurrentView('dashboard'); }}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Billing & Subscription — C29 */}
        {currentView === 'billing' && (
          <div className="mb-6">
            <BillingTab onBack={() => { setCurrentView('dashboard'); }} />
          </div>
        )}

        {/* Project Dashboard (when visible) */}
        {currentView === 'dashboard' && (
          <div className="mb-6">
            <ProjectDashboard
              onOpenProject={handleOpenProject}
              onNewProject={handleNewProject}
              onManageTeams={() => { setCurrentView('teamMgmt'); }}
              onManageUsers={() => { setCurrentView('userMgmt'); }}
              onManageClients={() => { setCurrentView('clientPanel'); }}
              onOpenBilling={() => { setCurrentView('billing'); }}
              currentState={state}
              unreadNotifCount={unreadNotifCount}
            />
          </div>
        )}

        {/* Inspection Interface */}
        {currentView === 'inspection' && (
          <>
            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleLoadSampleData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
              >
                Load Sample Data
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
              >
                Reset All
              </button>
            </div>

            {/* Overall Progress Bar */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Overall Progress:</span>
              <div className="flex-grow bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: (tabCompletion._overall || 0) + '%' }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-blue-900">{tabCompletion._overall || 0}%</span>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {tabs.map((tab, idx) => {
                const tabCompletionKeys = [
                  'projectInfo', 'xrfData', 'labResults', 'hazardAnalysis', 'photos',
                  'aiPhotoTags', 'buildingSurvey', 'residentInterview', 'floorPlans',
                  'signatures', 'labPdfImport', 'propertyRecords', 'miRegistry',
                  'compliance', 'assumedPositives', 'thresholds', 'aiReportWriter',
                  'qaReview', 'generateReport'
                ];
                const completionKey = tabCompletionKeys[idx];
                const completion = tabCompletion[completionKey] || 0;

                return (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    className={`px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
                      activeTab === idx
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                      style={{
                        backgroundColor:
                          activeTab === idx ? '#60a5fa' :
                          completion >= 100 ? '#4ade80' :
                          completion > 0 ? '#facc15' :
                          '#d1d5db'
                      }}
                    ></span>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <ActiveComponent state={state} dispatch={dispatch} />

              {/* Per-tab Voice Notes panel — notes are scoped to the active tab by label.
                  Reducer + initial state already wired at src/data/initialState.js
                  (voiceNotes array + ADD_VOICE_NOTE / DELETE_VOICE_NOTE cases). */}
              <div className="mt-6">
                <VoiceNotePanel
                  state={state}
                  dispatch={dispatch}
                  tabName={tabs[activeTab].label}
                />
              </div>

              {/* Save Progress Bar — visible on every tab */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* FIX 3: Hide Save Progress button for viewers */}
                  {currentTeam?.role !== 'viewer' && (
                    <button
                      onClick={handleManualSave}
                      disabled={saveStatus === 'saving'}
                      className={`px-6 py-3 rounded-lg font-semibold text-white text-lg shadow transition ${
                        saveStatus === 'saving'
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                      }`}
                    >
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Progress'}
                    </button>
                  )}
                  <span className="text-sm text-gray-500">
                    {saveStatus === 'saved' && state._lastSaved && ('Last saved: ' + new Date(state._lastSaved).toLocaleTimeString())}
                    {saveStatus === 'error' && <span className="text-red-600 font-medium">Save failed — try again</span>}
                    {saveStatus === 'unsaved' && 'Not yet saved'}
                  </span>
                </div>
                <div className="flex gap-3">
                  {activeTab > 0 && (
                    <button
                      onClick={() => { handleManualSave(); setActiveTab(activeTab - 1); }}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition"
                    >
                      &larr; Previous Tab
                    </button>
                  )}
                  {activeTab < tabs.length - 1 && (
                    <button
                      onClick={() => { handleManualSave(); setActiveTab(activeTab + 1); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                    >
                      Save &amp; Next Tab &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Save Toast Notification */}
            {showSaveToast && (
              <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 animate-fade-in">
                <span style={{ fontSize: '20px' }}>&#10003;</span>
                <span className="font-medium">Progress saved successfully!</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
