import { Router } from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';
import courseRoutes from './courseRoutes.js';
import questionRoutes from './questionRoutes.js';
import assessmentRoutes from './assessmentRoutes.js';
import applicationRoutes from './applicationRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import counsellingRoutes from './counsellingRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import followUpRoutes from './followUpRoutes.js';
import profileRoutes from './profileRoutes.js';
import adminRoutes from './adminRoutes.js';
import messageRoutes from './messageRoutes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/students', studentRoutes);
apiRouter.use('/courses', courseRoutes);
apiRouter.use('/questions', questionRoutes);
apiRouter.use('/assessment', assessmentRoutes);
apiRouter.use('/assessments', assessmentRoutes);
apiRouter.use('/application', applicationRoutes);
apiRouter.use('/applications', applicationRoutes);
apiRouter.use('/payment', paymentRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/counselling', counsellingRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/follow-ups', followUpRoutes);
apiRouter.use('/profiles', profileRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/messages', messageRoutes);

export default apiRouter;
