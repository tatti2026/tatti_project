import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead, getStudentByProfileId } from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import type { Notification, Student } from '@/types/index';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell, BellOff, CheckCheck, MessageSquare, Calendar, CreditCard,
  ClipboardList, GraduationCap, FileText, Search, Send, Mic,
  Volume2, VolumeX, BellRing, Settings2, Paperclip, MoreVertical,
  Check, CheckCheck as CheckCheckIcon, Smile, X, ArrowLeft, ArrowRight,
  ShieldCheck, Unlock, Lock, Sparkles
} from 'lucide-react';
import {
  getMessagesForStudent, getStudentConversation, sendChatMessage,
  markConversationAsRead, playNotificationSound, type ChatMessage, type ChatConversation,
  fetchMessagesFromAPI, sendMessageViaAPI, markMessagesReadViaAPI
} from '@/services/messagingService';
import FileAttachment from '@/components/chat/FileAttachment';
import ChatInput from '@/components/chat/ChatInput';
import type { UploadedFileData } from '@/components/chat/DocumentUploadModal';

type MainTab = 'all' | 'messages';

// Icons and badges for system notifications
const systemNotifConfig: Record<string, { icon: string; badgeColor: string; bg: string }> = {
  general:     { icon: '🔔', badgeColor: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  assessment:  { icon: '📋', badgeColor: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  course:      { icon: '🎓', badgeColor: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20' },
  application: { icon: '📄', badgeColor: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  payment:     { icon: '💳', badgeColor: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20' },
  counselling: { icon: '📅', badgeColor: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  admission:   { icon: '🏛️', badgeColor: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20' },
};

function formatMsgDate(d: Date) {
  if (isToday(d)) return format(d, 'hh:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMM');
}

function formatSectionDate(d: Date) {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMMM yyyy');
}

export default function Notifications() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [newMsgPopup, setNewMsgPopup] = useState<ChatMessage | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load student, notifications & messages
  const loadData = async () => {
    if (!profile) return;
    try {
      let s = await getStudentByProfileId(profile.id);
      setStudent(s);
      const studentId = s?.id || 'default';

      const notifs = await getNotifications(profile.id);
      setNotifications(notifs);

      const msgs = await fetchMessagesFromAPI(studentId);
      setMessages(msgs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [profile]);

  // Real-time message and notification listeners
  useEffect(() => {
    const handleNewMsg = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message as ChatMessage;
      if (!msg) return;
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      if (msg.senderType === 'admin') {
        // Trigger in-app notification popup
        setNewMsgPopup(msg);
        setTimeout(() => setNewMsgPopup(null), 6000);
      }
    };

    const handleMsgStatus = () => {
      if (student) {
        setMessages(getMessagesForStudent(student.id));
      }
    };

    const handleNotifs = () => {
      if (profile) {
        getNotifications(profile.id).then(setNotifications).catch(() => {});
      }
    };

    window.addEventListener('tatti_new_message', handleNewMsg);
    window.addEventListener('tatti_message_status_updated', handleMsgStatus);
    window.addEventListener('tatti_new_notification', handleNotifs);
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('tatti_new_message', handleNewMsg);
      window.removeEventListener('tatti_message_status_updated', handleMsgStatus);
      window.removeEventListener('tatti_new_notification', handleNotifs);
      window.removeEventListener('storage', loadData);
    };
  }, [student, profile]);

  useEffect(() => {
    if (activeTab === 'messages') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => markNotificationRead(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    if (student) {
      await markMessagesReadViaAPI(student.id, 'student');
      const msgs = await fetchMessagesFromAPI(student.id);
      setMessages(msgs);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  // Send message from student to Admin
  const handleSendMessageText = async (text: string) => {
    if (!text.trim()) return;
    const studentId = student?.id || 'default';
    const studentName = student?.full_name || profile?.full_name || 'Student';

    await sendMessageViaAPI({
      studentId,
      senderId: profile?.id || 'student',
      senderName: studentName,
      senderType: 'student',
      text: text.trim(),
    });

    const msgs = await fetchMessagesFromAPI(studentId);
    setMessages(msgs);
  };

  const handleSendDocument = async (file: UploadedFileData) => {
    const studentId = student?.id || 'default';
    const studentName = student?.full_name || profile?.full_name || 'Student';

    await sendMessageViaAPI({
      studentId,
      senderId: profile?.id || 'student',
      senderName: studentName,
      senderType: 'student',
      text: `Uploaded document: ${file.name}`,
      attachment: {
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
      },
    });

    const msgs = await fetchMessagesFromAPI(studentId);
    setMessages(msgs);
  };

  // Switch to messages tab and mark read
  const openMessagesTab = async () => {
    setActiveTab('messages');
    setShowMobileChat(true);
    if (student) {
      await markMessagesReadViaAPI(student.id, 'student');
      const msgs = await fetchMessagesFromAPI(student.id);
      setMessages(msgs);
    }
  };

  // Calculate unread counts
  const unreadSysNotifs = notifications.filter(n => !n.is_read).length;
  const unreadMessagesCount = messages.filter(m => m.senderType === 'admin' && m.status !== 'read').length;
  const totalAllUnread = unreadSysNotifs + unreadMessagesCount;

  // Filtered lists according to search query
  const q = searchQuery.toLowerCase().trim();

  // Combined notifications for the "All" tab: includes both system notifications & direct messages
  interface CombinedItem {
    id: string;
    type: 'system' | 'message';
    title: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
    sysType?: string;
    rawMessage?: ChatMessage;
    rawNotif?: Notification;
  }

  const allItems: CombinedItem[] = useMemo(() => {
    const list: CombinedItem[] = [];

    // Add system notifications
    for (const n of notifications) {
      list.push({
        id: `sys-${n.id}`,
        type: 'system',
        title: n.title,
        message: n.message,
        timestamp: new Date(n.created_at),
        isRead: n.is_read,
        sysType: n.type,
        rawNotif: n,
      });
    }

    // Add admin direct messages to "All" tab
    for (const m of messages.filter(m => m.senderType === 'admin')) {
      list.push({
        id: `msg-${m.id}`,
        type: 'message',
        title: '💬 Direct Message from TATTI Admin',
        message: m.text,
        timestamp: new Date(m.timestamp),
        isRead: m.status === 'read',
        sysType: 'message',
        rawMessage: m,
      });
    }

    // Sort descending
    list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (!q) return list;
    return list.filter(item =>
      item.title.toLowerCase().includes(q) || item.message.toLowerCase().includes(q)
    );
  }, [notifications, messages, q]);

  // Group messages by date for chat view
  const groupedChatMessages = useMemo(() => {
    const filtered = q
      ? messages.filter(m => m.text.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q))
      : messages;

    const groups: { dateLabel: string; msgs: ChatMessage[] }[] = [];
    let currentLabel = '';
    let currentList: ChatMessage[] = [];

    for (const m of filtered) {
      const label = formatSectionDate(new Date(m.timestamp));
      if (label !== currentLabel) {
        if (currentList.length > 0) {
          groups.push({ dateLabel: currentLabel, msgs: currentList });
        }
        currentLabel = label;
        currentList = [m];
      } else {
        currentList.push(m);
      }
    }
    if (currentList.length > 0) {
      groups.push({ dateLabel: currentLabel, msgs: currentList });
    }
    return groups;
  }, [messages, q]);

  const lastAdminMessage = useMemo(() => {
    return [...messages].reverse().find(m => m.senderType === 'admin');
  }, [messages]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="space-y-3 max-w-4xl mx-auto">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto animate-fade-in relative">
        {/* ── IN-APP POPUP NOTIFICATION FOR NEW MESSAGES ── */}
        {newMsgPopup && (
          <div className="fixed top-16 right-4 z-50 max-w-sm bg-card border border-primary/40 shadow-2xl rounded-2xl p-4 animate-slide-in flex items-start gap-3 ring-2 ring-primary/20">
            <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
              TA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>💬 TATTI Admin</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {newMsgPopup.text}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-6 px-2.5 text-[11px] gradient-bg border-0 text-white font-semibold"
                  onClick={() => {
                    setNewMsgPopup(null);
                    openMessagesTab();
                  }}
                >
                  View Message
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px] text-muted-foreground"
                  onClick={() => setNewMsgPopup(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stay updated with important updates and messages from TATTI.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {totalAllUnread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs border-border hover:border-primary/40"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-primary" /> Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="flex items-center gap-2.5 bg-card rounded-xl px-3.5 py-2.5 border border-border mb-5 shadow-sm">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search notifications/messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── ONLY TWO TABS PER SPEC: [ All ] [ Messages ] ── */}
        <div className="flex gap-2 mb-6 border-b border-border pb-3">
          <button
            onClick={() => {
              setActiveTab('all');
              setShowMobileChat(false);
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-primary text-white shadow-md'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>All</span>
            {unreadSysNotifs > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-primary text-white'
              }`}>
                {unreadSysNotifs}
              </span>
            )}
          </button>

          <button
            onClick={openMessagesTab}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'messages'
                ? 'bg-primary text-white shadow-md'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Messages</span>
            {unreadMessagesCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'messages' ? 'bg-white/20 text-white' : 'bg-primary text-white'
              }`}>
                {unreadMessagesCount}
              </span>
            )}
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ── TAB 1: ALL TAB ────────────────────────────────────────── */}
        {/* Displays BOTH System Notifications and Direct Messages      */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'all' && (
          <div className="space-y-3">
            {allItems.length === 0 ? (
              <div className="glass-card rounded-2xl p-16 text-center border border-border">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <Bell className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">No notifications</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                  {searchQuery
                    ? 'No notifications or messages match your search query.'
                    : "You'll receive important updates and messages from TATTI here."}
                </p>
              </div>
            ) : (
              allItems.map(item => {
                const conf = systemNotifConfig[item.sysType || 'general'] || systemNotifConfig.general;
                const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true });
                const isUnlockNotif = item.title.includes('Unlocked') || item.title.includes('Application Process Unlocked');

                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-4 p-4 md:p-5 rounded-2xl border transition-all ${
                      !item.isRead
                        ? 'bg-primary/5 border-primary/30 shadow-sm'
                        : 'glass-card border-border/80 hover:bg-muted/30'
                    }`}
                  >
                    {/* Icon Badge */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl border ${conf.bg}`}>
                      {conf.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`text-sm font-bold leading-snug truncate ${!item.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {format(item.timestamp, 'dd MMMM yyyy • hh:mm a')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground/80 whitespace-nowrap">
                            {timeAgo}
                          </span>
                          {!item.isRead && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              Unread
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs md:text-sm text-muted-foreground mt-2 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Action buttons on notification cards */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {isUnlockNotif && (
                          <Button
                            size="sm"
                            onClick={() => navigate('/student/application')}
                            className="gradient-bg border-0 text-white text-xs h-8 px-3 font-semibold shadow-sm"
                          >
                            <Unlock className="w-3.5 h-3.5 mr-1.5" /> Start Application
                          </Button>
                        )}

                        {item.type === 'message' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={openMessagesTab}
                            className="text-xs h-8 px-3 border-primary/40 text-primary hover:bg-primary/10"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Open Chat & Reply
                          </Button>
                        )}

                        {!item.isRead && item.rawNotif && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkSingleRead(item.rawNotif!.id)}
                            className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: MESSAGES TAB ───────────────────────────────────── */}
        {/* WhatsApp-Style Chat Experience with TATTI Branding          */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'messages' && (
          <div className="glass-card rounded-2xl overflow-hidden border border-border shadow-xl" style={{ height: '72vh' }}>
            <div className="flex h-full">
              {/* Left Pane: Conversation List */}
              <div className={`w-full md:w-80 flex flex-col border-r border-border shrink-0 bg-card ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                {/* Channel Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Support Channels</h3>
                    <p className="text-[11px] text-muted-foreground">Direct staff & admin communication</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                    Live
                  </Badge>
                </div>

                {/* TATTI Admin Conversation Card */}
                <div className="flex-1 overflow-y-auto p-2">
                  <button
                    onClick={() => setShowMobileChat(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-all text-left group"
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        TA
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          TATTI Admin
                        </span>
                        {lastAdminMessage && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatMsgDate(new Date(lastAdminMessage.timestamp))}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {lastAdminMessage?.text || 'Official Admin Support'}
                      </p>
                    </div>

                    {unreadMessagesCount > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1.5 shadow-sm">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Pane: WhatsApp-style Chat Area */}
              <div className={`flex-1 min-w-0 flex flex-col bg-background/50 ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                {/* Chat Top Header */}
                <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setShowMobileChat(false)}
                      className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        TA
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-xs sm:text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                        TATTI Admin
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      </h2>
                      <p className="text-[10px] text-emerald-400 font-medium">
                        Online • Academic & Admissions Desk
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={playNotificationSound}
                      className="h-8 px-2 text-xs text-muted-foreground"
                      title="Test Audio Chime"
                    >
                      <Volume2 className="w-3.5 h-3.5 mr-1" /> Chime
                    </Button>
                  </div>
                </div>

                {/* Chat Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {groupedChatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                      <MessageSquare className="w-10 h-10 mb-2 opacity-50 text-primary" />
                      <p className="text-xs font-semibold text-foreground">Start Conversation</p>
                      <p className="text-[11px] max-w-xs mt-1">
                        Send a message to TATTI Admin regarding your assessment, application, or admissions.
                      </p>
                    </div>
                  ) : (
                    groupedChatMessages.map(({ dateLabel, msgs }) => (
                      <div key={dateLabel} className="space-y-3">
                        {/* Date Divider */}
                        <div className="flex items-center justify-center">
                          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-muted/80 text-muted-foreground border border-border/60 shadow-xs">
                            {dateLabel}
                          </span>
                        </div>

                        {msgs.map(m => {
                          const isMe = m.senderType === 'student';
                          const timeStr = format(new Date(m.timestamp), 'hh:mm a');

                          return (
                            <div
                              key={m.id}
                              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-xs md:text-sm leading-relaxed ${
                                  isMe
                                    ? 'gradient-bg text-white rounded-tr-xs'
                                    : 'bg-card border border-border/80 text-foreground rounded-tl-xs'
                                }`}
                              >
                                {!isMe && (
                                  <p className="text-[10px] font-bold text-primary mb-1">
                                    {m.senderName}
                                  </p>
                                )}
                                {m.attachment && (
                                  <div className="mb-2">
                                    <FileAttachment
                                      fileName={m.attachment.name}
                                      fileSize={m.attachment.size}
                                      fileType={m.attachment.type}
                                      fileUrl={m.attachment.url}
                                      isSender={isMe}
                                    />
                                  </div>
                                )}
                                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                                <div
                                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                    isMe ? 'text-white/80' : 'text-muted-foreground'
                                  }`}
                                >
                                  <span>{timeStr}</span>
                                  {isMe && (
                                    <span>
                                      {m.status === 'read' ? (
                                        <CheckCheckIcon className="w-3.5 h-3.5 text-blue-300" />
                                      ) : m.status === 'delivered' ? (
                                        <CheckCheckIcon className="w-3.5 h-3.5" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Chat Input with Document Upload & Virtual Keyboard */}
                <ChatInput
                  onSendMessage={handleSendMessageText}
                  onSendDocument={handleSendDocument}
                  placeholder="Type a message to TATTI Admin..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
