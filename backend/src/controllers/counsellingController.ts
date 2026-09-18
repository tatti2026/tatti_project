import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';
import { calculateReminderDatetime } from '../services/counsellingReminderService.js';

export async function getStudentCounselling(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const result = await query(
      'SELECT * FROM counselling WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1',
      [studentId]
    );
    return res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error getting student counselling:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllCounselling(req: Request, res: Response) {
  try {
    const { page, pageSize, limit, search = '' } = req.query;
    const isPaginated = page !== undefined || limit !== undefined || pageSize !== undefined;

    const rawPage = Number(page);
    const p = isNaN(rawPage) || rawPage <= 0 ? 1 : rawPage;
    const ps = Math.max(1, Number(limit || pageSize) || 10);
    const offset = (p - 1) * ps;

    let baseWhere = '1=1';
    const queryParams: any[] = [];

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
        c.*,
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

export async function upsertCounselling(req: Request, res: Response) {
  try {
    const c = req.body;
    const reminderOpt = c.reminder_option || c.reminder || '1 day before';
    const dateStr = c.scheduled_date || '';
    const timeStr = c.scheduled_time || '10:30 AM';

    const { reminderDatetime, isPast } = calculateReminderDatetime(dateStr, timeStr, reminderOpt);

    // If reminder is already in the past, mark elapsed so worker won't send an outdated notification
    const reminderSent = isPast;
    const notifStatus = isPast ? 'elapsed' : 'pending';

    let counsellingRow: any;

    if (c.id) {
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

      // Update reminder fields
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
      values.push(c.id);

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
        c.student_id, c.counsellor_name || 'TATTI Counsellor', c.scheduled_date || null,
        c.scheduled_time || '10:30 AM', c.mode || 'Online', c.venue_or_link || '',
        c.instructions || '', c.notes || '', c.status || 'scheduled',
        reminderOpt, reminderDatetime, reminderSent, notifStatus
      ]);
      counsellingRow = result.rows[0];
    }

    // Always ensure student's counselling_status in students table is updated
    if (c.student_id) {
      await query(
        "UPDATE students SET counselling_status = $1, updated_at = now() WHERE id = $2",
        [c.status || 'scheduled', c.student_id]
      );

      // Create immediate counselling notification for the student
      const studentRes = await query('SELECT profile_id, full_name FROM students WHERE id = $1', [c.student_id]);
      const profileId = studentRes.rows[0]?.profile_id;

      if (profileId && dateStr) {
        const counsellor = c.counsellor_name || 'TATTI Counsellor';
        const notifMsg = `Your TATTI counselling session is scheduled for ${dateStr} at ${timeStr} with ${counsellor}.`;
        
        await query(`
          INSERT INTO notifications (profile_id, title, message, type, is_read)
          VALUES ($1, $2, $3, 'counselling', false);
        `, [profileId, '📅 Counselling Scheduled', notifMsg]);
      }
    }

    return res.status(c.id ? 200 : 201).json(counsellingRow);
  } catch (err) {
    console.error('Error upserting counselling:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateCounselling(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const c = req.body;

    const allowedFields = [
      'counsellor_name', 'scheduled_date', 'scheduled_time', 'mode',
      'venue_or_link', 'instructions', 'notes', 'status',
      'reminder_option', 'reminder_datetime', 'reminder_sent', 'notification_status'
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

    if (updates.length === 0) {
      return res.json({ message: 'No fields to update' });
    }

    updates.push('updated_at = now()');
    values.push(id);

    const queryStr = `UPDATE counselling SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(queryStr, values);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating counselling:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
