import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: './.env' });

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'tatti_portal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

try {
  const result = await pool.query('SELECT * FROM students ORDER BY created_at ASC;');
  console.log(JSON.stringify(result.rows, null, 2));
  console.log(`\nCOUNT=${result.rows.length}`);
} finally {
  await pool.end();
}
