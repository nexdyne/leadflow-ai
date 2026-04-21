import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { apiCall } from '../api/apiConfig.js';

const STATUS_COLORS = {
  draft:       { bg: '#edf2f7', text: '#2d3748' },
  scheduled:   { bg: '#bee3f8', text: '#2c5282' },
  in_progress: { bg: '#fefcbf', text: '#975a16' },
  completed:   { bg: '#c6f6d5', text: '#276749' },
  delivered:   { bg: '#c6f6d5', text: '#22543d' },
  pending:     { bg: '#fefcbf', text: '#975a16' },
  accepted:    { bg: '#c6f6d5', text: '#276749' },
  declined:    { bg: '#fed7d7', text: '#c53030' },
};

const STATUS_LABELS = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  delivered: 'Delivered',
};

const STATUS_WORKFLOW = ['draft', 'scheduled', 'in_progress', 'completed', 'delivered'];

export default function InspectorClientPanel(props = {}) {
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState('messages'); // messages | requests | status | access
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const msgEndRef = useRef(null);

  // ═══════════════════════════════════════════════════════════
  // MESSAGES TAB
  // ═══════════════════════════════════════════════════════════
  const [sharedProjects, setSharedProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // ═══════════════════════════════════════════════════════════
  // INCOMING REQUESTS TAB
  // ═══════════════════════════════════════════════════════════
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [responseNotes, setResponseNotes] = useState({}); // { [requestId]: noteText }
  const [requestResponding, setRequestResponding] = useState({}); // { [requestId]: boolean }

  // ═══════════════════════════════════════════════════════════
  // STATUS MANAGER TAB
  // ═══════════════════════════════════════════════════════════
  const [allProjects, setAllProjects] = useState([]);
  const [selectedStatusProjectId, setSelectedStatusProjectId] = useState(null);
  const [statusNote, setStatusNote] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(false);

  // ═══════════════════════════════════════════════════════════
  // CLIENT ACCESS TAB
  // ═══════════════════════════════════════════════════════════
  const [selectedAccessProjectId, setSelectedAccessProjectId] = useState(null);
  const [sharedWith, setSharedWith] = useState([]); // List of clients + pending invites
  const [shareEmail, setShareEmail] = useState('');
  const [shareName, setShareName] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [sharingLoading, setSharingLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // Utility functions
  // ─────────────────────────────────────────────────────────────
  function showMsg(msg) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3500);
  }

  // Auto-scroll messages
  useEffect(() => {
    if (msgEndRef.current && activeTab === 'messages') {
      msgEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // ─────────────────────────────────────────────────────────────
  // MESSAGES TAB - Load shared projects
  // ─────────────────────────────────────────────────────────────
  const loadSharedProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall('GET', '/client/projects/shared-with-clients');
      setSharedProjects(data.projects || []);
      if (data.projects && data.projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data.projects[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load shared projects');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  // Load messages for selected project
  const loadMessages = useCallback(async (projectId) => {
    if (!projectId) return;
    try {
      const data = await apiCall('GET', `/client/messages/${projectId}/inspector`);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message || 'Failed to load messages');
    }
  }, []);

  // Send message
  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!msgInput.trim() || !selectedProjectId) return;

    const content = msgInput.trim();
    setMsgInput('');
    try {
      const data = await apiCall('POST', `/client/messages/${selectedProjectId}/inspector`, { content });
      setMessages(prev => [...prev, data.message]);
      showMsg('Message sent!');
    } catch (err) {
      setError(err.message || 'Failed to send message');
      setMsgInput(content); // Restore input on error
    }
  }, [msgInput, selectedProjectId]);

  // Load messages when tab or project changes
  useEffect(() => {
    if (activeTab === 'messages' && selectedProjectId) {
      loadMessages(selectedProjectId);
    }
  }, [activeTab, selectedProjectId, loadMessages]);

  // ─────────────────────────────────────────────────────────────
  // INCOMING REQUESTS TAB
  // ─────────────────────────────────────────────────────────────
  const loadIncomingRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall('GET', '/client/requests/incoming');
      setIncomingRequests(data.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReviewRequest = useCallback(async (requestId, status) => {
    const notes = responseNotes[requestId] || '';
    setRequestResponding(prev => ({ ...prev, [requestId]: true }));
    try {
      await apiCall('PUT', `/client/requests/${requestId}/review`, { status, responseNote: notes });
      setIncomingRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status } : r)
      );
      setResponseNotes(prev => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
      showMsg(`Request ${status === 'accepted' ? 'accepted' : 'declined'}!`);
    } catch (err) {
      setError(err.message || 'Failed to update request');
    } finally {
      setRequestResponding(prev => ({ ...prev, [requestId]: false }));
    }
  }, [responseNotes]);

  // Load requests when tab changes
  useEffect(() => {
    if (activeTab === 'requests') {
      loadIncomingRequests();
    }
  }, [activeTab, loadIncomingRequests]);

  // ─────────────────────────────────────────────────────────────
  // STATUS MANAGER TAB
  // ─────────────────────────────────────────────────────────────
  const loadAllProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const data = await apiCall('GET', '/projects?limit=100');
      setAllProjects(data.projects || []);
      if (data.projects && data.projects.length > 0 && !selectedStatusProjectId) {
        setSelectedStatusProjectId(data.projects[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  }, [selectedStatusProjectId]);

  const selectedStatusProject = selectedStatusProjectId
    ? allProjects.find(p => p.id === selectedStatusProjectId)
    : null;

  const handleStatusChange = useCallback(async (newStatus) => {
    if (!selectedStatusProjectId) return;
    try {
      await apiCall('PUT', `/client/projects/${selectedStatusProjectId}/status`, {
        status: newStatus,
        statusNote,
      });
      setStatusNote('');
      setAllProjects(prev =>
        prev.map(p => p.id === selectedStatusProjectId ? { ...p, status: newStatus } : p)
      );
      showMsg(`Status updated to ${STATUS_LABELS[newStatus] || newStatus}`);
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  }, [selectedStatusProjectId, statusNote]);

  // Load projects when status OR access tab is active (shared dropdown source)
  useEffect(() => {
    if (activeTab === 'status' || activeTab === 'access') {
      loadAllProjects();
    }
  }, [activeTab, loadAllProjects]);

  // ─────────────────────────────────────────────────────────────
  // CLIENT ACCESS TAB
  // ─────────────────────────────────────────────────────────────
  const loadClientAccess = useCallback(async (projectId) => {
    if (!projectId) return;
    setSharingLoading(true);
    try {
      const data = await apiCall('GET', `/client/shared/${projectId}`);
      setSharedWith(data.clients || []);
    } catch (err) {
      setError(err.message || 'Failed to load client access');
    } finally {
      setSharingLoading(false);
    }
  }, []);

  const selectedAccessProject = selectedAccessProjectId
    ? allProjects.find(p => p.id === selectedAccessProjectId)
    : null;

  const handleShareWithClient = useCallback(async (e) => {
    e.preventDefault();
    if (!shareEmail.trim() || !selectedAccessProjectId) return;

    setSharingLoading(true);
    try {
      const body = {
        projectId: selectedAccessProjectId,
        clientEmail: shareEmail.trim(),
      };
      if (shareName.trim()) body.clientName = shareName.trim();
      if (shareMessage.trim()) body.message = shareMessage.trim();
      const result = await apiCall('POST', '/client/share', body);
      const emailSent = shareEmail;
      setShareEmail('');
      setShareName('');
      setShareMessage('');
      await loadClientAccess(selectedAccessProjectId);
      if (result?.status === 'invited') {
        showMsg(`Invite sent to ${emailSent} — they'll receive an email to create an account.`);
      } else if (result?.status === 're_shared') {
        showMsg(`${emailSent} already had access — re-notified them.`);
      } else {
        showMsg(`Project shared with ${emailSent}!`);
      }
    } catch (err) {
      setError(err.message || 'Failed to share project');
    } finally {
      setSharingLoading(false);
    }
  }, [shareEmail, shareName, shareMessage, selectedAccessProjectId, loadClientAccess]);

  const handleRevokeAccess = useCallback(async (row) => {
    if (!selectedAccessProjectId) return;
    const isInvite = row.kind === 'invite';
    const prompt = isInvite
      ? 'Cancel this pending invite? The recipient will no longer be able to use the invite link.'
      : 'Remove this client\'s access to the project? They will no longer be able to view it.';
    if (!confirm(prompt)) return;
    setSharingLoading(true);
    try {
      const body = { projectId: selectedAccessProjectId };
      if (isInvite) body.inviteId = row.id;
      else body.clientId = row.id;
      await apiCall('DELETE', '/client/share', body);
      await loadClientAccess(selectedAccessProjectId);
      showMsg(isInvite ? 'Invite cancelled!' : 'Access revoked!');
    } catch (err) {
      setError(err.message || 'Failed to revoke access');
    } finally {
      setSharingLoading(false);
    }
  }, [selectedAccessProjectId, loadClientAccess]);

  // Load client access when project changes
  useEffect(() => {
    if (activeTab === 'access' && selectedAccessProjectId) {
      loadClientAccess(selectedAccessProjectId);
    }
  }, [activeTab, selectedAccessProjectId, loadClientAccess]);

  // Load shared projects when tab changes to messages
  useEffect(() => {
    if (activeTab === 'messages') {
      loadSharedProjects();
    }
  }, [activeTab, loadSharedProjects]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a365d, #2c5282)',
        color: '#fff', padding: '16px 24px', marginBottom: '24px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0' }}>Inspector Client Panel</h1>
          <p style={{ fontSize: '14px', color: '#cbd5e0', margin: '4px 0 0 0' }}>
            Manage messages, requests, project status, and client access
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 24px' }}>
        <div style={{
          display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px',
        }}>
          {['messages', 'requests', 'status', 'access'].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setError('');
              }}
              style={{
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab ? '600' : '500',
                color: activeTab === tab ? '#2d3748' : '#718096',
                borderBottom: activeTab === tab ? '3px solid #3182ce' : 'none',
                marginBottom: '-2px',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'messages' && `✉ Client Messages`}
              {tab === 'requests' && `📋 Incoming Requests`}
              {tab === 'status' && `📊 Status Manager`}
              {tab === 'access' && `🔐 Client Access`}
            </button>
          ))}
        </div>

        {/* Error and success messages */}
        {error && (
          <div style={{
            background: '#fed7d7', color: '#c53030', padding: '12px 16px',
            borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>✗ {error}</span>
            <button
              onClick={() => setError('')}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#c53030', fontSize: '16px', padding: '0',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {actionMsg && (
          <div style={{
            background: '#c6f6d5', color: '#276749', padding: '12px 16px',
            borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
          }}>
            ✓ {actionMsg}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CLIENT MESSAGES TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'messages' && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', height: 'calc(100vh - 320px)' }}>
            {/* Projects list */}
            <div style={{
              background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                padding: '16px', background: '#f7fafc', borderBottom: '1px solid #e2e8f0',
                fontSize: '14px', fontWeight: '600', color: '#2d3748',
              }}>
                Shared Projects ({sharedProjects.length})
              </div>

              <div style={{ overflow: 'auto', flex: 1 }}>
                {loading && (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#718096' }}>
                    Loading...
                  </div>
                )}

                {!loading && sharedProjects.length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#718096', fontSize: '14px' }}>
                    No projects shared with clients yet.
                  </div>
                )}

                {sharedProjects.map(proj => (
                  <button
                    key={proj.id}
                    onClick={() => setSelectedProjectId(proj.id)}
                    style={{
                      width: '100%', padding: '12px 16px', border: 'none',
                      background: selectedProjectId === proj.id ? '#e6fffa' : 'transparent',
                      borderLeft: selectedProjectId === proj.id ? '3px solid #38b2ac' : 'none',
                      cursor: 'pointer', textAlign: 'left', fontSize: '14px',
                      borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedProjectId !== proj.id) e.target.style.background = '#f7fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedProjectId !== proj.id) e.target.style.background = 'transparent';
                    }}
                  >
                    <div style={{ fontWeight: '500', color: '#2d3748' }}>{proj.projectName}</div>
                    <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>
                      {proj.address || 'No address'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages panel */}
            <div style={{
              background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}>
              {!selectedProjectId ? (
                <div style={{
                  padding: '32px 24px', textAlign: 'center', color: '#718096', fontSize: '14px',
                }}>
                  Select a project to view messages
                </div>
              ) : (
                <>
                  {/* Messages list */}
                  <div style={{
                    padding: '16px', background: '#f7fafc', borderBottom: '1px solid #e2e8f0',
                    fontSize: '14px', fontWeight: '600', color: '#2d3748',
                  }}>
                    Messages
                  </div>

                  <div style={{
                    flex: 1, overflow: 'auto', padding: '16px', display: 'flex',
                    flexDirection: 'column', gap: '12px',
                  }}>
                    {messages.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#718096', fontSize: '14px', padding: '24px' }}>
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      messages.map(msg => {
                        const isInspector = msg.senderRole === 'inspector';
                        return (
                        <div
                          key={msg.id}
                          style={{
                            padding: '12px 16px',
                            background: isInspector ? '#bee3f8' : '#e6fffa',
                            color: isInspector ? '#2c5282' : '#234e52',
                            fontSize: '14px', wordWrap: 'break-word',
                            borderRadius: '8px',
                            marginLeft: isInspector ? 'auto' : '0',
                            marginRight: isInspector ? '0' : 'auto',
                            maxWidth: '70%',
                          }}
                        >
                          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
                            {isInspector ? 'You' : msg.senderName || 'Client'}
                          </div>
                          <div>{msg.content}</div>
                          <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
                            {new Date(msg.createdAt).toLocaleString()}
                          </div>
                        </div>
                        );
                      })
                    )}
                    <div ref={msgEndRef} />
                  </div>

                  {/* Message input */}
                  <form
                    onSubmit={handleSendMessage}
                    style={{
                      padding: '16px', borderTop: '1px solid #e2e8f0',
                      display: 'flex', gap: '8px',
                    }}
                  >
                    <input
                      type="text"
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      placeholder="Type message..."
                      style={{
                        flex: 1, padding: '10px 12px', border: '1px solid #cbd5e0',
                        borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!msgInput.trim()}
                      style={{
                        padding: '10px 16px', background: msgInput.trim() ? '#3182ce' : '#cbd5e0',
                        color: '#fff', border: 'none', borderRadius: '6px', cursor: msgInput.trim() ? 'pointer' : 'default',
                        fontSize: '14px', fontWeight: '500',
                      }}
                    >
                      Send
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* INCOMING REQUESTS TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'requests' && (
          <div>
            <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: '500', color: '#2d3748' }}>
              Pending Inspection Requests ({incomingRequests.length})
            </div>

            {loading && (
              <div style={{ textAlign: 'center', color: '#718096', padding: '32px' }}>
                Loading...
              </div>
            )}

            {!loading && incomingRequests.length === 0 && (
              <div style={{
                textAlign: 'center', color: '#718096', padding: '32px',
                background: '#f7fafc', borderRadius: '8px',
              }}>
                No pending requests.
              </div>
            )}

            {incomingRequests.map(req => (
              <div
                key={req.id}
                style={{
                  background: '#fff', borderRadius: '8px', padding: '20px',
                  marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${STATUS_COLORS[req.status]?.bg || '#e2e8f0'}`,
                }}
              >
                {/* Request Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                      {req.propertyAddress}
                    </div>
                    <div style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
                      {req.city}, {req.state} {req.zip}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 12px', borderRadius: '4px',
                    background: STATUS_COLORS[req.status]?.bg,
                    color: STATUS_COLORS[req.status]?.text,
                    fontSize: '12px', fontWeight: '600', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center',
                  }}>
                    {req.status === 'pending' && '⏱'}
                    {req.status === 'accepted' && '✓'}
                    {req.status === 'declined' && '✗'}
                    {req.status === 'scheduled' && '📅'}
                    {' '}
                    {req.status}
                  </div>
                </div>

                {/* Request Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#718096', fontWeight: '500' }}>Inspection Type</div>
                    <div style={{ fontSize: '14px', color: '#2d3748', marginTop: '2px' }}>{req.inspectionType}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#718096', fontWeight: '500' }}>Preferred Date</div>
                    <div style={{ fontSize: '14px', color: '#2d3748', marginTop: '2px' }}>
                      {req.preferredDate ? new Date(req.preferredDate).toLocaleDateString() : 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#718096', fontWeight: '500' }}>Client Name</div>
                    <div style={{ fontSize: '14px', color: '#2d3748', marginTop: '2px' }}>{req.clientName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#718096', fontWeight: '500' }}>Email</div>
                    <div style={{ fontSize: '14px', color: '#2d3748', marginTop: '2px' }}>{req.clientEmail}</div>
                  </div>
                </div>

                {/* Notes */}
                {req.notes && (
                  <div style={{ marginBottom: '16px', padding: '12px', background: '#f7fafc', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#718096', fontWeight: '500', marginBottom: '4px' }}>
                      Client Notes
                    </div>
                    <div style={{ fontSize: '14px', color: '#2d3748' }}>{req.notes}</div>
                  </div>
                )}

                {/* Response Section */}
                {req.status === 'pending' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#718096', fontWeight: '500', marginBottom: '8px' }}>
                      Response Notes (optional)
                    </label>
                    <textarea
                      value={responseNotes[req.id] || ''}
                      onChange={(e) => setResponseNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="Add any notes for the client..."
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #cbd5e0',
                        borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit',
                        minHeight: '80px', resize: 'none',
                      }}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                {req.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleReviewRequest(req.id, 'declined')}
                      disabled={requestResponding[req.id]}
                      style={{
                        padding: '10px 16px', background: '#fed7d7', color: '#c53030',
                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
                        fontWeight: '500', opacity: requestResponding[req.id] ? 0.6 : 1,
                      }}
                    >
                      ✗ Decline
                    </button>
                    <button
                      onClick={() => handleReviewRequest(req.id, 'accepted')}
                      disabled={requestResponding[req.id]}
                      style={{
                        padding: '10px 16px', background: '#c6f6d5', color: '#276749',
                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
                        fontWeight: '500', opacity: requestResponding[req.id] ? 0.6 : 1,
                      }}
                    >
                      ✓ Accept
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* STATUS MANAGER TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'status' && (
          <div>
            {/* Project Selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '8px' }}>
                Select Project
              </label>
              <select
                value={selectedStatusProjectId || ''}
                onChange={(e) => {
                  setSelectedStatusProjectId(e.target.value);
                  setStatusNote('');
                }}
                disabled={projectsLoading}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #cbd5e0',
                  borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option value="">-- Choose a project --</option>
                {allProjects.map(proj => (
                  <option key={proj.id} value={proj.id}>
                    {proj.projectName} ({proj.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedStatusProject && (
              <div style={{
                background: '#fff', borderRadius: '8px', padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                {/* Current Status */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#718096', marginBottom: '8px' }}>
                    Current Status
                  </div>
                  <div style={{
                    padding: '12px 16px', borderRadius: '6px',
                    background: STATUS_COLORS[selectedStatusProject.status]?.bg,
                    color: STATUS_COLORS[selectedStatusProject.status]?.text,
                    fontSize: '16px', fontWeight: '600', textTransform: 'capitalize',
                    display: 'inline-block',
                  }}>
                    {STATUS_LABELS[selectedStatusProject.status] || selectedStatusProject.status}
                  </div>
                </div>

                {/* Draft Warning */}
                {selectedStatusProject.isDraft && (
                  <div style={{
                    background: '#fefcbf', color: '#975a16', padding: '12px 16px',
                    borderRadius: '6px', marginBottom: '24px', fontSize: '14px',
                  }}>
                    ⚠️ This project is still a draft. Complete the inspection before scheduling.
                  </div>
                )}

                {/* Status Workflow Buttons */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#718096', marginBottom: '12px' }}>
                    Change Status
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {STATUS_WORKFLOW.map(status => {
                      const currentIdx = STATUS_WORKFLOW.indexOf(selectedStatusProject.status);
                      const statusIdx = STATUS_WORKFLOW.indexOf(status);
                      // Only show current status (disabled) and next status (enabled), plus all forward-skippable future ones
                      const isCurrentStatus = statusIdx === currentIdx;
                      const isNextStatus = statusIdx === currentIdx + 1;
                      const isClickable = statusIdx > currentIdx;

                      return (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          disabled={!isClickable}
                          style={{
                            padding: '10px 16px',
                            background: isCurrentStatus ? STATUS_COLORS[status]?.bg : (isClickable ? STATUS_COLORS[status]?.bg : '#e2e8f0'),
                            color: isCurrentStatus ? STATUS_COLORS[status]?.text : (isClickable ? STATUS_COLORS[status]?.text : '#a0aec0'),
                            border: isCurrentStatus ? `2px solid ${STATUS_COLORS[status]?.text}` : 'none',
                            borderRadius: '6px',
                            cursor: isClickable ? 'pointer' : 'default',
                            fontSize: '14px',
                            fontWeight: isNextStatus ? '600' : '500',
                            textTransform: 'capitalize',
                            opacity: isClickable ? 1 : 0.6,
                          }}
                          title={isCurrentStatus ? 'Current status' : (isClickable ? `Click to change to ${STATUS_LABELS[status] || status}` : `Cannot move backward in workflow`)}
                        >
                          {STATUS_LABELS[status] || status}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status Note */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#718096', marginBottom: '8px' }}>
                    Status Notes (optional)
                  </label>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Add notes about the status change..."
                    style={{
                      width: '100%', padding: '10px 12px', border: '1px solid #cbd5e0',
                      borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit',
                      minHeight: '100px', resize: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {!selectedStatusProject && !projectsLoading && (
              <div style={{
                textAlign: 'center', color: '#718096', padding: '32px',
                background: '#f7fafc', borderRadius: '8px',
              }}>
                Select a project to manage its status.
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CLIENT ACCESS TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'access' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Project Selector & Share Form */}
            <div style={{
              background: '#fff', borderRadius: '8px', padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748', marginBottom: '16px' }}>
                Share Project
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#718096', marginBottom: '8px' }}>
                  Select Project
                </label>
                <select
                  value={selectedAccessProjectId || ''}
                  onChange={(e) => {
                    setSelectedAccessProjectId(e.target.value);
                    setShareEmail('');
                  }}
                  disabled={projectsLoading}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #cbd5e0',
                    borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">-- Choose a project --</option>
                  {allProjects.map(proj => (
                    <option key={proj.id} value={proj.id}>
                      {proj.projectName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAccessProject?.isDraft && (
                <div style={{
                  background: '#fefcbf', color: '#975a16', padding: '12px 16px',
                  borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
                }}>
                  ⚠️ This project is still a draft
                </div>
              )}

              {selectedAccessProjectId && (
                <form onSubmit={handleShareWithClient} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#718096', marginBottom: '8px' }}>
                      Client Email <span style={{ color: '#e53e3e' }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="client@example.com"
                      required
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #cbd5e0',
                        borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#718096', marginBottom: '8px' }}>
                      Client Name <span style={{ color: '#a0aec0', fontWeight: '400' }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={shareName}
                      onChange={(e) => setShareName(e.target.value)}
                      placeholder="Jane Homeowner"
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #cbd5e0',
                        borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>
                      Used in the invite email greeting if they don't have an account yet.
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#718096', marginBottom: '8px' }}>
                      Personal Message <span style={{ color: '#a0aec0', fontWeight: '400' }}>(optional)</span>
                    </label>
                    <textarea
                      value={shareMessage}
                      onChange={(e) => setShareMessage(e.target.value)}
                      placeholder="Hi Jane — sharing your lead inspection results. Let me know if you have any questions."
                      rows={3}
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #cbd5e0',
                        borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!shareEmail.trim() || sharingLoading}
                    style={{
                      padding: '10px 16px',
                      background: shareEmail.trim() && !sharingLoading ? '#3182ce' : '#cbd5e0',
                      color: '#fff', border: 'none', borderRadius: '6px',
                      cursor: shareEmail.trim() && !sharingLoading ? 'pointer' : 'default',
                      fontSize: '14px', fontWeight: '500',
                    }}
                  >
                    {sharingLoading ? 'Sharing...' : '✓ Share Project'}
                  </button>
                  <div style={{ fontSize: '11px', color: '#718096', lineHeight: 1.5, marginTop: '-4px' }}>
                    If the email matches an existing client, they'll be granted access immediately.
                    Otherwise, they'll receive a secure invite link to create their portal account.
                  </div>
                </form>
              )}
            </div>

            {/* Client Access List */}
            <div style={{
              background: '#fff', borderRadius: '8px', padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748', marginBottom: '16px' }}>
                Clients with Access
              </h3>

              {!selectedAccessProjectId ? (
                <div style={{ color: '#718096', fontSize: '14px' }}>
                  Select a project to view client access.
                </div>
              ) : sharingLoading ? (
                <div style={{ color: '#718096', fontSize: '14px' }}>
                  Loading...
                </div>
              ) : sharedWith.length === 0 ? (
                <div style={{ color: '#718096', fontSize: '14px' }}>
                  No clients have access yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sharedWith.map(row => {
                    const isInvite = row.kind === 'invite';
                    const displayName = isInvite ? (row.name || row.email) : (row.fullName || row.email);
                    const displayEmail = row.email;
                    const dateLabel = isInvite
                      ? `Invited ${row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''}`
                      : `Shared ${row.grantedAt ? new Date(row.grantedAt).toLocaleDateString() : ''}`;
                    const key = `${isInvite ? 'i' : 'c'}-${row.id}`;
                    return (
                      <div
                        key={key}
                        style={{
                          padding: '12px',
                          background: isInvite ? '#fffbeb' : '#f7fafc',
                          borderRadius: '6px',
                          border: isInvite ? '1px solid #fcd34d' : '1px solid transparent',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#2d3748' }}>
                              {displayName}
                            </div>
                            {isInvite && (
                              <span style={{
                                fontSize: '10px', fontWeight: '600',
                                padding: '2px 8px', borderRadius: '10px',
                                background: '#fbbf24', color: '#78350f',
                                textTransform: 'uppercase', letterSpacing: '0.3px',
                              }}>
                                Pending
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>
                            {displayEmail}
                          </div>
                          <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>
                            {dateLabel}
                            {isInvite && row.expiresAt && ` · Expires ${new Date(row.expiresAt).toLocaleDateString()}`}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeAccess(row)}
                          disabled={sharingLoading}
                          style={{
                            padding: '6px 12px', background: '#fed7d7', color: '#c53030',
                            border: 'none', borderRadius: '4px', cursor: 'pointer',
                            fontSize: '12px', fontWeight: '500',
                          }}
                        >
                          {isInvite ? '✗ Cancel' : '✗ Revoke'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
