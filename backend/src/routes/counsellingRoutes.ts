import { Router } from 'express';
import {
  getStudentCounselling,
  getAllCounselling,
  upsertCounselling,
  updateCounselling
} from '../controllers/counsellingController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/student/:studentId', getStudentCounselling);
router.get('/', requireRole(['admin', 'counsellor']), getAllCounselling);
router.post('/', requireRole(['admin', 'counsellor']), upsertCounselling);
router.put('/:id', requireRole(['admin', 'counsellor']), updateCounselling);

export default router;
