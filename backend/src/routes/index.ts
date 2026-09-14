import { Router } from 'express';
import authRoutes from './authRoutes.js';
import assessmentRoutes from './assessmentRoutes.js';
import applicationRoutes from './applicationRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import adminRoutes from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/assessment', assessmentRoutes);
apiRouter.use('/application', applicationRoutes);
apiRouter.use('/payment', paymentRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/notifications', notificationRoutes);

export default apiRouter;
