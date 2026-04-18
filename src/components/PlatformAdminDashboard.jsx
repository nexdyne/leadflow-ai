import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '../api/apiConfig.js';
import { useAuth } from '../hooks/useAuth.jsx';

const TABS = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'users', label: 'Users', icon: '👥' },
  { key: 'organizations', label: 'Organizations', icon: '🏢' },
  { key: 'revenue', label: 'Revenue', icon: '💰' },
  { key: 'announcements', label: 'Announcements', icon: '📢' },
  { key: 'audit', label: 'Audit Logs', icon: '📋' },
];

export default function PlatformAdminDashboard({ onLogout }) {
  const { logout, user, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (pwForm.newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    try {
      await changePassword(pwForm.current, pwForm.newPw);
      setShowChangePw(false);
      setPwForm({ current: '', newPw: '', confirm: '' });
      alert('Password changed successfully.');
    } catch (err) {
      setPwError(err.message || 'Failed to change password');
    }
  };

  async function loadDashboard() {
    try {
      const data = await apiCall('GET', '/platform/dashboard');
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
        padding: '16px 24px',
        borderBottom: '1px solid #334155',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#c4b5fd' }}>
            LeadFlow AI — Platform Admin
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            Signed in as {user?.email}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setShowChangePw(true)}
            style={{
              padding: '8px 16px', background: '#334155', color: '#e2e8f0',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '500',
            }}
          >
            Change Password
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 20px', background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: '4px', padding: '12px 24px',
        background: '#1e293b', borderBottom: '1px solid #334155',
        overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontSize: '14px', fontWeight: '500',
              whiteSpace: 'nowrap', transition: 'all 0.2s',
              background: activeTab === tab.key ? '#7c3aed' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#94a3b8',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>Loading dashboard...</div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewPanel dashboard={dashboard} onRefresh={loadDashboard} />}
            {activeTab === 'users' && <UsersPanel />}
            {activeTab === 'organizations' && <OrganizationsPanel />}
            {activeTab === 'revenue' && <RevenuePanel />}
            {activeTab === 'announcements' && <AnnouncementsPanel />}
            {activeTab === 'audit' && <AuditPanel />}
          </>
        )}
      </div>

      {/* Force password change modal (CS33) */}
      {user?.mustChangePassword && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ color: '#f1f5f9', marginBottom: '8px' }}>Password Change Required</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
              Your password was reset by an administrator. Please set a new password to continue.
            </p>
            {pwError && <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>{pwError}</div>}
            <label style={labelDarkStyle}>Current Password</label>
            <input type="password" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} style={inputDarkStyle} />
            <label style={labelDarkStyle}>New Password</label>
            <input type="password" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} style={inputDarkStyle} />
            <label style={labelDarkStyle}>Confirm New Password</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} style={inputDarkStyle} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={handleLogout} style={actionBtnStyle('#475569')}>Sign Out</button>
              <button onClick={handleChangePassword} disabled={!pwForm.current || !pwForm.newPw} style={actionBtnStyle('#7c3aed')}>Change Password</button>
            </div>
          </div>
        </div>
      )}

      {/* Voluntary change password modal */}
      {showChangePw && !user?.mustChangePassword && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ color: '#f1f5f9', marginBottom: '16px' }}>Change Password</h3>
            {pwError && <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>{pwError}</div>}
            <label style={labelDarkStyle}>Current Password</label>
            <input type="password" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} style={inputDarkStyle} />
            <label style={labelDarkStyle}>New Password</label>
            <input type="password" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} style={inputDarkStyle} />
            <label style={labelDarkStyle}>Confirm New Password</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} style={inputDarkStyle} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => { setShowChangePw(false); setPwForm({ current: '', newPw: '', confirm: '' }); setPwError(''); }} style={actionBtnStyle('#475569')}>Cancel</button>
              <button onClick={handleChangePassword} disabled={!pwForm.current || !pwForm.newPw} style={actionBtnStyle('#7c3aed')}>Change Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
//  OVERVIEW PANEL
// ═══════════════════════════════════════════════════════════

