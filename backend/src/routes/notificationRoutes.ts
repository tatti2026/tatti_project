import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  createNotification,
  getStudentMessages,
  sendMessage,
  markMessagesRead,
} from '../controllers/notificationController.js';

const router = Router();

router.get('/profile/:profileId', getNotifications);
router.get('/:profileId', getNotifications);
router.put('/:id/read', markNotificationRead);
router.patch('/:id/read', markNotificationRead);
router.post('/', createNotification);

router.get('/messages/:studentId', getStudentMessages);
router.post('/messages', sendMessage);
router.patch('/messages/:studentId/read', markMessagesRead);

export default router;
