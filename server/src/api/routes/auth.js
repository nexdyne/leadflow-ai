import { Router } from 'express';
import { register, login, refresh, logout, getProfile, updateDesignation, changePassword, listDesignations, forgotPassword, resetPassword, verifyEmail, resendVerification } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Async wrapper
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/register', wrap(register));
router.post('/login', wrap(login));
router.post('/refresh', wrap(refresh));
router.post('/logout', requireAuth, wrap(logout));
router.get('/profile', requireAuth, wrap(getProfile));
router.put('/designation', requireAuth, wrap(updateDesignation));
router.put('/change-password', requireAuth, wrap(changePassword));
router.get('/designations', wrap(listDesignations));

// Email verification & password reset (public endpoints)
router.post('/forgot-password', wrap(forgotPassword));
router.post('/reset-password', wrap(resetPassword));
router.post('/verify-email', wrap(verifyEmail));
router.post('/resend-verification', requireAuth, wrap(resendVerification));

export default router;