function OverviewPanel({ dashboard, onRefresh }) {
  if (!dashboard) return <div style={{ color: '#94a3b8' }}>No data available</div>;

  const stats = [
    { label: 'Total Users', value: dashboard.users.total, color: '#3b82f6', sub: `${dashboard.users.inspectors} inspectors, ${dashboard.users.clients} clients` },
    { label: 'Organizations', value: dashboard.organizations.total, color: '#8b5cf6', sub: `${dashboard.organizations.pro + dashboard.organizations.enterprise} paid` },
    { label: 'Active Teams', value: dashboard.teams.active, color: '#10b981', sub: `${dashboard.teams.total} total` },
    { label: 'Projects', value: dashboard.projects.active, color: '#f59e0b', sub: `${dashboard.projects.drafts} drafts` },
    { label: 'Signups (7d)', value: dashboard.recentSignups, color: '#ec4899', sub: 'Last 7 days' },
    { label: 'Active Today', value: dashboard.activeToday, color: '#06b6d4', sub: 'Logged in today' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>Platform Overview</h2>
        <button onClick={onRefresh} style={refreshBtnStyle}>Refresh</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {stats.map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{s.label}</div>
            <div style={{ fontSize: '36px', fontWeight: '800', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick status */}
      <div style={{ ...cardStyle, marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9', marginBottom: '12px' }}>Quick Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Suspended Accounts</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: dashboard.users.suspended > 0 ? '#ef4444' : '#10b981' }}>
              {dashboard.users.suspended}
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Inactive Accounts</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{dashboard.users.inactive}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
//  USERS PANEL
// ═══════════════════════════════════════════════════════════

function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'suspend'|'resetPw', userId }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiCall('GET', `/platform/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSuspend = async (userId, reason) => {
    try {
      await apiCall('PUT', `/platform/users/${userId}/suspend`, { reason });
      setActionModal(null);
      loadUsers();
    } catch (err) {
      alert('Failed to suspend: ' + err.message);
    }
  };

  const handleReactivate = async (userId) => {
    try {
      await apiCall('PUT', `/platform/users/${userId}/reactivate`);
      loadUsers();
    } catch (err) {
      alert('Failed to reactivate: ' + err.message);
    }
  };

  const handleResetPassword = async (userId, newPassword) => {
    try {
      await apiCall('PUT', `/platform/users/${userId}/reset-password`, { newPassword });
      setActionModal(null);
      alert('Password reset. User will be required to change it on next login.');
    } catch (err) {
      alert('Failed to reset password: ' + err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Permanently deactivate this account? This cannot be undone.')) return;
    try {
      await apiCall('DELETE', `/platform/users/${userId}`);
      loadUsers();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const totalPages = Math.ceil(total / 25);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', marginBottom: '16px' }}>User Management</h2>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Search by name, email, or company..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={inputDarkStyle}
        />
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} style={{ ...inputDarkStyle, width: '150px' }}>
          <option value="">All Roles</option>
          <option value="inspector">Inspectors</option>
          <option value="client">Clients</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ ...inputDarkStyle, width: '150px' }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Results count */}
      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
        {total} user{total !== 1 ? 's' : ''} found
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Name', 'Email', 'Role', 'Organization', 'Projects', 'Status', 'Last Login', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={cellStyle}>
                  <div style={{ fontWeight: '500', color: '#f1f5f9' }}>{u.fullName || '—'}</div>
                  {u.isPrimaryAdmin && <span style={badgeStyle('#7c3aed')}>Primary Admin</span>}
                </td>
                <td style={cellStyle}>{u.email}</td>
                <td style={cellStyle}>
                  <span style={badgeStyle(u.role === 'inspector' ? '#3b82f6' : '#f59e0b')}>
                    {u.role}
                  </span>
                </td>
                <td style={cellStyle}>{u.orgName || '—'}</td>
                <td style={cellStyle}>{u.projectCount}</td>
                <td style={cellStyle}>
                  {u.suspendedAt ? (
                    <span style={badgeStyle('#ef4444')}>Suspended</span>
                  ) : u.active ? (
                    <span style={badgeStyle('#10b981')}>Active</span>
                  ) : (
                    <span style={badgeStyle('#64748b')}>Inactive</span>
                  )}
                </td>
                <td style={cellStyle}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                <td style={cellStyle}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={cellStyle}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {u.suspendedAt ? (
                      <button onClick={() => handleReactivate(u.id)} style={actionBtnStyle('#10b981')}>Reactivate</button>
                    ) : (
                      <button onClick={() => setActionModal({ type: 'suspend', userId: u.id, userName: u.fullName || u.email })} style={actionBtnStyle('#f59e0b')}>Suspend</button>
                    )}
                    <button onClick={() => setActionModal({ type: 'resetPw', userId: u.id, userName: u.fullName || u.email })} style={actionBtnStyle('#3b82f6')}>Reset PW</button>
                    <button onClick={() => handleDelete(u.id)} style={actionBtnStyle('#ef4444')}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtnStyle}>Previous</button>
          <span style={{ color: '#94a3b8', fontSize: '14px', padding: '8px' }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={pageBtnStyle}>Next</button>
        </div>
      )}

      {/* Action Modals */}
      {actionModal && actionModal.type === 'suspend' && (
        <SuspendModal
          userName={actionModal.userName}
          onConfirm={(reason) => handleSuspend(actionModal.userId, reason)}
          onCancel={() => setActionModal(null)}
        />
      )}
      {actionModal && actionModal.type === 'resetPw' && (
        <ResetPasswordModal
          userName={actionModal.userName}
          onConfirm={(pw) => handleResetPassword(actionModal.userId, pw)}
          onCancel={() => setActionModal(null)}
        />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
//  ORGANIZATIONS PANEL
// ═══════════════════════════════════════════════════════════

function OrganizationsPanel() {
  const [orgs, setOrgs] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingOrg, setEditingOrg] = useState(null);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (search) params.set('search', search);
      const data = await apiCall('GET', `/platform/organizations?${params}`);
      setOrgs(data.organizations);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load orgs:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  const handleUpdateOrg = async (orgId, updates) => {
    try {
      await apiCall('PUT', `/platform/organizations/${orgId}`, updates);
      setEditingOrg(null);
      loadOrgs();
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', marginBottom: '16px' }}>Organizations</h2>

      <input
        type="text" placeholder="Search organizations..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={{ ...inputDarkStyle, marginBottom: '16px' }}
      />

      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>{total} organization{total !== 1 ? 's' : ''}</div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {loading ? (
          <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Loading...</div>
        ) : orgs.length === 0 ? (
          <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>No organizations found</div>
        ) : orgs.map(org => (
          <div key={org.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9' }}>{org.name}</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                  Owner: {org.ownerName || '—'} ({org.ownerEmail || '—'})
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={badgeStyle(
                  org.subscriptionPlan === 'enterprise' ? '#7c3aed' :
                  org.subscriptionPlan === 'pro' ? '#3b82f6' :
                  org.subscriptionPlan === 'team' ? '#10b981' : '#64748b'
                )}>
                  {org.subscriptionPlan}
                </span>
                <button onClick={() => setEditingOrg(org)} style={actionBtnStyle('#7c3aed')}>Edit</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '12px' }}>
              <div><div style={{ fontSize: '11px', color: '#64748b' }}>Users</div><div style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>{org.userCount}</div></div>
              <div><div style={{ fontSize: '11px', color: '#64748b' }}>Teams</div><div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{org.teamCount}</div></div>
              <div><div style={{ fontSize: '11px', color: '#64748b' }}>Monthly</div><div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>${org.monthlyRate || 0}</div></div>
              <div><div style={{ fontSize: '11px', color: '#64748b' }}>Joined</div><div style={{ fontSize: '14px', color: '#94a3b8' }}>{new Date(org.createdAt).toLocaleDateString()}</div></div>
            </div>
            {org.notes && <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Notes: {org.notes}</div>}
          </div>
        ))}
      </div>

      {/* Edit Org Modal */}
      {editingOrg && (
        <EditOrgModal
          org={editingOrg}
          onSave={(updates) => handleUpdateOrg(editingOrg.id, updates)}
          onCancel={() => setEditingOrg(null)}
        />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
//  REVENUE PANEL
// ═══════════════════════════════════════════════════════════

function RevenuePanel() {
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiCall('GET', '/platform/revenue');
        setRevenue(data);
      } catch (err) {
        console.error('Failed to load revenue:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Loading...</div>;
  if (!revenue) return <div style={{ color: '#64748b' }}>No revenue data</div>;

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', marginBottom: '16px' }}>Revenue Dashboard</h2>

      {/* MRR */}
      <div style={{ ...cardStyle, marginBottom: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Monthly Recurring Revenue</div>
        <div style={{ fontSize: '48px', fontWeight: '800', color: '#10b981' }}>${revenue.mrr.toFixed(2)}</div>
      </div>

      {/* Plan Breakdown */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9', marginBottom: '12px' }}>Revenue by Plan</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '8px', textAlign: 'left', color: '#94a3b8', fontSize: '12px' }}>Plan</th>
              <th style={{ padding: '8px', textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>Orgs</th>
              <th style={{ padding: '8px', textAlign: 'right', color: '#94a3b8', fontSize: '12px' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {revenue.planBreakdown.map(p => (
              <tr key={p.subscription_plan} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px 8px', fontWeight: '500', color: '#f1f5f9', textTransform: 'capitalize' }}>{p.subscription_plan}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#94a3b8' }}>{p.count}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#10b981', fontWeight: '600' }}>${parseFloat(p.revenue).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
//  ANNOUNCEMENTS PANEL
// ═══════════════════════════════════════════════════════════

function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall('GET', '/platform/announcements');
      setAnnouncements(data.announcements);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const handleCreate = async (form) => {
    try {
      await apiCall('POST', '/platform/announcements', form);
      setShowCreate(false);
      loadAnnouncements();
    } catch (err) {
      alert('Failed to create: ' + err.message);
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      await apiCall('PUT', `/platform/announcements/${id}`, { isActive: !isActive });
      loadAnnouncements();
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await apiCall('DELETE', `/platform/announcements/${id}`);
      loadAnnouncements();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const typeColors = { info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444', feature: '#10b981', maintenance: '#8b5cf6' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>Announcements</h2>
        <button onClick={() => setShowCreate(true)} style={{ ...actionBtnStyle('#7c3aed'), padding: '10px 20px', fontSize: '14px' }}>
          + New Announcement
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Loading...</div>
      ) : announcements.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#64748b', padding: '40px' }}>No announcements yet</div>
      ) : announcements.map(a => (
        <div key={a.id} style={{ ...cardStyle, marginBottom: '12px', opacity: a.is_active ? 1 : 0.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                <span style={badgeStyle(typeColors[a.type] || '#64748b')}>{a.type}</span>
                <span style={badgeStyle('#475569')}>{a.target_audience}</span>
                {!a.is_active && <span style={badgeStyle('#64748b')}>Inactive</span>}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9' }}>{a.title}</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>{a.body}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                Created {new Date(a.created_at).toLocaleDateString()} — {a.dismiss_count || 0} dismissals
                {a.expires_at && ` — Expires ${new Date(a.expires_at).toLocaleDateString()}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
              <button onClick={() => handleToggle(a.id, a.is_active)} style={actionBtnStyle(a.is_active ? '#f59e0b' : '#10b981')}>
                {a.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => handleDeleteAnnouncement(a.id)} style={actionBtnStyle('#ef4444')}>Delete</button>
            </div>
          </div>
        </div>
      ))}

      {showCreate && (
        <CreateAnnouncementModal onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
//  AUDIT LOG PANEL
// ═══════════════════════════════════════════════════════════

function AuditPanel() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await apiCall('GET', `/platform/audit-logs?page=${page}&limit=50`);
        setLogs(data.logs);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', marginBottom: '16px' }}>Audit Logs</h2>

      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>{total} log entries</div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Time', 'Actor', 'Action', 'Target', 'Details'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No audit logs yet</td></tr>
            ) : logs.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={cellStyle}>{new Date(l.created_at).toLocaleString()}</td>
                <td style={cellStyle}>{l.actor_name || l.actor_email || '—'}</td>
                <td style={cellStyle}><span style={badgeStyle('#7c3aed')}>{l.action}</span></td>
                <td style={cellStyle}>{l.target_type} #{l.target_id}</td>
                <td style={{ ...cellStyle, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {JSON.stringify(l.details)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(total / 50) > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtnStyle}>Previous</button>
          <span style={{ color: '#94a3b8', fontSize: '14px', padding: '8px' }}>Page {page} of {Math.ceil(total / 50)}</span>
          <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)} style={pageBtnStyle}>Next</button>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
//  MODAL COMPONENTS
// ═══════════════════════════════════════════════════════════

function SuspendModal({ userName, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ color: '#f1f5f9', marginBottom: '16px' }}>Suspend {userName}</h3>
        <label style={{ color: '#94a3b8', fontSize: '13px' }}>Reason (optional)</label>
        <textarea
          value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Why is this account being suspended?"
          style={{ ...inputDarkStyle, height: '80px', resize: 'vertical', marginTop: '4px', marginBottom: '16px' }}
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={actionBtnStyle('#475569')}>Cancel</button>
          <button onClick={() => onConfirm(reason)} style={actionBtnStyle('#ef4444')}>Suspend Account</button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ userName, onConfirm, onCancel }) {
  const [pw, setPw] = useState('');
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ color: '#f1f5f9', marginBottom: '16px' }}>Reset Password for {userName}</h3>
        <label style={{ color: '#94a3b8', fontSize: '13px' }}>New Password (min 8 chars)</label>
        <input
          type="text" value={pw} onChange={e => setPw(e.target.value)}
          placeholder="Enter new password..."
          style={{ ...inputDarkStyle, marginTop: '4px', marginBottom: '16px' }}
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={actionBtnStyle('#475569')}>Cancel</button>
          <button onClick={() => onConfirm(pw)} disabled={pw.length < 8} style={actionBtnStyle('#3b82f6')}>Reset Password</button>
        </div>
      </div>
    </div>
  );
}

