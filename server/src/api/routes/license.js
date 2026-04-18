import { Router } from 'express';
import { verifyLicense, setOwnLicense, setMemberLicense, getLicenseStatus } from '../controllers/licenseController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Async wrapper
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public-ish verification check (still requires auth)
router.post('/verify', requireAuth, wrap(verifyLicense));

// Admin sets own designation + license
router.put('/set-own', requireAuth, wrap(setOwnLicense));

// Admin sets team member's designation + license
router.put('/set-member', requireAuth, wrap(setMemberLicense));

// Get own license verification status
router.get('/status', requireAuth, wrap(getLicenseStatus));

export default router;
