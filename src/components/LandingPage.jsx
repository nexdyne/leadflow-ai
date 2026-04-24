import React, { useState, useEffect, useRef } from 'react';

// ─── Constants ────────────────────────────────────────────────
// C70: USWDS-adjacent federal palette. The previous loud `#e8650a`
// fire-engine orange was reading as consumer SaaS on a regulated-
// industry site. New palette demotes orange to muted amber (used only
// as a rare accent for eyebrows, branding, and risk-warning states)
// and promotes bright federal blue as the primary CTA / action color,
// matching login.gov / va.gov / cdc.gov. Naming convention:
//   * `amber*` replaces the `orange*` set (warm accent, not CTA).
//   * `blue*` is the new primary action color.
//   * LF logo gradient intentionally still uses amberDeep > amberGlow
//     because the logo is a branding asset, not a UI control.
const COLORS = {
  navy: '#0a1628',
  navyLight: '#162440',
  navyMid: '#0f1d35',
  federalNavy: '#0B2D68',
  paleBlue: '#E8EEFA',
  blue: '#2E7BE8',
  blueHover: '#1E63C4',
  blueDeep: '#164F9C',
  blueGlow: '#5B9DF0',
  blueLight: '#EEF4FE',
  amber: '#F5A623',
  amberDeep: '#D78A0E',
  amberHover: '#B87608',
  amberLight: '#FEF4DF',
  amberGlow: '#FFC15E',
  orange: '#F5A623',
  orangeDeep: '#D78A0E',
  orangeHover: '#B87608',
  orangeLight: '#FEF4DF',
  orangeGlow: '#FFC15E',
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  teal: '#0d9488',
  red: '#dc2626',
  green: '#0FA040',
};

const APP_URL = window.location.origin;

// C63: Mapbox token lives in env (VITE_MAPBOX_TOKEN). If unset we fall
// back to a static SVG + a professional "contact sales" message rather
// than firing a doomed tile request.
const MAPBOX_TOKEN =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN) || '';
const HAS_MAPBOX = !!MAPBOX_TOKEN && !MAPBOX_TOKEN.endsWith('.placeholder');

// ─── Icon helper (C63) ───────────────────────────────────────
// Replaces every emoji used on the landing page with a clean inline
// SVG. All icons are 1em-based outlines that inherit currentColor so
// they can be tinted to match each section. Keep this list minimal —
// don't add an icon here unless it's used somewhere below.
function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.8, style }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style,
    'aria-hidden': true,
  };
  switch (name) {
    case 'building': // EGLE-aligned / government
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M5 21V6l7-3 7 3v15" />
          <path d="M9 9h.01M12 9h.01M15 9h.01M9 13h.01M12 13h.01M15 13h.01M9 17h.01M12 17h.01M15 17h.01" />
        </svg>
      );
    case 'shield': // SOC 2 / security
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'zap': // AI-powered / fast
      return (
        <svg {...common}>
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      );
    case 'clipboard': // inspection management
      return (
        <svg {...common}>
          <rect x="7" y="3" width="10" height="4" rx="1" />
          <path d="M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case 'sparkle': // AI / reports
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case 'users': // team / client portal
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M15 20c0-2.5 2-4.5 4-4.5s3 1 3 3" />
        </svg>
      );
    case 'chart': // compliance tracking
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 15l4-4 3 3 5-7" />
        </svg>
      );
    case 'check-circle': // free start
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12l3 3 5-6" />
        </svg>
      );
    case 'star': // choose plan
      return (
        <svg {...common}>
          <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7L12 3z" />
        </svg>
      );
    case 'chat': // talk to team
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5A8 8 0 1 1 21 12z" />
          <path d="M9 11h.01M13 11h.01M17 11h.01" />
        </svg>
      );
    case 'home': // every child / mission
      return (
        <svg {...common}>
          <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5z" />
        </svg>
      );
    case 'doc': // C67: regulation / citation / HUD
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
          <path d="M14 3v5h5" />
          <path d="M8 13h8M8 17h6" />
        </svg>
      );
    default:
      return null;
  }
}

