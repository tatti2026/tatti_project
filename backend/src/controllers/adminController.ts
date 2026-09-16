import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';
import {
  setStudentApplicationAccess,
  getStudentApplicationAccess,
  getAuditLogsForStudent,
} from '../services/applicationAccessService.js';
import { createSystemNotification } from '../services/notificationService.js';
import type { StudentRecord } from '../models/index.js';

export async function updateStudentApplicationAccess(req: Request, res: Response) {
  try {
    const { id, studentId } = req.params;
    const targetStudentId = id || studentId;
    const { unlocked, adminName } = req.body;
    const isUnlocked = !!unlocked;
    const status = isUnlocked ? 'unlocked' : 'locked';
    const adminDisplayName = adminName || 'TATTI Head Administrator';

    // Verify student exists
    const checkRes = await query('SELECT id, full_name, email FROM students WHERE id = $1', [targetStudentId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = checkRes.rows[0];

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const updatedRes = await query(
      `UPDATE students 
       SET application_access_status = $1, 
           application_unlocked_by = $2, 
           application_unlocked_at = $3,
           updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [
        status,
        isUnlocked ? adminDisplayName : null,
        isUnlocked ? now.toISOString() : null,
        targetStudentId
      ]
    );

    try {
      await query(
        `INSERT INTO admin_audit_logs (student_id, admin_name, action, date, time)
         VALUES ($1, $2, $3, $4, $5)`,
        [targetStudentId, adminDisplayName, isUnlocked ? 'UNLOCK' : 'LOCK', dateStr, timeStr]
      );
    } catch (auditErr) {
      console.warn('Audit log table insert warning:', auditErr);
    }

    if (isUnlocked) {
      createSystemNotification(
        targetStudentId,
        '🎉 Application Process Unlocked',
        'Congratulations! TATTI Admin has unlocked your application process. You can now start your application.',
        'application'
      );
    }

    return res.json({
      success: true,
      applicationAccess: isUnlocked,
      application_access_status: status,
      student: updatedRes.rows[0],
      message: `Application access ${status} successfully for ${student.full_name || 'student'}.`,
    });
  } catch (err) {
    console.error('Error updating student application access:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unlockStudentApplication(req: Request, res: Response) {
  req.body = { ...req.body, unlocked: true };
  return updateStudentApplicationAccess(req, res);
}

export async function lockStudentApplication(req: Request, res: Response) {
  req.body = { ...req.body, unlocked: false };
  return updateStudentApplicationAccess(req, res);
}

export async function getStudentAuditLogs(req: Request, res: Response) {
  const { studentId } = req.params;
  try {
    const resDb = await query(
      'SELECT * FROM admin_audit_logs WHERE student_id = $1 ORDER BY created_at DESC',
      [studentId]
    );
    return res.json(resDb.rows);
  } catch {
    const logs = getAuditLogsForStudent(studentId);
    return res.json(logs);
  }
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
      return {
        ...s,
        application_access_status: s.application_access_status || 'locked',
        application_unlocked_by: s.application_unlocked_by || null,
        application_unlocked_at: s.application_unlocked_at || null,
      };
    });

    return res.json({ data: list, count: totalCount });
  } catch (err) {
      console.error('Error listing students:', err);
      res.status(500).json({ error: 'Internal server error' });
  }
}
