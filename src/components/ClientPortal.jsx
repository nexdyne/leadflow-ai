import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useClient } from '../hooks/useClient.js';
import { generateDocxReport } from '../engine/docxReportGenerator.js';

const STATUS_COLORS = {
  draft:       { bg: '#edf2f7', text: '#4a5568' },
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

export default function ClientPortal() {
  const { user, logout } = useAuth();
  const {
    projects, requests, messages, unreadCount, loading, error, clearError,
    loadProjects, getProject, loadRequests, createRequest,
    loadMessages, sendMessage, loadUnreadCount,
  } = useClient();

  const [view, setView] = useState('projects'); // projects | project-detail | requests | new-request
  const [selectedProject, setSelectedProject] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [reportGenerating, setReportGenerating] = useState(false);
  const msgEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Request form
  const [reqForm, setReqForm] = useState({
    propertyAddress: '', city: '', stateCode: 'MI', zip: '',
    inspectionType: '', preferredDate: '', notes: '', contactPhone: '',
  });

  useEffect(() => {
    loadProjects();
    loadRequests();
    loadUnreadCount();
  }, [loadProjects, loadRequests, loadUnreadCount]);

  useEffect(() => {
    if (showMessages && msgEndRef.current) {
      msgEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showMessages]);

  // Message polling every 15 seconds when messages panel is open
  useEffect(() => {
    if (showMessages && selectedProject) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        loadMessages(selectedProject.id);
      }, 15000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [showMessages, selectedProject, loadMessages]);

  function showMsg(msg) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  }

  async function openProject(id) {
    clearError();
    try {
      const project = await getProject(id);
      setSelectedProject(project);
      setView('project-detail');
      setShowMessages(false);
    } catch { /* error in hook */ }
  }

  async function openMessages(projectId) {
    setShowMessages(true);
    await loadMessages(projectId);
    loadUnreadCount();
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!msgInput.trim() || !selectedProject) return;
    try {
      await sendMessage(selectedProject.id, msgInput.trim());
      setMsgInput('');
    } catch { /* error in hook */ }
  }

  async function handleSubmitRequest(e) {
    e.preventDefault();
    clearError();
    try {
      await createRequest(reqForm);
      setReqForm({
        propertyAddress: '', city: '', stateCode: 'MI', zip: '',
        inspectionType: '', preferredDate: '', notes: '', contactPhone: '',
      });
      showMsg('Inspection request submitted!');
      setView('requests');
    } catch { /* error in hook */ }
  }

  async function handleDownloadReport() {
    if (!selectedProject) return;

    // Check if stateData exists
    if (!selectedProject.stateData) {
      showMsg('Report available when inspection is complete. Contact your inspector.');
      return;
    }

    setReportGenerating(true);
    try {
      await generateDocxReport(selectedProject.stateData);
      showMsg('Report downloaded successfully!');
    } catch (err) {
      showMsg('Error generating report. Please try again.');
      console.error('Report generation error:', err);
    } finally {
      setReportGenerating(false);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a365d, #2c5282)',
        color: '#fff', padding: '16px 24px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>LeadFlow AI</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>Client Portal</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', opacity: 0.8 }}>{user?.fullName || user?.email}</span>
            <button onClick={logout} style={btnGhost}>Sign Out</button>
          </div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', gap: '0' }}>
          {[
            { key: 'projects', label: 'My Inspections' },
            { key: 'requests', label: 'Requests' },
            { key: 'new-request', label: '+ New Request' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setView(tab.key); clearError(); }}
              style={{
                padding: '12px 20px', border: 'none', background: 'none',
                borderBottom: view === tab.key || (view === 'project-detail' && tab.key === 'projects')
                  ? '3px solid #2c5282' : '3px solid transparent',
                color: view === tab.key ? '#2c5282' : '#718096',
                fontWeight: view === tab.key ? '600' : '400',
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              {tab.label}
              {tab.key === 'projects' && unreadCount > 0 && (
                <span style={{
                  background: '#c53030', color: '#fff', borderRadius: '10px',
                  padding: '1px 6px', fontSize: '11px', marginLeft: '6px',
                }}>{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
        {error && <div style={errorBanner}>{error}</div>}
        {actionMsg && <div style={successBanner}>{actionMsg}</div>}

        {/* ─── PROJECTS LIST ──────────────────────────────── */}
        {view === 'projects' && (
          <>
            {loading && <div style={loadingText}>Loading inspections...</div>}
            {!loading && projects.length === 0 && (
              <div style={emptyState}>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>No inspections shared with you yet</div>
                <div style={{ fontSize: '14px' }}>Your inspector will share project reports with you here.</div>
                <button onClick={() => setView('new-request')} style={{ ...btnPrimary, marginTop: '16px' }}>
                  Request an Inspection
                </button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {projects.map(p => (
                <div key={p.id} onClick={() => openProject(p.id)} style={cardStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', fontSize: '15px', color: '#2d3748' }}>
                        {p.propertyAddress || p.projectName}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div style={{ fontSize: '13px', color: '#718096' }}>
                      {p.city}{p.city && p.stateCode ? ', ' : ''}{p.stateCode}
                      {p.inspectionType && ` · ${p.inspectionType}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>
                      Inspector: {p.inspectorName || 'N/A'}
                      {p.inspectorCompany && ` (${p.inspectorCompany})`}
                      {' · Updated '}
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{ color: '#cbd5e0', fontSize: '20px' }}>›</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─── PROJECT DETAIL ─────────────────────────────── */}
        {view === 'project-detail' && selectedProject && (
          <>
            <button onClick={() => setView('projects')} style={{ ...linkBtn, marginBottom: '16px' }}>
              ← Back to Inspections
            </button>

            {/* Draft Warning Banner */}
            {(selectedProject.isDraft === true || selectedProject.status === 'draft') && (
              <div style={{
                padding: '12px 16px', marginBottom: '16px', borderRadius: '6px',
                background: '#fffaf0', borderLeft: '4px solid #f6ad55', color: '#7c2d12',
                fontSize: '14px', fontWeight: '500',
              }}>
                ⚠ This inspection is still in progress. Results shown are preliminary and may change.
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#1a365d' }}>
                    {selectedProject.propertyAddress || selectedProject.projectName}
                  </h2>
                  <div style={{ fontSize: '14px', color: '#718096' }}>
                    {selectedProject.city}{selectedProject.city && selectedProject.stateCode ? ', ' : ''}{selectedProject.stateCode} {selectedProject.zip}
                  </div>
                </div>
                <StatusBadge status={selectedProject.status} large />
              </div>

              {/* Status timeline note */}
              {selectedProject.statusNote && (
                <div style={{ background: '#f7fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', color: '#4a5568' }}>
                  <strong>Status Note:</strong> {selectedProject.statusNote}
                </div>
              )}

              {/* Project info grid - responsive */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '12px',
                fontSize: '14px',
              }}>
                <InfoRow label="Inspector" value={selectedProject.inspectorName} />
                <InfoRow label="Company" value={selectedProject.inspectorCompany} />
                <InfoRow label="Inspection Type" value={selectedProject.inspectionType} />
                <InfoRow label="Program" value={selectedProject.programType} />
                <InfoRow label="Year Built" value={selectedProject.yearBuilt} />
                <InfoRow label="Inspection Date" value={selectedProject.inspectionDate ? new Date(selectedProject.inspectionDate).toLocaleDateString() : null} />
              </div>

              {/* Report summary */}
              {selectedProject.reportSummary && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#ebf8ff', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontWeight: '600', color: '#2c5282' }}>Report Summary</div>
                    {(selectedProject.status === 'completed' || selectedProject.status === 'delivered') && (
                      <button
                        onClick={handleDownloadReport}
                        disabled={reportGenerating}
                        style={{
                          ...btnPrimary,
                          background: reportGenerating ? '#a0aec0' : '#2c5282',
                          opacity: reportGenerating ? 0.6 : 1,
                          cursor: reportGenerating ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          padding: '6px 12px',
                        }}
                      >
                        {reportGenerating ? 'Generating...' : 'Download Report'}
                      </button>
                    )}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '12px',
                    fontSize: '14px',
                  }}>
                    <div>
                      <div style={{ color: '#718096', fontSize: '12px' }}>Rooms Inspected</div>
                      <div style={{ fontWeight: '600', color: '#2d3748' }}>{selectedProject.reportSummary.roomCount}</div>
                    </div>
                    <div>
                      <div style={{ color: '#718096', fontSize: '12px' }}>Hazards Found</div>
                      <div style={{ fontWeight: '600', color: selectedProject.reportSummary.hazardCount > 0 ? '#c53030' : '#276749' }}>
                        {selectedProject.reportSummary.hazardCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#718096', fontSize: '12px' }}>Compliance</div>
                      <div style={{ fontWeight: '600', color: '#2d3748', textTransform: 'capitalize' }}>
                        {selectedProject.reportSummary.complianceStatus || 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hazard Details Section */}
              {selectedProject.reportSummary && selectedProject.reportSummary.hazardCount > 0 && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#fff5f5', borderRadius: '8px', borderLeft: '4px solid #c53030' }}>
                  <div style={{ fontWeight: '600', color: '#c53030', marginBottom: '12px' }}>Hazard Details</div>
                  {selectedProject.reportSummary.hazards && selectedProject.reportSummary.hazards.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedProject.reportSummary.hazards.map((hazard, idx) => (
                        <div key={idx} style={{
                          padding: '10px', background: '#fff', borderRadius: '4px',
                          borderLeft: '3px solid #c53030', fontSize: '13px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '600', color: '#2d3748' }}>
                              {hazard.room || 'Unknown'} - {hazard.component || 'Unknown'}
                            </span>
                            <span style={{
                              background: hazard.result >= 1 ? '#ffcccc' : '#ccffcc',
                              color: hazard.result >= 1 ? '#c53030' : '#276749',
                              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                            }}>
                              {hazard.result >= 1 ? '⚠ POSITIVE' : '✓ NEGATIVE'}
                            </span>
                          </div>
                          {hazard.reading !== undefined && (
                            <div style={{ color: '#718096', fontSize: '12px', marginBottom: '2px' }}>
                              Reading: {hazard.reading.toFixed(2)} mg/cm²
                            </div>
                          )}
                          {hazard.recommendation && (
                            <div style={{ color: '#4a5568', fontSize: '12px', marginTop: '4px' }}>
                              <strong>Recommendation:</strong> {hazard.recommendation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#718096', fontSize: '13px' }}>
                      Hazards identified but details not available. See full report for details.
                    </div>
                  )}
                </div>
              )}

              {/* Photos Section */}
              {selectedProject.stateData && selectedProject.stateData.photos && selectedProject.stateData.photos.length > 0 && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#f7fafc', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '600', color: '#2c5282', marginBottom: '12px' }}>Inspection Photos</div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '12px',
                  }}>
                    {selectedProject.stateData.photos.map((photo, idx) => (
                      <div key={idx} style={{
                        background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0',
                        overflow: 'hidden', display: 'flex', flexDirection: 'column',
                      }}>
                        <div style={{
                          width: '100%', height: '120px', background: '#edf2f7',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden',
                        }}>
                          {photo.data && photo.data.startsWith('data:image') ? (
                            <img
                              src={photo.data}
                              alt={photo.caption || 'Inspection photo'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : photo.url ? (
                            <img
                              src={photo.url}
                              alt={photo.caption || 'Inspection photo'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span style={{ color: '#a0aec0', fontSize: '12px' }}>📷</span>
                          )}
                        </div>
                        <div style={{ padding: '8px', fontSize: '12px' }}>
                          {photo.room && (
                            <div style={{ color: '#718096', marginBottom: '2px' }}>
                              <strong>{photo.room}</strong>
                            </div>
                          )}
                          {photo.component && (
                            <div style={{ color: '#718096', marginBottom: '2px', fontSize: '11px' }}>
                              {photo.component}
                            </div>
                          )}
                          {photo.caption && (
                            <div style={{ color: '#4a5568', marginTop: '4px', fontSize: '11px', fontStyle: 'italic' }}>
                              {photo.caption}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Messages section */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <button
                onClick={() => showMessages ? setShowMessages(false) : openMessages(selectedProject.id)}
                style={{
                  width: '100%', padding: '14px 20px', border: 'none', background: '#f7fafc',
                  textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                  color: '#2d3748', display: 'flex', justifyContent: 'space-between',
                }}
              >
                <span>Messages</span>
                <span style={{ color: '#a0aec0' }}>{showMessages ? '▴' : '▾'}</span>
              </button>

              {showMessages && (
                <div style={{ padding: '16px' }}>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '12px' }}>
                    {messages.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#a0aec0', padding: '20px', fontSize: '14px' }}>
                        No messages yet. Send a message to your inspector.
                      </div>
                    )}
                    {messages.map(m => (
                      <div key={m.id} style={{
                        marginBottom: '10px',
                        textAlign: m.senderRole === 'client' ? 'right' : 'left',
                      }}>
                        <div style={{
                          display: 'inline-block', maxWidth: '75%',
                          padding: '10px 14px', borderRadius: '12px',
                          background: m.senderRole === 'client' ? '#2c5282' : '#edf2f7',
                          color: m.senderRole === 'client' ? '#fff' : '#2d3748',
                          fontSize: '14px', textAlign: 'left',
                        }}>
                          {m.content}
                        </div>
                        <div style={{
                          fontSize: '11px', color: '#a0aec0', marginTop: '2px',
                        }}>
                          {m.senderName} · {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    <div ref={msgEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={msgInput}
                      onChange={e => setMsgInput(e.target.value)}
                      placeholder="Type a message..."
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button type="submit" style={btnPrimary}>Send</button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── REQUESTS LIST ──────────────────────────────── */}
        {view === 'requests' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#1a365d' }}>My Inspection Requests</h2>
              <button onClick={() => setView('new-request')} style={btnPrimary}>+ New Request</button>
            </div>

            {loading && <div style={loadingText}>Loading...</div>}
            {!loading && requests.length === 0 && (
              <div style={emptyState}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>No requests yet</div>
                <div style={{ fontSize: '14px' }}>Submit an inspection request to get started.</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {requests.map(r => (
                <div key={r.id} style={{ ...cardStyle, cursor: 'default' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', color: '#2d3748' }}>{r.propertyAddress}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div style={{ fontSize: '13px', color: '#718096' }}>
                      {r.city}{r.stateCode ? `, ${r.stateCode}` : ''}
                      {r.inspectionType && ` · ${r.inspectionType}`}
                      {r.preferredDate && ` · Preferred: ${new Date(r.preferredDate).toLocaleDateString()}`}
                    </div>
                    {r.responseNote && (
                      <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '4px', fontStyle: 'italic' }}>
                        Response: {r.responseNote}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '4px' }}>
                      Submitted {new Date(r.createdAt).toLocaleDateString()}
                      {r.reviewedByName && ` · Reviewed by ${r.reviewedByName}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─── NEW REQUEST FORM ───────────────────────────── */}
        {view === 'new-request' && (
          <>
            <button onClick={() => setView('requests')} style={{ ...linkBtn, marginBottom: '16px' }}>
              ← Back to Requests
            </button>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: '18px', color: '#1a365d' }}>Request an Inspection</h2>
              <form onSubmit={handleSubmitRequest}>
                <label style={labelStyle}>Property Address *</label>
                <input
                  type="text" required
                  value={reqForm.propertyAddress}
                  onChange={e => setReqForm(f => ({ ...f, propertyAddress: e.target.value }))}
                  placeholder="123 Main St"
                  style={inputStyle}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input type="text" value={reqForm.city}
                      onChange={e => setReqForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Detroit" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>State</label>
                    <input type="text" value={reqForm.stateCode} maxLength={2}
                      onChange={e => setReqForm(f => ({ ...f, stateCode: e.target.value.toUpperCase() }))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>ZIP</label>
                    <input type="text" value={reqForm.zip}
                      onChange={e => setReqForm(f => ({ ...f, zip: e.target.value }))}
                      placeholder="48201" style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Inspection Type</label>
                    <select value={reqForm.inspectionType}
                      onChange={e => setReqForm(f => ({ ...f, inspectionType: e.target.value }))}
                      style={inputStyle}>
                      <option value="">Select...</option>
                      <option value="Lead Inspection">Lead Inspection</option>
                      <option value="Risk Assessment">Risk Assessment</option>
                      <option value="Lead Inspection/Risk Assessment">Lead Inspection/Risk Assessment</option>
                      <option value="Clearance">Clearance</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Preferred Date</label>
                    <input type="date" value={reqForm.preferredDate}
                      onChange={e => setReqForm(f => ({ ...f, preferredDate: e.target.value }))}
                      style={inputStyle} />
                  </div>
                </div>

                <label style={labelStyle}>Contact Phone</label>
                <input type="tel" value={reqForm.contactPhone}
                  onChange={e => setReqForm(f => ({ ...f, contactPhone: e.target.value }))}
                  placeholder="(313) 555-0100" style={inputStyle} />

                <label style={labelStyle}>Additional Notes</label>
                <textarea value={reqForm.notes}
                  onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special instructions, access details, etc."
                  rows={4} style={{ ...inputStyle, resize: 'vertical' }} />

                <button type="submit" disabled={loading || !reqForm.propertyAddress.trim()}
                  style={{ ...btnPrimary, marginTop: '16px', width: '100%', padding: '12px', fontSize: '15px' }}>
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────
function StatusBadge({ status, large }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  const label = STATUS_LABELS[status] || status || 'Draft';
  return (
    <span style={{
      fontSize: large ? '13px' : '11px',
      padding: large ? '4px 12px' : '2px 8px',
      borderRadius: '10px',
      background: s.bg,
      color: s.text,
      fontWeight: '600',
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {label.replace('_', ' ')}
    </span>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ color: '#718096', fontSize: '12px' }}>{label}</div>
      <div style={{ color: '#2d3748', fontWeight: '500' }}>{value}</div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────
const btnPrimary = {
  padding: '8px 16px', background: '#2c5282', color: '#fff', border: 'none',
  borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
};
const btnGhost = {
  padding: '6px 14px', background: 'transparent', color: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
};
const linkBtn = {
  background: 'none', border: 'none', color: '#3182ce', cursor: 'pointer',
  fontSize: '14px', fontWeight: '500', padding: 0,
};
const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568',
  marginBottom: '4px', marginTop: '14px',
};
const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
  borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};
const cardStyle = {
  display: 'flex', alignItems: 'center', padding: '16px',
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
  cursor: 'pointer', transition: 'border-color 0.15s',
};
const loadingText = { textAlign: 'center', padding: '24px', color: '#718096' };
const emptyState = {
  textAlign: 'center', padding: '48px 24px', color: '#718096',
  background: '#fff', borderRadius: '8px', border: '2px dashed #e2e8f0',
};
const errorBanner = {
  padding: '10px 14px', borderRadius: '6px', marginBottom: '12px',
  background: '#fed7d7', color: '#c53030', fontSize: '13px',
};
const successBanner = {
  padding: '10px 14px', borderRadius: '6px', marginBottom: '12px',
  background: '#c6f6d5', color: '#276749', fontSize: '13px',
};
