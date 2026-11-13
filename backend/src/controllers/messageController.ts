import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';

// ─── Helper: map DB row to API message shape ──────────────────────────────
function mapMessage(row: Record<string, unknown>) {
  return {
    id: row.id,
    studentId: row.student_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderType: row.sender_type,
    text: row.message_text,
    timestamp: row.created_at,
    status: row.status,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    attachment: row.attachment_name
      ? {
          name: row.attachment_name,
          size: row.attachment_size,
          type: row.attachment_type,
          url: row.attachment_url,
        }
      : undefined,
  };
}

// ─── POST /api/messages/send ──────────────────────────────────────────────
// Send a message from admin/counsellor OR student. Role-enforced.
// Body: { studentId, text, senderName, attachment? }
export async function sendMessage(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    if (!caller) return res.status(401).json({ error: 'Unauthorized' });

    const callerRole: string = (caller.role || 'student').toLowerCase();
    const {
      studentId,
      text,
      senderName,
      attachment,
    } = req.body;

    if (!text && !attachment) {
      return res.status(400).json({ error: 'Message text or attachment is required.' });
    }

    let targetStudentId = studentId;

    // Students can only send to their own conversation
    if (callerRole === 'student') {
      const studentCheck = await query(
        'SELECT id, counsellor_id, full_name, student_id FROM students WHERE profile_id = $1',
        [caller.userId]
      );
      if (studentCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Student record not found for user.' });
      }
      const myStudentId = studentCheck.rows[0].id;
      if (studentId && studentId !== 'default' && studentId !== myStudentId) {
        return res.status(403).json({ error: 'Students can only send messages in their own conversation.' });
      }
      targetStudentId = myStudentId;
    }

    if (!targetStudentId) {
      return res.status(400).json({ error: 'studentId is required.' });
    }

    // Counsellors can only send to their assigned students
    if (callerRole === 'counsellor') {
      const counsellorCheck = await query(
        'SELECT id FROM students WHERE id = $1 AND (counsellor_id = $2 OR counsellor_id IS NULL)',
        [targetStudentId, caller.userId]
      );
      if (counsellorCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: You can only message your assigned students.' });
      }
    }

    // Verify student exists
    const studentRes = await query('SELECT id, counsellor_id, profile_id, full_name, student_id FROM students WHERE id = $1', [targetStudentId]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    const studentData = studentRes.rows[0];

    // Ensure student has counsellor assigned if null
    if (!studentData.counsellor_id) {
      const defCounsellor = await query(`
        SELECT id FROM profiles 
        WHERE (email = 'counsellor@tatti.edu.in' OR role = 'counsellor') 
        ORDER BY (email = 'counsellor@tatti.edu.in') DESC 
        LIMIT 1
      `);
      if (defCounsellor.rows.length > 0) {
        studentData.counsellor_id = defCounsellor.rows[0].id;
        await query('UPDATE students SET counsellor_id = $1, updated_at = now() WHERE id = $2', [
          studentData.counsellor_id,
          targetStudentId
        ]);
      }
    }

    const isStaff = callerRole === 'admin' || callerRole === 'counsellor';
    const senderType = isStaff ? 'admin' : 'student';
    const receiverRole = isStaff ? 'student' : 'admin';
    const defaultStaffName = callerRole === 'counsellor' ? 'PSY CARE Counsellor' : 'PSY CARE Admin';
    const resolvedSenderName = senderName || (isStaff ? defaultStaffName : (studentData.full_name || 'Student'));

    const result = await query(
      `INSERT INTO direct_messages
         (student_id, sender_id, sender_name, sender_type, receiver_role,
          message_text, attachment_name, attachment_size, attachment_type, attachment_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'sent')
       RETURNING *`,
      [
        targetStudentId,
        caller.userId || null,
        resolvedSenderName,
        senderType,
        receiverRole,
        text || '',
        attachment?.name || null,
        attachment?.size ? String(attachment.size) : null,
        attachment?.type || null,
        attachment?.url || null,
      ]
    );

    // Notify the other party in PostgreSQL notifications
    try {
      if (senderType === 'student' && studentData.counsellor_id) {
        const sName = studentData.full_name || studentData.student_id || 'Student';
        await query(
          `INSERT INTO notifications (profile_id, title, message, type, is_read)
           VALUES ($1, 'New Student Message', $2 || ' sent you a message.', 'message', false)`,
          [studentData.counsellor_id, sName]
        );
      } else if (senderType === 'admin' && studentData.profile_id) {
        await query(
          `INSERT INTO notifications (profile_id, title, message, type, is_read)
           VALUES ($1, 'New Message from Counsellor', 'You received a message from your counsellor.', 'message', false)`,
          [studentData.profile_id]
        );
      }
    } catch (notifErr) {
      console.warn('Notification dispatch note:', notifErr);
    }

    return res.status(201).json({ message: mapMessage(result.rows[0]) });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ error: 'Internal server error sending message.' });
  }
}

