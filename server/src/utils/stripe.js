// ═══════════════════════════════════════════════════════════
// Stripe client wrapper — gated behind STRIPE_SECRET_KEY
//
// If the env var isn't set, isStripeEnabled() returns false and
// callers should degrade gracefully. Nothing Stripe-related will
// ever throw from a missing module or missing key — the rest of the
// app continues to work with admin-typed monthly_rate values as the
// source of truth.
// ═══════════════════════════════════════════════════════════

import Stripe from 'stripe';

let _client = null;
let _warnedMissingKey = false;

export function isStripeEnabled() {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function stripeClient() {
  if (!isStripeEnabled()) {
    if (!_warnedMissingKey) {
      console.warn('[billing] STRIPE_SECRET_KEY not set — billing features disabled.');
      _warnedMissingKey = true;
    }
    return null;
  }
  if (_client) return _client;
  _client = new Stripe(process.env.STRIPE_SECRET_KEY, {
    // Pinning the API version protects us from Stripe making breaking
    // changes to response shapes on their release schedule.
    apiVersion: '2024-12-18.acacia',
    typescript: false,
    telemetry: false,
    appInfo: {
      name: 'LeadFlow AI',
      version: '1.0.0',
      url: 'https://abatecomply.com',
    },
  });
  return _client;
}

export function webhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

// The URL Stripe redirects to after checkout. Defaults assume same-origin.
export function successUrl() {
  const base = process.env.APP_URL || 'https://abatecomply.com';
  return `${base}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
}
export function cancelUrl() {
  const base = process.env.APP_URL || 'https://abatecomply.com';
  return `${base}/billing?checkout=cancel`;
}
export function portalReturnUrl() {
  const base = process.env.APP_URL || 'https://abatecomply.com';
  return `${base}/billing`;
}
