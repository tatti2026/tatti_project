import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RouteGuard } from '@/components/common/RouteGuard';

// Auth pages
import LoginPage from '@/pages/LoginPage';
import AdminLoginPage from '@/pages/AdminLoginPage';

// Student pages
import StudentDashboard from '@/pages/student/StudentDashboard';
import EntryAssessment from '@/pages/student/EntryAssessment';
import ApplicationProcess from '@/pages/student/ApplicationProcess';
import CounsellingPage from '@/pages/student/CounsellingPage';
// AdmissionStatus removed from student portal (admin portal still manages admissions)
import Notifications from '@/pages/student/Notifications';
import StudentProfile from '@/pages/student/StudentProfile';
import StudentSettings from '@/pages/student/StudentSettings';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import StudentDetails from '@/pages/admin/StudentDetails';
import QuestionManagement from '@/pages/admin/QuestionManagement';
import Segmentation from '@/pages/admin/Segmentation';
import CounsellingManagement from '@/pages/admin/CounsellingManagement';
import FollowUpManagement from '@/pages/admin/FollowUpManagement';
import CoursesManagement from '@/pages/admin/CoursesManagement';
import Confirmations from '@/pages/admin/Confirmations';
import Reports from '@/pages/admin/Reports';
import AdminNotifications from '@/pages/admin/AdminNotifications';
import AdminSettings from '@/pages/admin/AdminSettings';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  public?: boolean;
}

const studentGuard = (el: ReactNode) => (
  <RouteGuard requireAuth requireRole="student">{el}</RouteGuard>
);

const adminGuard = (el: ReactNode) => (
  <RouteGuard requireAuth requireRole="admin">{el}</RouteGuard>
);

export const routes: RouteConfig[] = [
  // Root redirect
  { name: 'Root', path: '/', element: <Navigate to="/login" replace />, public: true },

  // Auth
  { name: 'Student Login', path: '/login', element: <LoginPage />, public: true },
  { name: 'Admin Login', path: '/admin/login', element: <AdminLoginPage />, public: true },

  // Student Portal
  { name: 'Student Dashboard', path: '/student/dashboard', element: studentGuard(<StudentDashboard />) },
  { name: 'Entry Assessment', path: '/student/assessment', element: studentGuard(<EntryAssessment />) },
  { name: 'Application Process', path: '/student/application', element: studentGuard(<ApplicationProcess />) },
  // Counselling removed from student portal — redirect to dashboard
  { name: 'Counselling Redirect', path: '/student/counselling', element: <Navigate to="/student/dashboard" replace /> },
  // Admission Status removed from student portal — redirect to dashboard. Admin portal manages admissions.
  { name: 'Admission Status Redirect', path: '/student/admission', element: <Navigate to="/student/dashboard" replace /> },
  { name: 'Notifications', path: '/student/notifications', element: studentGuard(<Notifications />) },
  { name: 'Profile', path: '/student/profile', element: studentGuard(<StudentProfile />) },
  { name: 'Settings', path: '/student/settings', element: studentGuard(<StudentSettings />) },

  // Admin Portal
  { name: 'Admin Dashboard', path: '/admin/dashboard', element: adminGuard(<AdminDashboard />) },
  { name: 'Student Details', path: '/admin/students', element: adminGuard(<StudentDetails />) },
  { name: 'Entry Assessment', path: '/admin/questions', element: adminGuard(<QuestionManagement />) },
  { name: 'Assessment & Segmentation', path: '/admin/segmentation', element: adminGuard(<Segmentation />) },
  { name: 'Counselling Management', path: '/admin/counselling', element: adminGuard(<CounsellingManagement />) },
  { name: 'Follow-up Management', path: '/admin/followup', element: adminGuard(<FollowUpManagement />) },
  { name: 'Courses', path: '/admin/courses', element: adminGuard(<CoursesManagement />) },
  { name: 'Confirmations', path: '/admin/confirmations', element: adminGuard(<Confirmations />) },
  { name: 'Reports', path: '/admin/reports', element: adminGuard(<Reports />) },
  { name: 'Admin Notifications', path: '/admin/notifications', element: adminGuard(<AdminNotifications />) },
  { name: 'Settings', path: '/admin/settings', element: adminGuard(<AdminSettings />) },
];
