import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

  const adminUser = await pool.query("SELECT u.id, u.email, u.password_hash, p.role FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.email = 'admin@tatti.edu.in'");
  console.log('Admin user found:', adminUser.rows);

  const counsellorUser = await pool.query("SELECT u.id, u.email, u.password_hash, p.role FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE p.role = 'counsellor'");
  console.log('Counsellor users:', counsellorUser.rows.map(r => ({ email: r.email, role: r.role, has_hash: !!r.password_hash })));

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  pool.end();
});
