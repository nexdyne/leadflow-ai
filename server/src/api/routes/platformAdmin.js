import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getDashboard, getAnalytics, getRevenue,
  listUsers, getUser, suspendUser, reactivateUser, deleteUser, resetUserPassword,
  listOrganizations, updateOrganization,
  listProjects, getProjectDetail,
  listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  listAuditLogs,
  getActiveAnnouncements, dismissAnnouncement,
} from '../controllers/platformAdminController.js';
import { listTickets, updateTicket } from '../controllers/supportController.js';

const router = Router();

// All routes require auth
router.use(requireAuth);

// ─── Dashboard & Analytics ──────────────────────────────
router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);
router.get('/revenue', getRevenue);

// ─── User Management ────────────────────────────────────
router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/reactivate', reactivateUser);
router.put('/users/:id/reset-password', resetUserPassword);
router.delete('/users/:id', deleteUser);

// ─── Organization Management ────────────────────────────
router.get('/organizations', listOrganizations);
router.put('/organizations/:id', updateOrganization);

// ─── Projects / Inspections (admin visibility) ──────────
router.get('/projects', listProjects);
router.get('/projects/:id', getProjectDetail);

// ─── Announcements ──────────────────────────────────────
// IMPORTANT: /active must come before /:id to avoid param capture
router.get('/announcements/active', getActiveAnnouncements);
router.get('/announcements', listAnnouncements);
router.post('/announcements', createAnnouncement);
router.put('/announcements/:id', updateAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);
router.post('/announcements/:id/dismiss', dismissAnnouncement);

// ─── Audit Logs ─────────────────────────────────────────
router.get('/audit-logs', listAuditLogs);

// ─── Support Tickets ────────────────────────────────────
router.get('/support-tickets', listTickets);
router.patch('/support-tickets/:id', updateTicket);

export default router;
