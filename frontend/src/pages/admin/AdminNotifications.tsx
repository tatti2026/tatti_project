import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getNotifications, markNotificationRead } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import type { Notification } from '@/types/index';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell, BellOff, CheckCheck, MessageSquare, Calendar, Search, Send,
  Paperclip, MoreVertical, Check, CheckCheck as CheckCheckIcon,
  Users, Plus, X, ArrowLeft, Clock, Smile, Mic, AlertCircle,
  Filter, RefreshCw, Eye, Trash2
} from 'lucide-react';
import { sendChatMessage, playNotificationSound } from '@/services/messagingService';

// ─── Types ─────────────────────────────────────────────────────────────────
type AdminTab = 'center' | 'compose' | 'sent' | 'conversations';
type ComposeType = 'message' | 'reminder' | 'notification';

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
        text: 'Congratulations! Your assessment results are ready. Please login to view your score and course recommendations.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
        status: 'read',
      },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const typeIcon: Record<string, { emoji: string; bg: string }> = {
  general:     { emoji: '🔔', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  assessment:  { emoji: '📋', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  course:      { emoji: '🎓', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  application: { emoji: '📄', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  payment:     { emoji: '💳', bg: 'bg-green-50 dark:bg-green-500/10' },
  counselling: { emoji: '📅', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  admission:   { emoji: '🏛️', bg: 'bg-rose-50 dark:bg-rose-500/10' },
  message:     { emoji: '💬', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
};

const formatChatTime = (d: Date) => format(d, 'hh:mm a');
const formatListTime  = (d: Date) => {
  const diff = Date.now() - d.getTime();
  if (diff < 1000 * 60 * 60) return formatDistanceToNow(d, { addSuffix: true });
  if (diff < 1000 * 60 * 60 * 24) return format(d, 'hh:mm a');
  return format(d, 'dd MMM');
};

function MessageStatus({ status }: { status: AdminMessage['status'] }) {
  if (status === 'sent')      return <Check className="w-3 h-3 text-muted-foreground" />;
  if (status === 'delivered') return <CheckCheckIcon className="w-3 h-3 text-muted-foreground" />;
  return <CheckCheckIcon className="w-3 h-3 text-blue-400" />;
}

// ─── Admin Chat View ──────────────────────────────────────────────────────
function AdminChatView({
  conv,
  onBack,
}: {
  conv: StudentConversation;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<AdminMessage[]>(conv.messages);
  const [inputText, setInputText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    const msg: AdminMessage = {
      id: `am-${Date.now()}`,
      senderId: 'admin', senderName: 'TATTI Admin', senderType: 'admin',
      text, timestamp: new Date(), status: 'sent',
    };
    setMessages(prev => [...prev, msg]);
    setInputText('');

    // Broadcast to real-time messagingService so student receives it instantly
    sendChatMessage({
      studentId: conv.studentId || 'default',
      senderId: 'admin',
      senderName: 'TATTI Admin',
      senderType: 'admin',
      text,
    });

    setTimeout(() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'delivered' } : m)), 800);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button onClick={onBack} className="md:hidden p-1 rounded-lg hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
          {conv.studentName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{conv.studentName}</p>
          <p className="text-[11px] text-muted-foreground">{conv.studentId} · {conv.studentEmail}</p>
        </div>
        <button className="p-2 rounded-lg hover:bg-muted">
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 bg-gradient-to-b from-background/50 to-background">
        {messages.map(msg => {
          const isMe = msg.senderType === 'admin';
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1.5`}>
              {!isMe && (
                <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-bold shrink-0 mr-2 mt-auto text-muted-foreground">
                  {conv.studentName[0]}
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                isMe
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-card text-foreground border border-border rounded-bl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-white/70' : 'text-muted-foreground'}`}>
                  <span className="text-[10px]">{formatChatTime(msg.timestamp)}</span>
                  {isMe && <MessageStatus status={msg.status} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card shrink-0">
        <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-2 border border-border">
          <button className="p-1 text-muted-foreground hover:text-foreground shrink-0">
            <Smile className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Message ${conv.studentName}...`}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
          />
          <button className="p-1 text-muted-foreground hover:text-foreground shrink-0">
            <Paperclip className="w-4 h-4" />
          </button>
          {inputText.trim() ? (
            <button
              onClick={handleSend}
              className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center shrink-0 shadow-sm hover:opacity-90"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          ) : (
            <button className="p-1 text-muted-foreground shrink-0">
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Compose Panel ───────────────────────────────────────────────────────
function ComposePanel() {
  const [composeType, setComposeType] = useState<ComposeType>('message');
  const [recipient, setRecipient] = useState('');
  const [messageText, setMessageText] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [counselDate, setCounselDate] = useState('');
  const [counselTime, setCounselTime] = useState('');
  const [counsellor, setCounsellor] = useState('');
  const [reminderTime, setReminderTime] = useState('1_day');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!recipient || !messageText) return;
    setSending(true);

    if (composeType === 'message') {
      sendChatMessage({
        studentId: recipient,
        senderId: 'admin',
        senderName: 'TATTI Admin',
        senderType: 'admin',
        text: messageText,
      });
    } else {
      sendChatMessage({
        studentId: recipient,
        senderId: 'admin',
        senderName: 'TATTI Admin',
        senderType: 'admin',
        text: `${notifTitle ? `[${notifTitle}] ` : ''}${messageText}${counselDate ? ` (Scheduled: ${counselDate} ${counselTime})` : ''}`,
      });
    }

    await new Promise(r => setTimeout(r, 600));
    setSending(false);
    setSent(true);
    setRecipient(''); setMessageText(''); setNotifTitle('');
    setCounselDate(''); setCounselTime(''); setCounsellor('');
    setTimeout(() => setSent(false), 3000);
  };

  const inputCls = "w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all";

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-base font-bold text-foreground mb-1">Send to Student</h2>
        <p className="text-xs text-muted-foreground">Compose a message, schedule a reminder, or send a notification</p>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        {([
          { id: 'message' as ComposeType,      label: 'Message',   icon: MessageSquare },
          { id: 'reminder' as ComposeType,      label: 'Counselling Reminder', icon: Calendar },
          { id: 'notification' as ComposeType,  label: 'Notification', icon: Bell },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setComposeType(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              composeType === id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Recipient */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Student ID / Email</label>
        <input
          type="text"
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          placeholder="TATTI20260001 or student@email.com"
          className={inputCls}
        />
      </div>

      {/* Message-specific fields */}
      {composeType === 'message' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Message</label>
          <textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            placeholder="Type your message to the student..."
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </div>
      )}

      {/* Counselling reminder fields */}
      {composeType === 'reminder' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Counselling Date</label>
              <input type="date" value={counselDate} onChange={e => setCounselDate(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Counselling Time</label>
              <input type="time" value={counselTime} onChange={e => setCounselTime(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Assigned Counsellor</label>
            <input type="text" value={counsellor} onChange={e => setCounsellor(e.target.value)} placeholder="Counsellor Name" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Reminder Message</label>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="Your TATTI counselling session is scheduled..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Remind Student</label>
            <select value={reminderTime} onChange={e => setReminderTime(e.target.value)} className={inputCls}>
              <option value="1_week">1 week before</option>
              <option value="3_days">3 days before</option>
              <option value="1_day">1 day before</option>
              <option value="3_hours">3 hours before</option>
              <option value="1_hour">1 hour before</option>
            </select>
          </div>
        </div>
      )}

      {/* General notification fields */}
      {composeType === 'notification' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Notification Title</label>
            <input
              type="text"
              value={notifTitle}
              onChange={e => setNotifTitle(e.target.value)}
              placeholder="e.g., Admission Update"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Notification Message</label>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="Your notification message..."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      )}

      {/* Send button */}
      {sent ? (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600">
          <Check className="w-4 h-4" />
          <span className="text-sm font-semibold">
            {composeType === 'message' ? 'Message sent!' : composeType === 'reminder' ? 'Reminder scheduled!' : 'Notification sent!'}
          </span>
        </div>
      ) : (
        <Button
          onClick={handleSend}
          disabled={sending || !recipient || !messageText}
          className="gradient-bg border-0 text-white w-full font-semibold"
        >
          {sending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {composeType === 'message' ? 'Send Message' : composeType === 'reminder' ? 'Set Reminder' : 'Send Notification'}
        </Button>
      )}
    </div>
  );
}

// ─── Notification Center Overview ─────────────────────────────────────────
function NotificationCenter({
  notifications,
  onMarkRead,
  onMarkAll,
}: {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAll: () => void;
}) {
  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',   value: notifications.length,                                  color: 'text-foreground',   bg: 'bg-muted/50' },
          { label: 'Unread',  value: unread,                                                color: 'text-primary',      bg: 'bg-primary/5' },
          { label: 'Today',   value: notifications.filter(n => {
            const d = new Date(n.created_at); const now = new Date();
            return d.toDateString() === now.toDateString();
          }).length, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Read',    value: notifications.filter(n => n.is_read).length,           color: 'text-emerald-600',  bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 border border-border`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      {unread > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onMarkAll} className="text-xs">
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Mark all as read
          </Button>
        </div>
      )}

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="glass-card rounded-2xl p-14 text-center">
          <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">No notifications</p>
          <p className="text-muted-foreground text-sm">System notifications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const info = typeIcon[n.type] || typeIcon.general;
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && onMarkRead(n.id)}
                className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-sm ${
                  !n.is_read ? 'bg-primary/5 border-primary/20' : 'bg-card border-border hover:bg-muted/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${info.bg}`}>
                  {info.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {format(new Date(n.created_at), 'dd MMM yyyy, hh:mm a')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Notifications ─────────────────────────────────────────────
export default function AdminNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('center');
  const [conversations, setConversations] = useState<StudentConversation[]>(MOCK_STUDENT_CONVS);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);

  useEffect(() => {
    if (!profile) return;
    getNotifications(profile.id)
      .then(n => { setNotifications(n); setLoading(false); })
      .catch(() => setLoading(false));
  }, [profile]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };
  const handleMarkAll = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => markNotificationRead(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const filteredConvs = conversations.filter(c =>
    c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConv = conversations.find(c => c.id === activeConvId) || null;
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalMsgUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'center',        label: 'Notification Center', icon: <Bell className="w-3.5 h-3.5" />,         badge: unreadCount },
    { id: 'compose',       label: 'Compose',             icon: <Plus className="w-3.5 h-3.5" /> },
    { id: 'conversations', label: 'Conversations',       icon: <MessageSquare className="w-3.5 h-3.5" />, badge: totalMsgUnread },
  ];

  if (loading) return (
    <AdminLayout>
      <div className="space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Notification Center</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage student messages, reminders, and notifications</p>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold">
              {unreadCount} unread
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id !== 'conversations') setShowMobileChat(false); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className={`min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-primary text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── CENTER ── */}
        {activeTab === 'center' && (
          <NotificationCenter
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAll={handleMarkAll}
          />
        )}

        {/* ── COMPOSE ── */}
        {activeTab === 'compose' && <ComposePanel />}

        {/* ── CONVERSATIONS ── */}
        {activeTab === 'conversations' && (
          <div className="glass-card rounded-2xl overflow-hidden" style={{ height: '72vh' }}>
            <div className="flex h-full">
              {/* Left: Student list */}
              <div className={`w-full md:w-80 flex flex-col border-r border-border shrink-0 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                {/* Search */}
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
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

                <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Students</p>
                  <span className="text-[10px] text-muted-foreground">{filteredConvs.length} conversations</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredConvs.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => { setActiveConvId(conv.id); setShowMobileChat(true); setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)); }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-border/50 hover:bg-muted/40 transition-colors text-left ${activeConvId === conv.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {conv.studentName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-semibold text-foreground truncate">{conv.studentName}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatListTime(conv.lastMessageTime)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate">{conv.lastMessage}</span>
                          {conv.unreadCount > 0 && (
                            <span className="shrink-0 ml-2 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{conv.studentId}</p>
                      </div>
                    </button>
                  ))}
                  {filteredConvs.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground text-sm">No students found</div>
                  )}
                </div>
              </div>

              {/* Right: Chat view */}
              <div className={`flex-1 min-w-0 flex flex-col ${!showMobileChat && !activeConv ? 'hidden md:flex' : 'flex'}`}>
                {activeConv ? (
                  <AdminChatView conv={activeConv} onBack={() => { setShowMobileChat(false); setActiveConvId(null); }} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-2xl gradient-bg/20 border border-primary/20 flex items-center justify-center mb-4">
                      <Users className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-base font-semibold text-foreground mb-1">Student Conversations</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Select a student from the list to view and send messages.
                    </p>
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
