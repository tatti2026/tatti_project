import type { Request, Response } from 'express';
import {
  getNotificationsForProfile,
  markNotificationAsRead,
  getDirectChatForStudent,
  sendDirectChatMessage,
  markChatAsRead,
} from '../services/notificationService.js';

export async function getNotifications(req: Request, res: Response) {
  const { profileId } = req.params;
  const notifs = getNotificationsForProfile(profileId);
  return res.json(notifs);
}

export async function markRead(req: Request, res: Response) {
  const { id } = req.params;
  const success = markNotificationAsRead(id);
  return res.json({ success });
}

export async function getStudentMessages(req: Request, res: Response) {
  const { studentId } = req.params;
  const msgs = getDirectChatForStudent(studentId);
  return res.json(msgs);
}

export async function sendMessage(req: Request, res: Response) {
  const { studentId, senderId, senderName, senderType, text } = req.body;
  const msg = sendDirectChatMessage(studentId, senderId, senderName, senderType, text);
  return res.json(msg);
}

export async function markMessagesRead(req: Request, res: Response) {
  const { studentId } = req.params;
  const { readerType } = req.body;
  markChatAsRead(studentId, readerType || 'student');
  return res.json({ success: true });
}
