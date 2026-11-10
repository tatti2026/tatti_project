import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const { Pool } = pg;
const prodPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const users = await prodPool.query("SELECT password_hash FROM users WHERE email = 'a06971352@gmail.com'");
  const hash = users.rows[0].password_hash;

  const prefixes = ['thara', 'Thara', 'THARA', 'a06971352', 'tatti', 'TATTI'];
  const seps = ['', '@', '#', '$', '!', '123'];
  const suffixes = ['', '123', '1234', '12345', '2026', '2024', '1', '12', '@123', '#123'];

  const testPws = new Set([
    'thara123', 'Thara123', 'thara@123', 'Thara@123', 'Thara@2026', 'thara@2026',
    'Thara#123', 'thara#123', 'Thara@1234', 'Thara@12345', 'thara12345',
    'a06971352', 'a06971352@gmail.com', 'student123', 'Student123',
    '123456', '12345678', 'password', 'Password@123', 'Test@12345',
    '2026-TATTI-018', 'TATTI-018', 'tatti-018', 'tatti@123', 'TATTI@123'
  ]);

  for (const p of prefixes) {
    for (const s of seps) {
      for (const suf of suffixes) {
        testPws.add(p + s + suf);
      }
    }
  }

  console.log(`Testing ${testPws.size} candidates for 2026-TATTI-018 (Thara)...`);
  for (const pw of testPws) {
    if (await bcrypt.compare(pw, hash)) {
      console.log(`>>> MATCH FOUND for 2026-TATTI-018: "${pw}" <<<`);
      await prodPool.end();
      return;
    }
  }
  console.log('No candidate matched for 2026-TATTI-018.');
  await prodPool.end();
}

main().catch(console.error);
