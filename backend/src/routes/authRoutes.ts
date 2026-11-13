import { Router } from 'express';
import {
  login,
  signup,
  counsellorSignup,
  getCounsellors,
  getMe,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  checkEmailStatus,
  getPendingCounsellors,
  approveCounsellor,
  rejectCounsellor,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/signup', signup);
router.post('/counsellor-signup', counsellorSignup);
router.post('/counsellor/register', counsellorSignup);
router.get('/counsellors', getCounsellors);
router.get('/counsellors/pending', requireAuth, getPendingCounsellors);
router.post('/counsellors/:id/approve', requireAuth, approveCounsellor);
router.post('/counsellors/:id/reject', requireAuth, rejectCounsellor);
router.get('/me', requireAuth, getMe);
router.post('/request-password-reset', requestPasswordReset);
router.get('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);
router.get('/email-status', checkEmailStatus);

export default router;
