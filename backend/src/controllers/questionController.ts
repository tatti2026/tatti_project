import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

export async function ensureQuestionsSchema(): Promise<void> {
  try {
    await query(`
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS marks_a INTEGER DEFAULT 1;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS marks_b INTEGER DEFAULT 1;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS marks_c INTEGER DEFAULT 1;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS marks_d INTEGER DEFAULT 1;
      ALTER TABLE questions ALTER COLUMN correct_answer DROP NOT NULL;
      ALTER TABLE questions ALTER COLUMN marks DROP NOT NULL;
      ALTER TABLE questions ALTER COLUMN difficulty DROP NOT NULL;
    `);
    console.log('[PSY CARE Backend] questions table schema verified (option marks columns ensured).');
  } catch (err: any) {
    console.error('[PSY CARE Backend] Note on questions schema migration:', err.message);
  }
}

export async function getActiveQuestions(_req: Request, res: Response) {
  try {
    const result = await query('SELECT * FROM questions WHERE is_active = true ORDER BY created_at ASC LIMIT 30');
    return res.json(result.rows);
  } catch (err: any) {
    console.error('[questionController/getActiveQuestions] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error while fetching active questions' });
  }
}

export async function getAllQuestions(_req: Request, res: Response) {
  try {
    const result = await query('SELECT * FROM questions ORDER BY created_at DESC');
    console.log(`[questionController/getAllQuestions] Loaded ${result.rows.length} questions`);
    return res.json(result.rows);
  } catch (err: any) {
    console.error('[questionController/getAllQuestions] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error while fetching questions' });
  }
}

/** Parse and validate an option marks value — must be a non-negative integer. */
function parseOptionMarks(val: unknown, fallback = 1): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  if (Number.isFinite(n) && n >= 0) return Math.round(n);
  return fallback;
}

export async function createQuestion(req: Request, res: Response) {
  try {
    const {
      question_text, option_a, option_b, option_c, option_d,
      marks_a, marks_b, marks_c, marks_d,
      // Legacy fields kept nullable so old requests do not break
      correct_answer, difficulty, category, is_active
    } = req.body;

    if (
      !question_text?.trim() ||
      !option_a?.trim() ||
      !option_b?.trim() ||
      !option_c?.trim() ||
      !option_d?.trim()
    ) {
      return res.status(400).json({ error: 'Question text and all 4 options are required.' });
    }

    // Validate that all four option marks are provided and are non-negative integers
    if (
      marks_a === undefined || marks_a === null || marks_a === '' ||
      marks_b === undefined || marks_b === null || marks_b === '' ||
      marks_c === undefined || marks_c === null || marks_c === '' ||
      marks_d === undefined || marks_d === null || marks_d === ''
    ) {
      return res.status(400).json({ error: 'Marks for all four options (A, B, C, D) are required.' });
    }

    const cleanedMarksA = parseOptionMarks(marks_a);
    const cleanedMarksB = parseOptionMarks(marks_b);
    const cleanedMarksC = parseOptionMarks(marks_c);
    const cleanedMarksD = parseOptionMarks(marks_d);

    // Legacy optional fields
    const cleanedCorrectAnswer = (
      typeof correct_answer === 'string' &&
      ['A', 'B', 'C', 'D'].includes(correct_answer.trim().toUpperCase())
    ) ? correct_answer.trim().toUpperCase() : null;

    const cleanedCategory = (typeof category === 'string' && category.trim()) ? category.trim() : null;

    const cleanedDifficulty = (
      typeof difficulty === 'string' &&
      ['easy', 'medium', 'hard'].includes(difficulty.trim().toLowerCase())
    ) ? difficulty.trim().toLowerCase() : 'medium';

    const cleanedIsActive = is_active !== undefined ? Boolean(is_active) : true;

    // The legacy single `marks` column gets the max of the four option marks for backwards compatibility
    const legacyMarks = Math.max(cleanedMarksA, cleanedMarksB, cleanedMarksC, cleanedMarksD);

    console.log('[questionController/createQuestion] Inserting question:', {
      textPreview: question_text.trim().substring(0, 40) + '...',
      cleanedMarksA, cleanedMarksB, cleanedMarksC, cleanedMarksD,
      cleanedCorrectAnswer, cleanedIsActive,
    });

    const result = await query(`
      INSERT INTO questions (
        question_text, option_a, option_b, option_c, option_d,
        marks_a, marks_b, marks_c, marks_d, marks,
        correct_answer, difficulty, category, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `, [
      question_text.trim(),
      option_a.trim(),
      option_b.trim(),
      option_c.trim(),
      option_d.trim(),
      cleanedMarksA,
      cleanedMarksB,
      cleanedMarksC,
      cleanedMarksD,
      legacyMarks,
      cleanedCorrectAnswer,
      cleanedDifficulty,
      cleanedCategory,
      cleanedIsActive
    ]);

    const created = result.rows[0];
    console.log('[questionController/createQuestion] Successfully created question ID:', created?.id);
    return res.status(201).json(created);
  } catch (err: any) {
    console.error('[questionController/createQuestion] Error creating question:', err.message, err.detail);
    return res.status(500).json({ error: err.message || 'Internal server error while creating question' });
  }
}

