import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard, ClipboardList, Lock, Unlock,
  Bell, User, LogOut, Menu, GraduationCap, ChevronRight, Settings
} from 'lucide-react';
import { getNotifications, getStudentByProfileId } from '@/lib/api';
import { getApplicationAccess } from '@/services/applicationAccessService';
import { getStudentUnreadMessagesCount } from '@/services/messagingService';

interface StudentLayoutProps {
  children: React.ReactNode;
}

function SidebarContent({
  onNavClick,
  unreadCount,
  isUnlocked,
}: {
  onNavClick?: () => void;
  unreadCount: number;
  isUnlocked: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/student/assessment', icon: ClipboardList, label: 'Career Fit Assessment' },
    {
      path: '/student/application',
      icon: isUnlocked ? Unlock : Lock,
      label: 'Application Process',
      isAppProcess: true,
    },
    { path: '/student/notifications', icon: Bell, label: 'Chats & Notifications', isNotifications: true },
    { path: '/student/profile', icon: User, label: 'Profile' },
    { path: '/student/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shrink-0 shadow-md">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground leading-tight">TATTI</p>
            <p className="text-[10px] text-sidebar-foreground truncate leading-tight">Student Portal</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center shrink-0 ring-2 ring-primary/20">
            <span className="text-xs font-bold text-white">
              {(profile?.full_name || profile?.email || 'S')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{profile?.full_name || 'Student'}</p>
            <p className="text-[10px] text-sidebar-foreground truncate">{profile?.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label, isAppProcess, isNotifications }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={onNavClick}
              className={`sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                active ? 'sidebar-item-active' : ''
              }`}
            >
              <div className="relative shrink-0">
                <Icon
                  className={`w-4 h-4 ${
                    isAppProcess
                      ? isUnlocked
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                      : ''
                  }`}
                />
              </div>

              <span className="flex-1 min-w-0 truncate text-xs font-medium">{label}</span>

              {/* Lock / Unlock badge indicator on sidebar */}
              {isAppProcess && (
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 ${
                    isUnlocked
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {isUnlocked ? '🔓' : '🔒'}
                </span>
              )}

              {/* Unread notification badge */}
              {isNotifications && unreadCount > 0 && (
                <span className="ml-auto shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}

              {active && !isAppProcess && !isNotifications && (
                <ChevronRight className="w-3 h-3 shrink-0 text-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className="sidebar-item w-full text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="text-xs font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const location = useLocation();
  const { profile } = useAuth();

  // Load student & application access status
  useEffect(() => {
    if (!profile) return;
    let mounted = true;

    const loadStudentData = async () => {
      try {
        const student = await getStudentByProfileId(profile.id);
        if (student && mounted) {
          setStudentId(student.id);
          const access = getApplicationAccess(student.id);
          setIsUnlocked(access.status === 'unlocked');

          // Fetch notifications count + unread chat messages
          const [notifs] = await Promise.all([getNotifications(profile.id)]);
          const sysUnread = notifs.filter(n => !n.is_read).length;
          const chatUnread = getStudentUnreadMessagesCount(student.id);
          setUnreadCount(sysUnread + chatUnread);
        }
      } catch {
        // graceful
      }
    };

    loadStudentData();

    // Listen to real-time events for lock status changes, new messages, and notification updates
    const handleAccessChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!studentId || detail?.studentId === studentId) {
        setIsUnlocked(detail?.status === 'unlocked');
      }
    };

    const handleNewMessage = () => {
      if (studentId) {
        getNotifications(profile.id).then(notifs => {
          const sysUnread = notifs.filter(n => !n.is_read).length;
          const chatUnread = getStudentUnreadMessagesCount(studentId);
          setUnreadCount(sysUnread + chatUnread);
        }).catch(() => {});
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tatti_application_access_records' && studentId) {
        const access = getApplicationAccess(studentId);
        setIsUnlocked(access.status === 'unlocked');
      }
      if (e.key === 'tatti_chat_messages_v1' && studentId) {
        const chatUnread = getStudentUnreadMessagesCount(studentId);
        setUnreadCount(prev => prev + chatUnread);
      }
    };

    window.addEventListener('tatti_application_access_changed', handleAccessChange);
    window.addEventListener('tatti_new_message', handleNewMessage);
    window.addEventListener('tatti_messages_read', handleNewMessage);
    window.addEventListener('storage', handleStorage);

    const interval = setInterval(loadStudentData, 15000);

    return () => {
      mounted = false;
      window.removeEventListener('tatti_application_access_changed', handleAccessChange);
      window.removeEventListener('tatti_new_message', handleNewMessage);
      window.removeEventListener('tatti_messages_read', handleNewMessage);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [profile, studentId]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border">
        <SidebarContent unreadCount={unreadCount} isUnlocked={isUnlocked} />
      </aside>

      {/* Main content container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header */}
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                <Menu className="w-5 h-5 text-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
              <SidebarContent
                unreadCount={unreadCount}
                isUnlocked={isUnlocked}
                onNavClick={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          {/* Current Page Title */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              TATTI Student Portal
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/student/notifications">
              <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
