import { Router } from 'express';
import {
  getFollowUps,
  upsertFollowUp,
  updateFollowUp
} from '../controllers/followUpController.js';

const router = Router();

router.get('/', getFollowUps);
router.post('/', upsertFollowUp);
router.put('/:id', updateFollowUp);

export default router;
