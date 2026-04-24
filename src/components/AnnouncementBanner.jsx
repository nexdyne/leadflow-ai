import { useState, useEffect } from 'react';
import { apiCall } from '../api/apiConfig.js';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    // C75: initial fetch on mount, then poll every 2 minutes so users
    // mid-session pick up newly-published announcements (e.g., a
    // scheduled-downtime notice or a critical compliance update) within
    // 120 s rather than only on page reload. The endpoint is cheap
    // (single query, active=true + not-expired) and the payload is a
    // small array; 2 minutes is the right balance between responsiveness
    // and needless load. Pause when tab hidden (visibilitychange) to
    // cut wasted cycles on background tabs.
    loadAnnouncements();
    const POLL_MS = 120 * 1000;
    let intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') loadAnnouncements();
    }, POLL_MS);
    // When a hidden tab becomes visible again, fetch immediately so the
    // user does not wait up to 2 min for the next poll tick.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadAnnouncements();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  async function loadAnnouncements() {
    try {
      const data = await apiCall('GET', '/platform/announcements/active');
      setAnnouncements(data.announcements || []);
    } catch (err) {
      // Silently fail — announcements are non-critical
      console.warn('Failed to load announcements:', err.message);
    }
  }

  async function handleDismiss(id) {
    try {
      await apiCall('POST', `/platform/announcements/${id}/dismiss`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.warn('Failed to dismiss announcement:', err.message);
    }
  }

  if (announcements.length === 0) return null;

  const typeStyles = {
    info: { bg: '#ebf8ff', border: '#90cdf4', color: '#2b6cb0', icon: 'ℹ️' },
    feature: { bg: '#f0fff4', border: '#9ae6b4', color: '#276749', icon: '✨' },
    warning: { bg: '#fffff0', border: '#fefcbf', color: '#975a16', icon: '⚠️' },
    critical: { bg: '#fff5f5', border: '#feb2b2', color: '#c53030', icon: '🚨' },
    maintenance: { bg: '#faf5ff', border: '#d6bcfa', color: '#6b46c1', icon: '🔧' },
  };

  return (
    <div style={{ padding: '0 24px' }}>
      {announcements.map(a => {
        const style = typeStyles[a.type] || typeStyles.info;
        return (
          <div
            key={a.id}
            style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{style.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '14px', color: style.color }}>{a.title}</div>
              <div style={{ fontSize: '13px', color: style.color, opacity: 0.85, marginTop: '2px' }}>{a.body}</div>
            </div>
            <button
              onClick={() => handleDismiss(a.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '18px', color: style.color, opacity: 0.5,
                padding: '0 4px', lineHeight: 1, flexShrink: 0,
              }}
              title="Dismiss"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
