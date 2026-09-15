import { Router } from 'express';
import {
  getStudentCounselling,
  getAllCounselling,
  upsertCounselling,
  updateCounselling
} from '../controllers/counsellingController.js';

const router = Router();

router.get('/student/:studentId', getStudentCounselling);
router.get('/', getAllCounselling);
router.post('/', upsertCounselling);
router.put('/:id', updateCounselling);

export default router;
