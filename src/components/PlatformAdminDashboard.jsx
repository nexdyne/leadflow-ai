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

// Keys that carry protected, secret, or identifying data. When an audit log
// entry is rendered in the UI, values under these keys are replaced with a
// redaction marker so a platform admin browsing logs cannot incidentally
// read child BLLs, inspector credentials, or tokens.
// References:
//   HIPAA 45 CFR 164.514(b)   — Safe Harbor de-identification list
//   MCL 333.5474              — EBL child-identifying info is confidential
//   NIST SP 800-53 AU-11      — audit records must not retain secrets
const SENSITIVE_KEYS = [
  'password', 'pw', 'newpassword', 'newpw', 'currentpassword',
  'token', 'access_token', 'refresh_token', 'api_key', 'secret',
  'ssn', 'dob', 'dateofbirth', 'date_of_birth',
  'bll', 'bloodlead', 'blood_lead_level', 'bloodleadlevel',
  'childname', 'child_name', 'childdob', 'child_dob',
  'phone', 'phonenumber', 'phone_number', 'homephone',
  'homeaddress', 'home_address', 'residentaddress',
  'licensenumber', 'license_number',
  'creditcard', 'cardnumber', 'accountnumber',
];

function redactAuditDetails(details) {
  if (details == null) return '';
  try {
    const obj = typeof details === 'string' ? JSON.parse(details) : details;
    const walk = (v) => {
      if (v == null || typeof v !== 'object') return v;
      if (Array.isArray(v)) return v.map(walk);
      const out = {};
      for (const k of Object.keys(v)) {
        const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (SENSITIVE_KEYS.includes(lower)) {
          out[k] = '[REDACTED]';
        } else if (lower === 'email' && typeof v[k] === 'string' && v[k].includes('@')) {
          // Keep domain for debugging, mask local-part
          const parts = v[k].split('@');
          out[k] = `***@${parts[1]}`;
        } else {
          out[k] = walk(v[k]);
        }
      }
      return out;
    };
    const safe = walk(obj);
    const str = JSON.stringify(safe);
    // Hard cap to avoid UI overflow
    return str.length > 400 ? str.slice(0, 400) + '…' : str;
  } catch (e) {
    const s = String(details);
    return s.length > 400 ? s.slice(0, 400) + '…' : s;
  }
}

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
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    apiCall('GET', `/platform/analytics?period=${period}`)
      .then(data => { if (!cancelled) setAnalytics(data); })
      .catch(err => { if (!cancelled) setAnalyticsError(err.message || 'Failed to load analytics'); })
      .finally(() => { if (!cancelled) setAnalyticsLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  if (!dashboard) return <div style={{ color: '#94a3b8' }}>No data available</div>;

  const stats = [
    { label: 'Total Users', value: dashboard.users.total, color: '#3b82f6', sub: `${dashboard.users.inspectors} inspectors, ${dashboard.users.clients} clients` },
    { label: 'Organizations', value: dashboard.organizations.total, color: '#8b5cf6', sub: `${dashboard.organizations.pro + dashboard.organizations.enterprise} paid` },
    { label: 'Active Teams', value: dashboard.teams.active, color: '#10b981', sub: `${dashboard.teams.total} total` },
    { label: 'Projects', value: dashboard.projects.active, color: '#f59e0b', sub: `${dashboard.projects.drafts} drafts` },
    { label: 'Signups (7d)', value: dashboard.recentSignups, color: '#ec4899', sub: 'Last 7 days' },
    { label: 'Active Today', value: dashboard.activeToday, color: '#06b6d4', sub: 'Logged in today' },
  ];

  const signupSeries = buildDailySeries(analytics && analytics.signupTrend, period);
  const projectSeries = buildDailySeries(analytics && analytics.projectTrend, period);
  const roleDist = (analytics && analytics.roleDistribution) || [];

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

      {/* Analytics charts */}
      <div style={{ ...cardStyle, marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>Trends</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[7, 30, 90].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 10px',
                  background: period === p ? '#3b82f6' : 'transparent',
                  color: period === p ? '#fff' : '#94a3b8',
                  border: '1px solid ' + (period === p ? '#3b82f6' : '#475569'),
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        {analyticsLoading && <div style={{ color: '#64748b', padding: '20px', textAlign: 'center' }}>Loading analytics...</div>}
        {analyticsError && <div style={{ color: '#fca5a5', padding: '12px', background: '#7f1d1d', borderRadius: '4px' }}>Failed: {analyticsError}</div>}

        {!analyticsLoading && !analyticsError && analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <ChartCard
              title="User Signups"
              total={signupSeries.total}
              subtitle={`${signupSeries.total} in last ${period} days · avg ${signupSeries.avg.toFixed(1)}/day`}
              color="#3b82f6"
            >
              <SparkLine data={signupSeries.counts} color="#3b82f6" height={80} />
              <SeriesXAxis start={signupSeries.firstDate} end={signupSeries.lastDate} />
            </ChartCard>

            <ChartCard
              title="New Projects"
              total={projectSeries.total}
              subtitle={`${projectSeries.total} in last ${period} days · avg ${projectSeries.avg.toFixed(1)}/day`}
              color="#f59e0b"
            >
              <SparkLine data={projectSeries.counts} color="#f59e0b" height={80} />
              <SeriesXAxis start={projectSeries.firstDate} end={projectSeries.lastDate} />
            </ChartCard>

            <ChartCard
              title="Role Distribution"
              total={roleDist.reduce((s, r) => s + parseInt(r.count || 0), 0)}
              subtitle="All active non-admin users"
              color="#8b5cf6"
            >
              <Donut
                segments={roleDist.map(r => ({
                  label: r.role || 'unknown',
                  value: parseInt(r.count || 0),
                  color: r.role === 'inspector' ? '#3b82f6' : r.role === 'client' ? '#f59e0b' : '#64748b',
                }))}
                size={140}
              />
            </ChartCard>

            <ChartCard
              title="Subscription Plans"
              total={(dashboard.organizations.free || 0) + (dashboard.organizations.pro || 0) + (dashboard.organizations.enterprise || 0)}
              subtitle={`${dashboard.organizations.pro + dashboard.organizations.enterprise} paid orgs`}
              color="#10b981"
            >
              <Donut
                segments={[
                  { label: 'free', value: dashboard.organizations.free || 0, color: '#64748b' },
                  { label: 'pro', value: dashboard.organizations.pro || 0, color: '#3b82f6' },
                  { label: 'enterprise', value: dashboard.organizations.enterprise || 0, color: '#8b5cf6' },
                ]}
                size={140}
              />
            </ChartCard>
          </div>
        )}
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
//  CHART HELPERS (pure SVG, no external deps)
// ═══════════════════════════════════════════════════════════

function buildDailySeries(rows, days) {
  // Normalize backend rows ({date, count}) into a dense daily array covering `days` days.
  var map = {};
  var total = 0;
  (rows || []).forEach(function (r) {
    var k = r.date ? new Date(r.date).toISOString().slice(0, 10) : null;
    if (k) {
      map[k] = parseInt(r.count || 0);
      total += parseInt(r.count || 0);
    }
  });
  var counts = [];
  var end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  var start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  for (var i = 0; i < days; i++) {
    var d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    var key = d.toISOString().slice(0, 10);
    counts.push(map[key] || 0);
  }
  return {
    counts: counts,
    total: total,
    avg: counts.length ? total / counts.length : 0,
    firstDate: start,
    lastDate: end,
  };
}

function ChartCard({ title, total, subtitle, color, children }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: color }}>{total}</div>
      </div>
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>{subtitle}</div>
      {children}
    </div>
  );
}

