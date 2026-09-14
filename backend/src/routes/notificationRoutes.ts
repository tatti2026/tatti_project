import { Router } from 'express';
import {
  getNotifications,
  markRead,
  getStudentMessages,
  sendMessage,
  markMessagesRead,
} from '../controllers/notificationController.js';

const router = Router();

router.get('/:profileId', getNotifications);
router.patch('/:id/read', markRead);
router.get('/messages/:studentId', getStudentMessages);
router.post('/messages', sendMessage);
router.patch('/messages/:studentId/read', markMessagesRead);

export default router;
