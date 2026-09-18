import { Router } from 'express';
import {
  initiatePayment,
  verifyPayment,
  getStudentPayment,
  createPayment,
  getAllPayments,
  getPaymentById,
  getPaymentScreenshot,
} from '../controllers/paymentController.js';
import { requireApplicationUnlocked } from '../middleware/accessControlMiddleware.js';

const router = Router();

router.get('/student/:studentId', getStudentPayment);
router.post('/', createPayment);
router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.get('/:id/screenshot', getPaymentScreenshot);
router.post('/upi/initiate', requireApplicationUnlocked, initiatePayment);
router.post('/upi/verify', verifyPayment);

export default router;
