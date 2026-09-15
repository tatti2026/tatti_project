import { Router } from 'express';
import {
  getApplicationStatus,
  getStudentApplication,
  upsertApplication,
  submitApplication
} from '../controllers/applicationController.js';
import { requireApplicationUnlocked } from '../middleware/accessControlMiddleware.js';

const router = Router();

router.get('/status/:studentId', getApplicationStatus);
router.get('/student/:studentId', getStudentApplication);
router.post('/', requireApplicationUnlocked, upsertApplication);
router.put('/:id', requireApplicationUnlocked, upsertApplication);
router.post('/submit', requireApplicationUnlocked, submitApplication);

export default router;
