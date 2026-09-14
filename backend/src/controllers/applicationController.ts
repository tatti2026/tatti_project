import type { Request, Response } from 'express';
import { supabase } from '../database/dbClient.js';
import { isStudentApplicationUnlocked, getStudentApplicationAccess } from '../services/applicationAccessService.js';
import { createSystemNotification } from '../services/notificationService.js';

export async function getApplicationStatus(req: Request, res: Response) {
  const { studentId } = req.params;
  const access = getStudentApplicationAccess(studentId);

  const { data: application } = await supabase
    .from('applications')
    .select('*, course:courses(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return res.json({
    access,
    application: application || null,
  });
}

export async function submitApplication(req: Request, res: Response) {
  const { studentId, courseId, personalDetails } = req.body;

  if (!isStudentApplicationUnlocked(studentId)) {
    return res.status(403).json({
      error: 'Application process is locked by TATTI Admin. Wait for admin unlock before submitting application.',
      code: 'APPLICATION_LOCKED',
    });
  }

  const appNumber = `APP${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`;

  createSystemNotification(
    studentId,
    '✓ Application Submitted',
    `Your application (${appNumber}) has been recorded. Complete UPI payment to confirm admission.`,
    'application'
  );

  return res.json({
    message: 'Application submitted successfully.',
    applicationNumber: appNumber,
    status: 'submitted',
  });
}
