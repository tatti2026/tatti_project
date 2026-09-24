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
    { path: '/student/notifications', icon: Bell, label: 'Inquiries & Messages', isNotifications: true },
    { path: '/student/profile', icon: User, label: 'Profile' },
    { path: '/student/settings', icon: Settings, label: 'Account Settings' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0B1F3A] text-slate-300">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1D4ED8] flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white tracking-wide leading-tight">TATTI</p>
            <p className="text-[11px] text-slate-400 truncate leading-tight font-normal">Student Management Portal</p>
          </div>
        </div>
      </div>

      {/* Student Profile Card */}
      <div className="px-5 py-3.5 border-b border-slate-700/60 bg-slate-900/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1D4ED8]/25 border border-[#1D4ED8]/40 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">
              {(profile?.full_name || profile?.email || 'S')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'Enrolled Student'}</p>
            <p className="text-[10px] text-slate-400 truncate">{profile?.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label, isAppProcess, isNotifications }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#1D4ED8] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="relative shrink-0">
                <Icon
                  className={`w-4 h-4 ${
                    isAppProcess
                      ? isUnlocked
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                      : active
                        ? 'text-white'
                        : 'text-slate-400'
                  }`}
                />
              </div>

              <span className="flex-1 min-w-0 truncate">{label}</span>

              {/* Lock / Unlock badge indicator on sidebar */}
              {isAppProcess && (
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold flex items-center gap-1 ${
                    isUnlocked
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isUnlocked ? 'Unlocked' : 'Locked'}
                </span>
              )}

              {/* Unread notification badge */}
              {isNotifications && unreadCount > 0 && (
                <span className="ml-auto shrink-0 min-w-[18px] h-[18px] rounded-full bg-[#1D4ED8] text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}

              {active && !isAppProcess && !isNotifications && (
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-white/80" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-slate-700/60">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
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
          setIsUnlocked(student.application_access_status === 'unlocked');

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
    <div className="flex min-h-screen w-full bg-[#F5F7FA]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#0B1F3A]">
        <SidebarContent unreadCount={unreadCount} isUnlocked={isUnlocked} />
      </aside>

      {/* Main content container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header */}
        <header className="h-16 border-b border-[#E4E7EC] bg-white flex items-center justify-between px-6 gap-4 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {/* Mobile hamburger */}
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-slate-700">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-60 bg-[#0B1F3A] border-r border-[#0B1F3A]">
                <SidebarContent
                  unreadCount={unreadCount}
                  isUnlocked={isUnlocked}
                  onNavClick={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <div>
              <span className="text-base font-semibold text-[#172033] tracking-tight">
                TATTI Student Portal
              </span>
              <p className="text-[11px] text-[#667085] hidden sm:block">
                Tamil Nadu Advanced Technical Training Institute
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/student/notifications">
              <Button variant="outline" size="sm" className="relative h-9 px-3 border-[#E4E7EC] text-[#344054] hover:bg-[#F8FAFC]">
                <Bell className="w-4 h-4 mr-1.5 text-slate-500" />
                <span className="text-xs">Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-[#1D4ED8] text-white text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 md:p-8 overflow-y-auto bg-[#F5F7FA]">
          {children}
        </main>
      </div>
    </div>
  );
}
