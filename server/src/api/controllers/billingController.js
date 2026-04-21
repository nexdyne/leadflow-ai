// ═══════════════════════════════════════════════════════════
// Billing controller — Stripe-backed subscription management
//
// Every endpoint checks isStripeEnabled() first. When Stripe is not
// configured:
//   - Public plan listing still works (reads from billing_plans table)
//   - Checkout + portal + current-subscription all return 503
//   - The webhook endpoint 501s if hit
//
// This lets the frontend render the upgrade UI in a disabled state
// while LeadFlow runs on admin-typed billing, then light up automatically
// when the env vars are set.
// ═══════════════════════════════════════════════════════════

import { query, withTransaction } from '../../db/connection.js';
import { stripeClient, isStripeEnabled, webhookSecret, successUrl, cancelUrl, portalReturnUrl } from '../../utils/stripe.js';

// ─── Helpers ────────────────────────────────────────────

async function auditLog(actorId, actorEmail, action, targetType, targetId, details = {}) {
  try {
    await query(
      `INSERT INTO audit_logs (actor_id, actor_email, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorId, actorEmail, action, targetType, targetId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// Map Stripe subscription status to our organizations.subscription_status
function orgStatusFromStripe(stripeStatus) {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    case 'incomplete':
      return 'pending';
    default:
      return stripeStatus || 'active';
  }
}

// Find our local plan row from a Stripe price_id
async function findPlanByPriceId(priceId) {
  if (!priceId) return null;
  const r = await query('SELECT id, plan_tier, key FROM billing_plans WHERE stripe_price_id = $1 LIMIT 1', [priceId]);
  return r.rows[0] || null;
}

// ═══════════════════════════════════════════════════════════
//  PUBLIC — list plans (used by upgrade UI, always available)
// ═══════════════════════════════════════════════════════════

export async function listPlans(req, res) {
  try {
    const r = await query(
      `SELECT id, key, display_name, description, plan_tier, stripe_price_id,
              billing_interval, amount_cents, currency, max_users, max_projects,
              features, sort_order
       FROM billing_plans
       WHERE is_public = true AND active = true
       ORDER BY sort_order ASC, amount_cents ASC`
    );
    res.json({
      stripeEnabled: isStripeEnabled(),
      plans: r.rows.map((p) => ({
        id: p.id,
        key: p.key,
        displayName: p.display_name,
        description: p.description,
        planTier: p.plan_tier,
        billingInterval: p.billing_interval,
        amountCents: p.amount_cents,
        currency: p.currency,
        maxUsers: p.max_users,
        maxProjects: p.max_projects,
        features: p.features,
        // Plan can only be selected via Stripe Checkout if it has a price ID
        // AND stripe is enabled. Otherwise the UI should show "contact us"
        // or disable the button.
        canPurchase: isStripeEnabled() && !!p.stripe_price_id,
      })),
    });
  } catch (err) {
    console.error('listPlans error:', err.message);
    res.status(500).json({ error: 'Failed to load plans' });
  }
}

// ═══════════════════════════════════════════════════════════
//  AUTHED — current org subscription status
// ═══════════════════════════════════════════════════════════

export async function getCurrentSubscription(req, res) {
  try {
    const userRow = await query('SELECT organization_id FROM users WHERE id = $1', [req.user.userId]);
    const orgId = userRow.rows[0]?.organization_id;
    if (!orgId) return res.status(404).json({ error: 'No organization linked to your account' });

    const [orgResult, subResult, invoicesResult] = await Promise.all([
      query(
        `SELECT id, name, subscription_plan, subscription_status, monthly_rate, trial_ends_at,
                stripe_customer_id, billing_email
         FROM organizations WHERE id = $1`,
        [orgId]
      ),
      query(
        `SELECT s.id, s.stripe_subscription_id, s.status, s.current_period_start, s.current_period_end,
                s.cancel_at_period_end, s.canceled_at, s.trial_end, s.amount_cents, s.currency,
                p.key AS plan_key, p.display_name AS plan_name
         FROM subscriptions s
         LEFT JOIN billing_plans p ON p.id = s.plan_id
         WHERE s.organization_id = $1
           AND s.status IN ('active', 'trialing', 'past_due', 'unpaid', 'incomplete')
         ORDER BY s.created_at DESC LIMIT 1`,
        [orgId]
      ),
      query(
        `SELECT id, stripe_invoice_id, number, status, amount_due_cents, amount_paid_cents,
                currency, invoice_date, hosted_invoice_url, invoice_pdf_url, paid_at
         FROM invoices WHERE organization_id = $1
         ORDER BY invoice_date DESC NULLS LAST LIMIT 12`,
        [orgId]
      ),
    ]);

    res.json({
      stripeEnabled: isStripeEnabled(),
      organization: orgResult.rows[0] || null,
      subscription: subResult.rows[0] || null,
      recentInvoices: invoicesResult.rows,
    });
  } catch (err) {
    console.error('getCurrentSubscription error:', err.message);
    res.status(500).json({ error: 'Failed to load subscription' });
  }
}

// ═══════════════════════════════════════════════════════════
//  AUTHED — create Stripe Checkout session
// ═══════════════════════════════════════════════════════════

export async function createCheckoutSession(req, res) {
  if (!isStripeEnabled()) {
    return res.status(503).json({ error: 'Billing is not yet configured. Contact support to upgrade.' });
  }
  const stripe = stripeClient();

  try {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId required' });

    // Look up plan
    const planResult = await query('SELECT * FROM billing_plans WHERE id = $1 AND active = true', [planId]);
    const plan = planResult.rows[0];
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (!plan.stripe_price_id) {
      return res.status(400).json({ error: 'This plan is not yet available for self-serve purchase. Contact sales.' });
    }

    // Look up user + org
    const userResult = await query(
      `SELECT u.id, u.email, u.full_name, u.organization_id, o.stripe_customer_id, o.billing_email, o.name AS org_name
       FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1`,
      [req.user.userId]
    );
    const user = userResult.rows[0];
    if (!user?.organization_id) {
      return res.status(400).json({ error: 'Your account is not linked to an organization' });
    }

    // Get or create a Stripe customer for this org
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.billing_email || user.email,
        name: user.org_name || user.full_name,
        metadata: {
          organization_id: String(user.organization_id),
          user_id: String(user.id),
        },
      });
      customerId = customer.id;
      await query('UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2', [customerId, user.organization_id]);
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: successUrl(),
      cancel_url: cancelUrl(),
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: {
          organization_id: String(user.organization_id),
          plan_id: String(plan.id),
          plan_key: plan.key,
        },
      },
      metadata: {
        organization_id: String(user.organization_id),
        plan_id: String(plan.id),
        plan_key: plan.key,
      },
    });

    await auditLog(user.id, user.email, 'billing.checkout_started', 'organization', user.organization_id, {
      plan_id: plan.id, plan_key: plan.key, checkout_session_id: session.id,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('createCheckoutSession error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
}

// ═══════════════════════════════════════════════════════════
//  AUTHED — Stripe customer portal (change card, cancel, etc.)
// ═══════════════════════════════════════════════════════════

export async function createPortalSession(req, res) {
  if (!isStripeEnabled()) {
    return res.status(503).json({ error: 'Billing is not yet configured.' });
  }
  const stripe = stripeClient();

  try {
    const userResult = await query(
      `SELECT u.id, u.email, u.organization_id, o.stripe_customer_id
       FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1`,
      [req.user.userId]
    );
    const user = userResult.rows[0];
    if (!user?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer on file. Upgrade first.' });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: portalReturnUrl(),
    });

    await auditLog(user.id, user.email, 'billing.portal_opened', 'organization', user.organization_id, {});
    res.json({ url: portal.url });
  } catch (err) {
    console.error('createPortalSession error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to open billing portal' });
  }
}

// ═══════════════════════════════════════════════════════════
//  WEBHOOK — Stripe → us
//  Mounted BEFORE express.json() in app.js with express.raw() because
//  signature verification requires the unparsed request body.
// ═══════════════════════════════════════════════════════════

export async function handleWebhook(req, res) {
  if (!isStripeEnabled()) {
    return res.status(501).json({ error: 'Stripe webhook handler disabled (no STRIPE_SECRET_KEY)' });
  }
  const stripe = stripeClient();
  const secret = webhookSecret();
  if (!secret) {
    return res.status(501).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' });
  }

  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency: if we've already recorded this event, skip processing.
  try {
    const existing = await query('SELECT id, processed FROM payment_events WHERE stripe_event_id = $1', [event.id]);
    if (existing.rows.length > 0 && existing.rows[0].processed) {
      return res.json({ received: true, duplicate: true });
    }
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO payment_events (stripe_event_id, event_type, payload) VALUES ($1, $2, $3)
         ON CONFLICT (stripe_event_id) DO NOTHING`,
        [event.id, event.type, JSON.stringify(event)]
      );
    }
  } catch (err) {
    console.error('Webhook dedup insert failed:', err.message);
    // Keep going — idempotency is a safety net, not a hard requirement
  }

  try {
    await dispatchWebhookEvent(event);
    await query(
      `UPDATE payment_events SET processed = true, processed_at = NOW(), processing_error = NULL
       WHERE stripe_event_id = $1`,
      [event.id]
    );
    res.json({ received: true });
  } catch (err) {
    console.error(`Webhook handler for ${event.type} failed:`, err.message);
    await query(
      `UPDATE payment_events SET processed = false, processing_error = $2 WHERE stripe_event_id = $1`,
      [event.id, err.message || 'unknown error']
    );
    // Return 200 so Stripe doesn't retry forever on a permanent failure;
    // unprocessed events are surfaced in the admin dashboard.
    res.json({ received: true, error: err.message });
  }
}