function EditOrgModal({ org, onSave, onCancel }) {
  const [form, setForm] = useState({
    subscriptionPlan: org.subscriptionPlan || 'free',
    subscriptionStatus: org.subscriptionStatus || 'active',
    monthlyRate: org.monthlyRate || 0,
    billingEmail: org.billingEmail || '',
    notes: org.notes || '',
  });

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: '500px' }}>
        <h3 style={{ color: '#f1f5f9', marginBottom: '16px' }}>Edit: {org.name}</h3>

        <label style={labelDarkStyle}>Subscription Plan</label>
        <select value={form.subscriptionPlan} onChange={e => setForm({ ...form, subscriptionPlan: e.target.value })} style={inputDarkStyle}>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="team">Team</option>
          <option value="enterprise">Enterprise</option>
        </select>

        <label style={labelDarkStyle}>Status</label>
        <select value={form.subscriptionStatus} onChange={e => setForm({ ...form, subscriptionStatus: e.target.value })} style={inputDarkStyle}>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="past_due">Past Due</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <label style={labelDarkStyle}>Monthly Rate ($)</label>
        <input type="number" value={form.monthlyRate} onChange={e => setForm({ ...form, monthlyRate: parseFloat(e.target.value) || 0 })} style={inputDarkStyle} />

        <label style={labelDarkStyle}>Billing Email</label>
        <input type="email" value={form.billingEmail} onChange={e => setForm({ ...form, billingEmail: e.target.value })} style={inputDarkStyle} placeholder="billing@company.com" />

        <label style={labelDarkStyle}>Notes</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inputDarkStyle, height: '60px', resize: 'vertical' }} placeholder="Internal notes..." />

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onCancel} style={actionBtnStyle('#475569')}>Cancel</button>
          <button onClick={() => onSave(form)} style={actionBtnStyle('#7c3aed')}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function CreateAnnouncementModal({ onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '', body: '', type: 'info', targetAudience: 'all', expiresAt: '', sendEmail: false,
  });

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: '500px' }}>
        <h3 style={{ color: '#f1f5f9', marginBottom: '16px' }}>New Announcement</h3>

        <label style={labelDarkStyle}>Title</label>
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inputDarkStyle} placeholder="Announcement title..." />

        <label style={labelDarkStyle}>Message</label>
        <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} style={{ ...inputDarkStyle, height: '100px', resize: 'vertical' }} placeholder="Write your announcement..." />

        <label style={labelDarkStyle}>Type</label>
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputDarkStyle}>
          <option value="info">Info</option>
          <option value="feature">New Feature</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
          <option value="maintenance">Maintenance</option>
        </select>

        <label style={labelDarkStyle}>Target Audience</label>
        <select value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })} style={inputDarkStyle}>
          <option value="all">All Users</option>
          <option value="inspectors">Inspectors Only</option>
          <option value="clients">Clients Only</option>
        </select>

        <label style={labelDarkStyle}>Expires At (optional)</label>
        <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} style={inputDarkStyle} />

        <label style={{ ...labelDarkStyle, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.sendEmail} onChange={e => setForm({ ...form, sendEmail: e.target.checked })} />
          <span>Also send via email to all targeted users</span>
        </label>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onCancel} style={actionBtnStyle('#475569')}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={!form.title || !form.body} style={actionBtnStyle('#7c3aed')}>Publish</button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
