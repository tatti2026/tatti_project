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

// ─── JWT Secret Resolution & Startup Guard ─────────────────────────────────
// Minimum required length for a cryptographically secure production secret.
const MIN_JWT_SECRET_LENGTH = 32;

function resolveJwtSecret(): string {
  const raw = process.env.JWT_SECRET;

  if (isProduction) {
    if (!raw || raw.trim().length === 0) {
      console.error(
        '[FATAL] JWT_SECRET environment variable is missing in production.\n' +
        'The application cannot start safely without a configured JWT_SECRET.\n' +
        'Please set a strong JWT_SECRET (minimum 32 characters) in your production environment variables.'
      );
      process.exit(1);
    }
    if (raw.trim().length < MIN_JWT_SECRET_LENGTH) {
      console.error(
        `[FATAL] JWT_SECRET is too short (${raw.trim().length} characters).\n` +
        `Production requires a minimum length of ${MIN_JWT_SECRET_LENGTH} characters.\n` +
        'Please configure a strong, cryptographically random secret in your production environment variables.'
      );
      process.exit(1);
    }
    return raw.trim();
  }

  // Development / Test: use configured .env value or warn if missing
  if (!raw || raw.trim().length === 0) {
    console.warn(
      '[config] WARNING: JWT_SECRET is not configured in environment.\n' +
      'Using a local development fallback. Do not run in production without JWT_SECRET.'
    );
    return 'dev_local_jwt_secret_not_for_production_use';
  }

  return raw.trim();
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  jwtSecret: resolveJwtSecret(),
  dbHost: process.env.DB_HOST || (isProduction ? '' : 'localhost'),
  dbPort: parseInt(process.env.DB_PORT || '5432', 10),
  dbName: process.env.DB_NAME || (isProduction ? '' : 'tatti_portal'),
  dbUser: process.env.DB_USER || (isProduction ? '' : 'postgres'),
  dbPassword: process.env.DB_PASSWORD || (isProduction ? '' : 'YOUR_PASSWORD'),
  databaseUrl: process.env.DATABASE_URL,
  merchantVpa: process.env.TATTI_MERCHANT_VPA || 'tatti.admissions@upi',
  merchantName: process.env.TATTI_MERCHANT_NAME || 'PSY CARE',
};
