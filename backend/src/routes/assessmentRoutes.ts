import { Router } from 'express';
import { getActiveQuestions } from '../controllers/questionController.js';
import {
  submitAssessment,
  getStudentAssessment,
  createAssessment,
  submitAssessmentById,
  getStudentRecommendations,
  upsertRecommendation,
  getAllAssessments
} from '../controllers/assessmentController.js';

const router = Router();

router.get('/', getAllAssessments);
router.get('/questions', getActiveQuestions);
router.post('/submit', submitAssessment);

router.get('/student/:studentId', getStudentAssessment);
router.post('/', createAssessment);
router.put('/:id/submit', submitAssessmentById);
router.get('/recommendations/:studentId', getStudentRecommendations);
router.post('/recommendations', upsertRecommendation);

export default router;
