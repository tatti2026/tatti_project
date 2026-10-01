import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';
import { verifyToken } from '../utils/jwt.js';

async function getAdminInfo(req: Request): Promise<{ adminId: string | null; adminName: string }> {
  let adminId: string | null = null;
  let adminName: string = (req.body && req.body.admin_name) || 'Admin';

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (payload) {
      adminId = payload.userId || null;
      if (!req.body || !req.body.admin_name) {
        try {
          const pRes = await query('SELECT full_name FROM profiles WHERE id = $1', [payload.userId]);
          if (pRes.rows[0]?.full_name) {
            adminName = pRes.rows[0].full_name;
          } else if (payload.email) {
            adminName = payload.email;
          }
        } catch {
          adminName = payload.email || 'Admin';
        }
      }
    }
  }

  return { adminId, adminName };
}

async function syncFollowUpNote(
  studentId: string,
  noteText: string | undefined | null,
  adminId: string | null,
  adminName: string
) {
  if (!studentId) return null;

  // 1. Fetch current latest note for this student
  const latestRes = await query(
    `SELECT * FROM follow_up_notes 
     WHERE student_id = $1 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [studentId]
  );
  const currentLatest = latestRes.rows[0] || null;

  const trimmed = (noteText || '').trim();

  // If no note text provided, don't create a note; just return existing latest note
  if (!trimmed) {
    return currentLatest;
  }

  // Duplicate prevention:
  // If currentLatest exists and has the EXACT same text, do NOT insert a duplicate!
  if (currentLatest && currentLatest.note.trim() === trimmed) {
    return currentLatest;
  }

  // Insert new note into follow_up_notes (newest note, sorted created_at DESC)
  const insertRes = await query(
    `INSERT INTO follow_up_notes (student_id, admin_id, admin_name, note)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [studentId, adminId, adminName || 'Admin', trimmed]
  );

  return insertRes.rows[0];
}

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
    const { adminId, adminName } = await getAdminInfo(req);

    if (f.id) {
      let studentId = f.student_id;
      if (!studentId) {
        const findStudent = await query('SELECT student_id FROM follow_ups WHERE id = $1', [f.id]);
        studentId = findStudent.rows[0]?.student_id;
      }

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
      const updatedRow = result.rows[0];

      // Synchronize note with follow_up_notes
      let latestNote = null;
      if (studentId) {
        latestNote = await syncFollowUpNote(studentId, f.notes, adminId, adminName);
      }

      return res.json({
        ...updatedRow,
        latest_note: latestNote,
      });
    } else {
      const result = await query(`
        INSERT INTO follow_ups (student_id, intent_level, last_interaction, followup_date, followup_status, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `, [
        f.student_id, f.intent_level || 'medium', f.last_interaction || null,
        f.followup_date || null, f.followup_status || 'pending', f.notes || ''
      ]);
      const createdRow = result.rows[0];

      let latestNote = null;
      if (f.student_id) {
        latestNote = await syncFollowUpNote(f.student_id, f.notes, adminId, adminName);
      }

      return res.status(201).json({
        ...createdRow,
        latest_note: latestNote,
      });
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
    const { adminId, adminName } = await getAdminInfo(req);

    let studentId = f.student_id;
    if (!studentId) {
      const findStudent = await query('SELECT student_id FROM follow_ups WHERE id = $1', [id]);
      studentId = findStudent.rows[0]?.student_id;
    }

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
    const updatedRow = result.rows[0];

    let latestNote = null;
    if (studentId) {
      latestNote = await syncFollowUpNote(studentId, f.notes, adminId, adminName);
    }

    return res.json({
      ...updatedRow,
      latest_note: latestNote,
    });
  } catch (err) {
    console.error('Error updating follow up:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

