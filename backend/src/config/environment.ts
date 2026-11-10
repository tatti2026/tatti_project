import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
if (!process.env.DB_HOST) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });
  } catch {}
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

if (isProduction && !process.env.DATABASE_URL && (!process.env.DB_USER || !process.env.DB_HOST)) {
  console.warn('[config] WARNING: Production environment requires explicit DB_USER and DB_HOST (or DATABASE_URL).');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  jwtSecret: process.env.JWT_SECRET || 'tatti_super_secure_jwt_secret_key_2026_education',
  dbHost: process.env.DB_HOST || (isProduction ? '' : 'localhost'),
  dbPort: parseInt(process.env.DB_PORT || '5432', 10),
  dbName: process.env.DB_NAME || (isProduction ? '' : 'tatti_portal'),
  dbUser: process.env.DB_USER || (isProduction ? '' : 'postgres'),
  dbPassword: process.env.DB_PASSWORD || (isProduction ? '' : 'YOUR_PASSWORD'),
  databaseUrl: process.env.DATABASE_URL,
  merchantVpa: process.env.TATTI_MERCHANT_VPA || 'tatti.admissions@upi',
  merchantName: process.env.TATTI_MERCHANT_NAME || 'PSY CARE',
};