async function dispatchWebhookEvent(event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await upsertSubscription(event.data.object);
      break;
    case 'invoice.created':
    case 'invoice.finalized':
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.payment_succeeded':
    case 'invoice.voided':
    case 'invoice.marked_uncollectible':
      await upsertInvoice(event.data.object);
      break;
    case 'checkout.session.completed':
      // Subscription row will come via customer.subscription.created.
      // Nothing extra to do here.
      break;
    default:
      // Unhandled event types are fine — they're still recorded in payment_events.
      break;
  }
}

async function upsertSubscription(sub) {
  // Look up org by stripe_customer_id first, falling back to metadata
  let orgId = null;
  const byCustomer = await query('SELECT id FROM organizations WHERE stripe_customer_id = $1', [sub.customer]);
  if (byCustomer.rows[0]) orgId = byCustomer.rows[0].id;
  else if (sub.metadata?.organization_id) orgId = parseInt(sub.metadata.organization_id);
  if (!orgId) {
    console.warn(`[webhook] subscription ${sub.id} has no matching org`);
    return;
  }

  const priceId = sub.items?.data?.[0]?.price?.id || null;
  const plan = await findPlanByPriceId(priceId);
  const amountCents = sub.items?.data?.[0]?.price?.unit_amount || null;
  const currency = sub.items?.data?.[0]?.price?.currency || 'usd';

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO subscriptions (
         organization_id, plan_id, stripe_subscription_id, stripe_customer_id,
         stripe_price_id, status, current_period_start, current_period_end,
         cancel_at_period_end, canceled_at, ended_at, trial_end, quantity,
         amount_cents, currency, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7), to_timestamp($8), $9,
                 $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET
         plan_id = EXCLUDED.plan_id,
         stripe_price_id = EXCLUDED.stripe_price_id,
         status = EXCLUDED.status,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end,
         canceled_at = EXCLUDED.canceled_at,
         ended_at = EXCLUDED.ended_at,
         trial_end = EXCLUDED.trial_end,
         amount_cents = EXCLUDED.amount_cents,
         currency = EXCLUDED.currency,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()`,
      [
        orgId,
        plan?.id || null,
        sub.id,
        sub.customer,
        priceId,
        sub.status,
        sub.current_period_start || null,
        sub.current_period_end || null,
        !!sub.cancel_at_period_end,
        sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        sub.ended_at ? new Date(sub.ended_at * 1000) : null,
        sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        sub.items?.data?.[0]?.quantity || 1,
        amountCents,
        currency,
        JSON.stringify(sub.metadata || {}),
      ]
    );

    // Update the organization's plan/status summary columns so the admin
    // dashboard (and feature gates) see the right tier without joining.
    const orgStatus = orgStatusFromStripe(sub.status);
    const monthlyRate = (amountCents || 0) / 100; // dollars
    await client.query(
      `UPDATE organizations SET
         subscription_plan = COALESCE($1, subscription_plan),
         subscription_status = $2,
         monthly_rate = CASE WHEN $3::NUMERIC > 0 THEN $3 ELSE monthly_rate END,
         trial_ends_at = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [
        plan?.plan_tier || null,
        orgStatus,
        monthlyRate,
        sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        orgId,
      ]
    );
  });

  await auditLog(null, 'stripe-webhook', `subscription.${orgStatusFromStripe(sub.status)}`, 'organization', orgId, {
    stripe_subscription_id: sub.id, plan: plan?.key || null, amount_cents: amountCents,
  });
}

