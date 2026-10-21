import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RouteGuard } from '@/components/common/RouteGuard';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import CounsellorLoginPage from '@/pages/auth/CounsellorLoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Student pages
import StudentDashboard from '@/pages/student/StudentDashboard';
import EntryAssessment from '@/pages/student/EntryAssessment';
import ApplicationProcess from '@/pages/student/ApplicationProcess';
// AdmissionStatus removed from student portal
import Notifications from '@/pages/student/Notifications';
import StudentProfile from '@/pages/student/StudentProfile';
import StudentSettings from '@/pages/student/StudentSettings';

// Counsellor pages (page components wrapped in counsellor portal context)
import {
  CounsellorDashboard,
  CounsellorStudentDetails,
  CounsellorQuestionManagement,
  CounsellorSegmentation,
  CounsellorCounsellingManagement,
  CounsellorFollowUpManagement,
  CounsellorCoursesManagement,
  CounsellorReports,
  CounsellorNotifications,
} from '@/pages/counsellor';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  public?: boolean;
}

const studentGuard = (el: ReactNode) => (
  <RouteGuard requireAuth requireRole="student">{el}</RouteGuard>
);

const counsellorGuard = (el: ReactNode) => (
  <RouteGuard requireAuth requireRole="counsellor">{el}</RouteGuard>
);

export const routes: RouteConfig[] = [
  // Root redirect
  { name: 'Root', path: '/', element: <Navigate to="/login" replace />, public: true },

  // Auth
  { name: 'Student Login', path: '/login', element: <LoginPage />, public: true },
  { name: 'Counsellor Login', path: '/counsellor/login', element: <CounsellorLoginPage />, public: true },
  { name: 'Forgot Password', path: '/forgot-password', element: <ForgotPasswordPage />, public: true },
  { name: 'Reset Password', path: '/reset-password', element: <ResetPasswordPage />, public: true },

  // Student Portal
  { name: 'Student Dashboard', path: '/student/dashboard', element: studentGuard(<StudentDashboard />) },
  { name: 'Career Fit Assessment', path: '/student/assessment', element: studentGuard(<EntryAssessment />) },
  { name: 'Application Process', path: '/student/application', element: studentGuard(<ApplicationProcess />) },
  // Counselling removed from student portal — redirect to dashboard
  { name: 'Counselling Redirect', path: '/student/counselling', element: <Navigate to="/student/dashboard" replace /> },
  // Admission Status removed from student portal — redirect to dashboard
  { name: 'Admission Status Redirect', path: '/student/admission', element: <Navigate to="/student/dashboard" replace /> },
  { name: 'Notifications', path: '/student/notifications', element: studentGuard(<Notifications />) },
  { name: 'Profile', path: '/student/profile', element: studentGuard(<StudentProfile />) },
  { name: 'Settings', path: '/student/settings', element: studentGuard(<StudentSettings />) },

  // Old Admin Portal routes — redirect to public login page
  { name: 'Admin Login Redirect', path: '/admin/login', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Dashboard Redirect', path: '/admin/dashboard', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Students Redirect', path: '/admin/students', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Questions Redirect', path: '/admin/questions', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Segmentation Redirect', path: '/admin/segmentation', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Counselling Redirect', path: '/admin/counselling', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Follow-up Redirect', path: '/admin/followup', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Courses Redirect', path: '/admin/courses', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Confirmations Redirect', path: '/admin/confirmations', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Reports Redirect', path: '/admin/reports', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Notifications Redirect', path: '/admin/notifications', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Settings Redirect', path: '/admin/settings', element: <Navigate to="/login" replace />, public: true },
  { name: 'Admin Wildcard Redirect', path: '/admin/*', element: <Navigate to="/login" replace />, public: true },

  // Counsellor Portal (rendered with CounsellorLayout)
  { name: 'Counsellor Dashboard', path: '/counsellor/dashboard', element: counsellorGuard(<CounsellorDashboard />) },
  { name: 'Counsellor Student Details', path: '/counsellor/students', element: counsellorGuard(<CounsellorStudentDetails />) },
  { name: 'Counsellor Career Assessment', path: '/counsellor/questions', element: counsellorGuard(<CounsellorQuestionManagement />) },
  { name: 'Counsellor Segmentation', path: '/counsellor/segmentation', element: counsellorGuard(<CounsellorSegmentation />) },
  { name: 'Counsellor Counselling', path: '/counsellor/counselling', element: counsellorGuard(<CounsellorCounsellingManagement />) },
  { name: 'Counsellor Follow-up', path: '/counsellor/followup', element: counsellorGuard(<CounsellorFollowUpManagement />) },
  { name: 'Counsellor Course Management', path: '/counsellor/courses', element: counsellorGuard(<CounsellorCoursesManagement />) },
  { name: 'Counsellor Confirmations Redirect', path: '/counsellor/confirmations', element: counsellorGuard(<Navigate to="/counsellor/dashboard" replace />) },
  { name: 'Counsellor Reports', path: '/counsellor/reports', element: counsellorGuard(<CounsellorReports />) },
  { name: 'Counsellor Notifications', path: '/counsellor/notifications', element: counsellorGuard(<CounsellorNotifications />) },
];
