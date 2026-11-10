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
  const users = await prodPool.query(`
    SELECT u.id, u.email, u.password_hash, p.role
    FROM users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE u.email IN ('admin@tatti.edu.in', 'counsellor@tatti.edu.in', 'Swetha@gmail.com', 'a06971352@gmail.com')
  `);

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
    'counsellor123',
    'Counsellor123',
    'counsellor@123',
    'Counsellor@123',
    'student123',
    'Student123',
    'Test@12345',
    '123456',
    'password',
    'Admin@2026',
    'admin2026',
    'admin@tatti.edu.in',
    'Swetha@123',
    'swetha123',
    'Swetha123',
    'Thara@123',
    'thara123',
    'Thara123',
    'Swetha',
    'Thara'
  ];

  for (const user of users.rows) {
    console.log(`\nTesting user: ${user.email} (${user.role}), hash: ${user.password_hash.slice(0, 15)}...`);
    let found = false;
    for (const pw of candidates) {
      if (await bcrypt.compare(pw, user.password_hash)) {
        console.log(`  >>> MATCH FOUND for ${user.email}: "${pw}" <<<`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`  No candidate matched for ${user.email}`);
    }
  }

  await prodPool.end();
}

main().catch(console.error);
