import type React from 'react';
import { Navigate } from 'react-router-dom';
import { usePortal } from '@/contexts/PortalContext';
import CounsellorLayout from '@/components/layouts/CounsellorLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const portal = usePortal();

  // Counsellor portal pages use AdminLayout as an outer shell and delegate to CounsellorLayout
  if (portal === 'counsellor') {
    return <CounsellorLayout>{children}</CounsellorLayout>;
  }

  // The Admin Portal UI is completely removed — redirect to public login
  return <Navigate to="/login" replace />;
}
