import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  sendMessage,
  getConversation,
  getAllConversations,
  markMessagesRead,
  getUnreadCount,
  getMyStudentId,
} from '../controllers/messageController.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Send a message (admin→student or student→admin)
router.post('/send', sendMessage);

// Get full conversation for a specific student
router.get('/conversation/:studentId', getConversation);

// Admin only: get all conversation summaries
router.get('/conversations', getAllConversations);

// Mark messages as read in a conversation
router.put('/read/:studentId', markMessagesRead);

// Get unread message count for current user
router.get('/unread-count', getUnreadCount);

// Get the logged-in student's UUID
router.get('/my-student-id', getMyStudentId);

export default router;
