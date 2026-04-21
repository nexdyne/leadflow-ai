import { Router } from 'express';
import { createTicket } from '../controllers/supportController.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Public endpoint — anyone can submit a support ticket from the landing page.
// If the submitter is logged in, auth middleware upstream populates req.user
// and the ticket gets linked to their user row; but auth is NOT required.
router.post('/', wrap(createTicket));

export default router;
