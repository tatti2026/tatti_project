import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tatti_portal',
  user: 'postgres',
  password: 'postgres',
});

async function main() {
  const r = await localPool.query("SELECT password_hash FROM users WHERE email = 'admin@tatti.edu.in'");
  const hash = r.rows[0].password_hash;
  console.log('Local admin full hash:', hash);

  const candidates = [
    'admin123',
    'Admin@TATTI2024',
    'admin',
    'admin@123',
    'Admin123',
    'Admin@123',
    'tatti123',
    'TATTI@2024',
    'TATTI@portal.3456789',
    'admin@tatti.edu.in',
    'password',
    '123456',
    'Admin@2026',
    'admin2026',
    'admin@tatti.edu',
    'Admin@12345',
    'Test@12345'
  ];

  for (const pw of candidates) {
    if (await bcrypt.compare(pw, hash)) {
      console.log('>>> MATCH FOUND FOR LOCAL ADMIN PASSWORD:', pw);
    }
  }

  await localPool.end();
}

main().catch(console.error);
