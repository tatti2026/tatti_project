import { Router } from 'express';
import {
  getActiveQuestions,
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion
} from '../controllers/questionController.js';

const router = Router();

router.get('/active', getActiveQuestions);
router.get('/', getAllQuestions);
router.post('/', createQuestion);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);

export default router;
