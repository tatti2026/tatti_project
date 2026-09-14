import { Router } from 'express';
import { getApplicationStatus, submitApplication } from '../controllers/applicationController.js';
import { requireApplicationUnlocked } from '../middleware/accessControlMiddleware.js';

const router = Router();

router.get('/status/:studentId', getApplicationStatus);
router.post('/submit', requireApplicationUnlocked, submitApplication);

export default router;
