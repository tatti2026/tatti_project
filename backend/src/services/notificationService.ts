import type { NotificationRecord, ChatMessageRecord } from '../models/index.js';

const notificationsStore: NotificationRecord[] = [];
const chatMessagesStore: ChatMessageRecord[] = [];

export function createSystemNotification(
  profileId: string,
  title: string,
  message: string,
  type = 'general'
): NotificationRecord {
  const notif: NotificationRecord = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    profile_id: profileId,
    title,
    message,
    type,
    is_read: false,
    created_at: new Date().toISOString(),
  };
  notificationsStore.unshift(notif);
  return notif;
}

export function getNotificationsForProfile(profileId: string): NotificationRecord[] {
  return notificationsStore.filter(n => n.profile_id === profileId);
}

export function markNotificationAsRead(id: string): boolean {
  const target = notificationsStore.find(n => n.id === id);
  if (target) {
    target.is_read = true;
    return true;
  }
  return false;
}

export function sendDirectChatMessage(
  studentId: string,
  senderId: string,
  senderName: string,
  senderType: 'admin' | 'student',
  text: string
): ChatMessageRecord {
  const msg: ChatMessageRecord = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    student_id: studentId,
    sender_id: senderId,
    sender_name: senderName,
    sender_type: senderType,
    text,
    status: 'sent',
    created_at: new Date().toISOString(),
  };

  chatMessagesStore.push(msg);

  // Auto-upgrade status to delivered
  setTimeout(() => {
    msg.status = 'delivered';
  }, 500);

  return msg;
}

export function getDirectChatForStudent(studentId: string): ChatMessageRecord[] {
  return chatMessagesStore.filter(m => m.student_id === studentId);
}

export function markChatAsRead(studentId: string, readerType: 'admin' | 'student') {
  const opposite = readerType === 'admin' ? 'student' : 'admin';
  for (const m of chatMessagesStore) {
    if (m.student_id === studentId && m.sender_type === opposite) {
      m.status = 'read';
    }
  }
}
