import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard, Users, ClipboardList, BarChart2, Phone,
  PhoneCall, BookOpen, FileBarChart, MessageSquare,
  LogOut, Menu, Bell, MoreHorizontal, ChevronRight, UserCheck
} from 'lucide-react';
import { getNotifications, getUnreadCount as getChatUnreadCount } from '@/lib/api';

const navItems = [
  { path: '/counsellor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/counsellor/students', icon: Users, label: 'Student Details' },
  { path: '/counsellor/questions', icon: ClipboardList, label: 'Career Assessment' },
  { path: '/counsellor/segmentation', icon: BarChart2, label: 'Student Segmentation' },
  { path: '/counsellor/counselling', icon: Phone, label: 'Counselling' },
  { path: '/counsellor/followup', icon: PhoneCall, label: 'Follow-up' },
  { path: '/counsellor/courses', icon: BookOpen, label: 'Course Management' },
  { path: '/counsellor/reports', icon: FileBarChart, label: 'Analytics & Reports' },
  { path: '/counsellor/notifications', icon: MessageSquare, label: 'Student Inquiries' },
];

// Bottom nav items for mobile
const mobileBottomNavItems = [
  { path: '/counsellor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/counsellor/students', icon: Users, label: 'Students' },
  { path: '/counsellor/followup', icon: PhoneCall, label: 'Follow-ups' },
  { path: '/counsellor/counselling', icon: Phone, label: 'Counselling' },
];

function SidebarContent({ onNavClick, unreadCount }: { onNavClick?: () => void; unreadCount: number }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/counsellor/login');
  };

  return (
    <div className="flex flex-col h-full bg-white text-[#25364B]">
      {/* Brand Header */}
      <div className="px-4 py-3.5 border-b border-[#F0D6C8] bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-[#F0D6C8] p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            <img src="/logo/psycare-logo.png" alt="PSYCARE Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 flex items-center gap-1.5">
            <span className="text-base font-bold text-[#2878C8] tracking-tight">PSYCARE</span>
            <span className="text-[10px] font-semibold bg-[#E8F2FF] text-[#2878C8] px-1.5 py-0.5 rounded-full border border-[#2878C8]/20">
              Counsellor
            </span>
          </div>
        </div>
      </div>

      {/* Counsellor Profile */}
      <div className="px-4 py-3 border-b border-[#F0D6C8] bg-[#FFF0E8]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#2878C8] text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
            {(profile?.full_name || profile?.email || 'C')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#25364B] truncate">{profile?.full_name || 'Counsellor'}</p>
            <p className="text-[10px] text-[#667085] truncate">{profile?.email || 'counsellor@tatti.edu'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          const isNotifs = path === '/counsellor/notifications';
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
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-[#2878C8]' : 'text-[#667085]'}`} />
              <span className="flex-1 min-w-0 truncate">{label}</span>
              {isNotifs && unreadCount > 0 && (
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

export default function CounsellorLayout({ children }: { children: React.ReactNode }) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const [notifs, chatUnread] = await Promise.all([
          getNotifications(profile.id).catch(() => []),
          getChatUnreadCount().catch(() => 0),
        ]);
        if (mounted) {
          const sysUnread = Array.isArray(notifs) ? notifs.filter(n => !n.is_read).length : 0;
          setUnreadCount(sysUnread + (typeof chatUnread === 'number' ? chatUnread : 0));
        }
      } catch {
        // graceful
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 6000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/counsellor/login');
  };

  const moreNavItems = [
    { path: '/counsellor/questions', icon: ClipboardList, label: 'Career Assessment' },
    { path: '/counsellor/segmentation', icon: BarChart2, label: 'Student Segmentation' },
    { path: '/counsellor/courses', icon: BookOpen, label: 'Course Management' },
    { path: '/counsellor/reports', icon: FileBarChart, label: 'Analytics & Reports' },
    { path: '/counsellor/notifications', icon: MessageSquare, label: 'Student Inquiries' },
  ];

  const isMoreActive = moreNavItems.some(item => location.pathname === item.path);

  return (
    <div className="counsellor-portal flex min-h-screen w-full bg-[#FFF0E8]" data-portal="counsellor">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[#F0D6C8] bg-white">
        <SidebarContent unreadCount={unreadCount} />
      </aside>

      {/* Main Container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact Top Header (48–56px high) */}
        <header className="h-13 sm:h-14 border-b border-[#F0D6C8] bg-white flex items-center justify-between px-3.5 sm:px-6 shrink-0 shadow-[0_1px_3px_rgba(40,120,200,0.05)] pt-safe">
          <div className="flex items-center gap-2">
            <Link to="/counsellor/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#F0D6C8] p-0.5 flex items-center justify-center shrink-0">
                <img src="/logo/psycare-logo.png" alt="PSYCARE" className="w-full h-full object-contain" />
              </div>
              <span className="text-base sm:text-lg font-bold text-[#2878C8] tracking-tight">
                PSYCARE
              </span>
              <span className="text-[10px] font-semibold bg-[#E8F2FF] text-[#2878C8] px-2 py-0.5 rounded-full border border-[#2878C8]/20">
                Counsellor
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/counsellor/notifications"
              className="relative p-2 rounded-xl text-[#25364B] hover:bg-[#FFF0E8] transition-colors"
              title="Student Inquiries & Notifications"
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

        {/* Content Area with bottom padding to avoid bottom nav overlap on mobile */}
        <main className="flex-1 min-w-0 overflow-y-auto p-3.5 sm:p-5 md:p-6 bg-[#FFF0E8] pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (5 Compact Items: Dashboard, Students, Follow-ups, Counselling, More) */}
      <nav
        aria-label="Counsellor Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#F0D6C8] px-1 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(40,120,200,0.06)]"
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {mobileBottomNavItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-150 ${
                  active
                    ? 'bg-[#E8F2FF] text-[#2878C8] font-bold'
                    : 'text-[#667085] hover:text-[#25364B]'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110 text-[#2878C8]' : 'text-[#667085]'}`} />
                <span className="text-[10px] leading-tight font-medium mt-1 truncate">
                  {label}
                </span>
              </Link>
            );
          })}

          {/* 5th Item: More Menu */}
          <Sheet open={mobileMoreOpen} onOpenChange={setMobileMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-150 ${
                  isMoreActive
                    ? 'bg-[#E8F2FF] text-[#2878C8] font-bold'
                    : 'text-[#667085] hover:text-[#25364B]'
                }`}
              >
                <MoreHorizontal className={`w-5 h-5 ${isMoreActive ? 'scale-110 text-[#2878C8]' : 'text-[#667085]'}`} />
                <span className="text-[10px] leading-tight font-medium mt-1">
                  More
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl bg-white border-t border-[#F0D6C8] p-4 max-h-[80vh] overflow-y-auto">
              <div className="w-12 h-1 bg-[#F0D6C8] rounded-full mx-auto mb-4" />
              <h3 className="text-sm font-bold text-[#25364B] mb-2 px-1">More Options</h3>
              <div className="space-y-1">
                {moreNavItems.map(({ path, icon: Icon, label }) => {
                  const active = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setMobileMoreOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? 'bg-[#E8F2FF] text-[#2878C8] font-bold'
                          : 'text-[#667085] hover:bg-[#FFF0E8] hover:text-[#25364B]'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-[#2878C8]" />
                      <span className="flex-1">{label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </Link>
                  );
                })}

                <button
                  onClick={() => { setMobileMoreOpen(false); handleSignOut(); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors mt-2 border-t border-[#F0D6C8]/60 pt-3"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