//  SHARED STYLES
// ═══════════════════════════════════════════════════════════

const cardStyle = {
  background: '#1e293b', borderRadius: '12px', padding: '20px',
  border: '1px solid #334155',
};

const cellStyle = {
  padding: '10px 12px', fontSize: '13px', color: '#cbd5e1',
};

const inputDarkStyle = {
  width: '100%', padding: '10px 12px', background: '#0f172a',
  border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};

const labelDarkStyle = {
  display: 'block', fontSize: '13px', fontWeight: '500',
  color: '#94a3b8', marginTop: '12px', marginBottom: '4px',
};

const refreshBtnStyle = {
  padding: '8px 16px', background: '#334155', color: '#e2e8f0',
  border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
};

const pageBtnStyle = {
  padding: '8px 16px', background: '#334155', color: '#e2e8f0',
  border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
};

function badgeStyle(color) {
  return {
    display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
    fontSize: '11px', fontWeight: '600', color: '#fff',
    background: color, textTransform: 'capitalize',
  };
}

function actionBtnStyle(color) {
  return {
    padding: '6px 12px', background: color, color: '#fff',
    border: 'none', borderRadius: '5px', cursor: 'pointer',
    fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap',
  };
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const modalStyle = {
  background: '#1e293b', borderRadius: '12px', padding: '24px',
  width: '100%', maxWidth: '420px', border: '1px solid #334155',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};
