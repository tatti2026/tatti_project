import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

export async function getNotifications(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const role = (user?.role || '').toLowerCase();
    const isStaff = role === 'admin' || role === 'counsellor';
    const profileId = req.params.profileId || (req.query.profileId as string) || (!isStaff ? user?.userId : undefined);
    const studentId = req.query.studentId as string;

    if (role === 'counsellor') {
      if (studentId) {
        // Verify counsellor owns student
        const chk = await query('SELECT id FROM students WHERE id = $1 AND counsellor_id = $2', [studentId, user.userId]);
        if (chk.rows.length === 0) {
          return res.status(403).json({ error: 'Access denied: Student not assigned to you.' });
        }
        const result = await query(
          `SELECT * FROM notifications 
           WHERE student_id = $1 
              OR profile_id = (SELECT profile_id FROM students WHERE id = $1)
           ORDER BY created_at DESC LIMIT 50`,
          [studentId]
        );
        return res.json(result.rows);
      } else {
        // Only notifications for counsellor's assigned students or counsellor themself
        const result = await query(
          `SELECT n.* FROM notifications n
           LEFT JOIN students s ON s.id = n.student_id OR s.profile_id = n.profile_id
           WHERE n.profile_id = $1 OR s.counsellor_id = $1
           ORDER BY n.created_at DESC LIMIT 50`,
          [user.userId]
        );
        return res.json(result.rows);
      }
    }

    let result;
    if (role === 'student' && user?.userId) {
      try {
        const sRow = await query('SELECT id FROM students WHERE profile_id = $1', [user.userId]);
        if (sRow.rows.length > 0) {
          const studentDbId = sRow.rows[0].id;
          const todayCheckin = await query(
            'SELECT id FROM student_mood_entries WHERE student_id = $1 AND entry_date = CURRENT_DATE',
            [studentDbId]
          );
          if (todayCheckin.rows.length > 0) {
            await query(
              "UPDATE notifications SET is_read = true WHERE (profile_id = $1 OR student_id = $2) AND type = 'mood_checkin' AND created_at >= CURRENT_DATE",
              [user.userId, studentDbId]
            );
          } else {
            const existingReminderToday = await query(
              "SELECT id FROM notifications WHERE (profile_id = $1 OR student_id = $2) AND type = 'mood_checkin' AND created_at >= CURRENT_DATE LIMIT 1",
              [user.userId, studentDbId]
            );
            if (existingReminderToday.rows.length === 0) {
              await query(`
                INSERT INTO notifications (profile_id, student_id, title, message, type, is_read)
                VALUES ($1, $2, 'Daily Mood Check-in', 'How are you feeling today? Take a moment to check in with yourself.', 'mood_checkin', false)
              `, [user.userId, studentDbId]);
            }
          }
        }
      } catch (reminderErr) {
        console.error('Error handling daily mood notification check:', reminderErr);
      }
    }

    if (studentId) {
      result = await query(
        `SELECT * FROM notifications 
         WHERE student_id = $1 
            OR profile_id = (SELECT profile_id FROM students WHERE id = $1)
         ORDER BY created_at DESC LIMIT 50`,
        [studentId]
      );
    } else if (profileId) {
      result = await query(
        `SELECT * FROM notifications 
         WHERE profile_id = $1 
            OR student_id = (SELECT id FROM students WHERE profile_id = $1)
         ORDER BY created_at DESC LIMIT 50`,
        [profileId]
      );
    } else {
      result = await query(
        'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'
      );
    }

    return res.json(result.rows);
  } catch (err) {
    console.error('Error getting notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const caller = (req as any).user;
    const role = (caller?.role || '').toLowerCase();

    if (role === 'counsellor') {
      // Counsellor may mark notifications read for their own assigned students only
      const chk = await query(`
        SELECT n.id FROM notifications n
        LEFT JOIN students s ON s.id = n.student_id
        WHERE n.id = $1
          AND (n.profile_id = $2 OR s.counsellor_id = $2)
      `, [id, caller.userId]);
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: notification does not belong to you or your students.' });
      }
    } else if (role === 'student') {
      // Student may only mark their own notifications read
      const chk = await query(
        'SELECT id FROM notifications WHERE id = $1 AND profile_id = $2',
        [id, caller.userId]
      );
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: notification does not belong to you.' });
      }
    }
    // Admins may mark any notification read (no restriction)

    await query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createNotification(req: Request, res: Response) {
  try {
    const { profile_id, title, message, type } = req.body;
    const result = await query(`
      INSERT INTO notifications (profile_id, title, message, type, is_read)
      VALUES ($1, $2, $3, $4, false)
      RETURNING *;
    `, [profile_id, title, message, type || 'general']);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ── DIRECT MESSAGES (persisted in PostgreSQL direct_messages table) ──────────

export async function getStudentMessages(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const user = (req as any).user;
    const role = (user?.role || 'student').toLowerCase();

    if (role === 'student') {
      const chk = await query('SELECT id FROM students WHERE id = $1 AND profile_id = $2', [studentId, user.userId]);
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    } else if (role === 'counsellor') {
      const chk = await query('SELECT id FROM students WHERE id = $1 AND counsellor_id = $2', [studentId, user.userId]);
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: Student not assigned to you.' });
      }
    }

    const result = await query(
      `SELECT id, student_id, sender_id::text, sender_name, sender_type, message_text as text, status, created_at
       FROM direct_messages
       WHERE student_id = $1
       ORDER BY created_at ASC`,
      [studentId]
    );
    // Map to the shape messagingService expects on frontend
    const msgs = result.rows.map((r: any) => ({
      id: r.id,
      studentId: r.student_id,
      senderId: r.sender_id || 'admin',
      senderName: r.sender_name,
      senderType: r.sender_type,
      text: r.text,
      timestamp: r.created_at,
      status: r.status,
    }));
    return res.json(msgs);
  } catch (err) {
    console.error('Error getting student messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function sendMessage(req: Request, res: Response) {
  try {
    const { studentId, senderId, senderName, senderType, text } = req.body;
    if (!studentId || !text) {
      return res.status(400).json({ error: 'studentId and text are required' });
    }

    const user = (req as any).user;
    const role = (user?.role || 'student').toLowerCase();

    if (role === 'student') {
      const chk = await query('SELECT id FROM students WHERE id = $1 AND profile_id = $2', [studentId, user.userId]);
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: Can only message your own chat.' });
      }
    } else if (role === 'counsellor') {
      const chk = await query('SELECT id FROM students WHERE id = $1 AND counsellor_id = $2', [studentId, user.userId]);
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: Student not assigned to you.' });
      }
    }

    const result = await query(
      `INSERT INTO direct_messages (student_id, sender_id, sender_name, sender_type, message_text, status)
       VALUES ($1, $2, $3, $4, $5, 'sent')
       RETURNING id, student_id, sender_id::text, sender_name, sender_type, message_text as text, status, created_at`,
      [studentId, user?.userId || senderId || null, senderName || (role === 'counsellor' ? 'PSY CARE Counsellor' : 'Admin'), senderType || 'admin', text]
    );
    const row = result.rows[0];
    return res.status(201).json({
      id: row.id,
      studentId: row.student_id,
      senderId: row.sender_id || 'admin',
      senderName: row.sender_name,
      senderType: row.sender_type,
      text: row.text,
      timestamp: row.created_at,
      status: row.status,
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markMessagesRead(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const { readerType } = req.body;
    const user = (req as any).user;
    const role = (user?.role || 'student').toLowerCase();

    if (role === 'counsellor') {
      const chk = await query('SELECT id FROM students WHERE id = $1 AND counsellor_id = $2', [studentId, user.userId]);
      if (chk.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: Student not assigned to you.' });
      }
    }

    // Mark messages sent by the opposite party as read
    const senderType = readerType === 'admin' ? 'student' : 'admin';
    await query(
      `UPDATE direct_messages SET status = 'read'
       WHERE student_id = $1 AND sender_type = $2 AND status != 'read'`,
      [studentId, senderType]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Error marking messages read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
