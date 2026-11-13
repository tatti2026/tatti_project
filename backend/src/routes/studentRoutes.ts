import { Router } from 'express';
import {
  getStudentByProfileId,
  createStudent,
  updateStudent,
  getAllStudents,
  deleteStudent,
  getStudentApplicationAccessStatus,
  getStudentReminders,
} from '../controllers/studentController.js';
import { updateStudentApplicationAccess } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/me/reminders', requireAuth, requireRole('student'), getStudentReminders);
router.get('/profile/:profileId', requireAuth, getStudentByProfileId);
router.get('/:id/application-access', requireAuth, getStudentApplicationAccessStatus);
router.patch('/:id/application-access', requireAuth, requireRole(['admin', 'counsellor']), updateStudentApplicationAccess);
router.get('/', requireAuth, requireRole(['admin', 'counsellor']), getAllStudents);
router.post('/', createStudent);
router.put('/:id', requireAuth, requireRole(['admin', 'counsellor']), updateStudent);
router.delete('/:id', requireAuth, requireRole('admin'), deleteStudent);

export default router;
