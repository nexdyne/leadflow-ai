import React, { useState, useEffect, useRef } from 'react';

// âââ Constants ââââââââââââââââââââââââââââââââââââââââââââââââ
const COLORS = {
  navy: '#0a1628',
  navyLight: '#162440',
  navyMid: '#0f1d35',
  orange: '#e8650a',
  orangeDeep: '#d45800',
  orangeHover: '#c44d00',
  orangeLight: '#fef0e4',
  orangeGlow: '#ff8c33',
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
  green: '#16a34a',
  blue: '#2563eb',
};

const APP_URL = window.location.origin;

// âââ Navigation âââââââââââââââââââââââââââââââââââââââââââââââ
function Navbar({ scrolled }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Platform', href: '#platform' },
    { label: 'Features', href: '#features' },
    { label: 'Lead Map', href: '#map' },
    { label: 'Resources', href: '#resources' },
    { label: 'Company', href: '#company' },
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
          <a href="/login?register=true" style={{ color: COLORS.white, textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '8px 24px', borderRadius: 8, background: COLORS.orange, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.target.style.background = COLORS.orangeHover; e.target.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.target.style.background = COLORS.orange; e.target.style.transform = 'translateY(0)'; }}
          >Start for free</a>
        </div>
      </div>
    </nav>
  );
}

