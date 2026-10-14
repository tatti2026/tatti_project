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
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getAllAssessments);
router.get('/questions', getActiveQuestions);
router.get('/monthly-performance', requireAuth, getStudentMonthlyPerformance);
router.get('/student/:studentId/monthly-performance', requireAuth, getStudentMonthlyPerformance);
router.post('/submit', submitAssessment);

router.get('/student/:studentId', getStudentAssessment);
router.post('/', createAssessment);
router.put('/:id/submit', submitAssessmentById);
router.get('/recommendations/:studentId', getStudentRecommendations);
router.post('/recommendations', upsertRecommendation);

export default router;