export async function updateQuestion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Valid question ID is required.' });
    }

    const allowedFields = [
      'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
      'marks_a', 'marks_b', 'marks_c', 'marks_d',
      // Legacy fields kept for backwards compatibility
      'correct_answer', 'marks', 'difficulty', 'category', 'is_active'
    ];

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fieldsToUpdate.push(`${field} = $${idx}`);
        let val = body[field];

        if (field === 'correct_answer') {
          val = (
            typeof val === 'string' &&
            ['A', 'B', 'C', 'D'].includes(val.trim().toUpperCase())
          ) ? val.trim().toUpperCase() : null;
        } else if (field === 'marks') {
          val = (val !== null && val !== '' && !isNaN(Number(val))) ? Number(val) : null;
        } else if (['marks_a', 'marks_b', 'marks_c', 'marks_d'].includes(field)) {
          val = parseOptionMarks(val);
        } else if (field === 'category') {
          val = (typeof val === 'string' && val.trim()) ? val.trim() : null;
        } else if (field === 'difficulty') {
          val = (
            typeof val === 'string' &&
            ['easy', 'medium', 'hard'].includes(val.trim().toLowerCase())
          ) ? val.trim().toLowerCase() : 'medium';
        } else if (field === 'is_active') {
          val = Boolean(val);
        }

        values.push(val);
        idx++;
      }
    }

    // If all option marks are present or updated, synchronize legacy `marks` column
    const optionMarkFields = ['marks_a', 'marks_b', 'marks_c', 'marks_d'] as const;
    const allOptionMarksPresent = optionMarkFields.every(f => body[f] !== undefined);
    if (allOptionMarksPresent) {
      const legacyMarks = Math.max(
        parseOptionMarks(body.marks_a),
        parseOptionMarks(body.marks_b),
        parseOptionMarks(body.marks_c),
        parseOptionMarks(body.marks_d),
      );
      const marksIdx = fieldsToUpdate.findIndex(f => f.startsWith('marks ='));
      if (marksIdx >= 0) {
        values[marksIdx] = legacyMarks;
      } else {
        fieldsToUpdate.push(`marks = $${idx}`);
        values.push(legacyMarks);
        idx++;
      }
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update.' });
    }

    fieldsToUpdate.push(`updated_at = now()`);
    values.push(id);

    const queryStr = `UPDATE questions SET ${fieldsToUpdate.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(queryStr, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    console.log('[questionController/updateQuestion] Updated question ID:', id, {
      marks_a: result.rows[0].marks_a,
      marks_b: result.rows[0].marks_b,
      marks_c: result.rows[0].marks_c,
      marks_d: result.rows[0].marks_d,
      marks: result.rows[0].marks,
    });
    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('[questionController/updateQuestion] Error updating question:', err.message, err.detail);
    return res.status(500).json({ error: err.message || 'Internal server error while updating question' });
  }
}

export async function deleteQuestion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query('DELETE FROM questions WHERE id = $1', [id]);
    console.log('[questionController/deleteQuestion] Deleted question ID:', id);
    return res.json({ success: true, message: 'Question deleted successfully' });
  } catch (err: any) {
    console.error('[questionController/deleteQuestion] Error deleting question:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error while deleting question' });
  }
}