// ─── GET /api/messages/conversation/:studentId ───────────────────────────
// Get full conversation between counsellor/admin and a specific student.
// Students can only retrieve their own conversation.
// Counsellors can only retrieve conversations of their assigned students.
export async function getConversation(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    if (!caller) return res.status(401).json({ error: 'Unauthorized' });

    const { studentId } = req.params;
    const callerRole: string = (caller.role || 'student').toLowerCase();

    let targetStudentId = studentId;

    // Students can only read their own conversation
    if (callerRole === 'student') {
      const studentCheck = await query(
        'SELECT id FROM students WHERE profile_id = $1',
        [caller.userId]
      );
      if (studentCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      const myStudentId = studentCheck.rows[0].id;
      if (studentId && studentId !== 'default' && studentId !== myStudentId) {
        return res.status(403).json({ error: 'Access denied: You can only view your own conversation.' });
      }
      targetStudentId = myStudentId;
    }

    // Counsellors can only read their assigned students' conversations
    if (callerRole === 'counsellor') {
      const counsellorCheck = await query(
        'SELECT id FROM students WHERE id = $1 AND (counsellor_id = $2 OR counsellor_id IS NULL)',
        [targetStudentId, caller.userId]
      );
      if (counsellorCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: You can only view conversations for your assigned students.' });
      }
    }

    // Fetch all messages for this student conversation
    const result = await query(
      `SELECT * FROM direct_messages
       WHERE student_id = $1
       ORDER BY created_at ASC`,
      [targetStudentId]
    );

    // Mark admin messages as delivered when student fetches them
    if (callerRole === 'student') {
      await query(
        `UPDATE direct_messages
         SET status = 'delivered', delivered_at = now()
         WHERE student_id = $1 AND sender_type = 'admin' AND status = 'sent'`,
        [targetStudentId]
      );
    }

    return res.json({ messages: result.rows.map(mapMessage) });
  } catch (err) {
    console.error('getConversation error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// ─── GET /api/messages/conversations ─────────────────────────────────────
// Admin / Counsellor: get conversation summaries.
// Counsellors only see conversations for their assigned students.
export async function getAllConversations(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    if (!caller) return res.status(401).json({ error: 'Unauthorized' });

    const callerRole: string = (caller.role || '').toLowerCase();
    if (callerRole !== 'admin' && callerRole !== 'counsellor') {
      return res.status(403).json({ error: 'Admin or Counsellor access required.' });
    }

    let filterCondition = '';
    const params: any[] = [];

    if (callerRole === 'counsellor') {
      params.push(caller.userId);
      filterCondition = `WHERE (s.counsellor_id = $1 OR (s.counsellor_id IS NULL AND (SELECT email FROM profiles WHERE id = $1) = 'counsellor@tatti.edu.in'))`;
    }

    const result = await query(
      `SELECT
         s.id AS student_id,
         s.student_id AS student_code,
         s.full_name AS student_name,
         s.email AS student_email,
         s.phone AS student_phone,
         s.counsellor_id,
         -- Last message in conversation
         (SELECT dm.message_text FROM direct_messages dm
          WHERE dm.student_id = s.id ORDER BY dm.created_at DESC LIMIT 1) AS last_message,
         (SELECT dm.created_at FROM direct_messages dm
          WHERE dm.student_id = s.id ORDER BY dm.created_at DESC LIMIT 1) AS last_message_time,
         (SELECT dm.sender_type FROM direct_messages dm
          WHERE dm.student_id = s.id ORDER BY dm.created_at DESC LIMIT 1) AS last_message_sender,
         -- Unread count: student messages not yet read by staff
         (SELECT COUNT(*) FROM direct_messages dm
          WHERE dm.student_id = s.id AND dm.sender_type = 'student' AND dm.status != 'read') AS unread_count,
         -- Total messages
         (SELECT COUNT(*) FROM direct_messages dm WHERE dm.student_id = s.id) AS total_messages
       FROM students s
       ${filterCondition}
       ORDER BY last_message_time DESC NULLS LAST`,
      params
    );

    const conversations = result.rows.map(row => ({
      studentId: row.student_id,
      studentCode: row.student_code,
      studentName: row.student_name || 'Unknown Student',
      studentEmail: row.student_email,
      studentPhone: row.student_phone,
      counsellorId: row.counsellor_id,
      lastMessage: row.last_message || '',
      lastMessageTime: row.last_message_time,
      lastMessageSender: row.last_message_sender,
      unreadCount: parseInt(row.unread_count || '0', 10),
      totalMessages: parseInt(row.total_messages || '0', 10),
    }));

    return res.json({ conversations });
  } catch (err) {
    console.error('getAllConversations error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// ─── PUT /api/messages/read/:studentId ───────────────────────────────────
// Mark all messages in a conversation as read by the current user's role.
export async function markMessagesRead(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    if (!caller) return res.status(401).json({ error: 'Unauthorized' });

    const { studentId } = req.params;
    const callerRole: string = (caller.role || 'student').toLowerCase();

    let targetStudentId = studentId;

    // Student reads admin messages
    if (callerRole === 'student') {
      const sCheck = await query('SELECT id FROM students WHERE profile_id = $1', [caller.userId]);
      if (sCheck.rows.length > 0) targetStudentId = sCheck.rows[0].id;
    }

    // Counsellor check
    if (callerRole === 'counsellor') {
      const counsellorCheck = await query(
        'SELECT id FROM students WHERE id = $1 AND (counsellor_id = $2 OR counsellor_id IS NULL)',
        [targetStudentId, caller.userId]
      );
      if (counsellorCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: You can only update messages for your assigned students.' });
      }
    }

    // Student reads admin messages; admin/counsellor reads student messages
    const isStaff = callerRole === 'admin' || callerRole === 'counsellor';
    const targetSenderType = isStaff ? 'student' : 'admin';

    await query(
      `UPDATE direct_messages
       SET status = 'read', read_at = now()
       WHERE student_id = $1 AND sender_type = $2 AND status != 'read'`,
      [targetStudentId, targetSenderType]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('markMessagesRead error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// ─── GET /api/messages/unread-count ──────────────────────────────────────
// Unread message count per caller role.
export async function getUnreadCount(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    if (!caller) return res.status(401).json({ error: 'Unauthorized' });

    const callerRole: string = (caller.role || '').toLowerCase();

    if (callerRole === 'admin') {
      const result = await query(
        `SELECT COUNT(*) AS count FROM direct_messages
         WHERE sender_type = 'student' AND status != 'read'`
      );
      return res.json({ count: parseInt(result.rows[0].count, 10) });
    }

    if (callerRole === 'counsellor') {
      const result = await query(
        `SELECT COUNT(*) AS count FROM direct_messages dm
         JOIN students s ON s.id = dm.student_id
         WHERE dm.sender_type = 'student' AND dm.status != 'read' 
           AND (s.counsellor_id = $1 OR (s.counsellor_id IS NULL AND (SELECT email FROM profiles WHERE id = $1) = 'counsellor@tatti.edu.in'))`,
        [caller.userId]
      );
      return res.json({ count: parseInt(result.rows[0].count, 10) });
    }

    // Student: find their student record first
    const studentRes = await query(
      'SELECT id FROM students WHERE profile_id = $1',
      [caller.userId]
    );
    if (studentRes.rows.length === 0) {
      return res.json({ count: 0 });
    }
    const studentId = studentRes.rows[0].id;

    const result = await query(
      `SELECT COUNT(*) AS count FROM direct_messages
       WHERE student_id = $1 AND sender_type = 'admin' AND status != 'read'`,
      [studentId]
    );
    return res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// ─── GET /api/messages/my-student-id ─────────────────────────────────────
// Returns the logged-in student's UUID (student table ID) for use in API calls.
export async function getMyStudentId(req: Request, res: Response) {
  try {
    const caller = (req as any).user;
    if (!caller) return res.status(401).json({ error: 'Unauthorized' });

    const result = await query(
      'SELECT id, student_id FROM students WHERE profile_id = $1',
      [caller.userId]
    );

    if (result.rows.length === 0) return res.json({ studentId: null, studentCode: null });

    return res.json({
      studentId: result.rows[0].id,
      studentCode: result.rows[0].student_id,
    });
  } catch (err) {
    console.error('getMyStudentId error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
