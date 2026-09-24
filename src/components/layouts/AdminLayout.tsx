import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard, Users, ClipboardList, BarChart2, Phone,
  PhoneCall, BookOpen, CheckSquare, FileBarChart, Bell, MessageSquare,
  Settings, LogOut, Menu, GraduationCap, ChevronRight, Shield
} from 'lucide-react';

const navItems = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/students', icon: Users, label: 'Student Directory' },
  { path: '/admin/questions', icon: ClipboardList, label: 'Career Assessment' },
  { path: '/admin/segmentation', icon: BarChart2, label: 'Student Segmentation' },
  { path: '/admin/counselling', icon: Phone, label: 'Counselling' },
  { path: '/admin/followup', icon: PhoneCall, label: 'Follow-up Queue' },
  { path: '/admin/courses', icon: BookOpen, label: 'Course Catalog' },
  { path: '/admin/confirmations', icon: CheckSquare, label: 'Confirmations' },
  { path: '/admin/reports', icon: FileBarChart, label: 'Analytics & Reports' },
  { path: '/admin/notifications', icon: MessageSquare, label: 'Student Inquiries' },
];

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
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
            <p className="text-sm font-bold text-white tracking-wide leading-tight">TATTI</p>
            <p className="text-[11px] text-slate-400 truncate leading-tight font-normal">Enterprise Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Admin Profile */}
      <div className="px-5 py-3.5 border-b border-slate-700/60 bg-slate-900/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'Administrator'}</p>
            <p className="text-[10px] text-slate-400 truncate">{profile?.email || 'admin@tatti.edu'}</p>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#1D4ED8] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
              <span className="flex-1 min-w-0 truncate">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-white/80" />}
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const currentPage = navItems.find(n => n.path === location.pathname)?.label || 'Administration';

  return (
    <div className="flex min-h-screen w-full bg-[#F5F7FA]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#0B1F3A]">
        <SidebarContent />
      </aside>

      {/* Main Container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 border-b border-[#E4E7EC] bg-white flex items-center justify-between px-6 gap-4 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
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
              <span className="text-base font-semibold text-[#172033] tracking-tight">{currentPage}</span>
              <p className="text-[11px] text-[#667085] hidden sm:block">Tamil Nadu Advanced Technical Training Institute</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Admin Console</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto p-5 md:p-8 bg-[#F5F7FA]">
          {children}
        </main>
      </div>
    </div>
  );
}
