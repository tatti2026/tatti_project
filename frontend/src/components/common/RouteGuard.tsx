import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRole?: 'student' | 'admin';
}

export function RouteGuard({ children, requireAuth = true, requireRole }: RouteGuardProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading TATTI Portal...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to appropriate login
  if (requireAuth && !user) {
    const isAdminRoute = location.pathname.startsWith('/admin');
    return <Navigate to={isAdminRoute ? '/admin/login' : '/login'} replace state={{ from: location }} />;
  }

  // Authenticated but wrong role
  if (requireRole && profile?.role !== requireRole) {
    if (profile?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (profile?.role === 'student') return <Navigate to="/student/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
