import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listPlans,
  getCurrentSubscription,
  createCheckoutSession,
  createPortalSession,
} from '../controllers/billingController.js';

// Note: the Stripe webhook endpoint is mounted separately in app.js
// because it needs express.raw() body parsing that runs BEFORE the
// global express.json() middleware. Do not add it here.

const router = Router();

// ─── Public: plan catalog ──────────────────────
router.get('/plans', listPlans);

// ─── Authenticated: subscription management ────
router.use(requireAuth);
router.get('/subscription', getCurrentSubscription);
router.post('/checkout', createCheckoutSession);
router.post('/portal', createPortalSession);

export default router;
