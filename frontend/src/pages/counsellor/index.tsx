/**
 * Counsellor portal pages — wrappers around existing admin page components.
 * Injects PortalProvider mode="counsellor" so AdminLayout renders CounsellorLayout.
 */
import { PortalProvider } from '@/contexts/PortalContext';
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

function wrap(Component: React.ComponentType) {
  return function CounsellorWrapper() {
    return (
      <PortalProvider mode="counsellor">
        <Component />
      </PortalProvider>
    );
  };
}

export const CounsellorDashboard = wrap(AdminDashboard);
export const CounsellorStudentDetails = wrap(StudentDetails);
export const CounsellorQuestionManagement = wrap(QuestionManagement);
export const CounsellorSegmentation = wrap(Segmentation);
export const CounsellorCounsellingManagement = wrap(CounsellingManagement);
export const CounsellorFollowUpManagement = wrap(FollowUpManagement);
export const CounsellorCoursesManagement = wrap(CoursesManagement);
export const CounsellorConfirmations = wrap(Confirmations);
export const CounsellorReports = wrap(Reports);
export const CounsellorNotifications = wrap(AdminNotifications);
