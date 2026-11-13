import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  submitAnonymousQuestion,
  getStudentAnonymousQuestions,
  getAnonymousQuestionThread,
  replyToAnonymousQuestion,
  getCounsellorAnonymousQuestions,
  updateAnonymousQuestionStatus
} from '../controllers/anonymousQuestionsController.js';

const router = Router();

router.use(requireAuth);

// Counsellor endpoints (must be defined BEFORE /:id to prevent route shadowing)
router.get('/counsellor', requireRole(['counsellor', 'admin']), getCounsellorAnonymousQuestions);
router.get('/counsellor/list', requireRole(['counsellor', 'admin']), getCounsellorAnonymousQuestions);
router.get('/counsellor/all', requireRole(['counsellor', 'admin']), getCounsellorAnonymousQuestions);
router.patch('/counsellor/:id/status', requireRole(['counsellor', 'admin']), updateAnonymousQuestionStatus);
router.put('/counsellor/:id/status', requireRole(['counsellor', 'admin']), updateAnonymousQuestionStatus);

// Student endpoints
router.post('/', requireRole('student'), submitAnonymousQuestion);
router.post('/submit', requireRole('student'), submitAnonymousQuestion);
router.get('/my', requireRole('student'), getStudentAnonymousQuestions);
router.get('/student/my-questions', requireRole('student'), getStudentAnonymousQuestions);

// Shared endpoints (student / counsellor view thread and reply)
router.get('/:id', getAnonymousQuestionThread);
router.post('/:id/replies', replyToAnonymousQuestion);
router.post('/:id/reply', replyToAnonymousQuestion);

export default router;
