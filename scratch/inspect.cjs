const path = require('path');
const { Pool } = require(path.join(__dirname, '../backend/node_modules/pg'));
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function main() {
  const userCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
  console.log('USER COLS:', userCols.rows.map(r => r.column_name));
  const student = await pool.query("SELECT id, profile_id, student_id, full_name, email, application_access_status FROM students WHERE full_name ILIKE '%nithiya%'");
  console.log('NITHIYA STUDENT:', student.rows);
  if (student.rows[0]) {
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [student.rows[0].profile_id]);
    console.log('NITHIYA USER:', user.rows);
  }
  await pool.end();
}
main().catch(console.error);
