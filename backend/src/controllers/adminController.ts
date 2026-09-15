import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';
import {
  setStudentApplicationAccess,
  getStudentApplicationAccess,
  getAuditLogsForStudent,
} from '../services/applicationAccessService.js';
import { createSystemNotification } from '../services/notificationService.js';
import type { StudentRecord } from '../models/index.js';

export async function unlockStudentApplication(req: Request, res: Response) {
  const { studentId } = req.params;
  const { adminId, adminName } = req.body;
  const adminDisplayName = adminName || 'TATTI Admin';

  const result = setStudentApplicationAccess(
    studentId,
    'unlocked',
    { adminId: adminId || 'ADMIN', adminName: adminDisplayName }
  );

  try {
    await query(
      `UPDATE students 
       SET application_access_status = 'unlocked', 
           application_unlocked_by = $1, 
           application_unlocked_at = now() 
       WHERE id = $2`,
      [adminDisplayName, studentId]
    );

    await query(
      `INSERT INTO admin_audit_logs (student_id, admin_name, action, date, time)
       VALUES ($1, $2, 'UNLOCK', $3, $4)`,
      [studentId, adminDisplayName, result.log.date, result.log.time]
    );
  } catch (err) {
    console.error('Error updating student application access in DB:', err);
  }

  // Send real-time notification to the student
  createSystemNotification(
    studentId,
    '🎉 Application Process Unlocked',
    'Congratulations! TATTI Admin has unlocked your application process. You can now start your application.',
    'application'
  );

  return res.json({
    message: `Application access unlocked successfully for student ${studentId}.`,
    record: result.record,
    log: result.log,
  });
}

export async function lockStudentApplication(req: Request, res: Response) {
  const { studentId } = req.params;
  const { adminId, adminName } = req.body;
  const adminDisplayName = adminName || 'TATTI Admin';

  const result = setStudentApplicationAccess(
    studentId,
    'locked',
    { adminId: adminId || 'ADMIN', adminName: adminDisplayName }
  );

  try {
    await query(
      `UPDATE students 
       SET application_access_status = 'locked', 
           application_unlocked_by = NULL, 
           application_unlocked_at = NULL 
       WHERE id = $1`,
      [studentId]
    );

    await query(
      `INSERT INTO admin_audit_logs (student_id, admin_name, action, date, time)
       VALUES ($1, $2, 'LOCK', $3, $4)`,
      [studentId, adminDisplayName, result.log.date, result.log.time]
    );
  } catch (err) {
    console.error('Error updating student application access in DB:', err);
  }

  return res.json({
    message: `Application access locked for student ${studentId}.`,
    record: result.record,
    log: result.log,
  });
}

export async function getStudentAuditLogs(req: Request, res: Response) {
  const { studentId } = req.params;
  const logs = getAuditLogsForStudent(studentId);
  return res.json(logs);
}

export async function listAllStudents(req: Request, res: Response) {
  const { page = 0, pageSize = 20, search = '' } = req.query;
  const p = Number(page);
  const ps = Number(pageSize);

  try {
    let countQueryStr = 'SELECT COUNT(*) FROM students';
    let dataQueryStr = 'SELECT * FROM students';
    let queryParams: any[] = [];
    
    if (search) {
        const searchStr = `%${search}%`;
        const whereClause = ' WHERE full_name ILIKE $1 OR email ILIKE $1 OR student_id ILIKE $1';
        countQueryStr += whereClause;
        dataQueryStr += whereClause;
        queryParams.push(searchStr);
    }
    
    dataQueryStr += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    
    const countRes = await query(countQueryStr, queryParams);
    const totalCount = parseInt(countRes.rows[0].count, 10);
    
    const dataRes = await query(dataQueryStr, [...queryParams, ps, p * ps]);
    const data = dataRes.rows as StudentRecord[];

    const list = data.map(s => {
      const access = getStudentApplicationAccess(s.id);
      return {
        ...s,
        application_access_status: access.status,
        application_unlocked_by: access.unlockedBy,
        application_unlocked_at: access.unlockedAt,
      };
    });

    return res.json({ data: list, count: totalCount });
  } catch (err) {
      console.error('Error listing students:', err);
      res.status(500).json({ error: 'Internal server error' });
  }
}
