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
    <div className="flex flex-col h-full text-slate-300" style={{ backgroundColor: '#064E3B' }}>
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-emerald-800/60">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: '#059669' }}
          >
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white tracking-wide leading-tight">TATTI</p>
            <p className="text-[11px] text-emerald-300 truncate leading-tight font-normal">Counsellor Portal</p>
          </div>
        </div>
      </div>

      {/* Counsellor Profile */}
      <div className="px-5 py-3.5 border-b border-emerald-800/60" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)' }}
          >
            <UserCheck className="w-4 h-4" style={{ color: '#34D399' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'Counsellor'}</p>
            <p className="text-[10px] text-emerald-300 truncate">{profile?.email || 'counsellor@tatti.edu'}</p>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group ${
                active
                  ? 'text-white shadow-sm'
                  : 'text-emerald-100 hover:text-orange-400'
              }`}
              style={active ? { backgroundColor: '#059669' } : {}}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(249, 115, 22, 0.18)';
                  (e.currentTarget as HTMLElement).style.color = '#FB923C';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                  (e.currentTarget as HTMLElement).style.color = '';
                }
              }}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-white' : 'text-emerald-300 group-hover:text-orange-400'}`} />
              <span className="flex-1 min-w-0 truncate">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-white/80" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-emerald-800/60">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-200 transition-colors"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
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
    <div className="flex min-h-screen w-full bg-[#F5F7FA]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0" style={{ borderRight: '1px solid #064E3B' }}>
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
              <SheetContent side="left" className="p-0 w-60" style={{ backgroundColor: '#064E3B', borderRight: '1px solid #064E3B' }}>
                <SidebarContent onNavClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div>
              <span className="text-base font-semibold text-[#172033] tracking-tight">{currentPage}</span>
              <p className="text-[11px] text-[#667085] hidden sm:block">Tamil Nadu Advanced Technical Training Institute</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#059669' }} />
              <span>Counsellor Console</span>
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
