import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

export async function ensureQuestionsSchema(): Promise<void> {
  try {
    await query(`
      ALTER TABLE questions ALTER COLUMN correct_answer DROP NOT NULL;
      ALTER TABLE questions ALTER COLUMN marks DROP NOT NULL;
      ALTER TABLE questions ALTER COLUMN difficulty DROP NOT NULL;
    `);
    console.log('[TATTI Backend] questions table schema verified (optional columns nullable).');
  } catch (err: any) {
    console.error('[TATTI Backend] Note on questions schema migration:', err.message);
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

export async function createQuestion(req: Request, res: Response) {
  try {
    const {
      question_text, option_a, option_b, option_c, option_d,
      correct_answer, marks, difficulty, category, is_active
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

    const cleanedCorrectAnswer = (
      typeof correct_answer === 'string' &&
      ['A', 'B', 'C', 'D'].includes(correct_answer.trim().toUpperCase())
    ) ? correct_answer.trim().toUpperCase() : null;

    const cleanedMarks = (
      marks !== undefined && marks !== null && marks !== '' && !isNaN(Number(marks))
    ) ? Number(marks) : null;

    const cleanedCategory = (typeof category === 'string' && category.trim()) ? category.trim() : null;

    const cleanedDifficulty = (
      typeof difficulty === 'string' &&
      ['easy', 'medium', 'hard'].includes(difficulty.trim().toLowerCase())
    ) ? difficulty.trim().toLowerCase() : 'medium';

    const cleanedIsActive = is_active !== undefined ? Boolean(is_active) : true;

    console.log('[questionController/createQuestion] Inserting question:', {
      textPreview: question_text.trim().substring(0, 40) + '...',
      cleanedCorrectAnswer,
      cleanedMarks,
      cleanedDifficulty,
      cleanedCategory,
      cleanedIsActive,
    });

    const result = await query(`
      INSERT INTO questions (
        question_text, option_a, option_b, option_c, option_d,
        correct_answer, marks, difficulty, category, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `, [
      question_text.trim(),
      option_a.trim(),
      option_b.trim(),
      option_c.trim(),
      option_d.trim(),
      cleanedCorrectAnswer,
      cleanedMarks,
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

    const allowedFields = [
      'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
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

    if (fieldsToUpdate.length === 0) {
      return res.json({ message: 'No fields to update' });
    }

    fieldsToUpdate.push(`updated_at = now()`);
    values.push(id);

    const queryStr = `UPDATE questions SET ${fieldsToUpdate.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(queryStr, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    console.log('[questionController/updateQuestion] Updated question ID:', id);
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

