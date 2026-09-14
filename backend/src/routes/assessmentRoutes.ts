import { Router } from 'express';
import { getActiveQuestions, submitAssessment } from '../controllers/assessmentController.js';

const router = Router();

router.get('/questions', getActiveQuestions);
router.post('/submit', submitAssessment);

export default router;
