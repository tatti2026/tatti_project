import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';
import { calculateReminderDatetime } from '../services/counsellingReminderService.js';
import { triggerFeedbackRequestIfNeeded } from './sessionFeedbackController.js';

export async function getStudentCounselling(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();

    if (role === 'counsellor') {
      const chk = await query('SELECT id FROM students WHERE id = $1 AND counsellor_id = $2', [studentId, caller.userId]);
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: Student not assigned to you.' });
      }
    } else if (role === 'student') {
      const chk = await query('SELECT id FROM students WHERE id = $1 AND profile_id = $2', [studentId, caller.userId]);
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    const result = await query(`
      SELECT 
        id,
        student_id,
        counsellor_name,
        to_char(scheduled_date, 'YYYY-MM-DD') as scheduled_date,
        scheduled_time,
        mode,
        venue_or_link,
        instructions,
        notes,
        status,
        reminder_option,
        reminder_datetime,
        reminder_sent,
        notification_status,
        created_at,
        updated_at
      FROM counselling 
      WHERE student_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [studentId]);
    return res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error getting student counselling:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllCounselling(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();
    const { page, pageSize, limit, search = '' } = req.query;
    const isPaginated = page !== undefined || limit !== undefined || pageSize !== undefined;

    const rawPage = Number(page);
    const p = isNaN(rawPage) || rawPage <= 0 ? 1 : rawPage;
    const ps = Math.max(1, Number(limit || pageSize) || 10);
    const offset = (p - 1) * ps;

    let baseWhere = '1=1';
    const queryParams: any[] = [];

    if (role === 'counsellor') {
      queryParams.push(caller.userId);
      baseWhere += ` AND s.counsellor_id = $${queryParams.length}`;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchStr = `%${search.trim()}%`;
      queryParams.push(searchStr);
      baseWhere += ` AND (c.counsellor_name ILIKE $${queryParams.length} OR s.full_name ILIKE $${queryParams.length} OR s.email ILIKE $${queryParams.length} OR s.student_id ILIKE $${queryParams.length} OR c.mode ILIKE $${queryParams.length})`;
    }

    const countRes = await query(`
      SELECT COUNT(*) 
      FROM counselling c
      LEFT JOIN students s ON s.id = c.student_id
      WHERE ${baseWhere}
    `, queryParams);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    let dataQuery = `
      SELECT 
        c.id,
        c.student_id,
        c.counsellor_name,
        to_char(c.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
        c.scheduled_time,
        c.mode,
        c.venue_or_link,
        c.instructions,
        c.notes,
        c.status,
        c.reminder_option,
        c.reminder_datetime,
        c.reminder_sent,
        c.notification_status,
        c.created_at,
        c.updated_at,
        s.full_name as student_name,
        s.student_id as student_code,
        s.email as student_email,
        s.phone as student_phone,
        s.selected_course
      FROM counselling c
      LEFT JOIN students s ON s.id = c.student_id
      WHERE ${baseWhere}
      ORDER BY c.scheduled_date DESC NULLS LAST, c.created_at DESC
    `;

    if (isPaginated) {
      dataQuery += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      const result = await query(dataQuery, [...queryParams, ps, offset]);
      return res.json({
        data: result.rows,
        pagination: {
          page: p,
          limit: ps,
          total: totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / ps)),
        },
      });
    }

    const result = await query(dataQuery, queryParams);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error getting all counselling:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function formatCounsellingDate(dateInput: any): string {
  if (!dateInput) return '';
  let d: Date;
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    } else {
      d = new Date(dateInput);
    }
  } else if (dateInput instanceof Date) {
    d = dateInput;
  } else {
    d = new Date(dateInput);
  }
  if (isNaN(d.getTime())) return String(dateInput);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatCounsellingTime(timeInput: any): string {
  if (!timeInput) return '';
  const str = String(timeInput).trim();
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    const hours = parseInt(ampmMatch[1], 10);
    const mins = ampmMatch[2];
    const ampm = ampmMatch[3].toUpperCase();
    return `${hours}:${mins} ${ampm}`;
  }
  const h24Match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (h24Match) {
    let hours = parseInt(h24Match[1], 10);
    const mins = h24Match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${mins} ${ampm}`;
  }
  return str;
}

export async function upsertCounselling(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();
    const c = req.body;
    const targetStudentId = c.student_id;

    if (role === 'counsellor' && targetStudentId) {
      const chk = await query('SELECT id FROM students WHERE id = $1 AND counsellor_id = $2', [targetStudentId, caller.userId]);
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: Student not assigned to you.' });
      }
    }

    // Synchronize notes and instructions
    if (c.notes !== undefined && (c.instructions === undefined || c.instructions === '')) {
      c.instructions = c.notes;
    } else if (c.instructions !== undefined && (c.notes === undefined || c.notes === '')) {
      c.notes = c.instructions;
    }

    const reminderOpt = c.reminder_option || c.reminder || '1 day before';
    const dateStr = c.scheduled_date || '';
    const timeStr = c.scheduled_time || '10:30 AM';

    const { reminderDatetime, isPast } = calculateReminderDatetime(dateStr, timeStr, reminderOpt);
    const reminderSent = isPast;
    const notifStatus = isPast ? 'elapsed' : 'pending';

    // Find existing row if c.id is provided, or if PUT /counselling/:id
    let existingRow: any = null;
    const targetId = c.id || req.params?.id;
    if (targetId) {
      const existingRes = await query('SELECT * FROM counselling WHERE id = $1', [targetId]);
      existingRow = existingRes.rows[0] || null;
    } else if (req.method === 'PUT' && c.student_id) {
      const existingRes = await query(
        'SELECT * FROM counselling WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1',
        [c.student_id]
      );
      existingRow = existingRes.rows[0] || null;
    }

    if (role === 'counsellor' && existingRow) {
      const chk = await query('SELECT id FROM students WHERE id = $1 AND counsellor_id = $2', [existingRow.student_id, caller.userId]);
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: Session does not belong to your assigned student.' });
      }
    }

    let counsellingRow: any;

    if (existingRow) {
      const allowedFields = [
        'counsellor_name', 'scheduled_date', 'scheduled_time', 'mode',
        'venue_or_link', 'instructions', 'notes', 'status'
      ];
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const field of allowedFields) {
        if (c[field] !== undefined) {
          updates.push(`${field} = $${idx}`);
          values.push(c[field]);
          idx++;
        }
      }

      updates.push(`reminder_option = $${idx}`);
      values.push(reminderOpt);
      idx++;

      updates.push(`reminder_datetime = $${idx}`);
      values.push(reminderDatetime);
      idx++;

      updates.push(`reminder_sent = $${idx}`);
      values.push(reminderSent);
      idx++;

      updates.push(`notification_status = $${idx}`);
      values.push(notifStatus);
      idx++;

      updates.push('updated_at = now()');
      values.push(existingRow.id);

      const queryStr = `UPDATE counselling SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await query(queryStr, values);
      counsellingRow = result.rows[0];
    } else {
      const result = await query(`
        INSERT INTO counselling (
          student_id, counsellor_name, scheduled_date, scheduled_time,
          mode, venue_or_link, instructions, notes, status,
          reminder_option, reminder_datetime, reminder_sent, notification_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
      `, [
        c.student_id, c.counsellor_name || 'PSY CARE Counsellor', c.scheduled_date || null,
        c.scheduled_time || '10:30 AM', c.mode || 'Online', c.venue_or_link || '',
        c.instructions || '', c.notes || '', c.status || 'scheduled',
        reminderOpt, reminderDatetime, reminderSent, notifStatus
      ]);
      counsellingRow = result.rows[0];
    }

    const resolvedStudentId = counsellingRow.student_id || c.student_id;

    if (resolvedStudentId) {
      // Update student's counselling_status in students table
      await query(
        'UPDATE students SET counselling_status = $1, updated_at = now() WHERE id = $2',
        [counsellingRow.status || 'scheduled', resolvedStudentId]
      );

      // Fetch student details for notification dispatch
      const studentRes = await query(
        'SELECT id, profile_id, full_name, student_id FROM students WHERE id = $1',
        [resolvedStudentId]
      );
      const student = studentRes.rows[0];

      if (student && student.profile_id) {
        const cleanDate = formatCounsellingDate(counsellingRow.scheduled_date || c.scheduled_date);
        const cleanTime = formatCounsellingTime(counsellingRow.scheduled_time || c.scheduled_time);
        const counsellor = counsellingRow.counsellor_name || 'PSY CARE Counsellor';
        const type = counsellingRow.mode || 'In-Person';
        const status = counsellingRow.status || 'scheduled';

        // Check prior notifications to avoid duplicate or determine if this is a reschedule/cancel
        const priorNotifRes = await query(
          "SELECT id, title, message FROM notifications WHERE (student_id = $1 OR profile_id = $2) AND type = 'counselling' ORDER BY created_at DESC LIMIT 1",
          [student.id, student.profile_id]
        );
        const latestNotif = priorNotifRes.rows[0];

        let notifTitle: string | null = null;
        let notifMessage: string | null = null;

        const effectiveNotes = (counsellingRow.notes || counsellingRow.instructions || '').trim();
        const oldEffectiveNotes = (existingRow?.notes || existingRow?.instructions || '').trim();
        const isNotesChanged = existingRow && (oldEffectiveNotes !== effectiveNotes);

        if (status === 'cancelled') {
          if (!latestNotif || latestNotif.title !== 'Counselling Cancelled') {
            notifTitle = 'Counselling Cancelled';
            notifMessage = 'Your scheduled counselling session has been cancelled. Please check for further updates.';
          }
        } else if (!latestNotif || !existingRow) {
          // Initial schedule notification
          notifTitle = 'Counselling Scheduled';
          notifMessage = `Your counselling session has been scheduled.\n\nCounsellor: ${counsellor}\nDate: ${cleanDate}\nTime: ${cleanTime}\nType: ${type}`;
          if (effectiveNotes) {
            notifMessage += `\n\nNotes & Instructions:\n${effectiveNotes}`;
          }
        } else {
          // Editing existing session: check if date, time, or notes changed
          const oldCleanDate = formatCounsellingDate(existingRow.scheduled_date);
          const oldCleanTime = formatCounsellingTime(existingRow.scheduled_time);
          const isDateOrTimeChanged = (oldCleanDate && cleanDate && oldCleanDate !== cleanDate) ||
                                      (oldCleanTime && cleanTime && oldCleanTime !== cleanTime);

          if (isDateOrTimeChanged || isNotesChanged) {
            if (isDateOrTimeChanged && isNotesChanged) {
              notifTitle = 'Counselling Schedule & Notes Updated';
              notifMessage = `Your counselling session has been rescheduled and updated.\n\nDate: ${cleanDate}\nTime: ${cleanTime}`;
              if (effectiveNotes) {
                notifMessage += `\n\nNotes & Instructions:\n${effectiveNotes}`;
              }
            } else if (isDateOrTimeChanged) {
              notifTitle = 'Counselling Schedule Updated';
              notifMessage = `Your counselling session has been rescheduled.\n\nDate: ${cleanDate}\nTime: ${cleanTime}`;
              if (effectiveNotes) {
                notifMessage += `\n\nNotes & Instructions:\n${effectiveNotes}`;
              }
            } else {
              notifTitle = 'Counselling Notes Updated';
              notifMessage = `Your counsellor has updated the session notes and instructions for your appointment on ${cleanDate} at ${cleanTime}.\n\nNotes & Instructions:\n${effectiveNotes}`;
            }
          }
        }

        if (notifTitle && notifMessage) {
          await query(`
            INSERT INTO notifications (profile_id, student_id, title, message, type, is_read)
            VALUES ($1, $2, $3, $4, 'counselling', false);
          `, [student.profile_id, student.id, notifTitle, notifMessage]);
        }

        if (status.toLowerCase() === 'completed') {
          // Trigger feedback request ONLY if student's follow-up is also Completed
          await triggerFeedbackRequestIfNeeded(student.id, String(counsellingRow.id));
        }
      }
    }

    return res.status(c.id ? 200 : 201).json(counsellingRow);
  } catch (err) {
    console.error('Error upserting counselling:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateCounselling(req: Request, res: Response) {
  req.body = { ...req.body, id: req.params.id };
  return upsertCounselling(req, res);
}
