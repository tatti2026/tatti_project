import { Router } from 'express';
import { initiatePayment, verifyPayment } from '../controllers/paymentController.js';
import { requireApplicationUnlocked } from '../middleware/accessControlMiddleware.js';

const router = Router();

router.post('/upi/initiate', requireApplicationUnlocked, initiatePayment);
router.post('/upi/verify', verifyPayment);

export default router;