function SparkLine({ data, color, height }) {
  var w = 300;
  var h = height || 60;
  if (!data || data.length === 0) {
    return <div style={{ color: '#64748b', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>No data</div>;
  }
  var maxV = Math.max.apply(null, data.concat([1]));
  var stepX = data.length > 1 ? w / (data.length - 1) : 0;
  var points = data.map(function (v, i) {
    var x = i * stepX;
    var y = h - (v / maxV) * (h - 4) - 2;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  var areaPts = '0,' + h + ' ' + points + ' ' + w + ',' + h;
  return (
    <svg viewBox={'0 0 ' + w + ' ' + h} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={areaPts} fill={color} fillOpacity="0.15" stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map(function (v, i) {
        if (v === 0) return null;
        var x = i * stepX;
        var y = h - (v / maxV) * (h - 4) - 2;
        return <circle key={i} cx={x} cy={y} r="2" fill={color} />;
      })}
    </svg>
  );
}

function SeriesXAxis({ start, end }) {
  var fmt = function (d) { return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); };
  var mid = new Date((start.getTime() + end.getTime()) / 2);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
      <span>{fmt(start)}</span>
      <span>{fmt(mid)}</span>
      <span>{fmt(end)}</span>
    </div>
  );
}

function Donut({ segments, size }) {
  var total = segments.reduce(function (s, seg) { return s + (seg.value || 0); }, 0);
  var sz = size || 120;
  var r = sz / 2 - 4;
  var cx = sz / 2;
  var cy = sz / 2;
  if (total === 0) {
    return <div style={{ color: '#64748b', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>No data</div>;
  }
  var angle = -Math.PI / 2; // start at top
  var paths = [];
  segments.forEach(function (seg, idx) {
    if (!seg.value) return;
    var sweep = (seg.value / total) * Math.PI * 2;
    var x1 = cx + r * Math.cos(angle);
    var y1 = cy + r * Math.sin(angle);
    var x2 = cx + r * Math.cos(angle + sweep);
    var y2 = cy + r * Math.sin(angle + sweep);
    var large = sweep > Math.PI ? 1 : 0;
    var d = 'M ' + cx + ' ' + cy +
            ' L ' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
            ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) +
            ' Z';
    paths.push(<path key={idx} d={d} fill={seg.color} />);
    angle += sweep;
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <svg width={sz} height={sz} viewBox={'0 0 ' + sz + ' ' + sz} style={{ flexShrink: 0 }}>
        {paths}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#0f172a" />
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="16" fontWeight="700" fill="#f1f5f9">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="#64748b">TOTAL</text>
      </svg>
      <div style={{ flex: 1, fontSize: '11px' }}>
        {segments.map(function (seg) {
          var pct = total ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ width: '10px', height: '10px', background: seg.color, borderRadius: '2px', flexShrink: 0 }}></span>
              <span style={{ color: '#cbd5e1', flex: 1 }}>{seg.label}</span>
              <span style={{ color: '#f1f5f9', fontWeight: '600' }}>{seg.value}</span>
              <span style={{ color: '#64748b', minWidth: '32px', textAlign: 'right' }}>{pct}%</span>
            </div>
          );
        })}
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
  const [selectedUser, setSelectedUser] = useState(null); // { id, name } when row clicked
  const [userDetail, setUserDetail] = useState(null); // { user, teams, projects, auditHistory }
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'suspend'|'resetPw', userId }

  // Fetch full detail (teams, projects, auditHistory) when a user is selected
  useEffect(() => {
    if (!selectedUser) { setUserDetail(null); setDetailError(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    apiCall('GET', `/platform/users/${selectedUser.id}`)
      .then(data => { if (!cancelled) setUserDetail(data); })
      .catch(err => { if (!cancelled) setDetailError(err.message || 'Failed to load user'); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedUser]);

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
    try {
      await apiCall('DELETE', `/platform/users/${userId}`);
      setActionModal(null);
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
                  <div
                    onClick={() => setSelectedUser({ id: u.id, name: u.fullName || u.email })}
                    style={{ fontWeight: '500', color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                    title="Click to view full details"
                  >
                    {u.fullName || '—'}
                  </div>
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
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSelectedUser({ id: u.id, name: u.fullName || u.email })}
                      style={actionBtnStyle('#6366f1')}
                      title="View teams, projects, and audit history"
                    >
                      View
                    </button>
                    {u.suspendedAt ? (
                      <button onClick={() => handleReactivate(u.id)} style={actionBtnStyle('#10b981')}>Reactivate</button>
                    ) : (
                      <button onClick={() => setActionModal({ type: 'suspend', userId: u.id, userName: u.fullName || u.email })} style={actionBtnStyle('#f59e0b')}>Suspend</button>
                    )}
                    <button onClick={() => setActionModal({ type: 'resetPw', userId: u.id, userName: u.fullName || u.email })} style={actionBtnStyle('#3b82f6')}>Reset PW</button>
                    <button
                      onClick={() => setActionModal({ type: 'delete', userId: u.id, userName: u.fullName || u.email, projectCount: u.projectCount })}
                      style={actionBtnStyle('#ef4444')}
                    >
                      Delete
                    </button>
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
      {actionModal && actionModal.type === 'delete' && (
        <DeleteUserModal
          userName={actionModal.userName}
          projectCount={actionModal.projectCount}
          onConfirm={() => handleDelete(actionModal.userId)}
          onCancel={() => setActionModal(null)}
        />
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          selectedUser={selectedUser}
          detail={userDetail}
          loading={detailLoading}
          error={detailError}
          onClose={() => setSelectedUser(null)}
          onSuspend={(userName) => {
            setActionModal({ type: 'suspend', userId: selectedUser.id, userName });
            setSelectedUser(null);
          }}
          onResetPw={(userName) => {
            setActionModal({ type: 'resetPw', userId: selectedUser.id, userName });
            setSelectedUser(null);
          }}
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

      <div style={{
        padding: '10px 14px', background: '#1e3a5f', border: '1px solid #3b82f6',
        borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#bfdbfe',
        lineHeight: '1.5',
      }}>
        <strong style={{ color: '#dbeafe' }}>Privacy note:</strong> sensitive fields
        (passwords, tokens, child BLL values, child names, resident phone/address,
        license numbers) are masked in this view per HIPAA 45 CFR 164.514 and
        MCL 333.5474. The full record is retained server-side under 40 CFR 745.227(h).
      </div>

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
                <td style={{ ...cellStyle, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title="Sensitive keys (password, BLL, child name, tokens, phone, address, license #) are masked per HIPAA 45 CFR 164.514 / MCL 333.5474">
                  {redactAuditDetails(l.details)}
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
  const [visible, setVisible] = useState(false);

  // Cryptographically strong temporary password (20 chars, mixed case + digits
  // + specials). Uses window.crypto when available; falls back to Math.random.
  function generate() {
    const len = 20;
    const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let out = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const buf = new Uint32Array(len);
      window.crypto.getRandomValues(buf);
      for (let i = 0; i < len; i++) out += charset[buf[i] % charset.length];
    } else {
      for (let i = 0; i < len; i++) out += charset[Math.floor(Math.random() * charset.length)];
    }
    setPw(out);
    setVisible(true);
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ color: '#f1f5f9', marginBottom: '16px' }}>Reset Password for {userName}</h3>
        <div style={{ color: '#fbbf24', fontSize: '12px', marginBottom: '10px', background: '#422006', padding: '8px 10px', borderRadius: '6px', border: '1px solid #78350f' }}>
          Communicate this password to the user over a secure channel. The user
          will be forced to change it on next login (mustChangePassword).
        </div>
        <label style={{ color: '#94a3b8', fontSize: '13px' }}>Temporary Password (min 8 chars)</label>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', marginBottom: '4px' }}>
          <input
            type={visible ? 'text' : 'password'}
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Enter or generate..."
            style={{ ...inputDarkStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            style={{ ...actionBtnStyle('#475569'), whiteSpace: 'nowrap' }}
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
        <button
          type="button"
          onClick={generate}
          style={{ ...actionBtnStyle('#334155'), marginBottom: '16px' }}
        >
          Generate secure password
        </button>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={actionBtnStyle('#475569')}>Cancel</button>
          <button onClick={() => onConfirm(pw)} disabled={pw.length < 8} style={actionBtnStyle('#3b82f6')}>Reset Password</button>
        </div>
      </div>
    </div>
  );
}

// DeleteUserModal — replaces bare confirm() prompt for user deletion.
// A platform admin deleting a user must not accidentally sever the link
// between inspector identity and signed inspection reports. 40 CFR 745.227(h)
// requires the firm to retain inspection records, including the name and
// certification number of the inspector who performed the work, for 3 years.
// Deleting the user *record* before those records are migrated could orphan
// signatures on historical PDFs. Michigan R 325.99207 imposes a parallel
// 3-year retention on accredited-firm files.
//
// This modal:
//   1. surfaces how many projects are attached to the user (blocking signal)
//   2. requires the admin to type "DELETE <email>" exactly — not just click
//   3. cites the retention rule so the admin sees WHY they should hesitate
function DeleteUserModal({ userName, projectCount, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('');
  const expected = `DELETE ${userName || ''}`.trim();
  const canDelete = typed.trim() === expected && expected.length > 7;
  const hasProjects = typeof projectCount === 'number' && projectCount > 0;

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: '520px', border: '1px solid #7f1d1d' }}>
        <h3 style={{ color: '#fca5a5', marginBottom: '12px' }}>
          Delete user: {userName}
        </h3>

        <div style={{ color: '#fecaca', fontSize: '12px', marginBottom: '10px', background: '#450a0a', padding: '10px 12px', borderRadius: '6px', border: '1px solid #7f1d1d', lineHeight: 1.55 }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>This is permanent.</strong>
          Before deleting, make sure all inspection records signed by this
          user have been exported. <strong>40 CFR 745.227(h)</strong> and
          <strong> Michigan R 325.99207</strong> require inspector identity
          and certification to remain tied to reports for 3 years. Deleting
          the user record does not remove past PDFs, but future exports will
          show "(deleted user)" in the signature block.
        </div>

        {hasProjects && (
          <div style={{ color: '#fbbf24', fontSize: '12px', marginBottom: '10px', background: '#422006', padding: '10px 12px', borderRadius: '6px', border: '1px solid #78350f' }}>
            <strong>{projectCount}</strong> project{projectCount === 1 ? ' is' : 's are'} currently
            attached to this user. Consider re-assigning before deletion so the
            audit trail stays continuous.
          </div>
        )}

        <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
          To confirm, type: <code style={{ color: '#f87171', background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>{expected}</code>
        </label>
        <input
          type="text"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder={expected}
          autoComplete="off"
          spellCheck={false}
          style={{ ...inputDarkStyle, marginBottom: '16px' }}
        />

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={actionBtnStyle('#475569')}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!canDelete}
            style={{
              ...actionBtnStyle('#dc2626'),
              opacity: canDelete ? 1 : 0.4,
              cursor: canDelete ? 'pointer' : 'not-allowed',
            }}
          >
            Permanently delete
          </button>
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

// ═══════════════════════════════════════════════════════════
//  USER DETAIL MODAL
// ═══════════════════════════════════════════════════════════

function UserDetailModal({ selectedUser, detail, loading, error, onClose, onSuspend, onResetPw }) {
  const user = detail && detail.user ? detail.user : null;
  const teams = detail && Array.isArray(detail.teams) ? detail.teams : [];
  const projects = detail && Array.isArray(detail.projects) ? detail.projects : [];
  const auditHistory = detail && Array.isArray(detail.auditHistory) ? detail.auditHistory : [];

  const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—';
  const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString() : '—';

  const statusBadge = !user ? null : (
    user.suspendedAt ? <span style={badgeStyle('#ef4444')}>Suspended</span>
      : user.active ? <span style={badgeStyle('#10b981')}>Active</span>
      : <span style={badgeStyle('#64748b')}>Inactive</span>
  );

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={{ ...modalStyle, maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' }}>
          <div>
            <h3 style={{ color: '#f1f5f9', fontSize: '20px', margin: 0 }}>
              {selectedUser.name}
            </h3>
            {user && (
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                {user.email} · {user.role || '—'} · Joined {fmtDateShort(user.createdAt)} {statusBadge}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
            Close
          </button>
        </div>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading detail...</div>
        )}
        {error && (
          <div style={{ padding: '16px', background: '#7f1d1d', color: '#fecaca', borderRadius: '6px', marginBottom: '16px' }}>
            Failed to load: {error}
          </div>
        )}

        {!loading && !error && user && (
          <>
            {/* Core info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <InfoCell label="Organization" value={user.orgName || '—'} />
              <InfoCell label="Plan" value={user.orgPlan || '—'} />
              <InfoCell label="Phone" value={user.phone || '—'} />
              <InfoCell label="Last login" value={fmtDate(user.lastLoginAt)} />
              <InfoCell label="Email verified" value={user.emailVerifiedAt ? fmtDateShort(user.emailVerifiedAt) : 'No'} />
              <InfoCell label="Must change PW" value={user.mustChangePassword ? 'Yes' : 'No'} />
              {user.suspendedAt && (
                <InfoCell label="Suspended" value={fmtDate(user.suspendedAt) + (user.suspensionReason ? ' — ' + user.suspensionReason : '')} highlight="#ef4444" />
              )}
              {user.licenseNumber && (
                <InfoCell label="License #" value={user.licenseNumber + (user.licenseExpiresAt ? ' (exp ' + fmtDateShort(user.licenseExpiresAt) + ')' : '')} />
              )}
            </div>

            {/* Teams */}
            <DetailSection title={`Teams (${teams.length})`}>
              {teams.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '13px', padding: '8px 0' }}>Not a member of any team</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <th style={detailThStyle}>Team</th>
                      <th style={detailThStyle}>Role</th>
                      <th style={detailThStyle}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((t) => (
                      <tr key={t.id || t.teamId} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={detailTdStyle}>{t.name}</td>
                        <td style={detailTdStyle}>
                          <span style={badgeStyle(t.role === 'lead' ? '#3b82f6' : '#64748b')}>{t.role || 'member'}</span>
                        </td>
                        <td style={detailTdStyle}>{fmtDateShort(t.joinedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DetailSection>

            {/* Projects */}
            <DetailSection title={`Recent Projects (${projects.length})`}>
              {projects.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '13px', padding: '8px 0' }}>No projects yet</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <th style={detailThStyle}>Project</th>
                      <th style={detailThStyle}>Address</th>
                      <th style={detailThStyle}>Status</th>
                      <th style={detailThStyle}>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={detailTdStyle}>{p.name || p.projectName || '(untitled)'}</td>
                        <td style={detailTdStyle}>{p.propertyAddress || p.address || '—'}</td>
                        <td style={detailTdStyle}>
                          <span style={badgeStyle(
                            p.status === 'completed' ? '#10b981'
                            : p.status === 'in_progress' ? '#3b82f6'
                            : '#64748b'
                          )}>
                            {p.status || 'draft'}
                          </span>
                        </td>
                        <td style={detailTdStyle}>{fmtDateShort(p.updatedAt || p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DetailSection>

            {/* Audit history */}
            <DetailSection title={`Audit History (last ${auditHistory.length})`}>
              <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '8px' }}>
                PII in audit details is redacted per HIPAA 45 CFR 164.514(b) / NIST SP 800-53 AU-11
              </div>
              {auditHistory.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '13px', padding: '8px 0' }}>No recorded actions</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <th style={detailThStyle}>When</th>
                      <th style={detailThStyle}>Action</th>
                      <th style={detailThStyle}>By</th>
                      <th style={detailThStyle}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditHistory.map((a, i) => {
                      const redacted = redactAuditDetails(a.details);
                      return (
                        <tr key={a.id || i} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={detailTdStyle}>{fmtDate(a.createdAt || a.timestamp)}</td>
                          <td style={detailTdStyle}>{a.action || a.eventType || '—'}</td>
                          <td style={detailTdStyle}>{a.actorEmail || a.actorId || 'system'}</td>
                          <td style={{ ...detailTdStyle, fontFamily: 'monospace', fontSize: '11px', maxWidth: '380px', wordBreak: 'break-word' }}>
                            {redacted ? JSON.stringify(redacted) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </DetailSection>

            {/* Actions footer */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #334155', paddingTop: '12px', marginTop: '12px' }}>
              <button
                onClick={() => onResetPw(selectedUser.name)}
                style={actionBtnStyle('#3b82f6')}
              >
                Reset Password
              </button>
              {!user.suspendedAt && (
                <button
                  onClick={() => onSuspend(selectedUser.name)}
                  style={actionBtnStyle('#f59e0b')}
                >
                  Suspend
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoCell({ label, value, highlight }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid ' + (highlight || '#334155'), padding: '10px 12px', borderRadius: '6px' }}>
      <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: highlight ? '#fecaca' : '#f1f5f9', marginTop: '4px', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #334155' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

const detailThStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: '11px',
  color: '#94a3b8',
  textTransform: 'uppercase',
  fontWeight: '600',
};

const detailTdStyle = {
  padding: '8px 10px',
  color: '#cbd5e1',
  verticalAlign: 'top',
};

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
