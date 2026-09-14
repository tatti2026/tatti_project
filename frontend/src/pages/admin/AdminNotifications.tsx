import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getNotifications, markNotificationRead, getAllStudents, createNotification } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import type { Notification, Student } from '@/types/index';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Bell, BellOff, CheckCheck, MessageSquare, Calendar, Search, Send,
  Paperclip, MoreVertical, Check, CheckCheck as CheckCheckIcon,
  Users, Plus, X, ArrowLeft, Clock, Smile, Mic, AlertCircle,
  Filter, RefreshCw, Eye, Trash2, CheckSquare, Square, History
} from 'lucide-react';
import { sendChatMessage } from '@/services/messagingService';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────
type AdminTab = 'messages' | 'center' | 'conversations';

interface SentHistoryRecord {
  id: string;
  recipients: string[];
  recipientNames: string[];
  message: string;
  date: string;
  time: string;
  recipientCount: number;
  status: 'Sent' | 'Delivered';
}

interface AdminMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'admin' | 'student';
  text: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

interface StudentConversation {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: AdminMessage[];
}

// ─── Mock student conversations ───────────────────────────────────────────
const MOCK_STUDENT_CONVS: StudentConversation[] = [
  {
    id: 'sc-1', studentId: 'TATTI20260001', studentName: 'Arjun Kumar',
    studentEmail: 'arjun.kumar@example.com',
    lastMessage: 'Thank you. I will attend the session.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 35),
    unreadCount: 1,
    messages: [
      {
        id: 'm1', senderId: 'admin', senderName: 'TATTI Admin', senderType: 'admin',
        text: 'Your counselling session has been scheduled for 15 September 2026 at 10:30 AM.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        status: 'read',
      },
      {
        id: 'm2', senderId: 'student', senderName: 'Arjun Kumar', senderType: 'student',
        text: 'Thank you. I will attend the session.',
        timestamp: new Date(Date.now() - 1000 * 60 * 35),
        status: 'delivered',
      },
    ],
  },
  {
    id: 'sc-2', studentId: 'TATTI20260002', studentName: 'Priya Sharma',
    studentEmail: 'priya.sharma@example.com',
    lastMessage: 'Please review your application form.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 120),
    unreadCount: 0,
    messages: [
      {
        id: 'm3', senderId: 'admin', senderName: 'TATTI Admin', senderType: 'admin',
        text: 'Please complete your application form to proceed with the admission process.',
        timestamp: new Date(Date.now() - 1000 * 60 * 120),
        status: 'read',
      },
    ],
  },
  {
    id: 'sc-3', studentId: 'TATTI20260003', studentName: 'Rahul Verma',
    studentEmail: 'rahul.verma@example.com',
    lastMessage: 'Your assessment results are ready.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 3),
    unreadCount: 0,
    messages: [
      {
        id: 'm4', senderId: 'admin', senderName: 'TATTI Admin', senderType: 'admin',
        text: 'Congratulations! Your Career Fit Assessment results are ready. Please login to view your score and course recommendations.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
        status: 'read',
      },
    ],
  },
];

const SENT_HISTORY_KEY = 'tatti_admin_sent_messages_history';

