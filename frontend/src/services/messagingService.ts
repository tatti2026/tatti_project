import {
  sendMessage as apiSendMessage,
  getConversation as apiGetConversation,
  getAllConversations as apiGetAllConversations,
  markMessagesRead as apiMarkMessagesRead,
  getUnreadCount as apiGetUnreadCount,
  type DirectMessage,
} from '@/lib/api';

export interface ChatAttachment {
  name: string;
  size: number | string;
  type?: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  studentId: string;
  senderId: string;
  senderName: string;
  senderType: 'admin' | 'student';
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  deliveredAt?: string;
  readAt?: string;
  attachment?: ChatAttachment;
}

export interface ChatConversation {
  id: string;
  studentId: string;
  studentCode?: string;
  studentName: string;
  studentEmail?: string;
  adminName: string;
  adminAvatar: string;
  isOnline: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

const MESSAGES_STORAGE_KEY = 'tatti_chat_messages_v1';

// Seed initial messages for common students
const INITIAL_SEEDED_MESSAGES: ChatMessage[] = [
  {
    id: 'seed-m1',
    studentId: 'default',
    senderId: 'admin',
    senderName: 'PSY CARE Admin',
    senderType: 'admin',
    text: 'Welcome to PSY CARE Student Portal! We are here to support your educational journey.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: 'read',
  },
  {
    id: 'seed-m2',
    studentId: 'default',
    senderId: 'admin',
    senderName: 'PSY CARE Admin',
    senderType: 'admin',
    text: 'Please complete your Career Fit Assessment to review course recommendations. PSY CARE Admin will review your results to enable your Application Process.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    status: 'delivered',
  },
];

function getStoredMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(INITIAL_SEEDED_MESSAGES));
      return INITIAL_SEEDED_MESSAGES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SEEDED_MESSAGES;
  }
}

function saveMessages(msgs: ChatMessage[]) {
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(msgs));
  } catch {
    // ignore
  }
}

/**
 * WhatsApp-style incoming message chime using Web Audio API
 */
export function playIncomingSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First tone (E5 ~659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second higher chime tone (B5 ~987Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.08);
    gain2.gain.setValueAtTime(0.25, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);
  } catch {
    // Ignore audio permission restrictions
  }
}

/**
 * WhatsApp-style outgoing message pop using Web Audio API
 */
export function playOutgoingSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    // Ignore audio permission restrictions
  }
}

/**
 * Backward compatibility alias
 */
export const playNotificationSound = playIncomingSound;

// ─── API-BACKED ASYNC METHODS ───────────────────────────────────────────────

/**
 * Fetch messages for student from PostgreSQL API. Falls back to localStorage if network/API error.
 */
export async function fetchMessagesFromAPI(studentId: string): Promise<ChatMessage[]> {
  try {
    const apiMsgs = await apiGetConversation(studentId);
    if (Array.isArray(apiMsgs)) {
      const mapped: ChatMessage[] = apiMsgs.map(m => ({
        id: m.id,
        studentId: m.studentId,
        senderId: m.senderId,
        senderName: m.senderName,
        senderType: m.senderType,
        text: m.text,
        timestamp: m.timestamp,
        status: m.status,
        deliveredAt: m.deliveredAt,
        readAt: m.readAt,
        attachment: m.attachment,
      }));
      return mapped;
    }
  } catch (err) {
    console.warn('fetchMessagesFromAPI failed, falling back to local storage:', err);
    return getMessagesForStudent(studentId);
  }
  return [];
}

/**
 * Send chat message through PostgreSQL API. Also triggers local notification sound & events.
 */
export async function sendMessageViaAPI(params: {
  studentId: string;
  senderId?: string;
  senderName?: string;
  senderType: 'admin' | 'student';
  text: string;
  attachment?: ChatAttachment;
}): Promise<ChatMessage | null> {
  try {
    const sent = await apiSendMessage(
      params.studentId,
      params.text,
      params.senderName,
      params.attachment
    );

    if (sent) {
      const msg: ChatMessage = {
        id: sent.id,
        studentId: sent.studentId,
        senderId: sent.senderId,
        senderName: sent.senderName,
        senderType: sent.senderType,
        text: sent.text,
        timestamp: sent.timestamp,
        status: sent.status,
        deliveredAt: sent.deliveredAt,
        readAt: sent.readAt,
        attachment: sent.attachment,
      };

      window.dispatchEvent(new CustomEvent('tatti_new_message', { detail: { message: msg } }));
      return msg;
    }
  } catch (err) {
    console.warn('sendMessageViaAPI failed, falling back to local send:', err);
    return sendChatMessage({
      studentId: params.studentId,
      senderId: params.senderId || 'user',
      senderName: params.senderName || 'User',
      senderType: params.senderType,
      text: params.text,
      attachment: params.attachment,
    });
  }
  return null;
}

/**
 * Mark messages as read through PostgreSQL API
 * Guards against non-UUID studentId values (e.g. mock/code IDs like TATTI20260001)
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function markMessagesReadViaAPI(studentId: string, readerType: 'admin' | 'student' = 'student'): Promise<void> {
  if (UUID_REGEX.test(studentId)) {
    try {
      await apiMarkMessagesRead(studentId);
    } catch (err) {
      console.warn('markMessagesReadViaAPI failed:', err);
    }
  }
  markConversationAsRead(studentId, readerType);
}


/**
 * Fetch all conversations for Admin from PostgreSQL API
 */
