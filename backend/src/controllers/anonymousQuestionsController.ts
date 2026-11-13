import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

/**
 * Generate sequential anonymous reference ID (e.g. AQ-1001, AQ-1002)
 */
async function generateReferenceId(): Promise<string> {
  const counterRes = await query(`
    UPDATE anonymous_question_counters
    SET last_count = last_count + 1
    WHERE id = 1
    RETURNING last_count;
  `);
  const count = counterRes.rows[0]?.last_count || Math.floor(1000 + Math.random() * 9000);
  return `AQ-${count}`;
}

// ----------------- STUDENT ENDPOINTS -----------------

/**
 * Submit an anonymous question.
 * Assigns to the student's assigned counsellor so that counsellor can see and reply.
 */
export async function submitAnonymousQuestion(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    if (caller.role.toLowerCase() !== 'student') {
      return res.status(403).json({ error: 'Only students can submit anonymous questions.' });
    }

    const { question, category, title, description } = req.body;
    const finalQuestion = (description || question || '').trim();
    if (!finalQuestion) {
      return res.status(400).json({ error: 'Please enter a valid question or concern.' });
    }
    const finalCategory = (category || 'General Guidance').trim();
    const finalTitle = (title || (finalQuestion.length > 50 ? finalQuestion.substring(0, 50) + '...' : finalQuestion)).trim();

    // Resolve student record to find their assigned counsellor
    const sRes = await query('SELECT id, counsellor_id FROM students WHERE profile_id = $1', [caller.userId]);
    if (sRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }
    const student = sRes.rows[0];

    // Ensure student has an assigned counsellor (fallback to default TATTI Senior Counsellor if unassigned)
    if (!student.counsellor_id) {
      const defCounsellor = await query(`
        SELECT id FROM profiles 
        WHERE (email = 'counsellor@tatti.edu.in' OR role = 'counsellor') 
        ORDER BY (email = 'counsellor@tatti.edu.in') DESC 
        LIMIT 1
      `);
      if (defCounsellor.rows.length > 0) {
        student.counsellor_id = defCounsellor.rows[0].id;
        await query('UPDATE students SET counsellor_id = $1, updated_at = now() WHERE id = $2', [
          student.counsellor_id,
          student.id
        ]);
      }
    }

    const refId = await generateReferenceId();

    const insertRes = await query(`
      INSERT INTO anonymous_questions (student_id, counsellor_id, reference_id, question, category, title, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
      RETURNING id, reference_id, question, category, title, status, created_at;
    `, [student.id, student.counsellor_id, refId, finalQuestion, finalCategory, finalTitle]);

    const created = insertRes.rows[0];

    // Notify assigned counsellor WITHOUT exposing student identity
    if (student.counsellor_id) {
      await query(`
        INSERT INTO notifications (profile_id, title, message, type, is_read)
        VALUES ($1, 'New Anonymous Question', 'A student submitted an anonymous question (' || $2 || ').', 'anonymous_question', false)
      `, [student.counsellor_id, refId]);
    }

    return res.status(201).json({
      success: true,
      message: 'Your question has been submitted anonymously.',
      question: created
    });
  } catch (err) {
    console.error('Error submitting anonymous question:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all anonymous questions submitted by the calling student.
 */
export async function getStudentAnonymousQuestions(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    const sRes = await query('SELECT id FROM students WHERE profile_id = $1', [caller.userId]);
    if (sRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }
    const studentId = sRes.rows[0].id;

    const questionsRes = await query(`
      SELECT 
        q.id,
        q.reference_id,
        q.question,
        COALESCE(q.category, 'General Guidance') as category,
        COALESCE(q.title, substring(q.question from 1 for 50)) as title,
        q.status,
        q.created_at,
        q.updated_at,
        (SELECT COUNT(*) FROM anonymous_question_replies WHERE question_id = q.id) as reply_count
      FROM anonymous_questions q
      WHERE q.student_id = $1
      ORDER BY q.created_at DESC
    `, [studentId]);

    return res.json(questionsRes.rows);
  } catch (err) {
    console.error('Error fetching student anonymous questions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get details & thread for a single question.
 * Allowed for the submitting student or assigned counsellor.
 * NEVER returns student identifying fields.
 */
export async function getAnonymousQuestionThread(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();

    const qRes = await query(`
      SELECT id, student_id, counsellor_id, reference_id, question, COALESCE(category, 'General Guidance') as category, COALESCE(title, substring(question from 1 for 50)) as title, status, created_at, updated_at
      FROM anonymous_questions
      WHERE id = $1
    `, [id]);

    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    const q = qRes.rows[0];

    // Authorization check
    if (role === 'student') {
      const sRes = await query('SELECT id FROM students WHERE profile_id = $1', [caller.userId]);
      if (sRes.rows.length === 0 || sRes.rows[0].id !== q.student_id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    } else if (role === 'counsellor') {
      if (q.counsellor_id && q.counsellor_id !== caller.userId) {
        const sRes = await query('SELECT counsellor_id FROM students WHERE id = $1', [q.student_id]);
        if (sRes.rows[0]?.counsellor_id !== caller.userId) {
          return res.status(403).json({ error: 'Access denied: Question not assigned to you.' });
        }
      }
    }

    // Fetch replies without exposing internal sender UUIDs to the other party
    const repliesRes = await query(`
      SELECT 
        id,
        question_id,
        sender_type,
        message,
        created_at
      FROM anonymous_question_replies
      WHERE question_id = $1
      ORDER BY created_at ASC
    `, [id]);

    // Omit student_id and counsellor_id from output
    const safeQuestion = {
      id: q.id,
      reference_id: q.reference_id,
      question: q.question,
      category: q.category,
      title: q.title,
      status: q.status,
      created_at: q.created_at,
      updated_at: q.updated_at
    };

    return res.json({
      question: safeQuestion,
      replies: repliesRes.rows
    });
  } catch (err) {
    console.error('Error getting anonymous question thread:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Post a reply in the anonymous question thread (student or counsellor).
 */
export async function replyToAnonymousQuestion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { message, reply } = req.body;
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();
    const finalMessage = (message || reply || '').trim();

    if (!finalMessage) {
      return res.status(400).json({ error: 'Reply message cannot be empty.' });
    }

    const qRes = await query('SELECT id, student_id, counsellor_id, reference_id FROM anonymous_questions WHERE id = $1', [id]);
    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    const q = qRes.rows[0];

    let senderType: 'student' | 'counsellor';

    if (role === 'student') {
      const sRes = await query('SELECT id FROM students WHERE profile_id = $1', [caller.userId]);
      if (sRes.rows.length === 0 || sRes.rows[0].id !== q.student_id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      senderType = 'student';
    } else if (role === 'counsellor' || role === 'admin') {
      if (role === 'counsellor' && q.counsellor_id && q.counsellor_id !== caller.userId) {
        const sRes = await query('SELECT counsellor_id FROM students WHERE id = $1', [q.student_id]);
        if (sRes.rows[0]?.counsellor_id !== caller.userId) {
          return res.status(403).json({ error: 'Access denied.' });
        }
      }
      senderType = 'counsellor';
    } else {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const replyRes = await query(`
      INSERT INTO anonymous_question_replies (question_id, sender_type, sender_id, message)
      VALUES ($1, $2, $3, $4)
      RETURNING id, question_id, sender_type, message, created_at;
    `, [id, senderType, caller.userId, message.trim()]);

    // If counsellor replied, update question status to 'Answered'
    if (senderType === 'counsellor') {
      await query(`
        UPDATE anonymous_questions
        SET status = 'Answered', updated_at = now()
        WHERE id = $1 AND status != 'Closed'
      `, [id]);

      // Notify student
      const studentProfileRes = await query(`
        SELECT s.profile_id FROM students s
        JOIN anonymous_questions q ON q.student_id = s.id
        WHERE q.id = $1
      `, [id]);
      if (studentProfileRes.rows.length > 0 && studentProfileRes.rows[0].profile_id) {
        await query(`
          INSERT INTO notifications (profile_id, title, message, type, is_read)
          VALUES ($1, 'Reply to Anonymous Question', 'A counsellor has responded to your anonymous inquiry (' || $2 || ').', 'anonymous_question_reply', false)
        `, [studentProfileRes.rows[0].profile_id, q.reference_id]);
      }
    } else if (senderType === 'student') {
      // Student replied back in thread: notify assigned counsellor
      const counsellorTarget = q.counsellor_id;
      if (counsellorTarget) {
        await query(`
          INSERT INTO notifications (profile_id, title, message, type, is_read)
          VALUES ($1, 'Anonymous Question Follow-up', 'A follow-up was posted to anonymous inquiry (' || $2 || ').', 'anonymous_question_reply', false)
        `, [counsellorTarget, q.reference_id]);
      }
    }

    const updatedStatus = senderType === 'counsellor' ? 'Answered' : 'Updated';
    return res.status(201).json({
      success: true,
      reply: replyRes.rows[0],
      question: { id, status: updatedStatus }
    });
  } catch (err) {
    console.error('Error replying to anonymous question:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ----------------- COUNSELLOR ENDPOINTS -----------------

/**
 * Get anonymous questions assigned to the counsellor.
 * Strictly NEVER exposes student identity fields.
 */
export async function getCounsellorAnonymousQuestions(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();
    if (role !== 'counsellor' && role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { status, search } = req.query;
    let baseWhere = role === 'counsellor'
      ? '(q.counsellor_id = $1 OR (q.counsellor_id IS NULL AND (q.student_id IN (SELECT id FROM students WHERE counsellor_id = $1) OR (SELECT email FROM profiles WHERE id = $1) = \'counsellor@tatti.edu.in\')))'
      : '1=1';
    const params: any[] = role === 'counsellor' ? [caller.userId] : [];

    if (status && typeof status === 'string' && status !== 'all') {
      params.push(status);
      baseWhere += ` AND q.status = $${params.length}`;
    }

    if (search && typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim()}%`);
      baseWhere += ` AND (q.reference_id ILIKE $${params.length} OR q.question ILIKE $${params.length})`;
    }

    const result = await query(`
      SELECT 
        q.id,
        q.reference_id,
        q.question,
        COALESCE(q.category, 'General Guidance') as category,
        COALESCE(q.title, substring(q.question from 1 for 50)) as title,
        q.status,
        to_char(q.created_at, 'YYYY-MM-DD HH24:MI') as submission_date,
        q.created_at,
        q.updated_at,
        (SELECT COUNT(*) FROM anonymous_question_replies WHERE question_id = q.id) as reply_count
      FROM anonymous_questions q
      WHERE ${baseWhere}
      ORDER BY 
        CASE WHEN q.status = 'Pending' THEN 1 ELSE 2 END,
        q.created_at DESC
    `, params);

    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching counsellor anonymous questions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Mark question status (e.g. Answered or Closed).
 */
export async function updateAnonymousQuestionStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();

    if (!['Pending', 'Answered', 'Closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    if (role === 'counsellor') {
      const chk = await query(
        'SELECT id FROM anonymous_questions WHERE id = $1 AND (counsellor_id = $2 OR counsellor_id IS NULL)',
        [id, caller.userId]
      );
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: Question not assigned to you.' });
      }
    }

    const result = await query(`
      UPDATE anonymous_questions
      SET status = $1, updated_at = now()
      WHERE id = $2
      RETURNING id, reference_id, status, updated_at;
    `, [status, id]);

    return res.json({ success: true, question: result.rows[0] });
  } catch (err) {
    console.error('Error updating question status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
