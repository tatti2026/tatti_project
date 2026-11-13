import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  submitSessionFeedback,
  getStudentPendingFeedback,
  getCounsellorFeedbackSummary
} from '../controllers/sessionFeedbackController.js';

const router = Router();

router.use(requireAuth);

// Student endpoints
router.post('/', requireRole('student'), submitSessionFeedback);
router.get('/pending', requireRole('student'), getStudentPendingFeedback);

// Counsellor / Admin endpoints
router.get('/summary', requireRole(['counsellor', 'admin']), getCounsellorFeedbackSummary);

export default router;

