import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  // Client-facing
  listClientProjects, getClientProject,
  createInspectionRequest, listClientRequests,
  listMessages, sendMessage, getUnreadCount,
  // Inspector-facing
  shareProject, revokeProjectAccess, listProjectClients, listSharedWithClients,
  listIncomingRequests, reviewRequest,
  inspectorSendMessage, inspectorListMessages,
  updateProjectStatus,
} from '../controllers/clientController.js';

const router = Router();

// All routes require auth
router.use(requireAuth);

// ─── Client-facing routes ─────────────────────────────
router.get('/projects', listClientProjects);
// Inspector route MUST come before :id param route (Express matches first)
router.get('/projects/shared-with-clients', listSharedWithClients);
router.get('/projects/:id', getClientProject);
router.get('/requests', listClientRequests);
router.post('/requests', createInspectionRequest);
router.get('/messages/:projectId', listMessages);
router.post('/messages/:projectId', sendMessage);
router.get('/unread', getUnreadCount);

// ─── Inspector-facing routes ──────────────────────────
router.post('/share', shareProject);
router.delete('/share', revokeProjectAccess);
router.get('/shared/:projectId', listProjectClients);
router.get('/requests/incoming', listIncomingRequests);
router.put('/requests/:id/review', reviewRequest);
router.get('/messages/:projectId/inspector', inspectorListMessages);
router.post('/messages/:projectId/inspector', inspectorSendMessage);
router.put('/projects/:id/status', updateProjectStatus);

export default router;
