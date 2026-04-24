import React from 'react';
import ResourcesIndexPage from './ResourcesIndexPage';
import MichiganLIRAGuide from './MichiganLIRAGuide';
import XRFTestingGuide from './XRFTestingGuide';
import EPARRPUpdates from './EPARRPUpdates';
import GettingStartedTutorial from './GettingStartedTutorial';
import { COLORS, RESOURCE_BY_SLUG } from './_resourceTheme';

// Small router for the /resources surface. App.jsx hands us a slug
// (null for the index, a string for a specific page). Keeps App.jsx
// from having to know about each individual page file — when a new
// resource lands, we register it here and in _resourceTheme.js only.
const PAGE_BY_SLUG = {
  'michigan-lira-2026': MichiganLIRAGuide,
  'xrf-testing': XRFTestingGuide,
  'epa-rrp-updates': EPARRPUpdates,
  'getting-started': GettingStartedTutorial,
};

export default function ResourceRouter({ slug }) {
  // Null / empty slug → render the index.
  if (!slug) return <ResourcesIndexPage />;

  const Page = PAGE_BY_SLUG[slug];
  if (!Page) {
    // Unknown slug — friendly dark 404 that stays on brand rather than
    // falling back to the browser's default error page. Offers a link
    // back to the index.
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 100%)`,
        color: COLORS.white,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.orangeGlow, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
            404 · Resource not found
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-1px' }}>
            That resource isn't here.
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: '0 0 28px' }}>
            The URL may be out of date, or the page may have been renamed. Head back to the index and you'll
            find everything we've published.
          </p>
          <a
            href="/resources"
            onClick={(e) => {
              e.preventDefault();
              try {
                window.history.pushState(null, '', '/resources');
                window.dispatchEvent(new PopStateEvent('popstate'));
              } catch (_) { window.location.href = '/resources'; }
            }}
            style={{
              display: 'inline-block',
              padding: '12px 24px', borderRadius: 10,
              background: COLORS.orange, color: COLORS.white,
              fontSize: 15, fontWeight: 600, textDecoration: 'none',
            }}
          >Back to all resources</a>
        </div>
      </div>
    );
  }

  return <Page />;
}

// Small helper the App-level routing can use to tell whether a slug
// is registered. Not required, but nice for unit tests.
export function isKnownResourceSlug(slug) {
  return Boolean(RESOURCE_BY_SLUG[slug]) && Boolean(PAGE_BY_SLUG[slug]);
}
