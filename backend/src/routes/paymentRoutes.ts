import { Router } from 'express';
import {
  initiatePayment,
  verifyPayment,
  getStudentPayment,
  createPayment,
  getAllPayments
} from '../controllers/paymentController.js';
import { requireApplicationUnlocked } from '../middleware/accessControlMiddleware.js';

const router = Router();

router.get('/student/:studentId', getStudentPayment);
router.post('/', createPayment);
router.get('/', getAllPayments);
router.post('/upi/initiate', requireApplicationUnlocked, initiatePayment);
router.post('/upi/verify', verifyPayment);

export default router;
