import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './authMiddleware.js';
import { isStudentApplicationUnlocked } from '../services/applicationAccessService.js';

export function requireApplicationUnlocked(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const studentId = req.params.studentId || req.body.studentId || req.body.student_id;

  if (!studentId) {
    return res.status(400).json({ error: 'Missing student identifier for application access check.' });
  }

  const isUnlocked = isStudentApplicationUnlocked(studentId);
  if (!isUnlocked) {
    return res.status(403).json({
      error: 'Application process is locked by TATTI Admin. Unauthorized attempt to modify or submit application.',
      code: 'APPLICATION_LOCKED',
      status: 'locked',
    });
  }

  next();
}
