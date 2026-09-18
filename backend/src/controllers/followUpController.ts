import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

export async function getFollowUps(req: Request, res: Response) {
  try {
    const { page, pageSize, limit, intent, search = '' } = req.query;
    const isPaginated = page !== undefined || limit !== undefined || pageSize !== undefined;

    const rawPage = Number(page);
    const p = isNaN(rawPage) || rawPage <= 0 ? 1 : rawPage;
    const ps = Math.max(1, Number(limit || pageSize) || 10);
    const offset = (p - 1) * ps;

    let baseWhere = '1=1';
    const queryParams: any[] = [];

    if (intent && intent !== 'all') {
      queryParams.push(intent);
      baseWhere += ` AND f.intent_level = $${queryParams.length}`;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchStr = `%${search.trim()}%`;
      queryParams.push(searchStr);
      baseWhere += ` AND (f.notes ILIKE $${queryParams.length} OR s.full_name ILIKE $${queryParams.length} OR s.email ILIKE $${queryParams.length} OR s.student_id ILIKE $${queryParams.length})`;
    }

    const countRes = await query(`
      SELECT COUNT(*) 
      FROM follow_ups f
      LEFT JOIN students s ON s.id = f.student_id
      WHERE ${baseWhere}
    `, queryParams);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    let dataQuery = `
      SELECT 
        f.*,
        s.full_name as student_name,
        s.student_id as student_code,
        s.email as student_email,
        s.phone as student_phone
      FROM follow_ups f
      LEFT JOIN students s ON s.id = f.student_id
      WHERE ${baseWhere}
      ORDER BY f.created_at DESC
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
