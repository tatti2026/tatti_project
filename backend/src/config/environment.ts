import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'tatti_super_secure_jwt_secret_key_2026_education',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: parseInt(process.env.DB_PORT || '5432', 10),
  dbName: process.env.DB_NAME || 'tatti_portal',
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || 'YOUR_PASSWORD',
  merchantVpa: process.env.TATTI_MERCHANT_VPA || 'tatti.admissions@upi',
  merchantName: process.env.TATTI_MERCHANT_NAME || 'TATTI Institute',
};
