import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getPrivateNotes,
  getPrivateNoteById,
  addPrivateNote,
  updatePrivateNote,
  deletePrivateNote,
} from '../controllers/counsellorPrivateNotesController.js';

const router = Router();

// Every endpoint strictly requires authentication and enforces counsellor-only permission
router.use(requireAuth);

router.get('/', getPrivateNotes);
router.get('/:id', getPrivateNoteById);
router.post('/', addPrivateNote);
router.put('/:id', updatePrivateNote);
router.delete('/:id', deletePrivateNote);

export default router;
