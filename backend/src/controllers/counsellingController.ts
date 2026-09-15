import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

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

export async function getAllCounselling(_req: Request, res: Response) {
  try {
    const result = await query('SELECT * FROM counselling ORDER BY created_at DESC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error getting all counselling:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function upsertCounselling(req: Request, res: Response) {
  try {
    const c = req.body;
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

      updates.push('updated_at = now()');
      values.push(c.id);

      const queryStr = `UPDATE counselling SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await query(queryStr, values);
      return res.json(result.rows[0]);
    } else {
      const result = await query(`
        INSERT INTO counselling (
          student_id, counsellor_name, scheduled_date, scheduled_time,
          mode, venue_or_link, instructions, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `, [
        c.student_id, c.counsellor_name || '', c.scheduled_date || null,
        c.scheduled_time || null, c.mode || 'Online', c.venue_or_link || '',
        c.instructions || '', c.notes || '', c.status || 'not_scheduled'
      ]);
      return res.status(201).json(result.rows[0]);
    }
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
