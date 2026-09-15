import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

export async function getAllCourses(_req: Request, res: Response) {
  try {
    const result = await query('SELECT * FROM courses ORDER BY course_name ASC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createCourse(req: Request, res: Response) {
  try {
    const {
      course_name, course_code, description, duration,
      eligibility, fee, category, skills, career_opportunities,
      available_seats, status
    } = req.body;

    const result = await query(`
      INSERT INTO courses (
        course_name, course_code, description, duration,
        eligibility, fee, category, skills, career_opportunities,
        available_seats, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `, [
      course_name, course_code, description || '', duration || '',
      eligibility || '', fee || 0, category || '', skills || [],
      career_opportunities || [], available_seats || 30, status || 'available'
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateCourse(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body = req.body;

    const allowedFields = [
      'course_name', 'course_code', 'description', 'duration',
      'eligibility', 'fee', 'category', 'skills', 'career_opportunities',
      'available_seats', 'status'
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

    const queryStr = `UPDATE courses SET ${fieldsToUpdate.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(queryStr, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteCourse(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query('DELETE FROM courses WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
