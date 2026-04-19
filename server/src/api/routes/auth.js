import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);
router.get('/profile', requireAuth, getProfile);

// Password reset + email verification
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

export default router;