async function upsertInvoice(inv) {
  let orgId = null;
  const byCustomer = await query('SELECT id FROM organizations WHERE stripe_customer_id = $1', [inv.customer]);
  if (byCustomer.rows[0]) orgId = byCustomer.rows[0].id;
  if (!orgId) {
    console.warn(`[webhook] invoice ${inv.id} has no matching org`);
    return;
  }

  let subscriptionId = null;
  if (inv.subscription) {
    const sub = await query('SELECT id FROM subscriptions WHERE stripe_subscription_id = $1', [inv.subscription]);
    subscriptionId = sub.rows[0]?.id || null;
  }

  const lastFailure = inv.last_finalization_error?.message
                      || (inv.status === 'uncollectible' ? 'Marked uncollectible' : null);

  await query(
    `INSERT INTO invoices (
       organization_id, subscription_id, stripe_invoice_id, stripe_customer_id,
       stripe_charge_id, stripe_payment_intent_id, number, status,
       amount_due_cents, amount_paid_cents, amount_remaining_cents, currency,
       invoice_date, period_start, period_end, paid_at, due_date,
       attempt_count, last_failure_reason, hosted_invoice_url, invoice_pdf_url, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
               $9, $10, $11, $12,
               to_timestamp($13), to_timestamp($14), to_timestamp($15), to_timestamp($16), to_timestamp($17),
               $18, $19, $20, $21, $22)
     ON CONFLICT (stripe_invoice_id) DO UPDATE SET
       status = EXCLUDED.status,
       amount_paid_cents = EXCLUDED.amount_paid_cents,
       amount_remaining_cents = EXCLUDED.amount_remaining_cents,
       paid_at = EXCLUDED.paid_at,
       attempt_count = EXCLUDED.attempt_count,
       last_failure_reason = EXCLUDED.last_failure_reason,
       hosted_invoice_url = EXCLUDED.hosted_invoice_url,
       invoice_pdf_url = EXCLUDED.invoice_pdf_url,
       updated_at = NOW()`,
    [
      orgId, subscriptionId, inv.id, inv.customer,
      inv.charge || null, inv.payment_intent || null,
      inv.number || null, inv.status || null,
      inv.amount_due || 0, inv.amount_paid || 0, inv.amount_remaining || 0,
      inv.currency || 'usd',
      inv.created || null, inv.period_start || null, inv.period_end || null,
      inv.status_transitions?.paid_at || null, inv.due_date || null,
      inv.attempt_count || 0, lastFailure,
      inv.hosted_invoice_url || null, inv.invoice_pdf || null,
      JSON.stringify(inv.metadata || {}),
    ]
  );

  await auditLog(null, 'stripe-webhook', `invoice.${inv.status}`, 'organization', orgId, {
    stripe_invoice_id: inv.id, amount_due: inv.amount_due, amount_paid: inv.amount_paid,
  });
}

