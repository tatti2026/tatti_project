import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

export async function getFollowUps(_req: Request, res: Response) {
  try {
    const result = await query('SELECT * FROM follow_ups ORDER BY created_at DESC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching follow ups:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function upsertFollowUp(req: Request, res: Response) {
  try {
    const f = req.body;
    if (f.id) {
      const allowedFields = ['intent_level', 'last_interaction', 'followup_date', 'followup_status', 'notes'];
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      for (const field of allowedFields) {
        if (f[field] !== undefined) {
          updates.push(`${field} = $${idx}`);
          values.push(f[field]);
          idx++;
        }
      }

      updates.push('updated_at = now()');
      values.push(f.id);

      const queryStr = `UPDATE follow_ups SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await query(queryStr, values);
      return res.json(result.rows[0]);
    } else {
      const result = await query(`
        INSERT INTO follow_ups (student_id, intent_level, last_interaction, followup_date, followup_status, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `, [
        f.student_id, f.intent_level || 'medium', f.last_interaction || null,
        f.followup_date || null, f.followup_status || 'pending', f.notes || ''
      ]);
      return res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error upserting follow up:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateFollowUp(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const f = req.body;
    const allowedFields = ['intent_level', 'last_interaction', 'followup_date', 'followup_status', 'notes'];
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (f[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        values.push(f[field]);
        idx++;
      }
    }

    if (updates.length === 0) {
      return res.json({ message: 'No fields to update' });
    }

    updates.push('updated_at = now()');
    values.push(id);

    const queryStr = `UPDATE follow_ups SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(queryStr, values);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating follow up:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