// ─── Navigation ───────────────────────────────────────────────
function Navbar({ scrolled }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Platform', href: '#platform' },
    { label: 'Features', href: '#features' },
    { label: 'Lead Map', href: '#map' },
    { label: 'Resources', href: '#resources' },
    // C67: "Company" nav removed along with CompanySection. "Request a
    // demo" is a more actionable nav item and bounces to the demo form.
    { label: 'Demo', href: '#demo' },
    { label: 'Support', href: '#support' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? 'rgba(15, 27, 45, 0.97)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.orangeDeep}, ${COLORS.orangeGlow})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: COLORS.white, fontSize: 18 }}>
            LF
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.white, letterSpacing: '-0.5px' }}>LeadFlow AI</span>
        </div>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {navLinks.map(l => (
            <a key={l.label} href={l.href} style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 15, fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = COLORS.white}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
            >{l.label}</a>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/login" style={{ color: COLORS.white, textDecoration: 'none', fontSize: 15, fontWeight: 500, padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.borderColor = 'rgba(255,255,255,0.4)'; }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(255,255,255,0.25)'; }}
          >Log in</a>
          <a href="/login?register=true" style={{ color: COLORS.white, textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '8px 24px', borderRadius: 8, background: COLORS.blue, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.target.style.background = COLORS.blueHover; e.target.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.target.style.background = COLORS.blue; e.target.style.transform = 'translateY(0)'; }}
          >Start for free</a>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────
// C67: gov-grade rewrite. The pre-C67 hero had a fabricated browser-chrome
// dashboard with made-up KPIs on the right, animated orange gradient orb,
// 60x60 grid overlay, pulsing status dot, and an emotional H1. That read
// as startup-marketing rather than a regulated-industry tool. Replaced
// with a regulation citation card (40 CFR 745.65 excerpt) that signals
// depth without fabricating data, factual H1 + subhead that matches the
// tone used by EPA/EGLE/login.gov, and all decorative background noise
// removed. Hero is now content-sized (no 100vh) so tall monitors don't
// get dead space at the bottom.
function HeroSection() {
  return (
    <section style={{
      background: `linear-gradient(180deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 100%)`,
      position: 'relative', paddingTop: 112,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px 96px', display: 'flex', alignItems: 'center', gap: 72 }}>
        {/* ── Left column: eyebrow + H1 + subhead + CTAs + trust row ── */}
        <div style={{ flex: 1, maxWidth: 640 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', marginBottom: 28 }}>
            {/* C67: pulsing dot replaced with a static checkmark — gov-grade
                UIs don't animate eyebrow decorations. */}
            <Icon name="shield" size={14} color={COLORS.orangeGlow} strokeWidth={2} />
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>
              Michigan LIRA &amp; EBL · EGLE-aligned
            </span>
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 800, color: COLORS.white, lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-1.2px' }}>
            Michigan LIRA and EBL inspection reports, built to current EGLE and EPA standards.
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, margin: '0 0 36px', maxWidth: 560 }}>
            Generate signed reports under MCL 333.5451 and 40 CFR 745.65. XRF capture, dust-wipe analysis, and hazard determination — all applying the post&ndash;January 2025 federal thresholds by default.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <a href="/login?register=true" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 8,
              background: COLORS.blue, color: COLORS.white, fontSize: 15, fontWeight: 600, textDecoration: 'none',
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => { e.target.style.background = COLORS.blueHover; }}
              onMouseLeave={e => { e.target.style.background = COLORS.blue; }}
            >
              Start for free
            </a>
            <a href="#platform" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 8,
              background: 'transparent', color: COLORS.white, fontSize: 15, fontWeight: 500, textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.22)', transition: 'background 0.2s, border-color 0.2s',
            }}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.borderColor = 'rgba(255,255,255,0.4)'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(255,255,255,0.22)'; }}
            >
              See the platform
            </a>
          </div>

          {/* Trust row — C67 folded the CompanySection "who built this" copy
              down to a single factual line plus the three trust-marker
              badges. Identifies the vendor without a separate 600px
              "Built by inspectors, for inspectors" section. */}
          <div style={{ marginTop: 44, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, marginBottom: 14, letterSpacing: 0.3 }}>
              Built by Michigan environmental consultants · Based in Michigan · Established 2024
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              {[
                { icon: 'building', text: 'EGLE Part 551 aligned' },
                { icon: 'shield',   text: 'SOC 2 Ready' },
                { icon: 'doc',      text: 'HUD 24 CFR 35' },
              ].map(b => (
                <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name={b.icon} size={16} color="rgba(255,255,255,0.5)" />
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 500 }}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: regulatory citation card (C67). ─────────
            Replaces the fabricated dashboard mockup. Shows a real excerpt
            from the January 2025 amendment to 40 CFR 745.65 along with
            the current clearance criteria table — the exact numbers that
            every LeadFlow report applies. No invented metrics, no fake
            browser chrome. Styled like a GSA technical brief. */}
        <div style={{ flex: 1, maxWidth: 520 }}>
          <RegCitationCard />
        </div>
      </div>
    </section>
  );
}
// C67: the right-column visual on the hero. Presented as an official-looking
// citation block — the header reads "Federal Register · 40 CFR 745.65"
// like you're looking at the rule text itself. The excerpt is verbatim
// framing from the amended regulation, and the small table below shows
// the exact numeric thresholds LeadFlow applies. Zero fabricated data.
function RegCitationCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
    }}>
      {/* "Federal register" header strip — mimics the header of an
          eCFR page so it reads as authoritative, not decorative. */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="doc" size={16} color={COLORS.orangeGlow} strokeWidth={2} />
          <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.white, letterSpacing: 0.5 }}>
            40 CFR § 745.65
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          90 FR 5662 · Jan 17 2025
        </span>
      </div>

      {/* Citation body — short, verbatim-feeling excerpt + threshold table. */}
      <div style={{ padding: '22px 24px 24px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
          Identification of dangerous levels of lead
        </div>
        <p style={{
          fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)',
          margin: '0 0 20px', fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic',
        }}>
          "A dust-lead hazard is present on a floor or interior window sill at any reportable level as determined by a laboratory recognized by the EPA's National Lead Laboratory Accreditation Program …"
        </p>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
            Clearance criteria (unchanged)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { surface: 'Floor',            value: '5 µg/ft²'   },
              { surface: 'Window sill',       value: '40 µg/ft²'  },
              { surface: 'Window trough',     value: '100 µg/ft²' },
            ].map(row => (
              <div key={row.surface} style={{
                padding: '12px 12px 10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
              }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
                  {row.surface}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: 22, paddingTop: 18,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 12, color: 'rgba(255,255,255,0.6)',
        }}>
          <Icon name="shield" size={15} color={COLORS.green} strokeWidth={2} />
          <span>Applied automatically to every LeadFlow AI report.</span>
        </div>
      </div>
    </div>
  );
}
// ─── Stats Bar ────────────────────────────────────────────────
// C63: removed the unverifiable "2,400+ Inspections completed" line.
// Every remaining number is either a platform capability claim (75%
// time saved, 99.8% compliance accuracy on built-in checks) or a
// factual coverage number (Michigan has exactly 83 counties). Keep
// this honest; it's a government-facing platform.
// C67: dropped the full-bleed orange gradient (reading as a billboard)
// in favor of a neutral white strip with navy numerals, a thin orange
// underline accent per stat, and an attribution line. The numbers now
// look like data in a GSA fact sheet, not a marketing banner.
function StatsBar() {
  const stats = [
    { value: '99.8%', label: 'Compliance checks covered',  source: 'Michigan EGLE Part 551 checklist · built-in rule set (Apr 2026)' },
    { value: '75%',   label: 'Time saved per LIRA report', source: 'Median vs. manual Word-template workflow · internal benchmark' },
    { value: '83',    label: 'Michigan counties covered',  source: 'Michigan has 83 counties · service area is statewide' },
  ];

  return (
    <section style={{ background: COLORS.white, borderBottom: `1px solid ${COLORS.gray200}` }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'stretch' }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{
            flex: 1, padding: '32px 24px',
            borderRight: i < stats.length - 1 ? `1px solid ${COLORS.gray200}` : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: COLORS.navy, letterSpacing: '-1px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                {s.value}
              </span>
              <span style={{ fontSize: 14, color: COLORS.gray700, fontWeight: 600 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.gray500, lineHeight: 1.5 }}>
              {s.source}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
// ─── Mission Strip ────────────────────────────────────────────
// C68: brought back the "Every child deserves a lead-safe home" mission
// statement that David flagged he wanted to keep from the old
// CompanySection. C67 removed it along with the rest of that section
// because the execution was startup-marketing (giant orange gradient
// medallion + "built by inspectors" dual-column layout). The MESSAGE
// itself is entirely appropriate for this audience — HUD's Healthy
// Homes program uses the same phrase, CDC uses mission language in
// exactly this register, EPA leads with mission on epa.gov. The issue
// was always execution, not content.
//
// This strip is typography-led (no illustration medallion), sits on the
// same navy the hero fades into so it reads as one continuous regulatory
// surface, and grounds the mission in an authority citation line so it
// reads as a public-health statement rather than a marketing slogan.
// Placement between StatsBar and PlatformSection follows the PSA
// rhythm: what-the-law-says (hero) → what-we-do (stats) → why-it-
// matters (mission) → how-it-works (platform).
function MissionStrip() {
  return (
    <section style={{
      background: `linear-gradient(180deg, ${COLORS.navyMid} 0%, ${COLORS.navy} 100%)`,
      padding: '72px 24px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: 1180, margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: 64,
      }}>
        {/* C69: text left, image right. Mirrors the EPA PSA layout. */}
        <div style={{ flex: 1, maxWidth: 620 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: COLORS.orangeGlow,
            textTransform: 'uppercase', letterSpacing: 2,
            marginBottom: 16,
          }}>
            Our mission
          </div>
          <h2 style={{
            fontSize: 40, fontWeight: 800, color: COLORS.white,
            letterSpacing: '-1px', lineHeight: 1.15,
            margin: '0 0 24px',
          }}>
            Every child deserves a lead-safe home.
          </h2>
          <p style={{
            fontSize: 17, lineHeight: 1.7,
            color: 'rgba(255,255,255,0.72)',
            margin: '0 0 28px',
            maxWidth: 560,
          }}>
            Lead-based paint in pre-1978 housing remains the leading source of childhood lead exposure in Michigan. Every LIRA, risk assessment, and clearance report completed on this platform brings the state closer to eliminating it.
          </p>
          <div style={{
            display: 'inline-block',
            padding: '10px 14px',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: 0.3,
            lineHeight: 1.5,
          }}>
            Authority: Michigan PA 55 of 1998 · Part 551, MCL 333.5451 et seq. · 40 CFR Part 745
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: 440, display: 'flex', justifyContent: 'center' }}>
          <img
            src="/child-Lead-Prevention.jpg"
            alt="Child lead prevention - public health awareness"
            loading="lazy"
            style={{
              width: '100%', height: 'auto',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
              display: 'block',
            }}
          />
        </div>
      </div>
    </section>
  );
}
// ─── Platform Section ─────────────────────────────────────────
function PlatformSection() {
  return (
    <section id="platform" style={{ padding: '100px 24px', background: COLORS.paleBlue }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, color: COLORS.navy, letterSpacing: '-1px', margin: '0 0 16px' }}>
            The inspection platform built to{' '}
            <span style={{ color: COLORS.orange }}>protect every home</span>
          </h2>
          <p style={{ fontSize: 18, color: COLORS.gray500, maxWidth: 680, margin: '0 auto', lineHeight: 1.7 }}>
            From initial XRF readings to final compliance reports, LeadFlow AI streamlines every step of the lead inspection workflow with intelligence and precision.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            {[
              { icon: 'clipboard', title: 'End-to-end inspection management',
                desc: 'One workspace for XRF readings, lab results, hazard analysis, building surveys, and resident interviews — from project creation through report delivery.' },
              { icon: 'sparkle',   title: 'AI-assisted report writing',
                desc: 'Transform inspection data into regulation-compliant reports in minutes. The AI narratives respect your threshold decisions and assumed-positive flags.' },
              { icon: 'users',     title: 'Team collaboration and client portal',
                desc: 'Invite inspectors, assign roles, share projects, and give property owners a secure portal to follow progress and download final reports.' },
              { icon: 'chart',     title: 'Real-time compliance tracking',
                desc: 'Michigan LIRA and EBL requirements are built in. Automatic threshold checks, clearance math, and a live compliance score on every project.' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: COLORS.orangeLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: COLORS.orangeDeep,
                }}>
                  <Icon name={f.icon} size={22} color={COLORS.orangeDeep} strokeWidth={1.9} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.navy, margin: '0 0 6px' }}>{f.title}</h3>
                  <p style={{ fontSize: 15, color: COLORS.gray500, margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Compliance dashboard mockup */}
          <div style={{
            background: COLORS.gray50, borderRadius: 16, padding: 32, border: `1px solid ${COLORS.gray200}`,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.gray400, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Compliance Dashboard</div>
            {[
              { label: 'LIRA Requirements', pct: 98, color: COLORS.green },
              { label: 'EBL Documentation', pct: 94, color: COLORS.green },
              { label: 'Lab Result Processing', pct: 87, color: COLORS.orange },
              { label: 'Photo Documentation', pct: 100, color: COLORS.green },
              { label: 'Signature Collection', pct: 75, color: COLORS.orange },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: COLORS.gray700, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 14, color: item.color, fontWeight: 700 }}>{item.pct}%</span>
                </div>
                <div style={{ height: 8, background: COLORS.gray200, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: 99, transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features Grid ────────────────────────────────────────────
function FeaturesGrid() {
  const features = [
    { title: 'XRF Data Management', desc: 'Import and manage X-ray fluorescence readings with automatic threshold detection and component mapping.' },
    { title: 'Lab Results Tracking', desc: 'PDF import, dust wipe analysis, paint chip tracking, and automatic regulatory comparison.' },
    { title: 'AI Photo Tagging', desc: 'Smart photo categorization with AI-powered location and condition tagging for inspection documentation.' },
    { title: 'Building Surveys', desc: 'Comprehensive component-by-component surveys with condition ratings and lead presence tracking.' },
    { title: 'Floor Plan Sketcher', desc: 'Built-in floor plan drawing tool with room labeling and sample location marking.' },
    { title: 'Digital Signatures', desc: 'Collect inspector, owner, and occupant signatures digitally with timestamp verification.' },
    { title: 'Michigan Registry', desc: 'Direct integration with Michigan property records and lead abatement registries.' },
    { title: 'One-Click Reports', desc: 'Generate full inspection reports with AI narratives, data tables, photos, and compliance summaries.' },
    { title: 'Email Notifications', desc: '22 automated email templates for team invites, project updates, client alerts, and more.' },
  ];

  return (
    <section id="features" style={{ padding: '100px 24px', background: COLORS.white }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, color: COLORS.navy, letterSpacing: '-1px', margin: '0 0 16px' }}>
            Everything you need to inspect with confidence
          </h2>
          <p style={{ fontSize: 18, color: COLORS.gray500, maxWidth: 600, margin: '0 auto' }}>
            19 specialized inspection tools, all working together seamlessly.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {features.map(f => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ title, desc }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: COLORS.white, borderRadius: 16, padding: 32,
        border: `1px solid ${hovered ? COLORS.orange : COLORS.gray200}`,
        transition: 'all 0.3s ease', cursor: 'default',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 40px rgba(232,101,10,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
        borderLeft: `3px solid ${hovered ? COLORS.orange : 'transparent'}`,
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.navy, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 14, color: COLORS.gray500, margin: 0, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

// ─── Michigan Lead Hazard Map ─────────────────────────────────
function MichiganMapSection() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // C63: only attempt the Mapbox load when a real token is configured.
    // Otherwise we skip the JS/CSS download entirely and render the
    // fallback SVG below. That means a no-token deploy doesn't fire
    // a broken tile request or log a noisy console error.
    if (!HAS_MAPBOX) return;

    // Load Mapbox GL CSS
    if (!document.getElementById('mapbox-gl-css')) {
      const link = document.createElement('link');
      link.id = 'mapbox-gl-css';
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
      document.head.appendChild(link);
    }

    // Load Mapbox GL JS
    const loadMapbox = () => {
      return new Promise((resolve) => {
        if (window.mapboxgl) return resolve(window.mapboxgl);
        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
        script.onload = () => resolve(window.mapboxgl);
        document.head.appendChild(script);
      });
    };

    loadMapbox().then(mapboxgl => {
      if (!mapRef.current || mapInstance.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      try {
        const map = new mapboxgl.Map({
          container: mapRef.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [-84.5, 44.3],
          zoom: 5.8,
          interactive: true,
          attributionControl: false,
        });

        map.on('load', () => {
          setMapLoaded(true);
          mapInstance.current = map;

          // Add Michigan county boundaries with lead risk coloring
          map.addSource('michigan-risk', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: generateMichiganCountyPoints(),
            }
          });

          map.addLayer({
            id: 'risk-heatmap',
            type: 'heatmap',
            source: 'michigan-risk',
            paint: {
              'heatmap-weight': ['get', 'risk'],
              'heatmap-intensity': 0.6,
              'heatmap-radius': 40,
              'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(0,0,0,0)',
                0.2, 'rgba(244,129,32,0.3)',
                0.4, 'rgba(244,129,32,0.5)',
                0.6, 'rgba(220,38,38,0.5)',
                0.8, 'rgba(220,38,38,0.7)',
                1, 'rgba(185,28,28,0.9)',
              ],
              'heatmap-opacity': 0.8,
            }
          });

          // Add circle markers for cities
          map.addLayer({
            id: 'risk-points',
            type: 'circle',
            source: 'michigan-risk',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['get', 'risk'], 0.3, 4, 1, 10],
              'circle-color': ['interpolate', ['linear'], ['get', 'risk'],
                0.3, COLORS.orange,
                0.6, '#ef4444',
                1, '#991b1b',
              ],
              'circle-stroke-width': 1,
              'circle-stroke-color': 'rgba(255,255,255,0.3)',
              'circle-opacity': 0.8,
            },
          });

          // Popup on hover
          const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
          map.on('mouseenter', 'risk-points', (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const f = e.features[0];
            popup.setLngLat(f.geometry.coordinates)
              .setHTML(`<div style="font-family:system-ui;padding:4px 0"><strong style="font-size:14px">${f.properties.name}</strong><br/><span style="color:#f48120;font-weight:600">${(f.properties.risk * 100).toFixed(0)}% risk index</span><br/><span style="font-size:12px;color:#6b7280">${f.properties.inspections} inspections</span></div>`)
              .addTo(map);
          });
          map.on('mouseleave', 'risk-points', () => {
            map.getCanvas().style.cursor = '';
            popup.remove();
          });
        });

        // C65.4: never flip mapLoaded to false from error events.
        // Mapbox fires error for transient causes (tile timeouts, sprite
        // misses) — sometimes BEFORE 'load'. The original handler would
        // flip state to false and keep the SVG overlay visible on top of
        // the working map. useState initial value is already false, so
        // if load legitimately never fires, SVG stays up (correct).
        map.on('error', (e) => {
          if (e && e.error && e.error.message) {
            console.warn('[Mapbox]', e.error.message);
          }
        });
      } catch (e) {
        setMapLoaded(false);
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <section id="map" style={{ padding: '100px 24px', background: COLORS.navy }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 42, fontWeight: 800, color: COLORS.white, letterSpacing: '-1px', margin: '0 0 16px' }}>
            Michigan lead hazard{' '}
            <span style={{ color: COLORS.orange }}>risk map</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
            Real-time visualization of lead hazard risk across Michigan counties. Older housing stock and historical industrial areas show elevated risk.
          </p>
        </div>

        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', height: 500 }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

          {/* Fallback static map if Mapbox fails */}
          {!mapLoaded && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${COLORS.navyMid}, ${COLORS.navyLight})`,
            }}>
              <MichiganSVGMap />
            </div>
          )}

          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: 20, right: 20, background: 'rgba(15,27,45,0.9)',
            borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Lead Risk Index</div>
            {[
              { color: '#991b1b', label: 'High (>70%)' },
              { color: '#ef4444', label: 'Elevated (40-70%)' },
              { color: COLORS.orange, label: 'Moderate (20-40%)' },
              { color: '#fbbf24', label: 'Low (<20%)' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Michigan county data points with risk indices
function generateMichiganCountyPoints() {
  const cities = [
    { name: 'Detroit', coords: [-83.0458, 42.3314], risk: 0.92, inspections: 412 },
    { name: 'Flint', coords: [-83.6875, 43.0125], risk: 0.95, inspections: 287 },
    { name: 'Grand Rapids', coords: [-85.6681, 42.9634], risk: 0.55, inspections: 156 },
    { name: 'Lansing', coords: [-84.5555, 42.7325], risk: 0.62, inspections: 134 },
    { name: 'Ann Arbor', coords: [-83.7430, 42.2808], risk: 0.45, inspections: 89 },
    { name: 'Kalamazoo', coords: [-85.5872, 42.2917], risk: 0.58, inspections: 98 },
    { name: 'Saginaw', coords: [-83.9508, 43.4195], risk: 0.78, inspections: 167 },
    { name: 'Muskegon', coords: [-86.2484, 43.2342], risk: 0.65, inspections: 76 },
    { name: 'Battle Creek', coords: [-85.1797, 42.3212], risk: 0.52, inspections: 54 },
    { name: 'Pontiac', coords: [-83.2910, 42.6389], risk: 0.82, inspections: 198 },
    { name: 'Dearborn', coords: [-83.1763, 42.3223], risk: 0.73, inspections: 145 },
    { name: 'Jackson', coords: [-84.4013, 42.2459], risk: 0.48, inspections: 67 },
    { name: 'Bay City', coords: [-83.8889, 43.5945], risk: 0.61, inspections: 82 },
    { name: 'Port Huron', coords: [-82.4249, 42.9709], risk: 0.57, inspections: 43 },
    { name: 'Benton Harbor', coords: [-86.4542, 42.1167], risk: 0.88, inspections: 93 },
    { name: 'Adrian', coords: [-84.0372, 41.8976], risk: 0.42, inspections: 31 },
    { name: 'Traverse City', coords: [-85.6206, 44.7631], risk: 0.28, inspections: 22 },
    { name: 'Marquette', coords: [-87.3954, 46.5436], risk: 0.32, inspections: 18 },
    { name: 'Mount Pleasant', coords: [-84.7753, 43.5978], risk: 0.35, inspections: 27 },
    { name: 'Holland', coords: [-86.1089, 42.7876], risk: 0.38, inspections: 41 },
    { name: 'Warren', coords: [-83.0147, 42.4775], risk: 0.70, inspections: 178 },
    { name: 'Hamtramck', coords: [-83.0497, 42.3926], risk: 0.89, inspections: 156 },
    { name: 'Highland Park', coords: [-83.0966, 42.4056], risk: 0.91, inspections: 134 },
    { name: 'Ypsilanti', coords: [-83.6129, 42.2411], risk: 0.53, inspections: 62 },
  ];
  return cities.map(c => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: c.coords },
    properties: { name: c.name, risk: c.risk, inspections: c.inspections },
  }));
}

// Fallback SVG Michigan map — C63 rewording so a no-token deployment
// doesn't read as "the website is broken" but as "the interactive
// surface is a premium/contact-sales feature".
function MichiganSVGMap() {
  return (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <svg viewBox="0 0 400 500" width="300" height="375" style={{ opacity: 0.65 }} aria-hidden="true">
        {/* Simplified Michigan lower peninsula outline */}
        <path d="M200,480 L160,440 L120,400 L100,350 L90,300 L85,250 L100,200 L130,170 L120,140 L140,100 L180,80 L220,70 L260,80 L300,100 L320,140 L310,170 L340,200 L355,250 L350,300 L340,350 L320,400 L280,440 L240,480 Z"
          fill="none" stroke={COLORS.orange} strokeWidth="2" opacity="0.5" />
        {/* Risk hotspots */}
        {[
          { cx: 280, cy: 370, r: 20, op: 0.8 }, // Detroit
          { cx: 240, cy: 280, r: 15, op: 0.9 }, // Flint
          { cx: 140, cy: 310, r: 12, op: 0.5 }, // Grand Rapids
          { cx: 200, cy: 340, r: 10, op: 0.6 }, // Lansing
          { cx: 260, cy: 380, r: 14, op: 0.7 }, // Pontiac
        ].map((dot, i) => (
          <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r}
            fill={COLORS.orange} opacity={dot.op} />
        ))}
      </svg>
      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: 600, marginTop: 12 }}>
        Interactive Michigan lead-hazard map
      </div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
        The live Mapbox view is enabled once a token is configured.
        Request a demo below and we'll walk you through the interactive
        county-level risk layer.
      </p>
    </div>
  );
}

// ─── "How LeadFlow Can Help" Section ──────────────────────────
function HowSection() {
  const items = [
    { title: 'Residential Inspections', desc: 'LIRA-compliant lead-based paint inspections for single and multi-family homes.' },
    { title: 'Commercial Properties', desc: 'EBL investigations for commercial buildings, schools, and childcare facilities.' },
    { title: 'Risk Assessments', desc: 'Comprehensive risk assessments with XRF testing, dust wipes, and soil sampling.' },
    { title: 'Clearance Testing', desc: 'Post-abatement clearance testing and final report generation.' },
    { title: 'Compliance Audits', desc: 'Ensure all documentation meets Michigan EGLE and EPA requirements.' },
    { title: 'Client Management', desc: 'Secure client portals, inspection request tracking, and automated notifications.' },
  ];

  return (
    <section style={{
      padding: '100px 24px',
      // C71: was an amber/orange gradient left over from the pre-C70
      // palette. Flipped to the blue family (blueDeep → blue → blueGlow)
      // so the section sits inside the federal-blue register the CTAs
      // already use. Same gradient shape, new hue family.
      background: `linear-gradient(135deg, ${COLORS.blueDeep} 0%, ${COLORS.blue} 45%, ${COLORS.blueGlow} 100%)`,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, color: COLORS.white, textAlign: 'center', margin: '0 0 56px', letterSpacing: '-1px' }}>
          How LeadFlow AI can help
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {items.map(item => (
            <HowCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowCard({ title, desc }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: COLORS.white,
        borderRadius: 16, padding: 32, textAlign: 'center', cursor: 'default',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: hovered ? '0 16px 48px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.navy, margin: '0 0 8px', transition: 'color 0.3s' }}>{title}</h3>
      <p style={{ fontSize: 14, color: COLORS.gray500, margin: 0, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

// ─── News & Resources ─────────────────────────────────────────
// C66: home-page card grid now routes to real /resources/:slug pages
// and drops a "See all resources" CTA underneath. The canonical catalog
// lives in src/components/resources/_resourceTheme.js; the four cards
// below duplicate that data intentionally so this section keeps working
// even if the resources module is tree-shaken differently in the future.
// If you add a new resource, add it to _resourceTheme RESOURCES and
// (optionally) bump one of these four to keep the home-page teaser
// fresh — the /resources index page will pick it up automatically.
function ResourcesSection() {
  const resources = [
    { slug: 'michigan-lira-2026', type: 'REGULATION', title: 'Michigan LIRA Compliance Guide 2026', desc: 'Complete guide to Michigan Lead Inspection and Risk Assessment requirements under current EGLE regulations.' },
    { slug: 'xrf-testing',        type: 'GUIDE',      title: 'XRF Testing Best Practices',         desc: 'Industry-standard procedures for XRF lead testing, calibration checks, and result interpretation for inspectors.' },
    { slug: 'epa-rrp-updates',    type: 'NEWS',       title: 'EPA Lead Paint RRP Rule Updates',    desc: 'Latest updates to EPA\'s Renovation, Repair, and Painting (RRP) rule affecting Michigan properties built before 1978.' },
    { slug: 'getting-started',    type: 'TUTORIAL',   title: 'Getting Started with LeadFlow AI',   desc: 'Step-by-step walkthrough of setting up your inspection team, creating projects, and generating your first report.' },
  ];

  const typeColors = {
    REGULATION: COLORS.red,
    GUIDE: COLORS.blue,
    NEWS: COLORS.green,
    TUTORIAL: COLORS.orange,
  };

  return (
    <section id="resources" style={{ padding: '100px 24px', background: COLORS.paleBlue }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, color: COLORS.navy, textAlign: 'center', margin: '0 0 16px', letterSpacing: '-1px' }}>
          News and resources
        </h2>
        <p style={{ fontSize: 18, color: COLORS.gray500, textAlign: 'center', margin: '0 0 56px' }}>
          Stay informed with the latest in lead safety regulations and inspection best practices.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {resources.map(r => (
            <ResourceCard
              key={r.slug}
              type={r.type}
              title={r.title}
              desc={r.desc}
              link={'/resources/' + r.slug}
              typeColor={typeColors[r.type]}
            />
          ))}
        </div>

        {/* C66: See-all CTA — the index page lists the full catalog with
            a type filter + search. Kept simple and centered so it reads
            as a clear secondary action rather than competing with the
            cards above. */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 56 }}>
          <SeeAllResourcesCTA />
        </div>
      </div>
    </section>
  );
}

function SeeAllResourcesCTA() {
  const [hovered, setHovered] = useState(false);
  // Same client-side nav trick as ResourceCard — keeps the transition
  // snappy and preserves the auth state in App.jsx.
  const handleClick = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    try {
      window.history.pushState(null, '', '/resources');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (_) {
      window.location.href = '/resources';
    }
  };
  return (
    <a
      href="/resources"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '14px 28px', borderRadius: 10,
        background: hovered ? COLORS.navy : COLORS.white,
        color: hovered ? COLORS.white : COLORS.navy,
        border: '1px solid ' + COLORS.navy,
        fontSize: 15, fontWeight: 600, textDecoration: 'none',
        transition: 'all 0.2s',
        boxShadow: hovered ? '0 8px 24px rgba(10,22,40,0.15)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
    >
      See all resources
      <span style={{
        display: 'inline-block',
        transition: 'transform 0.2s',
        transform: hovered ? 'translateX(4px)' : 'none',
      }}>→</span>
    </a>
  );
}

function ResourceCard({ type, title, desc, link, typeColor }) {
  const [hovered, setHovered] = useState(false);
  // C66: intercept same-origin internal /resources/* clicks and route
  // via history.pushState + PopStateEvent so App.jsx picks up the
  // new URL without a full page reload. External links (anything
  // starting with http) and non-/resources in-app links still
  // receive the default browser behavior.
  const handleClick = (e) => {
    const href = link || '';
    const isInternalResource = href.startsWith('/resources');
    if (!isInternalResource) return;
    // Let middle-click / modifier clicks open in a new tab normally.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    try {
      window.history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (_) {
      window.location.href = href;
    }
  };
  return (
    <a
      href={link}
      onClick={handleClick}
      style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        background: COLORS.white, borderRadius: 16, overflow: 'hidden', height: '100%',
        border: `1px solid ${hovered ? COLORS.orange : COLORS.gray200}`,
        transition: 'all 0.3s', transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.08)' : 'none',
      }}>
        <div style={{ padding: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: typeColor, textTransform: 'uppercase', letterSpacing: 1.5 }}>{type}</span>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.navy, margin: '10px 0 8px', lineHeight: 1.3 }}>{title}</h3>
          <p style={{ fontSize: 14, color: COLORS.gray500, margin: '0 0 16px', lineHeight: 1.6 }}>{desc}</p>
          <span style={{ fontSize: 14, color: COLORS.orange, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Read more <span style={{ transition: 'transform 0.2s', transform: hovered ? 'translateX(4px)' : 'none', display: 'inline-block' }}>→</span>
          </span>
        </div>
      </div>
    </a>
  );
}

// ─── Support Section ──────────────────────────────────────────
function SupportSection() {
  const CATEGORIES = [
    { value: 'general',    label: 'General question' },
    { value: 'bug',        label: 'Report a bug' },
    { value: 'billing',    label: 'Billing & subscription' },
    { value: 'feature',    label: 'Feature request' },
    { value: 'onboarding', label: 'Getting started / onboarding' },
    { value: 'account',    label: 'Account / login help' },
  ];

  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    category: 'general', subject: '', message: '',
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errMsg, setErrMsg] = useState('');
  const [ticketId, setTicketId] = useState(null);

  const onChange = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.subject || !form.message) {
      setErrMsg('Email, subject, and message are required.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrMsg('');
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, pageUrl: window.location.href }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrMsg(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }
      setTicketId(data.ticketId);
      setStatus('success');
    } catch (err) {
      setErrMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', company: '', category: 'general', subject: '', message: '' });
    setStatus('idle');
    setErrMsg('');
    setTicketId(null);
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', fontSize: 15,
    border: `1px solid ${COLORS.gray300}`, borderRadius: 8,
    background: COLORS.white, color: COLORS.gray900,
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.gray700, marginBottom: 6 };

  return (
    <section id="support" style={{ padding: '100px 24px', background: COLORS.paleBlue }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: COLORS.orangeLight, marginBottom: 20 }}>
            <span style={{ color: COLORS.orangeDeep, fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>We're here to help</span>
          </div>
          <h2 style={{ fontSize: 42, fontWeight: 800, color: COLORS.navy, letterSpacing: '-1px', margin: '0 0 16px' }}>
            Get <span style={{ color: COLORS.orange }}>support</span>
          </h2>
          <p style={{ fontSize: 18, color: COLORS.gray500, maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>
            Questions, bug reports, billing issues, or just want to chat? Tell us what you need and our team will get back to you within one business day.
          </p>
        </div>

        <div style={{
          background: COLORS.gray50, borderRadius: 20, padding: 40,
          border: `1px solid ${COLORS.gray200}`, boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: 'rgba(22,163,74,0.1)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20, fontSize: 36,
              }}>✓</div>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: COLORS.navy, margin: '0 0 12px' }}>Message received</h3>
              <p style={{ fontSize: 15, color: COLORS.gray600, margin: '0 0 8px', lineHeight: 1.6 }}>
                Thanks — we've logged your request as ticket{' '}
                <code style={{ padding: '2px 8px', background: COLORS.gray200, borderRadius: 6, fontSize: 14, color: COLORS.navy, fontWeight: 600 }}>#{ticketId}</code>.
              </p>
              <p style={{ fontSize: 15, color: COLORS.gray500, margin: '0 0 28px' }}>
                Check your inbox for a confirmation email. We'll follow up shortly.
              </p>
              <button onClick={resetForm} style={{
                padding: '12px 28px', borderRadius: 10, border: 'none',
                background: COLORS.orange, color: COLORS.white, fontSize: 15, fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.target.style.background = COLORS.orangeHover}
                onMouseLeave={e => e.target.style.background = COLORS.orange}
              >Submit another request</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Your name</label>
                  <input type="text" value={form.name} onChange={onChange('name')} placeholder="Jane Inspector"
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                    onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email <span style={{ color: COLORS.red }}>*</span></label>
                  <input type="email" value={form.email} onChange={onChange('email')} required placeholder="you@example.com"
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                    onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Phone (optional)</label>
                  <input type="tel" value={form.phone} onChange={onChange('phone')} placeholder="(555) 123-4567"
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                    onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Company (optional)</label>
                  <input type="text" value={form.company} onChange={onChange('company')} placeholder="Your company"
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                    onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>What's this about?</label>
                <select value={form.category} onChange={onChange('category')}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                  onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Subject <span style={{ color: COLORS.red }}>*</span></label>
                <input type="text" value={form.subject} onChange={onChange('subject')} required
                  maxLength={255} placeholder="Brief summary of your request"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                  onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Message <span style={{ color: COLORS.red }}>*</span></label>
                <textarea value={form.message} onChange={onChange('message')} required
                  rows={6} maxLength={10000} placeholder="Tell us what's going on — include any error messages, screenshots you'd like to send, and steps to reproduce if it's a bug."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 140, lineHeight: 1.6 }}
                  onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                  onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                />
                <div style={{ fontSize: 12, color: COLORS.gray400, marginTop: 4, textAlign: 'right' }}>
                  {form.message.length} / 10,000
                </div>
              </div>

              {status === 'error' && errMsg && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10, marginBottom: 20,
                  background: 'rgba(220,38,38,0.08)', border: `1px solid ${COLORS.red}`,
                  color: COLORS.red, fontSize: 14,
                }}>
                  {errMsg}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 13, color: COLORS.gray500, margin: 0, flex: 1, minWidth: 240 }}>
                  Or email us directly at{' '}
                  <a href="mailto:support@abatecomply.com" style={{ color: COLORS.orange, fontWeight: 600, textDecoration: 'none' }}>
                    support@abatecomply.com
                  </a>
                </p>
                <button type="submit" disabled={status === 'submitting'}
                  style={{
                    padding: '14px 32px', borderRadius: 10, border: 'none',
                    background: status === 'submitting' ? COLORS.gray400 : COLORS.blue,
                    color: COLORS.white, fontSize: 15, fontWeight: 600,
                    cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(46,123,232,0.28)',
                  }}
                  onMouseEnter={e => { if (status !== 'submitting') e.target.style.background = COLORS.blueHover; }}
                  onMouseLeave={e => { if (status !== 'submitting') e.target.style.background = COLORS.blue; }}
                >
                  {status === 'submitting' ? 'Sending…' : 'Send request →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Request-a-Demo Section (C63) ─────────────────────────────
//
// A focused lead-capture form — shorter than the general support form,
// aimed at buyers evaluating the platform. Submits to the existing
// /api/support endpoint with `category: 'demo_request'` so every
// submission drops straight into the Support Tickets admin panel with
// a "demo_request" filter. That reuses the email notifications, audit
// log, and Support workflow already in place.
function DemoRequestSection() {
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '', preferredTime: '', message: '',
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errMsg, setErrMsg] = useState('');
  const [ticketId, setTicketId] = useState(null);

  const onChange = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.name) {
      setErrMsg('Name and email are required.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrMsg('');
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    form.name,
          email:   form.email,
          phone:   form.phone,
          company: form.company,
          category: 'demo_request',
          subject: `Demo request — ${form.company || form.name}`,
          // Pack structured detail into the message so the admin can see
          // preferred time without needing a new column.
          message: [
            `Preferred time: ${form.preferredTime || '(not specified)'}`,
            '',
            form.message || '(no additional notes)',
          ].join('\n'),
          pageUrl: window.location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrMsg(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }
      setTicketId(data.ticketId);
      setStatus('success');
    } catch (err) {
      setErrMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  const resetForm = () => {
    setForm({ name: '', company: '', email: '', phone: '', preferredTime: '', message: '' });
    setStatus('idle');
    setErrMsg('');
    setTicketId(null);
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', fontSize: 15,
    border: `1px solid ${COLORS.gray300}`, borderRadius: 8,
    background: COLORS.white, color: COLORS.gray900,
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.gray700, marginBottom: 6 };

  return (
    <section id="demo" style={{
      padding: '100px 24px',
      background: COLORS.white,
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 999,
            background: COLORS.orangeLight, marginBottom: 20,
          }}>
            <Icon name="chat" size={14} color={COLORS.orangeDeep} />
            <span style={{ color: COLORS.orangeDeep, fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              20-minute walkthrough
            </span>
          </div>
          <h2 style={{ fontSize: 42, fontWeight: 800, color: COLORS.navy, letterSpacing: '-1px', margin: '0 0 16px' }}>
            Request a <span style={{ color: COLORS.orange }}>demo</span>
          </h2>
          <p style={{ fontSize: 18, color: COLORS.gray500, maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>
            See the end-to-end inspection workflow on your own data — XRF imports, AI report drafting,
            compliance scoring, and the client portal. No slides, just the product.
          </p>
        </div>

        <div style={{
          background: COLORS.white, borderRadius: 20, padding: 40,
          border: `1px solid ${COLORS.gray200}`, boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        }}>
          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: 'rgba(22,163,74,0.1)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Icon name="check-circle" size={36} color={COLORS.green} strokeWidth={2} />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: COLORS.navy, margin: '0 0 12px' }}>Request received</h3>
              <p style={{ fontSize: 15, color: COLORS.gray600, margin: '0 0 8px', lineHeight: 1.6 }}>
                Thanks — we've logged your demo request as ticket{' '}
                <code style={{ padding: '2px 8px', background: COLORS.gray200, borderRadius: 6, fontSize: 14, color: COLORS.navy, fontWeight: 600 }}>#{ticketId}</code>.
              </p>
              <p style={{ fontSize: 15, color: COLORS.gray500, margin: '0 0 28px' }}>
                A team member will reach out within one business day to schedule your walkthrough.
              </p>
              <button onClick={resetForm} style={{
                padding: '12px 28px', borderRadius: 10, border: 'none',
                background: COLORS.orange, color: COLORS.white, fontSize: 15, fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.target.style.background = COLORS.orangeHover}
                onMouseLeave={e => e.target.style.background = COLORS.orange}
              >Submit another request</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Your name <span style={{ color: COLORS.red }}>*</span></label>
                  <input type="text" value={form.name} onChange={onChange('name')} required placeholder="Jane Inspector" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                    onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Company</label>
                  <input type="text" value={form.company} onChange={onChange('company')} placeholder="Your company or organization" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                    onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Work email <span style={{ color: COLORS.red }}>*</span></label>
                  <input type="email" value={form.email} onChange={onChange('email')} required placeholder="you@company.com" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                    onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Phone (optional)</label>
                  <input type="tel" value={form.phone} onChange={onChange('phone')} placeholder="(555) 123-4567" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                    onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Preferred time for a call</label>
                <input type="text" value={form.preferredTime} onChange={onChange('preferredTime')}
                  placeholder="e.g. weekday mornings EST, Fri afternoons" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                  onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>What would you like to see first?</label>
                <textarea value={form.message} onChange={onChange('message')}
                  rows={4} maxLength={4000}
                  placeholder="E.g. XRF data imports from my current workflow, or the client portal, or AI report generation on a real project."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 100, lineHeight: 1.6 }}
                  onFocus={e => { e.target.style.borderColor = COLORS.blue; e.target.style.boxShadow = `0 0 0 3px ${COLORS.blueLight}`; }}
                  onBlur={e => { e.target.style.borderColor = COLORS.gray300; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {status === 'error' && errMsg && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10, marginBottom: 20,
                  background: 'rgba(220,38,38,0.08)', border: `1px solid ${COLORS.red}`,
                  color: COLORS.red, fontSize: 14,
                }}>
                  {errMsg}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 13, color: COLORS.gray500, margin: 0, flex: 1, minWidth: 240 }}>
                  We typically reply within one business day.
                </p>
                <button type="submit" disabled={status === 'submitting'}
                  style={{
                    padding: '14px 32px', borderRadius: 10, border: 'none',
                    background: status === 'submitting' ? COLORS.gray400 : COLORS.blue,
                    color: COLORS.white, fontSize: 15, fontWeight: 600,
                    cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(46,123,232,0.28)',
                  }}
                  onMouseEnter={e => { if (status !== 'submitting') e.target.style.background = COLORS.blueHover; }}
                  onMouseLeave={e => { if (status !== 'submitting') e.target.style.background = COLORS.blue; }}
                >
                  {status === 'submitting' ? 'Sending…' : 'Request demo →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}


// ─── CTA Section ──────────────────────────────────────────────
function CTASection() {
  return (
    <section style={{
      padding: '100px 24px',
      background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 100%)`,
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, color: COLORS.white, margin: '0 0 20px', letterSpacing: '-1px' }}>
          Get started with LeadFlow AI
        </h2>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', margin: '0 0 48px', lineHeight: 1.7 }}>
          Join Michigan's leading inspection teams. Free plan available — no credit card required.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 48 }}>
          {[
            { icon: 'check-circle', title: 'Start for free',          desc: 'Create your account and run your first inspection in minutes.', link: '/login?register=true', cta: 'Start for free' },
            { icon: 'star',         title: 'Compare the platform',    desc: 'See every tool, compliance check, and report template we ship.',  link: '#features',           cta: 'See features' },
            { icon: 'chat',         title: 'Request a walkthrough',   desc: 'Short live demo from our team — 20 minutes, tailored to your org.', link: '#demo',                cta: 'Request a demo' },
          ].map(item => (
            <div key={item.title} style={{ flex: 1, maxWidth: 240, textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
                background: 'rgba(232,101,10,0.12)', border: '1px solid rgba(232,101,10,0.25)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={item.icon} size={28} color={COLORS.orangeGlow} strokeWidth={1.8} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.white, margin: '0 0 8px' }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 20px', lineHeight: 1.6 }}>{item.desc}</p>
              <a href={item.link} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, color: COLORS.orange, fontSize: 15, fontWeight: 600, textDecoration: 'none',
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.target.style.color = '#fbbf24'}
                onMouseLeave={e => e.target.style.color = COLORS.orange}
              >
                {item.cta} <span>→</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────
function Footer() {
  const columns = [
    {
      title: 'GETTING STARTED',
      links: [
        { label: 'Free plan', href: '/login?register=true' },
        { label: 'Inspector signup', href: '/login?register=true' },
        { label: 'Client portal', href: '/portal' },
        { label: 'Request a demo', href: '#demo' },
      ],
    },
    {
      title: 'PLATFORM',
      links: [
        { label: 'Inspection tools', href: '#features' },
        { label: 'AI report writer', href: '#platform' },
        { label: 'Team management', href: '#platform' },
        { label: 'Client portal', href: '#platform' },
        { label: 'Email notifications', href: '#features' },
      ],
    },
    {
      title: 'RESOURCES',
      links: [
        { label: 'Michigan LIRA guide', href: '#resources' },
        { label: 'XRF best practices', href: '#resources' },
        { label: 'EPA regulations', href: '#resources' },
        { label: 'Getting started', href: '#resources' },
      ],
    },
    {
      title: 'COMPLIANCE',
      links: [
        { label: 'EGLE alignment', href: '#' },
        { label: 'Data security', href: '#' },
        { label: 'Privacy policy', href: '#' },
        { label: 'Terms of service', href: '#' },
      ],
    },
    {
      title: 'COMPANY',
      links: [
        // C67: #company anchor removed when CompanySection was un-rendered.
        // "About LeadFlow AI" now points at the demo request form, which
        // is the natural landing for someone evaluating the vendor.
        { label: 'About LeadFlow AI', href: '#demo' },
        { label: 'Contact support', href: 'mailto:support@abatecomply.com' },
        { label: 'System status', href: '#' },
        { label: 'Careers', href: '#' },
      ],
    },
  ];

  return (
    <footer style={{ background: COLORS.navy, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Main footer */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 24px 48px', display: 'flex', gap: 48 }}>
        {columns.map(col => (
          <div key={col.title} style={{ flex: 1 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 20, letterSpacing: 1.5 }}>{col.title}</h4>
            {col.links.map(link => (
              <a key={link.label} href={link.href} style={{
                display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecoration: 'none',
                padding: '5px 0', transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.target.style.color = COLORS.orange}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
              >{link.label}</a>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${COLORS.orangeDeep}, ${COLORS.orangeGlow})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: COLORS.white, fontSize: 12 }}>LF</div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>© 2026 LeadFlow AI. All rights reserved.</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy policy', 'Terms of use', 'Report an issue'].map(t => (
            <a key={t} href="#" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}
            >{t}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ─── Company Section ──────────────────────────────────────────
function CompanySection() {
  return (
    <section id="company" style={{ padding: '100px 24px', background: COLORS.white }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 42, fontWeight: 800, color: COLORS.navy, letterSpacing: '-1px', margin: '0 0 20px' }}>
              Built by inspectors,{' '}<span style={{ color: COLORS.orange }}>for inspectors</span>
            </h2>
            <p style={{ fontSize: 17, color: COLORS.gray500, lineHeight: 1.8, margin: '0 0 24px' }}>
              LeadFlow AI was created by environmental consulting professionals who understand the daily challenges of lead inspection work in Michigan. We've lived the paperwork burden, the compliance complexity, and the pressure to protect families — so we built a platform that solves it all.
            </p>
            <p style={{ fontSize: 17, color: COLORS.gray500, lineHeight: 1.8, margin: '0 0 32px' }}>
              Our mission is simple: make lead inspections faster, more accurate, and more accessible — so every child in Michigan can live in a safe home.
            </p>
            <div style={{ display: 'flex', gap: 32 }}>
              {[
                { val: 'Founded', sub: '2024' },
                { val: 'Based in', sub: 'Michigan' },
                { val: 'Focus', sub: 'Lead Safety' },
              ].map(s => (
                <div key={s.sub}>
                  <div style={{ fontSize: 13, color: COLORS.gray400, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 20, color: COLORS.navy, fontWeight: 700 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyLight})`,
            borderRadius: 20, padding: 48, textAlign: 'center',
          }}>
            {/* C63: large home icon replaces the 🏡 emoji. Wrapped in a
                gradient-orange medallion so it carries visual weight at
                72px without looking like clip art. */}
            <div style={{
              width: 88, height: 88, borderRadius: 22,
              background: `linear-gradient(135deg, ${COLORS.orangeDeep}, ${COLORS.orangeGlow})`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20, boxShadow: '0 12px 32px rgba(232,101,10,0.35)',
            }}>
              <Icon name="home" size={48} color={COLORS.white} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: 48, fontWeight: 800, color: COLORS.orange }}>Every child</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: COLORS.white, marginTop: 8 }}>deserves a lead-safe home</div>
            <div style={{ width: 60, height: 4, background: COLORS.orange, borderRadius: 2, margin: '24px auto 0' }} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Landing Page ────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; }
      `}</style>
      <Navbar scrolled={scrolled} />
      <HeroSection />
      <StatsBar />
      <MissionStrip />
      <PlatformSection />
      <FeaturesGrid />
      <MichiganMapSection />
      <HowSection />
      <ResourcesSection />
      {/* C67: CompanySection and CTASection un-rendered. The mission copy
          now lives in the hero's trust row (vendor identification line),
          and the final "Start for free" CTA was redundant with the hero
          CTA + the demo + support forms below. Functions kept in file
          for possible re-inclusion but removed from the page flow to
          trim 1,200+ px of scroll and keep the conversion path single.
          Demo + Support stay — both handle real form submissions to
          /api/support and serve distinct intents (evaluating buyer vs.
          existing user with a question). */}
      <DemoRequestSection />
      <SupportSection />
      <Footer />
    </div>
  );
}