// ─── Main Admin Notifications Component ─────────────────────────────────────
export default function AdminNotifications() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('messages');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [conversations, setConversations] = useState<StudentConversation[]>(MOCK_STUDENT_CONVS);
  const [activeConvId, setActiveConvId] = useState<string | null>('sc-1');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Message Composer State
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple'>('multiple');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [singleStudentId, setSingleStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // Sent Confirmation State
  const [lastSentConfirmation, setLastSentConfirmation] = useState<{
    recipientCount: number;
    recipientNames: string[];
    date: string;
    time: string;
    status: string;
  } | null>(null);

  // Message History State
  const [sentHistory, setSentHistory] = useState<SentHistoryRecord[]>(() => {
    try {
      const stored = localStorage.getItem(SENT_HISTORY_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'hist-1',
        recipients: ['TATTI20260001', 'TATTI20260002'],
        recipientNames: ['Arjun Kumar', 'Priya Sharma'],
        message: 'Welcome to TATTI. Please check your dashboard for upcoming admissions schedules and assessment details.',
        date: format(new Date(Date.now() - 86400000), 'dd MMM yyyy'),
        time: '10:15 AM',
        recipientCount: 2,
        status: 'Delivered',
      },
      {
        id: 'hist-2',
        recipients: ['TATTI20260001'],
        recipientNames: ['Arjun Kumar'],
        message: 'Your counselling session is scheduled for 15 September at 10:30 AM.',
        date: format(new Date(), 'dd MMM yyyy'),
        time: '09:00 AM',
        recipientCount: 1,
        status: 'Sent',
      },
    ];
  });

  const loadData = async () => {
    if (!profile) return;
    try {
      const [notifs, { data: studList }] = await Promise.all([
        getNotifications(profile.id),
        getAllStudents(0, 1000),
      ]);
      setNotifications(notifs);
      setStudents(studList);
      if (studList.length > 0 && !singleStudentId) {
        setSingleStudentId(studList[0].id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAll = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => markNotificationRead(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read');
  };

  // Filter students in composer by search
  const filteredStudents = students.filter(s => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.student_id || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  });

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedStudentIds(filteredStudents.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  // Send Message Logic
  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast.error('Please enter a message to send');
      return;
    }

    const targetIds = selectionMode === 'single'
      ? (singleStudentId ? [singleStudentId] : [])
      : selectedStudentIds;

    if (targetIds.length === 0) {
      toast.error('Please select at least one student recipient');
      return;
    }

    setSending(true);

    const now = new Date();
    const dateFormatted = format(now, 'dd MMM yyyy');
    const timeFormatted = format(now, 'hh:mm a');

    const selectedStudentsObj = students.filter(s => targetIds.includes(s.id));
    const recipientNames = selectedStudentsObj.map(s => s.full_name || s.email || s.student_id || 'Student');

    // Send to each student
    for (const target of selectedStudentsObj) {
      // 1. Send direct chat message
      sendChatMessage({
        studentId: target.id,
        senderId: 'admin',
        senderName: 'TATTI Admin',
        senderType: 'admin',
        text: messageText.trim(),
      });

      // 2. Also send system notification to student profile
      if (target.profile_id) {
        try {
          await createNotification({
            profile_id: target.profile_id,
            title: '💬 Message from Admin',
            message: messageText.trim(),
            type: 'general',
            is_read: false,
          });
        } catch {
          // ignore
        }
      }
    }

    // Record in Sent History
    const newRecord: SentHistoryRecord = {
      id: `sent-${Date.now()}`,
      recipients: targetIds,
      recipientNames,
      message: messageText.trim(),
      date: dateFormatted,
      time: timeFormatted,
      recipientCount: targetIds.length,
      status: 'Sent',
    };

    const updatedHistory = [newRecord, ...sentHistory];
    setSentHistory(updatedHistory);
    try {
      localStorage.setItem(SENT_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch {}

    // Confirmation banner details
    setLastSentConfirmation({
      recipientCount: targetIds.length,
      recipientNames,
      date: dateFormatted,
      time: timeFormatted,
      status: 'Sent',
    });

    setMessageText('');
    setSending(false);
    toast.success(`Message sent successfully to ${targetIds.length} recipient${targetIds.length === 1 ? '' : 's'}`);
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const unreadNotifsCount = notifications.filter(n => !n.is_read).length;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Messages & Notifications</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Broadcast direct messages to students, view real-time chat conversations, and manage alerts
            </p>
          </div>
        </div>

        {/* Tab Navigation: Messages (formerly Compose), Center, Conversations */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {[
            { id: 'messages' as AdminTab, label: 'Messages', icon: <Send className="w-4 h-4" /> },
            { id: 'center' as AdminTab, label: 'Notification Center', icon: <Bell className="w-4 h-4" />, badge: unreadNotifsCount },
            { id: 'conversations' as AdminTab, label: 'Student Chats', icon: <MessageSquare className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className={`min-w-[16px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center px-1 ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-primary text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ── TAB 1: MESSAGES (MESSAGE COMPOSER & MESSAGE HISTORY) ──── */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            {/* ── SENT CONFIRMATION BANNER ── */}
            {lastSentConfirmation && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 animate-slide-in flex items-start justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">✓ Message sent successfully</p>
                    <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-foreground/80">
                      <span><strong>Recipients:</strong> {lastSentConfirmation.recipientCount} student{lastSentConfirmation.recipientCount === 1 ? '' : 's'}</span>
                      <span><strong>Date:</strong> {lastSentConfirmation.date}</span>
                      <span><strong>Time:</strong> {lastSentConfirmation.time}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[11px]">
                        ● {lastSentConfirmation.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setLastSentConfirmation(null)}
                  className="text-muted-foreground hover:text-foreground text-xs p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── MESSAGE COMPOSER CARD ── */}
            <div className="glass-card rounded-2xl p-6 border border-border shadow-sm space-y-5">
              <div className="border-b border-border/60 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" /> Message Composer
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Send real-time updates and messages to a single student or broadcast to multiple students
                  </p>
                </div>

                {/* Option 1 vs Option 2 Toggle */}
                <div className="flex items-center bg-muted/70 p-1 rounded-xl border border-border">
                  <button
                    onClick={() => setSelectionMode('single')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectionMode === 'single'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Single Student
                  </button>
                  <button
                    onClick={() => setSelectionMode('multiple')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectionMode === 'multiple'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Multiple Students
                  </button>
                </div>
              </div>

              {/* Recipient Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Select Students {selectionMode === 'multiple' && `(${selectedStudentIds.length} Selected)`}
                  </label>

                  {selectionMode === 'multiple' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSelectAll}
                        className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDeselectAll}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}
                </div>

                {/* Search Students Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search students by name, ID, or email..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="pl-9 bg-input border-border text-xs h-9"
                  />
                </div>

                {/* Student Selection Container */}
                {selectionMode === 'single' ? (
                  <div className="space-y-1">
                    <select
                      value={singleStudentId}
                      onChange={e => setSingleStudentId(e.target.value)}
                      className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none"
                    >
                      <option value="">-- Select a student --</option>
                      {filteredStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.student_id ? `[${s.student_id}] ` : ''}{s.full_name || s.email} {s.selected_course ? `• ${s.selected_course}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* Multiple Students Checkboxes List */
                  <div className="border border-border rounded-xl bg-input/40 max-h-56 overflow-y-auto p-2 space-y-1 divide-y divide-border/40">
                    {filteredStudents.length === 0 ? (
                      <p className="text-center py-6 text-xs text-muted-foreground">No students match your search</p>
                    ) : (
                      filteredStudents.map(s => {
                        const isChecked = selectedStudentIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-xs select-none ${
                              isChecked ? 'bg-primary/10 text-foreground font-semibold' : 'hover:bg-muted/50 text-foreground'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleStudent(s.id)}
                              className="rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0"
                            />
                            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                              <span className="truncate">
                                <strong className="font-mono text-primary mr-2">{s.student_id || 'ID-N/A'}</strong>
                                {s.full_name || 'Student'}
                              </span>
                              <span className="text-[11px] text-muted-foreground truncate shrink-0">
                                {s.email || '-'}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Message</label>
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Write your message here..."
                  rows={4}
                  className="w-full bg-input border border-border rounded-xl p-3.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                />
              </div>

              {/* Send Button */}
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !messageText.trim()}
                  className="gradient-bg border-0 text-white font-semibold text-xs h-10 px-6 shadow-md hover:opacity-95"
                >
                  {sending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Message
                </Button>
              </div>
            </div>

            {/* ── MESSAGE HISTORY ── */}
            <div className="glass-card rounded-2xl p-6 border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Message History</h3>
                </div>
                <span className="text-xs text-muted-foreground">{sentHistory.length} sent messages recorded</span>
              </div>

              {sentHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No sent messages found. Messages sent through the composer will appear here.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {sentHistory.map(record => (
                    <div key={record.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px] border border-primary/20">
                            {record.recipientCount} Recipient{record.recipientCount === 1 ? '' : 's'}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {record.recipientNames.slice(0, 3).join(', ')}
                            {record.recipientNames.length > 3 && ` +${record.recipientNames.length - 3} more`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary" /> {record.date} at {record.time}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 text-[10px]">
                            ✓ {record.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/40 whitespace-pre-wrap leading-relaxed">
                        {record.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: NOTIFICATION CENTER ────────────────────────────── */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'center' && (
          <div className="glass-card rounded-2xl p-6 border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground">Administrative Alerts</h3>
              {unreadNotifsCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleMarkAll} className="text-xs">
                  <CheckCheck className="w-3.5 h-3.5 mr-1 text-primary" /> Mark all as read
                </Button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-16 text-xs text-muted-foreground">
                No notifications to display.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {notifications.map(n => (
                  <div key={n.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${n.is_read ? 'bg-muted-foreground/40' : 'bg-primary'}`} />
                        <h4 className="text-xs font-bold text-foreground">{n.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground pl-4">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 pl-4">
                        {format(new Date(n.created_at), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                    {!n.is_read && (
                      <Button size="sm" variant="ghost" className="text-[11px] h-7" onClick={() => handleMarkRead(n.id)}>
                        Mark read
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ── TAB 3: CONVERSATIONS (CHAT WITH STUDENT) ──────────────── */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'conversations' && (
          <div className="glass-card rounded-2xl overflow-hidden border border-border" style={{ height: '70vh' }}>
            <div className="flex h-full">
              {/* Left Column: Student list */}
              <div className="w-full md:w-80 flex flex-col border-r border-border shrink-0">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 border border-border">
                    <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-border/50 hover:bg-muted/40 transition-colors text-left ${
                        activeConvId === conv.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {conv.studentName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-foreground truncate">{conv.studentName}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {format(conv.lastMessageTime, 'hh:mm a')}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{conv.lastMessage}</p>
                        <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{conv.studentId}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Chat messages */}
              <div className="flex-1 flex flex-col">
                {activeConv ? (
                  <div className="flex-1 flex flex-col h-full">
                    <div className="p-3.5 border-b border-border bg-card/60 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{activeConv.studentName}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono">{activeConv.studentId} • {activeConv.studentEmail}</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {activeConv.messages.map(m => (
                        <div
                          key={m.id}
                          className={`flex flex-col ${m.senderType === 'admin' ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-md rounded-2xl p-3 text-xs leading-relaxed ${
                              m.senderType === 'admin'
                                ? 'gradient-bg text-white rounded-tr-none'
                                : 'bg-muted border border-border text-foreground rounded-tl-none'
                            }`}
                          >
                            {m.text}
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-1 px-1">
                            {format(m.timestamp, 'hh:mm a')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                    Select a student to view chat
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
