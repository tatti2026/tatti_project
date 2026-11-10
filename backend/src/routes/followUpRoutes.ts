import { Router } from 'express';
import {
  getFollowUps,
  upsertFollowUp,
  updateFollowUp
} from '../controllers/followUpController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all follow-up routes for admin and counsellor access
router.use(requireAuth);
router.use(requireRole(['admin', 'counsellor']));

router.get('/', getFollowUps);
router.post('/', upsertFollowUp);
router.put('/:id', updateFollowUp);

export default router;
