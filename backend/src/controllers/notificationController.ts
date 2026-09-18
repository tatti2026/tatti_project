import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

export async function getNotifications(req: Request, res: Response) {
  try {
    const profileId = req.params.profileId || (req.query.profileId as string) || (req as any).user?.userId;
    const studentId = req.query.studentId as string;

    let result;
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
    const result = await query(
      `INSERT INTO direct_messages (student_id, sender_id, sender_name, sender_type, message_text, status)
       VALUES ($1, $2, $3, $4, $5, 'sent')
       RETURNING id, student_id, sender_id::text, sender_name, sender_type, message_text as text, status, created_at`,
      [studentId, senderId || null, senderName || 'Admin', senderType || 'admin', text]
    );
    const row = result.rows[0];
    // Dispatch server-sent event or just return the saved message
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
