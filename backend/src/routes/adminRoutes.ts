import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import {
  unlockStudentApplication,
  lockStudentApplication,
  getStudentAuditLogs,
  listAllStudents,
  getDashboardStats,
  getReportsSummary,
  exportReportExcel,
  exportReportPdf,
  exportStudentsExcel,
  exportStudentsPdf,
  getPendingPayments,
  getRejectedPayments,
  getPaymentDetailsById,
  approvePayment,
  rejectPayment,
  getAdminPaymentScreenshot,
} from '../controllers/adminController.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole(['admin', 'counsellor']));

// Analytics & Reports
router.get('/dashboard/stats', getDashboardStats);
router.get('/reports/summary', getReportsSummary);
router.get('/reports/export/excel', exportReportExcel);
router.get('/reports/export/pdf', exportReportPdf);

// Student access control
router.get('/students', listAllStudents);
router.get('/students/export/excel', exportStudentsExcel);
router.get('/students/export/pdf', exportStudentsPdf);
router.post('/students/:studentId/unlock', unlockStudentApplication);
router.post('/students/:studentId/lock', lockStudentApplication);
router.get('/students/:studentId/audit-logs', getStudentAuditLogs);

// UPI Payment verification endpoints (Admin only)
router.get('/payments/pending', requireRole('admin'), getPendingPayments);
router.get('/payments/rejected', requireRole('admin'), getRejectedPayments);
router.get('/payments/:id', requireRole('admin'), getPaymentDetailsById);
router.post('/payments/:id/approve', requireRole('admin'), approvePayment);
router.post('/payments/:id/reject', requireRole('admin'), rejectPayment);
router.get('/payments/:id/screenshot', requireRole('admin'), getAdminPaymentScreenshot);

export default router;
