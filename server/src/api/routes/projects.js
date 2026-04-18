import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listProjects, createProject, getProject, updateProject, deleteProject } from '../controllers/projectController.js';
import { listPhotos, deletePhoto } from '../controllers/photoController.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', listProjects);
router.post('/', createProject);
router.get('/:projectId', getProject);
router.put('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);

// Photo sub-routes
router.get('/:projectId/photos', listPhotos);
router.delete('/:projectId/photos/:photoId', deletePhoto);

export default router;
