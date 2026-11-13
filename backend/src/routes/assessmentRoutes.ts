import { Router } from 'express';
import { getActiveQuestions } from '../controllers/questionController.js';
import {
  submitAssessment,
  getStudentAssessment,
  createAssessment,
  submitAssessmentById,
  getStudentRecommendations,
  upsertRecommendation,
  getAllAssessments,
  getStudentMonthlyPerformance,
} from '../controllers/assessmentController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, requireRole(['admin', 'counsellor']), getAllAssessments);
router.get('/questions', getActiveQuestions);
router.get('/monthly-performance', requireAuth, getStudentMonthlyPerformance);
router.get('/student/:studentId/monthly-performance', requireAuth, getStudentMonthlyPerformance);
router.post('/submit', submitAssessment);

router.get('/student/:studentId', requireAuth, getStudentAssessment);
router.post('/', createAssessment);
router.put('/:id/submit', submitAssessmentById);
router.get('/recommendations/:studentId', requireAuth, getStudentRecommendations);
router.post('/recommendations', requireAuth, requireRole(['admin', 'counsellor']), upsertRecommendation);

export default router;
