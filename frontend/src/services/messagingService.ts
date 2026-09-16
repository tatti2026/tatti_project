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
    senderName: 'TATTI Admin',
    senderType: 'admin',
    text: 'Welcome to TATTI Student Portal! We are here to support your educational journey.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: 'read',
  },
  {
    id: 'seed-m2',
    studentId: 'default',
    senderId: 'admin',
    senderName: 'TATTI Admin',
    senderType: 'admin',
    text: 'Please complete your Career Fit Assessment to review course recommendations. TATTI Admin will review your results to enable your Application Process.',
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
 * Subtle pleasant notification chime using Web Audio API
 */
export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.12);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio permission restrictions
  }
}

// ─── API-BACKED ASYNC METHODS ───────────────────────────────────────────────

/**
 * Fetch messages for student from PostgreSQL API. Falls back to localStorage if network/API error.
 */
export async function fetchMessagesFromAPI(studentId: string): Promise<ChatMessage[]> {
  try {
    const apiMsgs = await apiGetConversation(studentId);
    if (apiMsgs && apiMsgs.length > 0) {
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
  }
  return getMessagesForStudent(studentId);
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
        adminName: 'TATTI Admin',
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
    adminName: 'TATTI Admin',
    adminAvatar: 'TA',
    isOnline: true,
    lastMessage: lastMsg ? lastMsg.text : 'Welcome to TATTI',
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
      adminName: 'TATTI Admin',
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
