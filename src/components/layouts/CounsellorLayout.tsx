import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard, Users, ClipboardList, BarChart2, Phone,
  PhoneCall, BookOpen, CheckSquare, FileBarChart, MessageSquare,
  LogOut, Menu, GraduationCap, ChevronRight, UserCheck
} from 'lucide-react';

const navItems = [
  { path: '/counsellor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/counsellor/students', icon: Users, label: 'Student Directory' },
  { path: '/counsellor/questions', icon: ClipboardList, label: 'Career Assessment' },
  { path: '/counsellor/segmentation', icon: BarChart2, label: 'Student Segmentation' },
  { path: '/counsellor/counselling', icon: Phone, label: 'Counselling' },
  { path: '/counsellor/followup', icon: PhoneCall, label: 'Follow-up Queue' },
  { path: '/counsellor/courses', icon: BookOpen, label: 'Course Catalog' },
  { path: '/counsellor/confirmations', icon: CheckSquare, label: 'Confirmations' },
  { path: '/counsellor/reports', icon: FileBarChart, label: 'Analytics & Reports' },
  { path: '/counsellor/notifications', icon: MessageSquare, label: 'Student Inquiries' },
];

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/counsellor/login');
  };

  return (
    <div className="flex flex-col h-full bg-[#0B1F3A] text-slate-300">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1D4ED8] flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white tracking-wide leading-tight">PSY CARE</p>
            <p className="text-[11px] text-slate-400 truncate leading-tight font-normal">Counsellor Portal</p>
          </div>
        </div>
      </div>

      {/* Counsellor Profile */}
      <div className="px-5 py-3.5 border-b border-slate-700/60 bg-slate-900/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/35 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'Counsellor'}</p>
            <p className="text-[10px] text-slate-400 truncate">{profile?.email || 'counsellor@tatti.edu'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group ${active
                  ? 'bg-[#FFE0B2] text-[#9A3412] font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-orange-500/15 hover:text-orange-300'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-[#C66A16]' : 'text-slate-400 group-hover:text-orange-300'}`} />
              <span className="flex-1 min-w-0 truncate">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#9A3412]" />}
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

export default function CounsellorLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const currentPage = navItems.find(n => n.path === location.pathname)?.label || 'Counsellor Portal';

  return (
    <div className="flex min-h-screen w-full bg-[#FFF7ED]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#0B1F3A]">
        <SidebarContent />
      </aside>

      {/* Main Container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 border-b border-[#FED7AA] bg-white flex items-center justify-between px-6 gap-4 shrink-0 shadow-[0_1px_2px_rgba(245,158,11,0.04)]">
          <div className="flex items-center gap-3 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-slate-700">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-60 bg-[#0B1F3A] border-r border-[#0B1F3A]">
                <SidebarContent onNavClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div>
              <span className="text-base font-semibold text-[#172554] tracking-tight">{currentPage}</span>
              <p className="text-[11px] text-[#64748B] hidden sm:block">PSY CARE</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-700"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Counsellor Console</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto p-5 md:p-8 bg-[#FFF7ED]">
          {children}
        </main>
      </div>
    </div>
  );
}
