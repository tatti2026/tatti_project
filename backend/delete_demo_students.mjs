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

async function main() {
  const candidateQuery = `
    SELECT id, student_id, full_name, email, created_at
    FROM students
    WHERE student_id ILIKE '%TEST%'
       OR full_name ILIKE '%TEST%'
       OR full_name ILIKE '%TATTI TEST%'
       OR email ILIKE '%TEST%'
       OR email ILIKE '%@test%'
       OR student_id ILIKE '%DEMO%'
       OR full_name ILIKE '%DEMO%'
       OR email ILIKE '%DEMO%'
    ORDER BY created_at ASC;
  `;

  const candidateRows = (await pool.query(candidateQuery)).rows;
  const ids = candidateRows.map((row) => row.id);

  console.log('CANDIDATES_BEFORE_DELETE');
  console.log(JSON.stringify(candidateRows, null, 2));
  console.log(`COUNT=${candidateRows.length}`);

  if (ids.length === 0) {
    console.log('No demo/test student records found. Nothing deleted.');
    return;
  }

  const relatedTables = [
    'assessments',
    'applications',
    'payments',
    'notifications',
    'direct_messages',
    'counselling',
    'follow_ups',
    'admin_audit_logs',
  ];

  for (const table of relatedTables) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS c FROM ${table} WHERE student_id = ANY($1)`,
      [ids]
    );
    console.log(`${table}: ${result.rows[0].c}`);
  }

  await pool.query('BEGIN');
  try {
    const del = await pool.query(
      'DELETE FROM students WHERE id = ANY($1::uuid[]) RETURNING student_id, full_name',
      [ids]
    );
    await pool.query('COMMIT');
    console.log('DELETED');
    console.log(JSON.stringify(del.rows, null, 2));
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }

  const remaining = await pool.query(`
    SELECT student_id, full_name, email
    FROM students
    ORDER BY created_at ASC;
  `);

  console.log('REMAINING_STUDENTS');
  console.log(JSON.stringify(remaining.rows, null, 2));
  console.log(`REMAINING_COUNT=${remaining.rows.length}`);
}

try {
  await main();
} finally {
  await pool.end();
}
