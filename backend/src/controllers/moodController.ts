import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

export const VALID_MOODS = ['Sad', 'Low', 'Okay', 'Good', 'Great'] as const;
export type MoodType = typeof VALID_MOODS[number];

/**
 * Check and update Needs Attention alert for a student based on their recent mood entries.
 * Rules:
 * - 3 or more consecutive calendar days of Sad, Low, or combination of Sad/Low.
 * - Missing check-ins do not count.
 * - Non-Sad/Low mood resets the consecutive count.
 * - Prevent duplicate alerts for the same ongoing episode.
 */
export async function evaluateStudentMoodAlert(studentId: string, counsellorId?: string | null): Promise<void> {
  try {
    // Fetch last 10 entries ordered by date desc
    const entriesRes = await query(`
      SELECT to_char(entry_date, 'YYYY-MM-DD') as entry_date, mood, journal_text
      FROM student_mood_entries
      WHERE student_id = $1
      ORDER BY entry_date DESC
      LIMIT 10
    `, [studentId]);

    const entries = entriesRes.rows;
    if (entries.length === 0) return;

    let consecutiveDays = 0;
    const recentMoods: Array<{ date: string; mood: string }> = [];
    let lastEpochDay: number | null = null;

    for (const entry of entries) {
      const isLowOrSad = entry.mood === 'Sad' || entry.mood === 'Low';
      if (!isLowOrSad) {
        // Streak is broken by non-low mood
        break;
      }

      const dateStr = String(entry.entry_date);
      const [y, m, d] = dateStr.split('-').map(Number);
      const currentEpochDay = Math.floor(Date.UTC(y, m - 1, d) / 86400000);

      if (lastEpochDay !== null) {
        if (lastEpochDay - currentEpochDay !== 1) {
          // Missing days between check-ins: missing days do NOT count
          break;
        }
      }

      consecutiveDays++;
      recentMoods.push({
        date: dateStr,
        mood: entry.mood
      });
      lastEpochDay = currentEpochDay;
    }

    if (consecutiveDays >= 3) {
      // Find assigned counsellor if not provided
      let cId = counsellorId;
      if (!cId) {
        const sRes = await query('SELECT counsellor_id FROM students WHERE id = $1', [studentId]);
        cId = sRes.rows[0]?.counsellor_id || null;
      }

      const alertReason = `${consecutiveDays} consecutive days with low/sad mood recorded.`;
      const lastCheckinDate = entries[0].entry_date;

      // Check if an Active or Reviewed alert already exists for this ongoing episode
      const existingAlertRes = await query(`
        SELECT id, consecutive_days, status
        FROM mood_attention_alerts
        WHERE student_id = $1 AND status IN ('Active', 'Reviewed')
        ORDER BY created_at DESC
        LIMIT 1
      `, [studentId]);

      if (existingAlertRes.rows.length > 0) {
        // Update the ongoing alert with new consecutive day count and latest checkin
        const alertId = existingAlertRes.rows[0].id;
        await query(`
          UPDATE mood_attention_alerts
          SET consecutive_days = $1,
              alert_reason = $2,
              recent_moods = $3,
              last_checkin_date = $4,
              updated_at = now()
          WHERE id = $5
        `, [consecutiveDays, alertReason, JSON.stringify(recentMoods), lastCheckinDate, alertId]);
      } else {
        // Create new alert
        await query(`
          INSERT INTO mood_attention_alerts (
            student_id, counsellor_id, consecutive_days, alert_reason, recent_moods, last_checkin_date, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'Active')
        `, [studentId, cId, consecutiveDays, alertReason, JSON.stringify(recentMoods), lastCheckinDate]);

        // Send a notification to the assigned counsellor
        if (cId) {
          await query(`
            INSERT INTO notifications (profile_id, title, message, type, student_id, is_read)
            VALUES ($1, 'Needs Attention Alert', 'A student has recorded 3 or more consecutive days of low/sad mood.', 'mood_alert', $2, false)
          `, [cId, studentId]);
        }
      }
    } else {
      // If consecutive low mood is now broken (e.g. student recorded Okay/Good/Great),
      // auto-resolve any active alerts for this student
      await query(`
        UPDATE mood_attention_alerts
        SET status = 'Resolved', resolved_at = now(), updated_at = now()
        WHERE student_id = $1 AND status = 'Active'
      `, [studentId]);
    }
  } catch (err) {
    console.error('Error evaluating student mood alert:', err);
  }
}

// ----------------- STUDENT ENDPOINTS -----------------

/**
 * Record or update today's mood entry.
 * Enforces one primary mood entry per student per day, allows same-day edit.
 */
