import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'tatti_super_secure_jwt_secret_key_2026_education',
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'https://twuqquhfswiovdfaneuz.supabase.co',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  merchantVpa: process.env.TATTI_MERCHANT_VPA || 'tatti.admissions@upi',
  merchantName: process.env.TATTI_MERCHANT_NAME || 'TATTI Institute',
};
