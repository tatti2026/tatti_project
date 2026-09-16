const { Client } = require('../backend/node_modules/pg');
const bcrypt = require('../backend/node_modules/bcrypt');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'tatti_portal'
  });
  await client.connect();

  const hash = await bcrypt.hash('admin123', 10);
  const res = await client.query('UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2 RETURNING id, email', [hash, 'admin@tatti.edu.in']);
  console.log('Updated user:', res.rows);

  await client.end();
}

main().catch(console.error);
