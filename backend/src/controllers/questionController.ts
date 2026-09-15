import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

export async function getActiveQuestions(_req: Request, res: Response) {
  try {
    const result = await query('SELECT * FROM questions WHERE is_active = true ORDER BY created_at ASC LIMIT 30');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error getting active questions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllQuestions(_req: Request, res: Response) {
  try {
    const result = await query('SELECT * FROM questions ORDER BY created_at DESC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error getting all questions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createQuestion(req: Request, res: Response) {
  try {
    const {
      question_text, option_a, option_b, option_c, option_d,
      correct_answer, marks, difficulty, category, is_active
    } = req.body;

    const result = await query(`
      INSERT INTO questions (
        question_text, option_a, option_b, option_c, option_d,
        correct_answer, marks, difficulty, category, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `, [
      question_text, option_a, option_b, option_c, option_d,
      correct_answer, marks || 1, difficulty || 'medium', category || 'General',
      is_active !== undefined ? is_active : true
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating question:', err);
    res.status(500).json({ error: 'Internal server error' });
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
        values.push(body[field]);
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

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating question:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteQuestion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query('DELETE FROM questions WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Question deleted successfully' });
  } catch (err) {
    console.error('Error deleting question:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
