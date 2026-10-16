import { Router } from 'express';
import {
  getActiveQuestions,
  getAllQuestions,
  createQuestion,
  createQuestionsBulk,
  updateQuestion,
  deleteQuestion
} from '../controllers/questionController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/active', getActiveQuestions);
router.get('/', getAllQuestions);
router.post('/bulk', requireAuth, requireRole(['admin', 'counsellor']), createQuestionsBulk);
router.post('/', createQuestion);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);

export default router;