// âââ Hero Section âââââââââââââââââââââââââââââââââââââââââââââ
function HeroSection() {
  return (
    <section style={{
      background: `linear-gradient(160deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 45%, ${COLORS.navyLight} 100%)`,
      minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden',
      paddingTop: 72,
    }}>
      {/* Animated gradient orb */}
      <div style={{
        position: 'absolute', right: '-10%', top: '10%', width: '60%', height: '80%',
        background: `radial-gradient(ellipse at center, rgba(232,101,10,0.2) 0%, rgba(255,140,51,0.08) 40%, transparent 70%)`,
        borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      {/* Grid pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
        backgroundSize: '60px 60px', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px', display: 'flex', alignItems: 'center', gap: 80, position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, maxWidth: 640 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(244,129,32,0.12)', border: '1px solid rgba(244,129,32,0.25)', marginBottom: 24 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.green, animation: 'pulse 2s infinite' }} />
            <span style={{ color: COLORS.orange, fontSize: 13, fontWeight: 600 }}>Michigan LIRA & EBL Compliant</span>
          </div>

          <h1 style={{ fontSize: 56, fontWeight: 800, color: COLORS.white, lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-1.5px' }}>
            Inspect, report, and protect{' '}
            <span style={{ color: COLORS.orange }}>communities</span>
          </h1>

          <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: '0 0 40px', maxWidth: 520 }}>
            The all-in-one lead inspection platform for Michigan inspectors. AI-powered reports, XRF data management, real-time compliance tracking, and client portals â built for the professionals who keep families safe.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <a href="/login?register=true" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 10,
              background: COLORS.orange, color: COLORS.white, fontSize: 16, fontWeight: 600, textDecoration: 'none',
              transition: 'all 0.25s ease', boxShadow: '0 4px 24px rgba(232,101,10,0.4)',
            }}
              onMouseEnter={e => { e.target.style.background = COLORS.orangeHover; e.target.style.boxShadow = '0 8px 36px rgba(232,101,10,0.55)'; e.target.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.target.style.background = COLORS.orange; e.target.style.boxShadow = '0 4px 24px rgba(232,101,10,0.4)'; e.target.style.transform = 'translateY(0)'; }}
            >
              Start for free â
            </a>
            <a href="#platform" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 10,
              background: 'transparent', color: COLORS.white, fontSize: 16, fontWeight: 500, textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.25)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.borderColor = 'rgba(255,255,255,0.4)'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(255,255,255,0.25)'; }}
            >
              See the platform
            </a>
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 48 }}>
            {[
              { icon: 'ðï¸', text: 'Michigan EGLE Aligned' },
              { icon: 'ð', text: 'SOC 2 Ready' },
              { icon: 'â¡', text: 'AI-Powered Reports' },
            ].map(b => (
              <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{b.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500 }}>{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual â App mockup */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <div style={{
            width: 520, height: 380, borderRadius: 16, overflow: 'hidden',
            background: `linear-gradient(135deg, ${COLORS.navyMid}, ${COLORS.navyLight})`,
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            position: 'relative',
          }}>
            {/* Browser chrome */}
            <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#ff5f56', '#ffbd2e', '#27c93f'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>
                abatecomply.com/dashboard
              </div>
            </div>
            {/* Dashboard mockup content */}
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Active Projects', val: '24', color: COLORS.blue },
                  { label: 'This Month', val: '8', color: COLORS.green },
                  { label: 'Pending Review', val: '3', color: COLORS.orange },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '14px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
              {/* Mock project rows */}
              {['123 Main St â XRF Complete', '456 Oak Ave â Pending Lab', '789 Pine St â Report Ready'].map((t, i) => (
                <div key={t} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 6,
                  background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{t}</span>
                  <span style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 99,
                    background: i === 0 ? 'rgba(22,163,106,0.15)' : i === 1 ? 'rgba(244,129,32,0.15)' : 'rgba(37,99,235,0.15)',
                    color: i === 0 ? COLORS.green : i === 1 ? COLORS.orange : COLORS.blue,
                  }}>{i === 0 ? 'Complete' : i === 1 ? 'Pending' : 'Ready'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// âââ Stats Bar ââââââââââââââââââââââââââââââââââââââââââââââââ
function StatsBar() {
  const stats = [
    { value: '2,400+', label: 'Inspections completed' },
    { value: '99.8%', label: 'Compliance accuracy' },
    { value: '75%', label: 'Time saved per report' },
    { value: '83', label: 'Michigan counties covered' },
  ];

  return (
    <section style={{ background: `linear-gradient(135deg, ${COLORS.orangeDeep} 0%, ${COLORS.orange} 50%, ${COLORS.orangeGlow} 100%)`, padding: '0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex' }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{
            flex: 1, padding: '36px 24px', textAlign: 'center',
            borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
          }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.white, letterSpacing: '-1px' }}>{s.value}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// âââ Platform Section âââââââââââââââââââââââââââââââââââââââââ
function PlatformSection() {
  return (
    <section id="platform" style={{ padding: '100px 24px', background: COLORS.white }}>
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
              { icon: 'ð', title: 'End-to-End Inspection Management', desc: 'Manage projects from creation through report delivery. Track XRF readings, lab results, hazard analysis, building surveys, and resident interviews in one place.' },
              { icon: 'ð¤', title: 'AI-Powered Report Generation', desc: 'Our natural language generation engine transforms your inspection data into comprehensive, regulation-compliant reports in minutes, not hours.' },
              { icon: 'ð¥', title: 'Team Collaboration & Client Portal', desc: 'Invite inspectors, assign roles, share projects, and give clients secure portal access to track their inspection progress in real time.' },
              { icon: 'ð', title: 'Real-Time Compliance Tracking', desc: 'Michigan LIRA and EBL regulatory requirements are built into every workflow. Automatic threshold checks, assumed positive tracking, and compliance scoring.' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: COLORS.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
                }}>
                  {f.icon}
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

// âââ Features Grid ââââââââââââââââââââââââââââââââââââââââââââ
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
    <section id="features" style={{ padding: '100px 24px', background: COLORS.gray50 }}>
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

// âââ Michigan Lead Hazard Map âââââââââââââââââââââââââââââââââ
function MichiganMapSection() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
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

      // Using a public-style token for demo display purposes
      mapboxgl.accessToken = 'pk.eyJ1IjoibGVhZGZsb3dhaWRlbW8iLCJhIjoiY200N2VhMjM0MDE0NjJwcHUxdGxzM3J3bSJ9.placeholder';

      // Fallback: if Mapbox token is invalid, render a static SVG map instead
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

        map.on('error', () => {
          setMapLoaded(false);
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

// Fallback SVG Michigan map
function MichiganSVGMap() {
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 400 500" width="300" height="375" style={{ opacity: 0.6 }}>
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
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 16 }}>Interactive map requires Mapbox API key</p>
    </div>
  );
}

// âââ "How LeadFlow Can Help" Section ââââââââââââââââââââââââââ
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
      background: `linear-gradient(135deg, ${COLORS.orangeDeep} 0%, ${COLORS.orange} 40%, ${COLORS.orangeGlow} 100%)`,
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

// âââ News & Resources âââââââââââââââââââââââââââââââââââââââââ
function ResourcesSection() {
  const resources = [
    { type: 'REGULATION', title: 'Michigan LIRA Compliance Guide 2026', desc: 'Complete guide to Michigan Lead Inspection and Risk Assessment requirements under current EGLE regulations.', link: '#' },
    { type: 'GUIDE', title: 'XRF Testing Best Practices', desc: 'Industry-standard procedures for XRF lead testing, calibration checks, and result interpretation for inspectors.', link: '#' },
    { type: 'NEWS', title: 'EPA Lead Paint RRP Rule Updates', desc: 'Latest updates to EPA\'s Renovation, Repair, and Painting (RRP) rule affecting Michigan properties built before 1978.', link: '#' },
    { type: 'TUTORIAL', title: 'Getting Started with LeadFlow AI', desc: 'Step-by-step walkthrough of setting up your inspection team, creating projects, and generating your first report.', link: '#' },
  ];

  const typeColors = {
    REGULATION: COLORS.red,
    GUIDE: COLORS.blue,
    NEWS: COLORS.green,
    TUTORIAL: COLORS.orange,
  };

  return (
    <section id="resources" style={{ padding: '100px 24px', background: COLORS.gray50 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, color: COLORS.navy, textAlign: 'center', margin: '0 0 16px', letterSpacing: '-1px' }}>
          News and resources
        </h2>
        <p style={{ fontSize: 18, color: COLORS.gray500, textAlign: 'center', margin: '0 0 56px' }}>
          Stay informed with the latest in lead safety regulations and inspection best practices.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {resources.map(r => (
            <ResourceCard key={r.title} {...r} typeColor={typeColors[r.type]} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ResourceCard({ type, title, desc, link, typeColor }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a href={link} style={{ textDecoration: 'none' }}
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
            Read more <span style={{ transition: 'transform 0.2s', transform: hovered ? 'translateX(4px)' : 'none', display: 'inline-block' }}>â</span>
          </span>
        </div>
      </div>
    </a>
  );
}

// âââ CTA Section ââââââââââââââââââââââââââââââââââââââââââââââ
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
          Join Michigan's leading inspection teams. Free plan available â no credit card required.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 48 }}>
          {[
            { icon: 'â', title: 'Get started for free', desc: 'Create your account and start inspecting in minutes.', link: '/login?register=true', cta: 'Start for free' },
            { icon: 'â¨', title: 'Need help choosing?', desc: 'Compare plans and features to find your perfect fit.', link: '#features', cta: 'See features' },
            { icon: 'ð¬', title: 'Talk to our team', desc: 'Have questions? Our support team is ready to help.', link: 'mailto:support@leadflow.dev', cta: 'Contact us' },
          ].map(item => (
            <div key={item.title} style={{ flex: 1, maxWidth: 240, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.white, margin: '0 0 8px' }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 20px', lineHeight: 1.6 }}>{item.desc}</p>
              <a href={item.link} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, color: COLORS.orange, fontSize: 15, fontWeight: 600, textDecoration: 'none',
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.target.style.color = '#fbbf24'}
                onMouseLeave={e => e.target.style.color = COLORS.orange}
              >
                {item.cta} <span>â</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// âââ Footer âââââââââââââââââââââââââââââââââââââââââââââââââââ
function Footer() {
  const columns = [
    {
      title: 'GETTING STARTED',
      links: [
        { label: 'Free plan', href: '/login?register=true' },
        { label: 'Inspector signup', href: '/login?register=true' },
        { label: 'Client portal', href: '/portal' },
        { label: 'Request a demo', href: 'mailto:support@leadflow.dev' },
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
        { label: 'About LeadFlow AI', href: '#company' },
        { label: 'Contact support', href: 'mailto:support@leadflow.dev' },
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
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Â© 2026 LeadFlow AI. All rights reserved.</span>
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

// âââ Company Section ââââââââââââââââââââââââââââââââââââââââââ
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
              LeadFlow AI was created by environmental consulting professionals who understand the daily challenges of lead inspection work in Michigan. We've lived the paperwork burden, the compliance complexity, and the pressure to protect families â so we built a platform that solves it all.
            </p>
            <p style={{ fontSize: 17, color: COLORS.gray500, lineHeight: 1.8, margin: '0 0 32px' }}>
              Our mission is simple: make lead inspections faster, more accurate, and more accessible â so every child in Michigan can live in a safe home.
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
            <div style={{ fontSize: 72, marginBottom: 20 }}>ð¡</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: COLORS.orange }}>Every child</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: COLORS.white, marginTop: 8 }}>deserves a lead-safe home</div>
            <div style={{ width: 60, height: 4, background: COLORS.orange, borderRadius: 2, margin: '24px auto 0' }} />
          </div>
        </div>
      </div>
    </section>
  );
}

// âââ Main Landing Page ââââââââââââââââââââââââââââââââââââââââ
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
      <PlatformSection />
      <FeaturesGrid />
      <MichiganMapSection />
      <HowSection />
      <ResourcesSection />
      <CompanySection />
      <CTASection />
      <Footer />
    </div>
  );
}
