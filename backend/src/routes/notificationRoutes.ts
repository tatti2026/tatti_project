import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  createNotification,
  getStudentMessages,
  sendMessage,
  markMessagesRead,
} from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Require authentication for all notification routes
router.use(requireAuth);

router.get('/', getNotifications);
router.get('/profile/:profileId', getNotifications);
router.get('/:profileId', getNotifications);
router.put('/:id/read', markNotificationRead);
router.patch('/:id/read', markNotificationRead);
router.post('/', createNotification);

router.get('/messages/:studentId', getStudentMessages);
router.post('/messages', sendMessage);
router.patch('/messages/:studentId/read', markMessagesRead);

export default router;
