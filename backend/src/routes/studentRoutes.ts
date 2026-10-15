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
router.get('/profile/:profileId', getStudentByProfileId);
router.get('/:id/application-access', getStudentApplicationAccessStatus);
router.patch('/:id/application-access', updateStudentApplicationAccess);
router.get('/', getAllStudents);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

export default router;
