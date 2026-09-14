import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard, Users, ClipboardList, BarChart2, Phone,
  MessageSquare, BookOpen, CheckSquare, FileBarChart, Bell,
  Settings, LogOut, Menu, GraduationCap, ChevronRight, Shield
} from 'lucide-react';

const navItems = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/students', icon: Users, label: 'Student Details' },
  { path: '/admin/questions', icon: ClipboardList, label: 'Entry Assessment' },
  { path: '/admin/segmentation', icon: BarChart2, label: 'Assessment & Segmentation' },
  { path: '/admin/counselling', icon: Phone, label: 'Counselling' },
  { path: '/admin/followup', icon: MessageSquare, label: 'Follow-up' },
  { path: '/admin/courses', icon: BookOpen, label: 'Courses' },
  { path: '/admin/confirmations', icon: CheckSquare, label: 'Confirmations' },
  { path: '/admin/reports', icon: FileBarChart, label: 'Reports' },
  { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
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
    <div className="flex flex-col h-full bg-sidebar">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground leading-tight">TATTI</p>
            <p className="text-[10px] text-sidebar-foreground leading-tight">Admin Portal</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{profile?.full_name || 'Admin'}</p>
            <p className="text-[10px] text-sidebar-foreground truncate">{profile?.email || ''}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={onNavClick}
              className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 min-w-0 truncate text-xs">{label}</span>
              {active && <ChevronRight className="w-3 h-3 shrink-0 text-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className="sidebar-item w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="text-xs">Logout</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const currentPage = navItems.find(n => n.path === location.pathname)?.label || 'Admin';

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border">
        <SidebarContent />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-56 bg-sidebar">
              <SidebarContent onNavClick={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold text-foreground truncate">{currentPage}</span>
          <div className="ml-auto shrink-0">
            <span className="text-xs text-muted-foreground hidden md:block">TATTI Admin Portal</span>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
