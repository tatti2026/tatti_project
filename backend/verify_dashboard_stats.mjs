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
  const stats = await pool.query(`
    SELECT
      COUNT(*)::int AS total_students,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_students_7d,
      COUNT(*) FILTER (WHERE assessment_status = 'completed')::int AS assessment_completed,
      COUNT(*) FILTER (WHERE assessment_status != 'completed')::int AS assessment_pending,
      COALESCE((SELECT COUNT(*) FROM applications WHERE LOWER(status) = 'submitted'), 0)::int AS applications_submitted,
      COALESCE((SELECT COUNT(DISTINCT application_id) FROM payments WHERE application_id IS NOT NULL AND LOWER(status) IN ('paid', 'approved')), 0)::int AS paid_applications,
      COALESCE((SELECT COUNT(*) FROM counselling WHERE LOWER(status) = 'pending'), 0)::int AS counselling_pending,
      COALESCE((SELECT COUNT(*) FROM applications WHERE LOWER(status) = 'confirmed'), 0)::int AS admissions_confirmed
    FROM students;
  `);

  const unpaid = await pool.query(`
    SELECT COUNT(*)::int AS unpaid_applications
    FROM applications a
    WHERE LOWER(a.status) = 'submitted'
      AND NOT EXISTS (
        SELECT 1
        FROM payments p
        WHERE p.application_id = a.id
          AND LOWER(p.status) IN ('paid', 'approved')
      );
  `);

  console.log(JSON.stringify({
    ...stats.rows[0],
    unpaid_applications: unpaid.rows[0]?.unpaid_applications ?? 0,
  }, null, 2));
} finally {
  await pool.end();
}
