import React, { useEffect } from 'react';
import { COLORS, TYPE_COLORS } from './_resourceTheme';

// Shared layout used by every /resources/:slug page. Renders:
//   • LeadFlow AI header bar (same glyph + wordmark as the landing page)
//   • "← All resources" top-left nav + "Sign in" top-right
//   • Navy gradient background with a centered 720px reading column
//   • Type pill (REGULATION / GUIDE / NEWS / TUTORIAL) + title + meta
//   • Children block (the article body — each page composes its own)
//   • Footer CTA that bounces to the sign-up page
//
// We deliberately reuse the landing-page navy palette so users feel they
// stayed on the same site rather than being dropped into a blog system.
export default function ResourcePageLayout({ resource, children }) {
  const typeColor = TYPE_COLORS[resource.type] || COLORS.orange;

  // Scroll to top on mount so a direct /resources/xrf-testing visit
  // starts at the header, not whatever scroll position the last page left.
  useEffect(() => { window.scrollTo(0, 0); }, [resource.slug]);

  const navigate = (href) => {
    // Match the landing-page convention: use history.pushState + fire a
    // popstate so App.jsx's route-reading code picks up the change
    // without a full reload. Falls back to href navigation for robustness.
    try {
      window.history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (_) {
      window.location.href = href;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 40%, ${COLORS.navyLight} 100%)`,
      color: COLORS.white,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* ─── Header ──────────────────────────────────────────── */}
      <header style={{
        padding: '20px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(10,22,40,0.85)',
        backdropFilter: 'blur(8px)',
      }}>
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: `linear-gradient(135deg, ${COLORS.orangeDeep}, ${COLORS.orangeGlow})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: COLORS.white, fontSize: 16,
          }}>L</div>
          <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.white, letterSpacing: '-0.5px' }}>
            LeadFlow AI
          </span>
        </a>
        <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a
            href="/resources"
            onClick={(e) => { e.preventDefault(); navigate('/resources'); }}
            style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}
            onMouseEnter={e => e.target.style.color = COLORS.white}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.75)'}
          >All resources</a>
          <a
            href="/login"
            style={{
              color: COLORS.white, textDecoration: 'none', fontSize: 14, fontWeight: 500,
              padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)',
            }}
          >Sign in</a>
          <a
            href="/login?register=true"
            style={{
              color: COLORS.white, textDecoration: 'none', fontSize: 14, fontWeight: 600,
              padding: '7px 18px', borderRadius: 8, background: COLORS.orange,
            }}
            onMouseEnter={e => e.target.style.background = COLORS.orangeHover}
            onMouseLeave={e => e.target.style.background = COLORS.orange}
          >Start free</a>
        </nav>
      </header>

      {/* ─── Reading column ─────────────────────────────────── */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 96px' }}>
        {/* Back link */}
        <a
          href="/resources"
          onClick={(e) => { e.preventDefault(); navigate('/resources'); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 14, color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
            marginBottom: 32,
          }}
          onMouseEnter={e => e.currentTarget.style.color = COLORS.white}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
        >
          <span>←</span> All resources
        </a>

        {/* Type pill */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            display: 'inline-block',
            fontSize: 11, fontWeight: 700, color: typeColor,
            textTransform: 'uppercase', letterSpacing: 1.5,
            background: 'rgba(255,255,255,0.06)',
            padding: '6px 12px', borderRadius: 999,
            border: `1px solid ${typeColor}55`,
          }}>{resource.type}</span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 44, lineHeight: 1.12, letterSpacing: '-1.2px',
          fontWeight: 800, color: COLORS.white, margin: '0 0 16px',
        }}>{resource.title}</h1>

        {/* Meta row */}
        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap',
          fontSize: 14, color: 'rgba(255,255,255,0.55)',
          paddingBottom: 32, marginBottom: 40,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span>Last reviewed: {resource.lastReviewed}</span>
          <span>·</span>
          <span>{resource.readingTimeMin} min read</span>
          <span>·</span>
          <span>By the LeadFlow AI compliance team</span>
        </div>

        {/* Article body */}
        <article style={{
          fontSize: 17, lineHeight: 1.7,
          color: 'rgba(255,255,255,0.88)',
        }}>
          {children}
        </article>

        {/* ─── Footer CTA ─────────────────────────────────────── */}
        <div style={{
          marginTop: 64, padding: '36px 32px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          textAlign: 'center',
        }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: COLORS.white, margin: '0 0 10px' }}>
            Ready to modernize your inspection workflow?
          </h3>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: '0 0 24px', lineHeight: 1.6 }}>
            LeadFlow AI generates Michigan-compliant LIRA and risk assessment reports in minutes, not days. Free while in preview.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/login?register=true"
              style={{
                display: 'inline-block',
                padding: '14px 28px', borderRadius: 10,
                background: COLORS.orange, color: COLORS.white,
                fontSize: 15, fontWeight: 600, textDecoration: 'none',
              }}
              onMouseEnter={e => e.target.style.background = COLORS.orangeHover}
              onMouseLeave={e => e.target.style.background = COLORS.orange}
            >Start free</a>
            <a
              href="/resources"
              onClick={(e) => { e.preventDefault(); navigate('/resources'); }}
              style={{
                display: 'inline-block',
                padding: '14px 28px', borderRadius: 10,
                background: 'transparent', color: COLORS.white,
                fontSize: 15, fontWeight: 500, textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >See all resources</a>
          </div>
        </div>

        {/* Footnote / disclaimer — important for regulatory content. */}
        <p style={{
          marginTop: 48, fontSize: 13, lineHeight: 1.6,
          color: 'rgba(255,255,255,0.45)',
        }}>
          This resource is provided for informational purposes by LeadFlow AI and does not constitute legal advice.
          Michigan lead hazard regulations change; always verify current rule text with EGLE and EPA before making
          compliance decisions on a specific job. Citations reflect the regulatory landscape as of {resource.lastReviewed}.
        </p>
      </main>
    </div>
  );
}

