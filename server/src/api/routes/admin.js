import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listAllUsers, createUser, updateUser,
  deactivateUser, reactivateUser, resetPassword,
  addUserToTeam, removeUserFromTeam, setUserDesignation,
} from '../controllers/adminController.js';

const router = Router();
router.use(requireAuth);

// Async wrapper to catch unhandled errors and forward to Express error handler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// User management
router.get('/users', wrap(listAllUsers));
router.post('/users', wrap(createUser));
router.put('/users/:userId', wrap(updateUser));
router.put('/users/:userId/deactivate', wrap(deactivateUser));
router.put('/users/:userId/reactivate', wrap(reactivateUser));
router.put('/users/:userId/reset-password', wrap(resetPassword));
router.post('/users/:userId/add-to-team', wrap(addUserToTeam));
router.delete('/users/:userId/remove-from-team', wrap(removeUserFromTeam));
router.put('/users/:userId/designation', wrap(setUserDesignation));

export default router;
