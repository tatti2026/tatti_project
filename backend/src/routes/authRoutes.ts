import { Router } from 'express';
import { login, signup, getMe, requestPasswordReset, resetPassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/signup', signup);
router.get('/me', requireAuth, getMe);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router;
