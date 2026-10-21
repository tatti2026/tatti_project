import { Router } from 'express';
import {
  login,
  signup,
  getMe,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  checkEmailStatus,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/signup', signup);
router.get('/me', requireAuth, getMe);
router.post('/request-password-reset', requestPasswordReset);
router.get('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);
router.get('/email-status', checkEmailStatus);

export default router;
