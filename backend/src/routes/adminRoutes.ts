import { Router } from 'express';
import {
  unlockStudentApplication,
  lockStudentApplication,
  getStudentAuditLogs,
  listAllStudents,
} from '../controllers/adminController.js';

const router = Router();

router.get('/students', listAllStudents);
router.post('/students/:studentId/unlock', unlockStudentApplication);
router.post('/students/:studentId/lock', lockStudentApplication);
router.get('/students/:studentId/audit-logs', getStudentAuditLogs);

export default router;
