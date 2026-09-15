// backend/src/config/database.ts
// PostgreSQL connection — re-exports the pg Pool and query helper.
// All database credentials come from environment variables only.
// Never expose this config to the frontend.

export { pool, query } from '../database/pgPool.js';
