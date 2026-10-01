import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  getNotesByStudent,
  addNote,
  updateNote,
} from '../controllers/followUpNotesController.js';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/:studentId', getNotesByStudent);
router.post('/:studentId', addNote);
router.put('/:studentId/:noteId', updateNote);

export default router;
