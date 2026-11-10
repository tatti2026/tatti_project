import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard, ClipboardList, BookOpen,
  Bell, User, LogOut, Menu, Settings
} from 'lucide-react';
import { getNotifications, getStudentByProfileId } from '@/lib/api';
import { getStudentUnreadMessagesCount } from '@/services/messagingService';
import StudentAppointmentReminders from '@/components/student/StudentAppointmentReminders';

interface StudentLayoutProps {
  children: React.ReactNode;
}

// Nav items for desktop sidebar & mobile drawer
const sidebarNavItems = [
  { path: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/student/assessment', icon: ClipboardList, label: 'Career Fit Assessment' },
  { path: '/student/courses', icon: BookOpen, label: 'Course Recommendations' },
  { path: '/student/notifications', icon: Bell, label: 'Inquiries & Messages', isNotifications: true },
  { path: '/student/profile', icon: User, label: 'Profile' },
  { path: '/student/settings', icon: Settings, label: 'Account Settings' },
];

// Compact 4 items for Mobile Bottom Navigation
const mobileBottomNavItems = [
  { path: '/student/dashboard', icon: LayoutDashboard, label: 'Home' },
  { path: '/student/assessment', icon: ClipboardList, label: 'Assessment' },
  { path: '/student/courses', icon: BookOpen, label: 'Courses' },
  { path: '/student/profile', icon: User, label: 'Profile' },
];

function SidebarContent({
  onNavClick,
  unreadCount,
}: {
  onNavClick?: () => void;
  unreadCount: number;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-white text-[#25364B]">
      {/* Brand Header */}
      <div className="px-4 py-3.5 border-b border-[#F0D6C8] bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-[#F0D6C8] p-1 flex items-center justify-center shrink-0 shadow-xs">
            <img src="/logo/psycare-logo.png" alt="PSYCARE" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 flex items-center gap-1.5">
            <span className="text-base font-bold text-[#2878C8] tracking-tight">PSYCARE</span>
            <span className="text-[10px] font-semibold bg-[#E8F2FF] text-[#2878C8] px-1.5 py-0.5 rounded-full border border-[#2878C8]/20">
              Student
            </span>
          </div>
        </div>
      </div>

      {/* Student Profile Card */}
      <div className="px-4 py-3 border-b border-[#F0D6C8] bg-[#FFF0E8]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#2878C8] text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
            {(profile?.full_name || profile?.email || 'S')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#25364B] truncate">{profile?.full_name || 'Enrolled Student'}</p>
            <p className="text-[10px] text-[#667085] truncate">{profile?.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        {sidebarNavItems.map(({ path, icon: Icon, label, isNotifications }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={onNavClick}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                active
                  ? 'bg-[#E8F2FF] text-[#2878C8] font-semibold border border-[#BFDBFE] shadow-xs'
                  : 'text-[#667085] hover:bg-[#FFF0E8] hover:text-[#25364B]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  active ? 'text-[#2878C8]' : 'text-[#667085]'
                }`}
              />

              <span className="flex-1 min-w-0 truncate">{label}</span>

              {/* Unread notification badge */}
              {isNotifications && unreadCount > 0 && (
                <span className="ml-auto shrink-0 min-w-[18px] h-[18px] rounded-full bg-[#2878C8] text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-[#F0D6C8]">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [studentId, setStudentId] = useState<string | null>(null);
  const location = useLocation();
  const { profile } = useAuth();

  // Load student data & notifications
  useEffect(() => {
    if (!profile) return;
    let mounted = true;

    const loadStudentData = async () => {
      try {
        const student = await getStudentByProfileId(profile.id);
        if (student && mounted) {
          setStudentId(student.id);

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

    window.addEventListener('tatti_new_message', handleNewMessage);
    window.addEventListener('tatti_messages_read', handleNewMessage);
    window.addEventListener('storage', handleStorage);

    const interval = setInterval(loadStudentData, 15000);

    return () => {
      mounted = false;
      window.removeEventListener('tatti_new_message', handleNewMessage);
      window.removeEventListener('tatti_messages_read', handleNewMessage);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [profile, studentId]);

  return (
    <div className="flex min-h-screen w-full bg-[#FFF0E8]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[#F0D6C8] bg-white">
        <SidebarContent unreadCount={unreadCount} />
      </aside>

      {/* Main content container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact Top Header (48–56px high) */}
        <header className="h-13 sm:h-14 border-b border-[#F0D6C8] bg-white flex items-center justify-between px-3.5 sm:px-6 shrink-0 shadow-[0_1px_3px_rgba(40,120,200,0.05)] pt-safe">
          {/* Left: PSYCARE + Student badge */}
          <div className="flex items-center gap-2.5">
            {/* Mobile Sheet Trigger (Menu) */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 text-[#25364B] hover:bg-[#FFF0E8]">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-white border-r border-[#F0D6C8]">
                <SidebarContent
                  unreadCount={unreadCount}
                  onNavClick={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <Link to="/student/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#F0D6C8] p-0.5 flex items-center justify-center shrink-0">
                <img src="/logo/psycare-logo.png" alt="PSYCARE" className="w-full h-full object-contain" />
              </div>
              <span className="text-base sm:text-lg font-bold text-[#2878C8] tracking-tight">
                PSYCARE
              </span>
              <span className="text-[10px] font-semibold bg-[#E8F2FF] text-[#2878C8] px-2 py-0.5 rounded-full border border-[#2878C8]/20">
                Student
              </span>
            </Link>
          </div>

          {/* Right: Notification Bell */}
          <div className="flex items-center gap-2">
            <Link
              to="/student/notifications"
              className="relative p-2 rounded-xl text-[#25364B] hover:bg-[#FFF0E8] transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-[#25364B]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[17px] h-[17px] rounded-full bg-[#2878C8] text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-xs animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page Content with bottom padding to avoid bottom nav overlap */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 overflow-y-auto bg-[#FFF0E8] pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (4 Compact Items) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#F0D6C8] px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(40,120,200,0.06)]"
      >
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {mobileBottomNavItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 ${
                  active
                    ? 'bg-[#E8F2FF] text-[#2878C8] font-bold'
                    : 'text-[#667085] hover:text-[#25364B]'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110 text-[#2878C8]' : 'text-[#667085]'}`} />
                <span className="text-[10px] leading-tight font-medium mt-1">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <StudentAppointmentReminders />
    </div>
  );
}
