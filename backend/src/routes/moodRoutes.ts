import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  recordStudentMood,
  getStudentMoodHistory,
  getCounsellorStudentsMood,
  getNeedsAttentionAlerts,
  updateAlertStatus,
  getStudentMoodForCounsellor
} from '../controllers/moodController.js';

const router = Router();

router.use(requireAuth);

// Student endpoints
router.post('/checkin', requireRole('student'), recordStudentMood);
router.post('/check-in', requireRole('student'), recordStudentMood);
router.get('/history', requireRole('student'), getStudentMoodHistory);
router.get('/stats', requireRole('student'), getStudentMoodHistory);

// Counsellor endpoints
router.get('/counsellor/overview', requireRole(['counsellor', 'admin']), getCounsellorStudentsMood);
router.get('/counsellor/alerts', requireRole(['counsellor', 'admin']), getNeedsAttentionAlerts);
router.patch('/counsellor/alerts/:id', requireRole(['counsellor', 'admin']), updateAlertStatus);
router.get('/student/:id', requireRole(['counsellor', 'admin']), getStudentMoodForCounsellor);

export default router;

