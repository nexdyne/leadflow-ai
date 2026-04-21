// ═══════════════════════════════════════════════════════════
// BillingTab — customer-side subscription management
//
// Fetches the plan catalog + current subscription from the
// /api/billing endpoints (commit 28) and lets customers upgrade
// via Stripe Checkout or manage their existing subscription via
// the Stripe Customer Portal.
//
// Gracefully degrades when Stripe isn't configured:
//   - stripeEnabled=false → upgrade buttons disabled, banner shown
//   - canPurchase=false on a plan (e.g. Enterprise, Free) → buttons
//     swap to "Contact sales" or "Current free plan"
//
// Handles checkout redirect query params from Stripe:
//   ?checkout=success  → success banner + refetch subscription
//   ?checkout=cancel   → dismissible info banner
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '../api/apiConfig.js';

export default function BillingTab({ onBack }) {
  const [plans, setPlans] = useState([]);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionPlanId, setActionPlanId] = useState(null); // id of plan currently being checked-out
  const [portalLoading, setPortalLoading] = useState(false);
  const [banner, setBanner] = useState(null); // { tone: 'success'|'info'|'error', text: string }

  // Read ?checkout=success/cancel once on mount and strip from URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('checkout');
    if (c === 'success') {
      setBanner({ tone: 'success', text: 'Subscription activated. Thanks for upgrading — your plan will refresh below in a moment.' });
    } else if (c === 'cancel') {
      setBanner({ tone: 'info', text: 'Checkout was cancelled. Your current plan has not changed.' });
    }
    if (c) {
      // Clear the query param so refreshes don't re-show the banner.
      params.delete('checkout');
      params.delete('session_id');
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
      window.history.replaceState({}, '', url);
    }
  }, []);

  const load = useCallback(async () => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    try {
      const [plansRes, subRes] = await Promise.all([
        apiCall('GET', '/billing/plans'),
        apiCall('GET', '/billing/subscription').catch((e) => {
          // A 404 here means the user's account isn't linked to an org yet —
          // we still want to show the plan catalog so they can see what's available.
          if (e.status === 404) return { organization: null, subscription: null, recentInvoices: [] };
          throw e;
        }),
      ]);
      if (cancelled) return;
      setPlans(plansRes.plans || []);
      setStripeEnabled(!!plansRes.stripeEnabled);
      setOrganization(subRes.organization || null);
      setSubscription(subRes.subscription || null);
      setInvoices(subRes.recentInvoices || []);
    } catch (err) {
      if (!cancelled) setError(err.message || 'Failed to load billing info');
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { load(); }, [load]);

  // If we just came back from Stripe, the webhook may still be in flight.
  // Poll once after a short delay to pick up the new subscription.
  useEffect(() => {
    if (banner?.tone === 'success') {
      const t = setTimeout(() => load(), 4000);
      return () => clearTimeout(t);
    }
  }, [banner, load]);

  const handleUpgrade = async (plan) => {
    if (!plan.canPurchase || actionPlanId) return;
    setActionPlanId(plan.id);
    setError(null);
    try {
      const res = await apiCall('POST', '/billing/checkout', { planId: plan.id });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        setError('Checkout session did not return a redirect URL.');
        setActionPlanId(null);
      }
    } catch (err) {
      setError(err.message || 'Could not start checkout');
      setActionPlanId(null);
    }
  };

  const handleManageBilling = async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    setError(null);
    try {
      const res = await apiCall('POST', '/billing/portal', {});
      if (res?.url) {
        window.location.href = res.url;
      } else {
        setError('Billing portal did not return a redirect URL.');
      }
    } catch (err) {
      setError(err.message || 'Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlanKey = subscription?.plan_key || organization?.subscription_plan || 'free';

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c', margin: 0 }}>Billing & Subscription</h2>
          <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>
            Manage your LeadFlow AI plan, billing method, and invoice history.
          </div>
        </div>
        {onBack && (
          <button onClick={onBack} style={btnSecondary}>Back to Dashboard</button>
        )}
      </div>

      {/* Banner (success / cancel / error) */}
      {banner && (
        <div style={{
          padding: '10px 14px', borderRadius: '6px', marginBottom: '14px',
          background: banner.tone === 'success' ? '#c6f6d5' : banner.tone === 'error' ? '#fed7d7' : '#bee3f8',
          color: banner.tone === 'success' ? '#276749' : banner.tone === 'error' ? '#c53030' : '#2b6cb0',
          fontSize: '13px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: '6px', marginBottom: '14px',
          background: '#fed7d7', color: '#c53030', fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>Loading billing info...</div>
      )}

      {!loading && !stripeEnabled && (
        <div style={{
          padding: '14px 18px', borderRadius: '8px', marginBottom: '20px',
          background: '#fffaf0', border: '1px solid #f6ad55', color: '#7b341e', fontSize: '13px',
        }}>
          <div style={{ fontWeight: '700', marginBottom: '4px' }}>Self-serve upgrades are not yet enabled.</div>
          Your current plan is managed directly by LeadFlow. To change plans or update billing,
          contact <a href="mailto:billing@abatecomply.com" style={{ color: '#c05621', fontWeight: '600' }}>billing@abatecomply.com</a>.
        </div>
      )}

      {/* Current plan summary */}
      {!loading && organization && (
        <div style={{
          padding: '16px 20px', borderRadius: '8px', marginBottom: '24px',
          background: '#fff', border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                Current Plan
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#1a202c', marginTop: '4px' }}>
                {subscription?.plan_name || titleCasePlan(currentPlanKey)}
                {subscription?.status && (
                  <StatusBadge status={subscription.status} />
                )}
                {!subscription && organization?.subscription_status && (
                  <StatusBadge status={organization.subscription_status} />
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '6px' }}>
                {organization.name}
                {organization.billing_email && (
                  <span style={{ color: '#718096' }}> · Billing email: {organization.billing_email}</span>
                )}
              </div>
              {subscription?.current_period_end && (
                <div style={{ fontSize: '12px', color: '#718096', marginTop: '6px' }}>
                  {subscription.cancel_at_period_end
                    ? `Cancels on ${fmtDate(subscription.current_period_end)}`
                    : `Renews on ${fmtDate(subscription.current_period_end)}`}
                </div>
              )}
              {!subscription && organization.monthly_rate > 0 && (
                <div style={{ fontSize: '12px', color: '#718096', marginTop: '6px' }}>
                  Admin-managed rate: ${Number(organization.monthly_rate).toFixed(2)}/mo
                </div>
              )}
              {!subscription && organization.trial_ends_at && (
                <div style={{ fontSize: '12px', color: '#c05621', marginTop: '6px', fontWeight: '600' }}>
                  Trial ends {fmtDate(organization.trial_ends_at)}
                </div>
              )}
            </div>
            {stripeEnabled && organization.stripe_customer_id && (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                style={{ ...btnSecondary, opacity: portalLoading ? 0.6 : 1 }}
              >
                {portalLoading ? 'Opening...' : 'Manage billing & invoices'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plan grid */}
      {!loading && plans.length > 0 && (
        <>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748', marginBottom: '12px' }}>
            {stripeEnabled ? 'Available plans' : 'Plan catalog'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={plan.key === currentPlanKey || plan.planTier === currentPlanKey}
                onUpgrade={() => handleUpgrade(plan)}
                busy={actionPlanId === plan.id}
                disabled={!!actionPlanId && actionPlanId !== plan.id}
              />
            ))}
          </div>
        </>
      )}

      {/* Invoice history */}
      {!loading && invoices.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2d3748', marginBottom: '12px' }}>
            Recent invoices
          </h3>
          <div style={{ overflow: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: '#f7fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Invoice</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={tdStyle}>{fmtDate(inv.invoice_date)}</td>
                    <td style={tdStyle}>{inv.number || inv.stripe_invoice_id?.slice(-8) || '—'}</td>
                    <td style={tdStyle}>
                      ${(((inv.status === 'paid' ? inv.amount_paid_cents : inv.amount_due_cents) || 0) / 100).toFixed(2)}
                      {inv.currency && inv.currency !== 'usd' && (
                        <span style={{ color: '#718096', marginLeft: '4px' }}>{String(inv.currency).toUpperCase()}</span>
                      )}
                    </td>
                    <td style={tdStyle}><StatusBadge status={inv.status} /></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {inv.hosted_invoice_url && (
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" style={{ color: '#2b6cb0', fontSize: '12px', marginRight: '10px' }}>View</a>
                      )}
                      {inv.invoice_pdf_url && (
                        <a href={inv.invoice_pdf_url} target="_blank" rel="noreferrer" style={{ color: '#2b6cb0', fontSize: '12px' }}>PDF</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Plan card ───────────────────────────────────────────────

function PlanCard({ plan, isCurrent, onUpgrade, busy, disabled }) {
  const price = plan.amountCents > 0
    ? `$${(plan.amountCents / 100).toFixed(0)}`
    : plan.planTier === 'enterprise' ? 'Custom' : 'Free';
  const interval = plan.amountCents > 0 ? `/${plan.billingInterval === 'year' ? 'yr' : 'mo'}` : '';

  return (
    <div style={{
      padding: '20px',
      borderRadius: '10px',
      border: isCurrent ? '2px solid #38a169' : '1px solid #e2e8f0',
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a202c' }}>{plan.displayName}</div>
        {isCurrent && (
          <span style={{ fontSize: '10px', background: '#38a169', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: '700', letterSpacing: '0.5px' }}>
            CURRENT
          </span>
        )}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#2d3748', marginTop: '8px' }}>
        {price}<span style={{ fontSize: '13px', fontWeight: '500', color: '#718096' }}>{interval}</span>
      </div>
      {plan.description && (
        <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '6px', minHeight: '32px' }}>
          {plan.description}
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0', flex: 1 }}>
        {(plan.features || []).map((f, i) => (
          <li key={i} style={{ fontSize: '12px', color: '#4a5568', padding: '3px 0', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
            <span style={{ color: '#38a169', fontWeight: '700' }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {isCurrent ? (
        <button disabled style={{ ...btnSecondary, cursor: 'default', opacity: 0.7 }}>
          Current plan
        </button>
      ) : plan.canPurchase ? (
        <button
          onClick={onUpgrade}
          disabled={busy || disabled}
          style={{
            ...btnPrimary,
            opacity: (busy || disabled) ? 0.6 : 1,
            cursor: (busy || disabled) ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Redirecting...' : `Upgrade to ${plan.displayName}`}
        </button>
      ) : plan.planTier === 'enterprise' ? (
        <a
          href="mailto:sales@abatecomply.com?subject=LeadFlow%20Enterprise%20Inquiry"
          style={{ ...btnPrimary, background: '#2c5282', textDecoration: 'none', textAlign: 'center' }}
        >
          Contact sales
        </a>
      ) : (
        <button disabled style={{ ...btnSecondary, cursor: 'not-allowed', opacity: 0.6 }}>
          {plan.amountCents === 0 ? 'Included' : 'Not available'}
        </button>
      )}
    </div>
  );
}

// ─── Small helpers ───────────────────────────────────────────

function StatusBadge({ status }) {
  if (!status) return null;
  const tone = statusTone(status);
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '10px',
      fontWeight: '700',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      padding: '2px 8px',
      borderRadius: '10px',
      marginLeft: '10px',
      verticalAlign: '2px',
      ...tone,
    }}>
      {String(status).replace(/_/g, ' ')}
    </span>
  );
}

function statusTone(status) {
  const s = String(status).toLowerCase();
  if (s === 'active' || s === 'paid' || s === 'trialing') return { background: '#c6f6d5', color: '#276749' };
  if (s === 'past_due' || s === 'unpaid' || s === 'open') return { background: '#fefcbf', color: '#744210' };
  if (s === 'canceled' || s === 'ended' || s === 'uncollectible' || s === 'void') return { background: '#fed7d7', color: '#c53030' };
  if (s === 'incomplete' || s === 'incomplete_expired') return { background: '#e2e8f0', color: '#4a5568' };
  return { background: '#edf2f7', color: '#4a5568' };
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(d);
  }
}

function titleCasePlan(key) {
  if (!key) return 'Free';
  return key.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── Styles (match ProjectDashboard palette) ─────────────────

const btnPrimary = {
  padding: '8px 14px', background: '#38a169', color: '#fff', border: 'none',
  borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
};
const btnSecondary = {
  padding: '8px 14px', background: '#edf2f7', color: '#2d3748', border: '1px solid #e2e8f0',
  borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
};
const thStyle = {
  textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: '700',
  color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px',
};
const tdStyle = {
  padding: '10px 14px', fontSize: '13px', color: '#2d3748',
};