// ─── Re-usable article primitives ────────────────────────────
// Every individual resource page composes its body from these small
// presentational components so typography, spacing, and colors stay
// consistent across the whole /resources surface. Keep them dumb —
// no data fetching, no routing, just rendering.

export function H2({ children }) {
  return (
    <h2 style={{
      fontSize: 28, fontWeight: 700, color: COLORS.white,
      margin: '48px 0 16px', letterSpacing: '-0.5px',
    }}>{children}</h2>
  );
}

export function H3({ children }) {
  return (
    <h3 style={{
      fontSize: 20, fontWeight: 700, color: COLORS.white,
      margin: '32px 0 12px',
    }}>{children}</h3>
  );
}

export function P({ children }) {
  return (
    <p style={{ margin: '0 0 20px' }}>{children}</p>
  );
}

export function UL({ children }) {
  return (
    <ul style={{ margin: '0 0 20px', paddingLeft: 22, lineHeight: 1.7 }}>
      {children}
    </ul>
  );
}

export function LI({ children }) {
  return (
    <li style={{ marginBottom: 8 }}>{children}</li>
  );
}

export function Callout({ title, children, tone = 'neutral' }) {
  const toneStyles = {
    neutral: { border: 'rgba(255,255,255,0.15)', accent: COLORS.white, bg: 'rgba(255,255,255,0.04)' },
    warning: { border: 'rgba(232,101,10,0.35)', accent: COLORS.orangeGlow, bg: 'rgba(232,101,10,0.08)' },
    danger: { border: 'rgba(220,38,38,0.4)', accent: '#fca5a5', bg: 'rgba(220,38,38,0.08)' },
    success: { border: 'rgba(22,163,74,0.35)', accent: '#86efac', bg: 'rgba(22,163,74,0.08)' },
    info: { border: 'rgba(37,99,235,0.35)', accent: '#93c5fd', bg: 'rgba(37,99,235,0.08)' },
  };
  const t = toneStyles[tone] || toneStyles.neutral;
  return (
    <div style={{
      margin: '24px 0 28px', padding: '20px 24px',
      border: `1px solid ${t.border}`, borderRadius: 12, background: t.bg,
    }}>
      {title && (
        <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          {title}
        </div>
      )}
      <div style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>
        {children}
      </div>
    </div>
  );
}

// Simple table primitive — two-column or multi-column. Children should
// be an array of row arrays; first row is treated as the header.
export function Table({ rows, caption }) {
  if (!rows || rows.length === 0) return null;
  const [header, ...body] = rows;
  return (
    <div style={{ margin: '24px 0 32px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} style={{
                textAlign: 'left', padding: '12px 14px',
                background: 'rgba(255,255,255,0.06)',
                color: COLORS.white, fontWeight: 700, fontSize: 13,
                borderBottom: '1px solid rgba(255,255,255,0.15)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.82)',
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && (
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8, fontStyle: 'italic' }}>
          {caption}
        </div>
      )}
    </div>
  );
}

export function Citation({ children }) {
  return (
    <span style={{
      fontSize: 14, color: 'rgba(255,255,255,0.55)',
      fontStyle: 'italic',
    }}>{children}</span>
  );
}

export function Code({ children }) {
  return (
    <code style={{
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
      fontSize: '0.9em',
      background: 'rgba(255,255,255,0.08)',
      padding: '2px 6px',
      borderRadius: 4,
      color: COLORS.orangeGlow,
    }}>{children}</code>
  );
}
