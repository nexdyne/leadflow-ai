import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createTeam, listTeams, getTeam, updateTeam, deleteTeam, updateTier,
  listMembers, updateMemberRole, removeMember,
  createInvite, listInvites, revokeInvite,
  getInviteDetails, acceptInvite,
  switchTeam, leaveTeam,
} from '../controllers/teamController.js';

const router = Router();

// Async wrapper to catch unhandled errors and forward to Express error handler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── Public (no auth needed) ──────────────────────────────
router.get('/invite/:token', wrap(getInviteDetails));

// ─── All other routes require auth ────────────────────────
router.use(requireAuth);

// Switch active team (before /:teamId to avoid param collision)
router.post('/switch', wrap(switchTeam));

// Invite acceptance (literal /invite/ path before /:teamId param)
router.post('/invite/:token/accept', wrap(acceptInvite));

// Team CRUD
router.post('/', wrap(createTeam));
router.get('/', wrap(listTeams));
router.get('/:teamId', wrap(getTeam));
router.put('/:teamId', wrap(updateTeam));
router.delete('/:teamId', wrap(deleteTeam));
router.put('/:teamId/tier', wrap(updateTier));

// Members
router.get('/:teamId/members', wrap(listMembers));
router.put('/:teamId/members/:memberId', wrap(updateMemberRole));
router.delete('/:teamId/members/:memberId', wrap(removeMember));

// Leave team
router.post('/:teamId/leave', wrap(leaveTeam));

// Invites
router.post('/:teamId/invites', wrap(createInvite));
router.get('/:teamId/invites', wrap(listInvites));
router.delete('/:teamId/invites/:inviteId', wrap(revokeInvite));

export default router;
