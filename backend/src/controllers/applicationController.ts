import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';
import { isStudentApplicationUnlocked, getStudentApplicationAccess } from '../services/applicationAccessService.js';
import { createSystemNotification } from '../services/notificationService.js';

export async function getApplicationStatus(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const access = getStudentApplicationAccess(studentId);

    const result = await query(`
      SELECT a.*, row_to_json(c.*) as course 
      FROM applications a 
      LEFT JOIN courses c ON a.course_id = c.id 
      WHERE a.student_id = $1 
      ORDER BY a.created_at DESC 
      LIMIT 1
    `, [studentId]);

    const application = result.rows[0] || null;

    return res.json({
      access,
      application,
    });
  } catch (err) {
    console.error('Error getting application status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStudentApplication(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const result = await query(`
      SELECT a.*, row_to_json(c.*) as course 
      FROM applications a 
      LEFT JOIN courses c ON a.course_id = c.id 
      WHERE a.student_id = $1 
      ORDER BY a.created_at DESC 
      LIMIT 1
    `, [studentId]);

    return res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error fetching student application:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function upsertApplication(req: Request, res: Response) {
  try {
    const app = req.body;
    const studentId = app.student_id;

    if (studentId && !isStudentApplicationUnlocked(studentId)) {
      return res.status(403).json({
        error: 'Application process is locked by TATTI Admin. Application cannot be modified or submitted.',
        code: 'APPLICATION_LOCKED'
      });
    }

    if (app.id) {
      const allowedFields = [
        'course_id', 'application_number', 'status', 'step', 'submitted_at'
      ];
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const field of allowedFields) {
        if (app[field] !== undefined) {
          updates.push(`${field} = $${idx}`);
          values.push(app[field]);
          idx++;
        }
      }

      updates.push('updated_at = now()');
      values.push(app.id);

      const queryStr = `UPDATE applications SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
      const updateRes = await query(queryStr, values);
      
      const fullRes = await query(`
        SELECT a.*, row_to_json(c.*) as course 
        FROM applications a 
        LEFT JOIN courses c ON a.course_id = c.id 
        WHERE a.id = $1
      `, [app.id]);

      return res.json(fullRes.rows[0] || updateRes.rows[0]);
    } else {
      const appNumber = app.application_number || `APP${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`;
      const result = await query(`
        INSERT INTO applications (student_id, course_id, application_number, status, step, submitted_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `, [
        studentId, app.course_id || null, appNumber,
        app.status || 'in_progress', app.step || 1, app.submitted_at || null
      ]);

      const inserted = result.rows[0];

      // Update student application_status
      await query("UPDATE students SET application_status = $1, updated_at = now() WHERE id = $2", [
        inserted.status, studentId
      ]);

      if (inserted.status === 'submitted') {
        createSystemNotification(
          studentId,
          '✓ Application Submitted',
          `Your application (${appNumber}) has been recorded. Complete UPI payment to confirm admission.`,
          'application'
        );
      }

      const fullRes = await query(`
        SELECT a.*, row_to_json(c.*) as course 
        FROM applications a 
        LEFT JOIN courses c ON a.course_id = c.id 
        WHERE a.id = $1
      `, [inserted.id]);

      return res.status(201).json(fullRes.rows[0] || inserted);
    }
  } catch (err) {
    console.error('Error upserting application:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function submitApplication(req: Request, res: Response) {
  const { studentId, courseId } = req.body;

  if (!isStudentApplicationUnlocked(studentId)) {
    return res.status(403).json({
      error: 'Application process is locked by TATTI Admin. Wait for admin unlock before submitting application.',
      code: 'APPLICATION_LOCKED',
    });
  }

  const appNumber = `APP${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    const result = await query(`
      INSERT INTO applications (student_id, course_id, application_number, status, submitted_at)
      VALUES ($1, $2, $3, 'submitted', now())
      RETURNING *;
    `, [studentId, courseId || null, appNumber]);

    await query("UPDATE students SET application_status = 'submitted', updated_at = now() WHERE id = $1", [studentId]);

    createSystemNotification(
      studentId,
      '✓ Application Submitted',
      `Your application (${appNumber}) has been recorded. Complete UPI payment to confirm admission.`,
      'application'
    );

    return res.json({
      message: 'Application submitted successfully.',
      applicationNumber: appNumber,
      application: result.rows[0],
      status: 'submitted',
    });
  } catch (err) {
    console.error('Error submitting application:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

