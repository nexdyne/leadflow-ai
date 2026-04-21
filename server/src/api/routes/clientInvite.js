// Public routes (no auth) for the client-share invite flow.
// Clients who've been invited don't have an account yet — they reach
// these endpoints anonymously via the token in their email link.

import { Router } from 'express';
import { getInvite, acceptInvite } from '../controllers/clientInviteController.js';

const router = Router();

router.get('/:token', getInvite);
router.post('/:token/accept', acceptInvite);

export default router;
