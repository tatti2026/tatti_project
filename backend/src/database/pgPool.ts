import { Pool } from 'pg';
import { config } from '../config/environment.js';

// Enable SSL for Supabase (pooler mode) — required in production.
// rejectUnauthorized: false is safe for Supabase's managed pooler.
// In local/dev mode (DB_HOST=localhost or 127.0.0.1) SSL is skipped automatically.
const isSupabase =
  config.dbHost.includes('supabase.com') ||
  config.dbHost.includes('pooler.supabase') ||
  config.nodeEnv === 'production';

export const pool = new Pool({
  host: config.dbHost,
  port: config.dbPort,
  database: config.dbName,
  user: config.dbUser,
  password: config.dbPassword,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
  // Keep connections alive in Railway's containerized env
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  max: 10,
});

pool.on('error', (err) => {
  // Log the error but don't crash — Railway will restart if truly unrecoverable
  console.error('[pgPool] Idle client error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
