import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../controllers/notificationController.js';

const router = Router();

// All routes require auth
router.use(requireAuth);

// ─── Notification routes ──────────────────────────────
router.get('/', listNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.put('/:id/read', markNotificationAsRead);
router.put('/read-all', markAllNotificationsAsRead);

// ─── Notification preferences routes ──────────────────
router.get('/preferences', getNotificationPreferences);
router.put('/preferences', updateNotificationPreferences);

export default router;
