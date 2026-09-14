export interface ChatMessage {
  id: string;
  studentId: string;
  senderId: string;
  senderName: string;
  senderType: 'admin' | 'student';
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface ChatConversation {
  id: string;
  studentId: string;
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

/**
 * Get all messages for a specific student conversation.
 * Falls back to 'default' messages if student has no custom messages yet.
 */
export function getMessagesForStudent(studentId: string): ChatMessage[] {
  const all = getStoredMessages();
  const specific = all.filter(m => m.studentId === studentId);
  if (specific.length > 0) return specific;
  // If no specific messages yet, clone default seed messages under this studentId
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
 * Get all conversations for Admin view
 */
export function getAllConversationsForAdmin(studentsList: { id: string; full_name?: string | null; email?: string | null; student_id?: string | null }[]): ChatConversation[] {
  const all = getStoredMessages();
  const convMap = new Map<string, ChatConversation>();

  // Initialize known students
  for (const s of studentsList) {
    const msgs = all.filter(m => m.studentId === s.id);
    const effectiveMsgs = msgs.length > 0 ? msgs : all.filter(m => m.studentId === 'default').map(m => ({ ...m, studentId: s.id }));
    const lastMsg = effectiveMsgs[effectiveMsgs.length - 1];
    const unreadCount = effectiveMsgs.filter(m => m.senderType === 'student' && m.status !== 'read').length;

    convMap.set(s.id, {
      id: `conv-${s.id}`,
      studentId: s.id,
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
 * Send a chat message (either Admin to Student, or Student to Admin)
 */
export function sendChatMessage(params: {
  studentId: string;
  senderId: string;
  senderName: string;
  senderType: 'admin' | 'student';
  text: string;
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
  };

  // If this student was relying on 'default' messages, copy them over first
  const existingForStudent = all.filter(m => m.studentId === params.studentId);
  if (existingForStudent.length === 0) {
    const defaults = all.filter(m => m.studentId === 'default').map(m => ({ ...m, id: `${m.id}-${params.studentId}`, studentId: params.studentId }));
    all.push(...defaults);
  }

  all.push(newMsg);
  saveMessages(all);

  // Upgrade to delivered shortly after
  setTimeout(() => {
    const current = getStoredMessages();
    const updated = current.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' as const } : m);
    saveMessages(updated);
    window.dispatchEvent(new CustomEvent('tatti_message_status_updated', { detail: { messageId: newMsg.id, status: 'delivered' } }));
  }, 600);

  // Play notification chime and dispatch event
  playNotificationSound();
  window.dispatchEvent(
    new CustomEvent('tatti_new_message', {
      detail: { message: newMsg },
    })
  );

  return newMsg;
}

/**
 * Mark messages in a conversation as read
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
