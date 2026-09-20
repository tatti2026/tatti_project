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
  const result = await pool.query(`
    SELECT
      id,
      student_id,
      full_name,
      email,
      phone,
      created_at,
      assessment_status,
      application_status,
      payment_status,
      counselling_status,
      admission_status
    FROM students
    WHERE student_id ILIKE '%TEST%'
       OR full_name ILIKE '%TEST%'
       OR email ILIKE '%TEST%'
       OR email ILIKE '%@test%'
       OR student_id ILIKE '%DEMO%'
       OR full_name ILIKE '%DEMO%'
       OR email ILIKE '%DEMO%'
    ORDER BY created_at ASC;
  `);

  console.log(JSON.stringify(result.rows, null, 2));
  console.log(`\nMATCH_COUNT=${result.rows.length}`);
} finally {
  await pool.end();
}