// ═══════════════════════════════════════════════════════════
//  PLATFORM ADMIN — aggregate billing views
//  Real MRR from Stripe-backed subscriptions
// ═══════════════════════════════════════════════════════════

// Helper for platform admin — not gated, reads whatever exists in DB
export async function getBillingSummaryForAdmin() {
  const [stripeOrgs, activeSubs, recentInvoices, failedInvoices, mrrRow] = await Promise.all([
    query('SELECT COUNT(*) FROM organizations WHERE stripe_customer_id IS NOT NULL'),
    query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS total_cents
       FROM subscriptions WHERE status IN ('active', 'trialing')`
    ),
    query(
      `SELECT i.id, i.stripe_invoice_id, i.number, i.status, i.amount_due_cents, i.amount_paid_cents,
              i.invoice_date, i.hosted_invoice_url, i.organization_id, o.name AS org_name
       FROM invoices i LEFT JOIN organizations o ON o.id = i.organization_id
       ORDER BY i.invoice_date DESC NULLS LAST LIMIT 20`
    ),
    query(
      `SELECT i.id, i.stripe_invoice_id, i.number, i.status, i.amount_due_cents,
              i.invoice_date, i.attempt_count, i.last_failure_reason,
              i.organization_id, o.name AS org_name
       FROM invoices i LEFT JOIN organizations o ON o.id = i.organization_id
       WHERE i.status IN ('open', 'uncollectible') AND i.amount_remaining_cents > 0
       ORDER BY i.invoice_date DESC NULLS LAST LIMIT 50`
    ),
    query(
      // Convert non-monthly plans to monthly equivalent
      `SELECT COALESCE(SUM(
         CASE WHEN s.stripe_price_id IN (SELECT stripe_price_id FROM billing_plans WHERE billing_interval = 'year')
              THEN s.amount_cents / 12.0
              ELSE s.amount_cents
         END
       ), 0) AS mrr_cents
       FROM subscriptions s WHERE s.status IN ('active', 'trialing')`
    ),
  ]);

  return {
    stripeEnabled: isStripeEnabled(),
    stripeCustomerCount: parseInt(stripeOrgs.rows[0].count),
    activeSubscriptionCount: parseInt(activeSubs.rows[0].count),
    mrrCents: parseFloat(mrrRow.rows[0].mrr_cents || 0),
    recentInvoices: recentInvoices.rows,
    failedInvoices: failedInvoices.rows,
  };
}
