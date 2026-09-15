import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

export async function getProfile(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM profiles WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body = req.body;

    const allowedFields = ['full_name', 'phone', 'avatar_url'];
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        values.push(body[field]);
        idx++;
      }
    }

    if (updates.length === 0) {
      return res.json({ message: 'No fields to update' });
    }

    updates.push('updated_at = now()');
    values.push(id);

    const queryStr = `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(queryStr, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
