const fs = require('fs');
const path = require('path');
const { Pool } = require('c:/Users/Andrea Evangeline/OneDrive/Documents/tatti-portal-source-code/tatti-portal-source-code/backend/node_modules/pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tatti_portal',
  user: 'postgres',
  password: 'postgres'
});

async function runMigration() {
  const sqlPath = path.join(__dirname, '003_upi_payment_verification.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Running migration 003_upi_payment_verification.sql...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