export async function fetchConversationsFromAPI(): Promise<ChatConversation[]> {
  try {
    const summaries = await apiGetAllConversations();
    if (summaries && summaries.length > 0) {
      return summaries.map(s => ({
        id: `conv-${s.studentId}`,
        studentId: s.studentId,
        studentCode: s.studentCode,
        studentName: s.studentName,
        studentEmail: s.studentEmail,
        adminName: 'PSY CARE Admin',
        adminAvatar: 'TA',
        isOnline: true,
        lastMessage: s.lastMessage || 'No messages yet',
        lastMessageTime: s.lastMessageTime || new Date().toISOString(),
        unreadCount: s.unreadCount,
        messages: [],
      }));
    }
  } catch (err) {
    console.warn('fetchConversationsFromAPI failed:', err);
  }
  return [];
}

// ─── SYNCHRONOUS / LOCAL METHODS (PRESERVED FOR COMPATIBILITY) ──────────────

/**
 * Get all messages for a specific student conversation from localStorage.
 */
export function getMessagesForStudent(studentId: string): ChatMessage[] {
  const all = getStoredMessages();
  const specific = all.filter(m => m.studentId === studentId);
  if (specific.length > 0) return specific;
  return all.filter(m => m.studentId === 'default').map(m => ({ ...m, studentId }));
}

/**
 * Get full conversation object for a student (for WhatsApp-style student view)
 */
export function getStudentConversation(studentId: string, studentName?: string): ChatConversation {
  const messages = getMessagesForStudent(studentId);
  const lastMsg = messages[messages.length - 1];
  const unreadCount = messages.filter(m => m.senderType === 'admin' && m.status !== 'read').length;

  return {
    id: `conv-${studentId}`,
    studentId,
    studentName: studentName || 'Student',
    adminName: 'PSY CARE Admin',
    adminAvatar: 'TA',
    isOnline: true,
    lastMessage: lastMsg ? lastMsg.text : 'Welcome to PSY CARE',
    lastMessageTime: lastMsg ? lastMsg.timestamp : new Date().toISOString(),
    unreadCount,
    messages,
  };
}

/**
 * Get all conversations for Admin view from localStorage
 */
export function getAllConversationsForAdmin(
  studentsList: { id: string; full_name?: string | null; email?: string | null; student_id?: string | null }[]
): ChatConversation[] {
  const all = getStoredMessages();
  const convMap = new Map<string, ChatConversation>();

  for (const s of studentsList) {
    const msgs = all.filter(m => m.studentId === s.id);
    const effectiveMsgs = msgs.length > 0 ? msgs : all.filter(m => m.studentId === 'default').map(m => ({ ...m, studentId: s.id }));
    const lastMsg = effectiveMsgs[effectiveMsgs.length - 1];
    const unreadCount = effectiveMsgs.filter(m => m.senderType === 'student' && m.status !== 'read').length;

    convMap.set(s.id, {
      id: `conv-${s.id}`,
      studentId: s.id,
      studentCode: s.student_id || undefined,
      studentName: s.full_name || s.student_id || 'Student',
      studentEmail: s.email || undefined,
      adminName: 'PSY CARE Admin',
      adminAvatar: 'TA',
      isOnline: true,
      lastMessage: lastMsg ? lastMsg.text : 'No messages yet',
      lastMessageTime: lastMsg ? lastMsg.timestamp : new Date().toISOString(),
      unreadCount,
      messages: effectiveMsgs,
    });
  }

  return Array.from(convMap.values()).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
}

/**
 * Send a chat message locally
 */
export function sendChatMessage(params: {
  studentId: string;
  senderId: string;
  senderName: string;
  senderType: 'admin' | 'student';
  text: string;
  attachment?: ChatAttachment;
}): ChatMessage {
  const all = getStoredMessages();
  const now = new Date();

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId: params.studentId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderType: params.senderType,
    text: params.text,
    timestamp: now.toISOString(),
    status: 'sent',
    attachment: params.attachment,
  };

  const existingForStudent = all.filter(m => m.studentId === params.studentId);
  if (existingForStudent.length === 0) {
    const defaults = all.filter(m => m.studentId === 'default').map(m => ({ ...m, id: `${m.id}-${params.studentId}`, studentId: params.studentId }));
    all.push(...defaults);
  }

  all.push(newMsg);
  saveMessages(all);

  setTimeout(() => {
    const current = getStoredMessages();
    const updated = current.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' as const } : m);
    saveMessages(updated);
    window.dispatchEvent(new CustomEvent('tatti_message_status_updated', { detail: { messageId: newMsg.id, status: 'delivered' } }));
  }, 600);

  playNotificationSound();
  window.dispatchEvent(
    new CustomEvent('tatti_new_message', {
      detail: { message: newMsg },
    })
  );

  return newMsg;
}

/**
 * Mark messages in a conversation as read locally
 */
export function markConversationAsRead(studentId: string, readerType: 'admin' | 'student') {
  const all = getStoredMessages();
  const targetSenderType = readerType === 'student' ? 'admin' : 'student';
  let changed = false;

  const updated = all.map(m => {
    if (m.studentId === studentId && m.senderType === targetSenderType && m.status !== 'read') {
      changed = true;
      return { ...m, status: 'read' as const };
    }
    return m;
  });

  if (changed) {
    saveMessages(updated);
    window.dispatchEvent(new CustomEvent('tatti_messages_read', { detail: { studentId, readerType } }));
  }
}

/**
 * Total unread messages for student
 */
export function getStudentUnreadMessagesCount(studentId: string): number {
  const msgs = getMessagesForStudent(studentId);
  return msgs.filter(m => m.senderType === 'admin' && m.status !== 'read').length;
}
