import type { Response } from 'express';
import { query } from '../database/pgPool.js';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function verifyCounsellorAccess(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required. Missing token.' });
    return false;
  }
  // Admin and student accounts MUST be explicitly blocked with 403 Forbidden
  if (req.user.role !== 'counsellor') {
    res.status(403).json({ error: 'Forbidden: Private notes are strictly accessible only by counsellors.' });
    return false;
  }
  return true;
}

export async function getPrivateNotes(req: AuthenticatedRequest, res: Response) {
  try {
    if (!verifyCounsellorAccess(req, res)) return;

    const counsellorId = req.user!.userId;
    const { counselling_id, student_id } = req.query;

    let sql = `
      SELECT id, student_id, counselling_id, counsellor_id, note_text, created_at, updated_at
      FROM counsellor_private_notes
      WHERE counsellor_id = $1
    `;
    const params: any[] = [counsellorId];

    if (counselling_id && typeof counselling_id === 'string') {
      params.push(counselling_id);
      sql += ` AND counselling_id = $${params.length}`;
    }

    if (student_id && typeof student_id === 'string') {
      params.push(student_id);
      sql += ` AND student_id = $${params.length}`;
    }

    sql += ' ORDER BY updated_at DESC';

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('[counsellorPrivateNotes] Error fetching private notes');
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPrivateNoteById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!verifyCounsellorAccess(req, res)) return;

    const counsellorId = req.user!.userId;
    const { id } = req.params;

    const result = await query(
      `SELECT id, student_id, counselling_id, counsellor_id, note_text, created_at, updated_at
       FROM counsellor_private_notes
       WHERE id = $1 AND counsellor_id = $2`,
      [id, counsellorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Private note not found or access denied.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[counsellorPrivateNotes] Error fetching note by ID');
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addPrivateNote(req: AuthenticatedRequest, res: Response) {
  try {
    if (!verifyCounsellorAccess(req, res)) return;

    const counsellorId = req.user!.userId;
    const { counselling_id, student_id, note_text } = req.body;

    if (!counselling_id || !student_id) {
      return res.status(400).json({ error: 'counselling_id and student_id are required.' });
    }

    if (!note_text || typeof note_text !== 'string' || !note_text.trim()) {
      return res.status(400).json({ error: 'Note text cannot be empty.' });
    }

    const trimmed = note_text.trim();
    if (trimmed.length > 2000) {
      return res.status(400).json({ error: 'Note text cannot exceed 2000 characters.' });
    }

    const cleanText = escapeHtml(trimmed);

    const result = await query(
      `INSERT INTO counsellor_private_notes (student_id, counselling_id, counsellor_id, note_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (counsellor_id, counselling_id) DO UPDATE SET
         note_text = EXCLUDED.note_text,
         updated_at = now()
       RETURNING id, student_id, counselling_id, counsellor_id, note_text, created_at, updated_at`,
      [student_id, counselling_id, counsellorId, cleanText]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[counsellorPrivateNotes] Error saving private note');
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updatePrivateNote(req: AuthenticatedRequest, res: Response) {
  try {
    if (!verifyCounsellorAccess(req, res)) return;

    const counsellorId = req.user!.userId;
    const { id } = req.params;
    const { note_text } = req.body;

    if (!note_text || typeof note_text !== 'string' || !note_text.trim()) {
      return res.status(400).json({ error: 'Note text cannot be empty.' });
    }

    const trimmed = note_text.trim();
    if (trimmed.length > 2000) {
      return res.status(400).json({ error: 'Note text cannot exceed 2000 characters.' });
    }

    const cleanText = escapeHtml(trimmed);

    const result = await query(
      `UPDATE counsellor_private_notes
       SET note_text = $1, updated_at = now()
       WHERE id = $2 AND counsellor_id = $3
       RETURNING id, student_id, counselling_id, counsellor_id, note_text, created_at, updated_at`,
      [cleanText, id, counsellorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Private note not found or access denied.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[counsellorPrivateNotes] Error updating private note');
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deletePrivateNote(req: AuthenticatedRequest, res: Response) {
  try {
    if (!verifyCounsellorAccess(req, res)) return;

    const counsellorId = req.user!.userId;
    const { id } = req.params;

    const result = await query(
      `DELETE FROM counsellor_private_notes
       WHERE id = $1 AND counsellor_id = $2
       RETURNING id`,
      [id, counsellorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Private note not found or access denied.' });
    }

    return res.json({ message: 'Private note deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error('[counsellorPrivateNotes] Error deleting private note');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
