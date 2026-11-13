import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

export const RATING_LABELS: Record<number, string> = {
  1: '1 Star — Very Poor',
  2: '2 Stars — Poor',
  3: '3 Stars — Average',
  4: '4 Stars — Good',
  5: '5 Stars — Excellent'
};

/**
 * Triggers feedback request notification for a student if BOTH:
 * 1. Counselling session is Completed
 * 2. Follow-up is Completed
 */
export async function triggerFeedbackRequestIfNeeded(studentId: string, specificSessionId?: string): Promise<boolean> {
  try {
    // 1. Check if student has at least one completed follow-up
    const fuCheck = await query(`
      SELECT id FROM follow_ups 
      WHERE student_id = $1 AND LOWER(followup_status) = 'completed'
      ORDER BY updated_at DESC LIMIT 1
    `, [studentId]);

    if (fuCheck.rows.length === 0) {
      return false; // Follow-up not completed yet
    }

    // 2. Find eligible completed counselling session(s) without feedback
    let sessionSql = `
      SELECT c.id, c.student_id, c.counsellor_name, s.profile_id
      FROM counselling c
      JOIN students s ON s.id = c.student_id
      LEFT JOIN session_feedback fb ON fb.session_id = c.id
      WHERE c.student_id = $1
        AND LOWER(c.status) = 'completed'
        AND fb.id IS NULL
    `;
    const params: any[] = [studentId];

    if (specificSessionId) {
      sessionSql += ' AND c.id = $2';
      params.push(specificSessionId);
    }
    sessionSql += ' ORDER BY c.scheduled_date DESC NULLS LAST, c.updated_at DESC LIMIT 1';

    const sessionRes = await query(sessionSql, params);
    if (sessionRes.rows.length === 0) {
      return false; // No completed session without feedback
    }

    const session = sessionRes.rows[0];
    const sessIdStr = String(session.id);

    // 3. Check if feedback notification already dispatched for this session
    const notifCheck = await query(`
      SELECT id FROM notifications 
      WHERE (student_id = $1 OR profile_id = $2) 
        AND type = 'session_feedback' 
        AND message LIKE '%' || $3 || '%'
      LIMIT 1
    `, [session.student_id, session.profile_id, sessIdStr]);

    if (notifCheck.rows.length === 0 && session.profile_id) {
      await query(`
        INSERT INTO notifications (profile_id, student_id, title, message, type, is_read)
        VALUES (
          $1, $2,
          'Counselling Feedback Required',
          'Your counselling session has been completed. Please share your experience by giving a rating and feedback (Session ID: ' || $3 || ').',
          'session_feedback',
          false
        )
      `, [session.profile_id, session.student_id, sessIdStr]);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error triggering feedback request:', err);
    return false;
  }
}

/**
 * Submit feedback for a completed session.
 * Enforces:
 * - Only the student who participated in the session can submit feedback.
 * - BOTH Counselling session status AND Follow-up status must be Completed.
 * - Only 1 feedback submission per session.
 * - Requires reason/comment for ratings 1, 2, or 3 stars.
 */
export async function submitSessionFeedback(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    if (caller.role.toLowerCase() !== 'student') {
      return res.status(403).json({ error: 'Only students can submit session feedback.' });
    }

    const rawSessionId = req.body.sessionId || req.body.session_id || req.body.counselling_session_id;
    const {
      rating,
      comment,
      reason,
      feedback_text,
      whatLiked,
      aspects_liked,
      what_liked,
      improvementSuggestions,
      suggestions,
      improvement_suggestions,
      lowRatingReason,
      low_rating_reason,
      followupId: userFollowupId
    } = req.body;

    const sessionId = rawSessionId;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required.' });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    // Verify session existence and that it belongs to this student
    const sessionRes = await query(`
      SELECT c.id, c.student_id, c.status, s.counsellor_id, s.profile_id
      FROM counselling c
      JOIN students s ON s.id = c.student_id
      WHERE c.id = $1
    `, [sessionId]);

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Counselling session not found.' });
    }

    const session = sessionRes.rows[0];

    // Check student ownership
    if (session.profile_id !== caller.userId) {
      return res.status(403).json({ error: 'Access denied: You can only submit feedback for your own session.' });
    }

    // Check Counselling status is Completed
    const status = (session.status || '').toLowerCase();
    if (status !== 'completed') {
      return res.status(400).json({ error: 'Feedback can only be submitted for completed sessions.' });
    }

    // Check Follow-up status is ALSO Completed
    const fuCheck = await query(`
      SELECT id FROM follow_ups 
      WHERE student_id = $1 AND LOWER(followup_status) = 'completed'
      ORDER BY updated_at DESC LIMIT 1
    `, [session.student_id]);

    if (fuCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'Feedback can only be submitted after both counselling and follow-up are marked as completed.'
      });
    }

    const resolvedFollowupId = userFollowupId || fuCheck.rows[0].id;

    // Check if feedback already submitted for this session
    const existingFeedback = await query('SELECT id FROM session_feedback WHERE session_id = $1', [sessionId]);
    if (existingFeedback.rows.length > 0) {
      return res.status(409).json({ error: 'Feedback has already been submitted for this session.' });
    }

    // Validate reason requirement for low ratings (1, 2, or 3 stars)
    const trimmedLowReason = typeof (lowRatingReason || low_rating_reason || reason || feedback_text) === 'string'
      ? String(lowRatingReason || low_rating_reason || reason || feedback_text).trim()
      : '';
    const trimmedComment = typeof (comment || feedback_text) === 'string'
      ? String(comment || feedback_text).trim()
      : '';
    const trimmedWhatLiked = Array.isArray(aspects_liked)
      ? aspects_liked.join(', ')
      : (typeof (whatLiked || what_liked) === 'string' ? String(whatLiked || what_liked).trim() : '');
    const trimmedImprovement = typeof (improvementSuggestions || suggestions || improvement_suggestions) === 'string'
      ? String(improvementSuggestions || suggestions || improvement_suggestions).trim()
      : '';

    if (numericRating <= 3) {
      const combinedReason = trimmedLowReason || trimmedComment || trimmedImprovement;
      if (!combinedReason) {
        return res.status(400).json({
          error: 'Please provide a reason or comment explaining your experience for ratings of 3 stars or below.'
        });
      }
    }

    // Assemble comprehensive legacy comment string for backwards compatibility
    const compositeComment = trimmedComment || [
      trimmedWhatLiked ? `Liked: ${trimmedWhatLiked}` : '',
      trimmedImprovement ? `Improvement: ${trimmedImprovement}` : '',
      trimmedLowReason ? `Reason: ${trimmedLowReason}` : '',
    ].filter(Boolean).join('\n\n') || null;

    const insertRes = await query(`
      INSERT INTO session_feedback (
        session_id,
        student_id,
        counsellor_id,
        followup_id,
        rating,
        comment,
        what_liked,
        improvement_suggestions,
        low_rating_reason,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted', now())
      RETURNING *;
    `, [
      sessionId,
      session.student_id,
      session.counsellor_id,
      resolvedFollowupId,
      numericRating,
      compositeComment,
      trimmedWhatLiked || null,
      trimmedImprovement || null,
      trimmedLowReason || null
    ]);

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Your review helps us improve our counselling services.',
      feedback: insertRes.rows[0]
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Feedback has already been submitted for this session.' });
    }
    console.error('Error submitting session feedback:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Check pending feedback for a student.
 * ONLY triggers when BOTH Counselling status is 'completed' AND Follow-up status is 'completed'.
 */
export async function getStudentPendingFeedback(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    const sRes = await query('SELECT id FROM students WHERE profile_id = $1', [caller.userId]);
    if (sRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }
    const studentId = sRes.rows[0].id;

    // Both Counselling AND Follow-up must be Completed!
    const pendingRes = await query(`
      SELECT 
        c.id as session_id,
        c.counsellor_name,
        to_char(c.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
        c.scheduled_time,
        c.mode,
        c.status,
        fu.id as followup_id
      FROM counselling c
      JOIN follow_ups fu ON fu.student_id = c.student_id AND LOWER(fu.followup_status) = 'completed'
      LEFT JOIN session_feedback f ON f.session_id = c.id
      WHERE c.student_id = $1
        AND LOWER(c.status) = 'completed'
        AND f.id IS NULL
      ORDER BY c.scheduled_date DESC NULLS LAST, c.updated_at DESC
      LIMIT 1
    `, [studentId]);

    const pendingSession = pendingRes.rows[0] ? {
      ...pendingRes.rows[0],
      counselling_session_id: pendingRes.rows[0].session_id,
    } : null;

    return res.json({
      hasPendingFeedback: !!pendingSession,
      pendingSession,
      pending_feedbacks: pendingSession ? [pendingSession] : [],
      pendingSessions: pendingSession ? [pendingSession] : [],
    });
  } catch (err) {
    console.error('Error getting student pending feedback:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get feedback summaries and detailed feedback records for Counsellor / Admin.
 * Supports filters: rating, search, startDate, endDate.
 */
export async function getCounsellorFeedbackSummary(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();
    if (role !== 'counsellor' && role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { rating, search, startDate, endDate } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (role === 'counsellor') {
      params.push(caller.userId);
      conditions.push(`(f.counsellor_id = $${params.length} OR s.counsellor_id = $${params.length})`);
    }

    if (rating && !isNaN(Number(rating))) {
      params.push(Number(rating));
      conditions.push(`f.rating = $${params.length}`);
    }

    if (search && typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      conditions.push(`(s.full_name ILIKE $${pIdx} OR s.student_id ILIKE $${pIdx} OR c.counsellor_name ILIKE $${pIdx})`);
    }

    if (startDate && typeof startDate === 'string') {
      params.push(startDate);
      conditions.push(`f.created_at >= $${params.length}::timestamptz`);
    }

    if (endDate && typeof endDate === 'string') {
      params.push(endDate);
      conditions.push(`f.created_at <= $${params.length}::timestamptz + interval '1 day'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Detailed feedback list
    const feedbackList = await query(`
      SELECT 
        f.id,
        f.session_id,
        f.student_id,
        f.followup_id,
        f.rating,
        f.comment,
        f.what_liked,
        f.improvement_suggestions,
        f.low_rating_reason,
        f.status,
        f.created_at,
        to_char(f.created_at, 'YYYY-MM-DD HH24:MI') as formatted_created_at,
        s.full_name as student_name,
        s.student_id as student_code,
        c.counsellor_name,
        to_char(c.scheduled_date, 'YYYY-MM-DD') as scheduled_date
      FROM session_feedback f
      JOIN counselling c ON c.id = f.session_id
      JOIN students s ON s.id = f.student_id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT 100
    `, params);

    // Summary statistics (unfiltered by rating/search, scoped to counsellor)
    const baseParams: any[] = [];
    const baseWhere = role === 'counsellor'
      ? `WHERE (f.counsellor_id = $1 OR s.counsellor_id = $1)`
      : '';
    if (role === 'counsellor') baseParams.push(caller.userId);

    const statsRes = await query(`
      SELECT 
        COUNT(*) as total_feedback,
        ROUND(AVG(f.rating), 1) as average_rating,
        COUNT(CASE WHEN f.rating = 5 THEN 1 END) as star_5,
        COUNT(CASE WHEN f.rating = 4 THEN 1 END) as star_4,
        COUNT(CASE WHEN f.rating = 3 THEN 1 END) as star_3,
        COUNT(CASE WHEN f.rating = 2 THEN 1 END) as star_2,
        COUNT(CASE WHEN f.rating = 1 THEN 1 END) as star_1
      FROM session_feedback f
      JOIN students s ON s.id = f.student_id
      ${baseWhere}
    `, baseParams);

    const stats = statsRes.rows[0];

    // Count pending feedback (both counselling & follow-up completed, but no feedback yet)
    const pendingParams: any[] = [];
    let pendingWhere = `WHERE LOWER(c.status) = 'completed' AND f.id IS NULL`;
    if (role === 'counsellor') {
      pendingParams.push(caller.userId);
      pendingWhere += ` AND s.counsellor_id = $1`;
    }

    const pendingCountRes = await query(`
      SELECT COUNT(DISTINCT c.id) as pending_count
      FROM counselling c
      JOIN students s ON s.id = c.student_id
      JOIN follow_ups fu ON fu.student_id = c.student_id AND LOWER(fu.followup_status) = 'completed'
      LEFT JOIN session_feedback f ON f.session_id = c.id
      ${pendingWhere}
    `, pendingParams);

    return res.json({
      summary: {
        totalFeedback: parseInt(stats.total_feedback || '0', 10),
        total_feedbacks: parseInt(stats.total_feedback || '0', 10),
        averageRating: parseFloat(stats.average_rating || '0'),
        average_rating: parseFloat(stats.average_rating || '0'),
        pendingFeedback: parseInt(pendingCountRes.rows[0]?.pending_count || '0', 10),
        distribution: {
          5: parseInt(stats.star_5 || '0', 10),
          4: parseInt(stats.star_4 || '0', 10),
          3: parseInt(stats.star_3 || '0', 10),
          2: parseInt(stats.star_2 || '0', 10),
          1: parseInt(stats.star_1 || '0', 10),
        },
        star_counts: {
          5: parseInt(stats.star_5 || '0', 10),
          4: parseInt(stats.star_4 || '0', 10),
          3: parseInt(stats.star_3 || '0', 10),
          2: parseInt(stats.star_2 || '0', 10),
          1: parseInt(stats.star_1 || '0', 10),
        }
      },
      feedbacks: feedbackList.rows
    });
  } catch (err) {
    console.error('Error getting counsellor feedback summary:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
