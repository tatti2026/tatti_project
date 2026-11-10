import { Pool, PoolConfig } from 'pg';
import { config } from '../config/environment.js';

// Enable SSL for Supabase (pooler mode) — required in production.
// rejectUnauthorized: false is safe for Supabase's managed pooler.
// In local/dev mode (DB_HOST=localhost or 127.0.0.1) SSL is skipped automatically.
const isSupabase =
  config.dbHost.includes('supabase.com') ||
  config.dbHost.includes('pooler.supabase') ||
  config.nodeEnv === 'production';

function sanitizeDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    // If the URL contains an un-encoded '@' in password:
    // e.g. postgresql://user:Pyscare@98761234@aws-0...
    const match = rawUrl.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.*)@([^@/:]+)(?::(\d+))?(\/.*)?$/);
    if (match) {
      const [, proto, user, pass, host, port, rest] = match;
      const encodedPass = pass.includes('%') ? pass : encodeURIComponent(pass);
      return `${proto}${user}:${encodedPass}@${host}${port ? `:${port}` : ''}${rest || ''}`;
    }
  } catch {
    // Return unchanged if pattern parsing fails
  }
  return rawUrl;
}

const poolConfig: PoolConfig = config.databaseUrl
  ? {
      connectionString: sanitizeDatabaseUrl(config.databaseUrl),
      ssl: isSupabase ? { rejectUnauthorized: false } : false,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      max: 5,
    }
  : {
      host: config.dbHost,
      port: config.dbPort,
      database: config.dbName,
      user: config.dbUser,
      password: config.dbPassword,
      ssl: isSupabase ? { rejectUnauthorized: false } : false,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      max: 5,
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  // Log the error but don't crash — Railway will restart if truly unrecoverable
  console.error('[pgPool] Idle client error:', err.message);
});

// Non-sensitive connection probe on startup
pool.query('SELECT 1')
  .then(() => {
    console.log(`[pgPool] Connected to PostgreSQL (${isSupabase ? 'Supabase pooler' : 'local'}) successfully.`);
  })
  .catch((err) => {
    console.error('[pgPool] Initial connection probe failed:', err.message);
  });

export const query = (text: string, params?: any[]) => pool.query(text, params);
