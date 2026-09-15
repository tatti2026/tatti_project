import { Router } from 'express';
import { login, signup, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/signup', signup);
router.get('/me', requireAuth, getMe);

export default router;