export async function recordStudentMood(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    if (caller.role.toLowerCase() !== 'student') {
      return res.status(403).json({ error: 'Only students can submit daily mood check-ins.' });
    }

    // Get student id for this profile
    const studentRes = await query('SELECT id, counsellor_id FROM students WHERE profile_id = $1', [caller.userId]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }
    const student = studentRes.rows[0];

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

    let { mood, journalText, journal_entry, journal, date, mood_score } = req.body;

    // Support numeric mood_score (1=Awful/Sad, 2=Low, 3=Okay, 4=Good, 5=Great)
    if (!mood && mood_score) {
      const scoreMap: Record<number, MoodType> = {
        1: 'Sad',
        2: 'Low',
        3: 'Okay',
        4: 'Good',
        5: 'Great'
      };
      mood = scoreMap[Number(mood_score)];
    }

    if (mood === 'Awful') {
      mood = 'Sad';
    }

    if (!mood || !VALID_MOODS.includes(mood)) {
      return res.status(400).json({ error: `Invalid mood. Must be one of: Awful, ${VALID_MOODS.join(', ')} (or mood_score 1 to 5)` });
    }

    // Default to today in YYYY-MM-DD
    const todayStr = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date().toISOString().split('T')[0];

    const effectiveJournal = journalText || journal_entry || journal;
    const trimmedJournal = typeof effectiveJournal === 'string' ? effectiveJournal.trim() : null;

    // Upsert into student_mood_entries
    const upsertRes = await query(`
      INSERT INTO student_mood_entries (student_id, entry_date, mood, journal_text, updated_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (student_id, entry_date)
      DO UPDATE SET
        mood = EXCLUDED.mood,
        journal_text = EXCLUDED.journal_text,
        updated_at = now()
      RETURNING id, student_id, to_char(entry_date, 'YYYY-MM-DD') as entry_date, mood, journal_text, created_at, updated_at;
    `, [student.id, todayStr, mood, trimmedJournal]);

    const entry = upsertRes.rows[0];

    const scoreLookup: Record<string, number> = {
      'Sad': 1,
      'Low': 2,
      'Okay': 3,
      'Good': 4,
      'Great': 5
    };

    const entryWithScore = {
      ...entry,
      mood_score: scoreLookup[entry.mood] || 3,
      mood_label: entry.mood === 'Sad' ? 'Awful' : entry.mood,
      journal_entry: entry.journal_text
    };

    // Evaluate Needs Attention alert rules
    await evaluateStudentMoodAlert(student.id, student.counsellor_id);

    return res.status(200).json({
      success: true,
      message: 'Mood check-in recorded successfully.',
      entry: entryWithScore,
      data: entryWithScore
    });
  } catch (err: any) {
    console.error('Error recording student mood:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get student's own mood entries and trends.
 */
export async function getStudentMoodHistory(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    const studentRes = await query('SELECT id FROM students WHERE profile_id = $1', [caller.userId]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }
    const studentId = studentRes.rows[0].id;

    // Fetch entries
    const entriesRes = await query(`
      SELECT 
        id, 
        to_char(entry_date, 'YYYY-MM-DD') as entry_date, 
        mood, 
        journal_text, 
        created_at, 
        updated_at
      FROM student_mood_entries
      WHERE student_id = $1
      ORDER BY entry_date DESC
    `, [studentId]);

    const entries = entriesRes.rows;

    // Today's entry
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEntry = entries.find(e => String(e.entry_date).slice(0, 10) === todayStr) || entries[0] || null;

    // Trend calculations (last 7 days, last 30 days)
    const now = new Date();
    const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklyCounts: Record<string, number> = { Sad: 0, Low: 0, Okay: 0, Good: 0, Great: 0 };
    const monthlyCounts: Record<string, number> = { Sad: 0, Low: 0, Okay: 0, Good: 0, Great: 0 };

    for (const e of entries) {
      const eDate = new Date(e.entry_date);
      if (eDate >= d7Ago) {
        if (weeklyCounts[e.mood] !== undefined) weeklyCounts[e.mood]++;
      }
      if (eDate >= d30Ago) {
        if (monthlyCounts[e.mood] !== undefined) monthlyCounts[e.mood]++;
      }
    }

    const scoreMap: Record<string, number> = { Sad: 1, Low: 2, Okay: 3, Good: 4, Great: 5 };
    const entriesWithScore = entries.map(e => ({
      ...e,
      mood_score: scoreMap[e.mood] || 3,
      mood_label: e.mood === 'Sad' ? 'Awful' : e.mood,
      journal_entry: e.journal_text
    }));

    // Compute streak
    let streakDays = 0;
    let prevEpochDay: number | null = null;
    for (const e of entries) {
      const [y, m, d] = String(e.entry_date).slice(0, 10).split('-').map(Number);
      const epochDay = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
      if (prevEpochDay === null) {
        streakDays = 1;
        prevEpochDay = epochDay;
      } else if (prevEpochDay - epochDay === 1) {
        streakDays++;
        prevEpochDay = epochDay;
      } else {
        break;
      }
    }

    // 7-day average
    const last7Entries = entriesWithScore.slice(0, 7);
    const avgScore = last7Entries.length > 0
      ? Number((last7Entries.reduce((acc, curr) => acc + curr.mood_score, 0) / last7Entries.length).toFixed(1))
      : 0;

    const todayMoodData = todayEntry ? {
      score: scoreMap[todayEntry.mood] || 3,
      label: todayEntry.mood === 'Sad' ? 'Awful' : todayEntry.mood,
      mood: todayEntry.mood
    } : null;

    return res.json({
      todayEntry,
      today_mood: todayMoodData,
      seven_day_average: avgScore,
      streak_days: streakDays,
      entries: entriesWithScore,
      history: entriesWithScore,
      trends: {
        weekly: weeklyCounts,
        monthly: monthlyCounts,
        totalEntries: entries.length
      }
    });
  } catch (err) {
    console.error('Error fetching student mood history:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ----------------- COUNSELLOR ENDPOINTS -----------------

/**
 * Get assigned students' mood records with date filters, search, and mood filter.
 * Strict ownership: only students assigned to this counsellor.
 */
export async function getCounsellorStudentsMood(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();
    if (role !== 'counsellor' && role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { filter = 'all', mood, search, studentId, startDate, endDate } = req.query;

    let dateCondition = '1=1';
    const params: any[] = [];

    if (role === 'counsellor') {
      params.push(caller.userId);
    }

    // Date filters
    const today = new Date().toISOString().split('T')[0];
    if (filter === 'today') {
      dateCondition = `m.entry_date = CURRENT_DATE`;
    } else if (filter === 'yesterday') {
      dateCondition = `m.entry_date = CURRENT_DATE - INTERVAL '1 day'`;
    } else if (filter === 'last7days') {
      dateCondition = `m.entry_date >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (filter === 'last30days') {
      dateCondition = `m.entry_date >= CURRENT_DATE - INTERVAL '30 days'`;
    } else if (filter === 'custom' && startDate && endDate) {
      params.push(startDate);
      params.push(endDate);
      dateCondition = `m.entry_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    let extraConditions = '';

    if (mood && typeof mood === 'string' && mood !== 'all' && VALID_MOODS.includes(mood as any)) {
      params.push(mood);
      extraConditions += ` AND m.mood = $${params.length}`;
    }

    if (studentId && typeof studentId === 'string') {
      params.push(studentId);
      extraConditions += ` AND s.id = $${params.length}`;
    }

    if (search && typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim()}%`);
      extraConditions += ` AND (s.full_name ILIKE $${params.length} OR s.student_id ILIKE $${params.length} OR s.email ILIKE $${params.length})`;
    }

    const counsellorJoin = role === 'counsellor'
      ? `WHERE s.counsellor_id = $1 AND ${dateCondition} ${extraConditions}`
      : `WHERE ${dateCondition} ${extraConditions}`;

    const queryStr = `
      SELECT 
        m.id,
        m.student_id,
        to_char(m.entry_date, 'YYYY-MM-DD') as entry_date,
        m.mood,
        m.journal_text,
        m.created_at,
        m.updated_at,
        s.full_name as student_name,
        s.student_id as student_code,
        s.email as student_email,
        CASE WHEN m.journal_text IS NOT NULL AND LENGTH(TRIM(m.journal_text)) > 0 THEN 'Has Journal' ELSE 'No Journal' END as journal_status,
        CASE WHEN m.mood IN ('Sad', 'Low') THEN 'Needs Attention' ELSE 'Normal' END as mood_status
      FROM student_mood_entries m
      JOIN students s ON s.id = m.student_id
      ${counsellorJoin}
      ORDER BY m.entry_date DESC, m.created_at DESC
    `;

    const result = await query(queryStr, params);

    // Compute overview statistics for the counsellor's students
    const todayRes = await query(`
      SELECT m.mood, COUNT(*) as count
      FROM student_mood_entries m
      JOIN students s ON s.id = m.student_id
      ${role === 'counsellor' ? 'WHERE s.counsellor_id = $1 AND m.entry_date = CURRENT_DATE' : 'WHERE m.entry_date = CURRENT_DATE'}
      GROUP BY m.mood
    `, role === 'counsellor' ? [caller.userId] : []);

    const todayOverview: Record<string, number> = { Sad: 0, Low: 0, Okay: 0, Good: 0, Great: 0, total: 0 };
    for (const r of todayRes.rows) {
      if (todayOverview[r.mood] !== undefined) {
        todayOverview[r.mood] = parseInt(r.count, 10);
      }
      todayOverview.total += parseInt(r.count, 10);
    }

    return res.json({
      records: result.rows,
      todayOverview,
      totalCount: result.rows.length
    });
  } catch (err) {
    console.error('Error fetching counsellor students mood:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Needs Attention alerts for counsellor dashboard.
 */
export async function getNeedsAttentionAlerts(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();
    if (role !== 'counsellor' && role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const whereClause = role === 'counsellor'
      ? `WHERE (a.counsellor_id = $1 OR s.counsellor_id = $1)`
      : ``;

    const params = role === 'counsellor' ? [caller.userId] : [];

    const result = await query(`
      SELECT 
        a.id,
        a.student_id,
        a.consecutive_days,
        a.alert_reason,
        a.recent_moods,
        to_char(a.last_checkin_date, 'YYYY-MM-DD') as last_checkin_date,
        a.status,
        a.reviewed_at,
        a.resolved_at,
        a.created_at,
        a.updated_at,
        s.full_name as student_name,
        s.student_id as student_code,
        s.email as student_email,
        s.phone as student_phone
      FROM mood_attention_alerts a
      JOIN students s ON s.id = a.student_id
      ${whereClause}
      ORDER BY 
        CASE WHEN a.status = 'Active' THEN 1 WHEN a.status = 'Reviewed' THEN 2 ELSE 3 END,
        a.updated_at DESC
    `, params);

    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching needs attention alerts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update alert status (Reviewed / Resolved).
 */
export async function updateAlertStatus(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();
    if (role !== 'counsellor' && role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['Reviewed', 'Resolved', 'Active'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Active, Reviewed, or Resolved.' });
    }

    // Verify ownership
    if (role === 'counsellor') {
      const chk = await query(`
        SELECT a.id FROM mood_attention_alerts a
        JOIN students s ON s.id = a.student_id
        WHERE a.id = $1 AND (a.counsellor_id = $2 OR s.counsellor_id = $2)
      `, [id, caller.userId]);
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: Alert not associated with your assigned student.' });
      }
    }

    const reviewedAt = status === 'Reviewed' ? 'now()' : 'reviewed_at';
    const resolvedAt = status === 'Resolved' ? 'now()' : 'resolved_at';

    const result = await query(`
      UPDATE mood_attention_alerts
      SET status = $1,
          reviewed_at = ${status === 'Reviewed' ? 'now()' : 'reviewed_at'},
          resolved_at = ${status === 'Resolved' ? 'now()' : 'resolved_at'},
          updated_at = now()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    return res.json({ success: true, alert: result.rows[0] });
  } catch (err) {
    console.error('Error updating alert status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get specific student mood history for counsellor/admin with strict ownership enforcement
 */
export async function getStudentMoodForCounsellor(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    const { id } = req.params;
    const role = (caller?.role || '').toLowerCase();

    if (role !== 'counsellor' && role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Check student existence
    const sRes = await query('SELECT id, counsellor_id, full_name, profile_id FROM students WHERE id = $1 OR profile_id = $1', [id]);
    if (sRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    const student = sRes.rows[0];

    // Privacy isolation: only assigned counsellor or admin can access
    if (role === 'counsellor' && student.counsellor_id !== caller.userId) {
      return res.status(403).json({ error: 'Access denied: You are not assigned to this student.' });
    }

    const entriesRes = await query(`
      SELECT 
        id, 
        to_char(entry_date, 'YYYY-MM-DD') as entry_date, 
        mood, 
        journal_text, 
        created_at
      FROM student_mood_entries
      WHERE student_id = $1
      ORDER BY entry_date DESC
    `, [student.id]);

    const scoreMap: Record<string, number> = { Sad: 1, Low: 2, Okay: 3, Good: 4, Great: 5 };
    const history = entriesRes.rows.map(e => ({
      ...e,
      mood_score: scoreMap[e.mood] || 3,
      mood_label: e.mood === 'Sad' ? 'Awful' : e.mood,
      journal_entry: e.journal_text
    }));

    return res.json({
      student_id: student.id,
      student_name: student.full_name,
      history,
      entries: history
    });
  } catch (err) {
    console.error('Error fetching student mood for counsellor:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
