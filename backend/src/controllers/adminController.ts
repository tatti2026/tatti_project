import type { Request, Response } from 'express';
import { supabase } from '../database/dbClient.js';
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

  const result = setStudentApplicationAccess(
    studentId,
    'unlocked',
    { adminId: adminId || 'ADMIN', adminName: adminName || 'TATTI Admin' }
  );

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

  const result = setStudentApplicationAccess(
    studentId,
    'locked',
    { adminId: adminId || 'ADMIN', adminName: adminName || 'TATTI Admin' }
  );

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

  let query = supabase
    .from('students')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(p * ps, (p + 1) * ps - 1);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,student_id.ilike.%${search}%`);
  }

  const { data, count } = await query;
  const list = ((Array.isArray(data) ? data : []) as StudentRecord[]).map(s => {
    const access = getStudentApplicationAccess(s.id);
    return {
      ...s,
      application_access_status: access.status,
      application_unlocked_by: access.unlockedBy,
      application_unlocked_at: access.unlockedAt,
    };
  });

  return res.json({ data: list, count: count ?? 0 });
}
