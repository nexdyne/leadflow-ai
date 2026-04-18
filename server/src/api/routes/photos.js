import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { downloadPhoto } from '../controllers/photoController.js';

const router = Router();

router.use(requireAuth);

// Download a photo by ID
router.get('/:photoId/download', downloadPhoto);

export default router;
