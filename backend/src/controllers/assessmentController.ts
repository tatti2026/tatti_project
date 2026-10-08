import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';
import { evaluateAssessmentAnswers } from '../services/assessmentScoringService.js';
import { generateCourseRecommendations } from '../services/recommendationService.js';
import { createSystemNotification } from '../services/notificationService.js';
import type { QuestionRecord, CourseRecord } from '../models/index.js';

export async function getStudentAssessment(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const result = await query(
      'SELECT * FROM assessments WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1',
      [studentId]
    );
    return res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error fetching student assessment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createAssessment(req: Request, res: Response) {
  try {
    const { studentId } = req.body;
    const result = await query(
      `INSERT INTO assessments (student_id, status, started_at) 
       VALUES ($1, 'in_progress', now()) 
       RETURNING *`,
      [studentId]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating assessment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function submitAssessment(req: Request, res: Response) {
  try {
    const { studentId, answers } = req.body;
    if (!studentId || !answers) {
      return res.status(400).json({ error: 'studentId and answers are required.' });
    }

    const qRes = await query('SELECT * FROM questions WHERE is_active = true');
    const evaluation = evaluateAssessmentAnswers(qRes.rows as QuestionRecord[], answers);

    const assessmentRes = await query(`
      INSERT INTO assessments (student_id, score, total_marks, percentage, answers, status, submitted_at)
      VALUES ($1, $2, $3, $4, $5, 'completed', now())
      RETURNING *;
    `, [studentId, evaluation.score, evaluation.totalMarks, evaluation.percentage, JSON.stringify(answers)]);

    const assessment = assessmentRes.rows[0];

    await query(
      "UPDATE students SET assessment_status = 'completed', updated_at = now() WHERE id = $1",
      [studentId]
    );

    const cRes = await query("SELECT * FROM courses WHERE status = 'available'");
    const recommendations = generateCourseRecommendations(evaluation.percentage, cRes.rows as CourseRecord[]);

    for (const rec of recommendations) {
      await query(`
        INSERT INTO course_recommendations (student_id, course_id, recommendation_percentage, is_interested, is_selected)
        VALUES ($1, $2, $3, false, false)
        ON CONFLICT (student_id, course_id) DO UPDATE SET
          recommendation_percentage = EXCLUDED.recommendation_percentage;
      `, [studentId, rec.course.id, rec.matchPercentage]);
    }

    createSystemNotification(
      studentId,
      '✓ Assessment Completed',
      `Your Career Fit Assessment has been evaluated with a score of ${evaluation.score}/${evaluation.totalMarks} (${evaluation.percentage}%). Your recommended courses are now unlocked.`,
      'assessment'
    );

    return res.json({
      message: 'Assessment submitted successfully.',
      evaluation,
      assessment,
      recommendations,
    });
  } catch (err) {
    console.error('Error submitting assessment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function submitAssessmentById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { score, totalMarks, answers } = req.body;

    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

    const result = await query(
      `UPDATE assessments 
       SET score = $1, total_marks = $2, percentage = $3, answers = $4, status = 'completed', submitted_at = now() 
       WHERE id = $5 
       RETURNING *`,
      [score, totalMarks, percentage, JSON.stringify(answers || {}), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = result.rows[0];

    // Update student's assessment status to 'completed'
    await query(
      "UPDATE students SET assessment_status = 'completed', updated_at = now() WHERE id = $1",
      [assessment.student_id]
    );

    // Generate recommendations automatically
    const coursesRes = await query("SELECT * FROM courses WHERE status = 'available'");
    const recommendations = generateCourseRecommendations(percentage, coursesRes.rows as CourseRecord[]);

    for (const rec of recommendations) {
      await query(`
        INSERT INTO course_recommendations (student_id, course_id, recommendation_percentage, is_interested, is_selected)
        VALUES ($1, $2, $3, false, false)
        ON CONFLICT (student_id, course_id) DO UPDATE SET
          recommendation_percentage = EXCLUDED.recommendation_percentage;
      `, [assessment.student_id, rec.course.id, rec.matchPercentage]);
    }

    return res.json({
      message: 'Assessment submitted successfully',
      assessment: result.rows[0],
      recommendations,
    });
  } catch (err) {
    console.error('Error submitting assessment by id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStudentRecommendations(req: Request, res: Response) {
  try {
    const { studentId } = req.params;

    // Fetch all currently available courses
    const coursesRes = await query("SELECT * FROM courses WHERE status = 'available' ORDER BY course_name ASC");
    const availableCourses = coursesRes.rows;

    // Fetch existing recommendations for this student that belong to available courses
    const result = await query(`
      SELECT r.*, row_to_json(c.*) as course 
      FROM course_recommendations r 
      JOIN courses c ON r.course_id = c.id 
      WHERE r.student_id = $1 AND c.status = 'available'
      ORDER BY r.recommendation_percentage DESC
    `, [studentId]);

    const existingRecs = result.rows;

    // If student has existing recommendations, ensure ANY newly activated available course is also included
    if (existingRecs.length > 0 && availableCourses.length > 0) {
      const existingCourseIds = new Set(existingRecs.map(r => r.course_id));
      const missingCourses = availableCourses.filter(c => !existingCourseIds.has(c.id));

      if (missingCourses.length > 0) {
        const avgPct = Math.round(
          existingRecs.reduce((sum, r) => sum + (Number(r.recommendation_percentage) || 70), 0) / existingRecs.length
        ) || 75;

        for (let i = 0; i < missingCourses.length; i++) {
          const course = missingCourses[i];
          const pct = Math.max(50, Math.min(95, avgPct - (i * 2)));
          try {
            await query(`
              INSERT INTO course_recommendations (student_id, course_id, recommendation_percentage, is_interested, is_selected)
              VALUES ($1, $2, $3, false, false)
              ON CONFLICT (student_id, course_id) DO UPDATE SET
                recommendation_percentage = EXCLUDED.recommendation_percentage;
            `, [studentId, course.id, pct]);
          } catch (e) {
            console.error('Error inserting recommendation for course:', course.id, e);
          }
          existingRecs.push({
            id: `rec-${course.id}`,
            student_id: studentId,
            course_id: course.id,
            recommendation_percentage: pct,
            is_interested: false,
            is_selected: false,
            course,
          });
        }
      }
    }

    existingRecs.sort((a, b) => (Number(b.recommendation_percentage) || 0) - (Number(a.recommendation_percentage) || 0));
    return res.json(existingRecs);
  } catch (err) {
    console.error('Error fetching recommendations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function upsertRecommendation(req: Request, res: Response) {
  try {
    const { student_id, course_id, recommendation_percentage, is_interested, is_selected } = req.body;
    const result = await query(`
      INSERT INTO course_recommendations (
        student_id, course_id, recommendation_percentage, is_interested, is_selected
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (student_id, course_id) DO UPDATE SET
        recommendation_percentage = COALESCE(EXCLUDED.recommendation_percentage, course_recommendations.recommendation_percentage),
        is_interested = COALESCE(EXCLUDED.is_interested, course_recommendations.is_interested),
        is_selected = COALESCE(EXCLUDED.is_selected, course_recommendations.is_selected)
      RETURNING *;
    `, [student_id, course_id, recommendation_percentage || 0, !!is_interested, !!is_selected]);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error upserting recommendation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllAssessments(req: Request, res: Response) {
  try {
    const result = await query(`
      SELECT DISTINCT ON (student_id) *
      FROM assessments
      ORDER BY student_id, created_at DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all assessments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
