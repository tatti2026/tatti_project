import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './authMiddleware.js';
import { query } from '../database/pgPool.js';
import { isStudentApplicationUnlocked } from '../services/applicationAccessService.js';

export async function requireApplicationUnlocked(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const studentId = req.params.studentId || req.body.studentId || req.body.student_id;

  if (!studentId) {
    return res.status(400).json({ error: 'Missing student identifier for application access check.' });
  }

  try {
    const dbRes = await query('SELECT application_access_status FROM students WHERE id = $1', [studentId]);
    if (dbRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found.' });
    }
    const status = dbRes.rows[0].application_access_status;
    if (status !== 'unlocked') {
      return res.status(403).json({
        error: 'Application process is locked by TATTI Admin. Unauthorized attempt to modify or submit application.',
        code: 'APPLICATION_LOCKED',
        status: 'locked',
      });
    }
    return next();
  } catch (err) {
    console.error('Database check error in requireApplicationUnlocked:', err);
    return res.status(500).json({ error: 'Internal server error validating application access.' });
  }
}
