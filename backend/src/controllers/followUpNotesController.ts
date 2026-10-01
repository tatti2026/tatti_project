import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// Ensure the table exists (idempotent)
export async function ensureFollowUpNotesTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS follow_up_notes (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      admin_id    UUID,
      admin_name  TEXT NOT NULL DEFAULT 'Admin',
      note        TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Index for fast student look-ups
  await query(`
    CREATE INDEX IF NOT EXISTS idx_follow_up_notes_student_id
    ON follow_up_notes(student_id)
  `);
}

// GET /api/follow-up-notes/:studentId
export async function getNotesByStudent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    const { studentId } = req.params;

    // Verify student exists
    const studentCheck = await query('SELECT id FROM students WHERE id = $1', [studentId]);
    if (studentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const result = await query(
      `SELECT * FROM follow_up_notes WHERE student_id = $1 ORDER BY created_at DESC`,
      [studentId]
    );

    let notes = result.rows;
    // Seamless migration: if no rows exist in follow_up_notes yet, check follow_ups.notes
    if (notes.length === 0) {
      const fuRes = await query(
        `SELECT notes, created_at, updated_at FROM follow_ups 
         WHERE student_id = $1 AND notes IS NOT NULL AND TRIM(notes) != '' 
         ORDER BY updated_at DESC LIMIT 1`,
        [studentId]
      );
      if (fuRes.rows.length > 0 && fuRes.rows[0].notes.trim()) {
        const migrated = await query(
          `INSERT INTO follow_up_notes (student_id, admin_name, note, created_at)
           VALUES ($1, 'Admin', $2, $3)
           RETURNING *`,
          [studentId, fuRes.rows[0].notes.trim(), fuRes.rows[0].updated_at || fuRes.rows[0].created_at || new Date()]
        );
        notes = [migrated.rows[0]];
      }
    }

    return res.json({ data: notes });
  } catch (err) {
    console.error('Error fetching follow-up notes:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/follow-up-notes/:studentId
export async function addNote(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    const { studentId } = req.params;
    const { note, admin_name } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ error: 'Note content is required.' });
    }

    // Verify student exists
    const studentCheck = await query('SELECT id FROM students WHERE id = $1', [studentId]);
    if (studentCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const adminId = req.user.userId || null;
    const adminNameVal = admin_name || req.user.email || 'Admin';

    const result = await query(
      `INSERT INTO follow_up_notes (student_id, admin_id, admin_name, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [studentId, adminId, adminNameVal, note.trim()]
    );

    // Keep follow_ups.notes in sync with newest note
    await query(
      `UPDATE follow_ups SET notes = $1, updated_at = NOW() WHERE student_id = $2`,
      [note.trim(), studentId]
    );

    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error adding follow-up note:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/follow-up-notes/:studentId/:noteId
export async function updateNote(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    const { studentId, noteId } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ error: 'Note content is required.' });
    }

    // Strict student isolation: the note must belong to this student
    const result = await query(
      `UPDATE follow_up_notes
       SET note = $1, updated_at = NOW()
       WHERE id = $2 AND student_id = $3
       RETURNING *`,
      [note.trim(), noteId, studentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found for this student.' });
    }

    // If this note is the latest note, update follow_ups.notes too
    const latestCheck = await query(
      `SELECT id FROM follow_up_notes WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [studentId]
    );
    if (latestCheck.rows[0]?.id === noteId) {
      await query(
        `UPDATE follow_ups SET notes = $1, updated_at = NOW() WHERE student_id = $2`,
        [note.trim(), studentId]
      );
    }

    return res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error updating follow-up note:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
