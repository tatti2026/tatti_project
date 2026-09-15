const fs = require('fs');
const bcrypt = require('../backend/node_modules/bcrypt');
const { Client } = require('../backend/node_modules/pg');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://twuqquhfswiovdfaneuz.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXFxdWhmc3dpb3ZkZmFuZXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjQ4NjEsImV4cCI6MjEwNDM0MDg2MX0.tnbvvr4EZHOAqTCapWDnHoOVI98LfhJGPVrMzxJMseA';

async function migrate() {
  console.log('--- Starting TATTI Data Migration ---');
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const pg = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'tatti_portal'
  });

  await pg.connect();
  console.log('Connected to local PostgreSQL database tatti_portal.');

  // 1. Migrate Courses from Supabase
  console.log('\n1. Migrating Courses...');
  const { data: courses, error: cErr } = await sb.from('courses').select('*');
  if (courses && courses.length > 0) {
    for (const c of courses) {
      await pg.query(`
        INSERT INTO courses (id, course_name, course_code, description, duration, eligibility, fee, category, skills, career_opportunities, available_seats, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (course_code) DO UPDATE SET
          course_name = EXCLUDED.course_name,
          fee = EXCLUDED.fee,
          duration = EXCLUDED.duration,
          category = EXCLUDED.category;
      `, [
        c.id, c.course_name, c.course_code, c.description || '', c.duration || '',
        c.eligibility || '', c.fee || 0, c.category || '', c.skills || [],
        c.career_opportunities || [], c.available_seats || 30, c.status || 'available'
      ]);
    }
    console.log(`Migrated ${courses.length} courses from Supabase.`);
  } else {
    console.log('No courses in Supabase or error:', cErr ? cErr.message : 'empty');
  }

  // Check course count, seed if empty
  const countRes = await pg.query('SELECT COUNT(*) FROM courses');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    console.log('Seeding courses from seed_data.sql...');
    const seedSql = fs.readFileSync(__dirname + '/seed/seed_data.sql', 'utf8');
    await pg.query(seedSql);
  }

  // 2. Ensure Questions exist
  const qCountRes = await pg.query('SELECT COUNT(*) FROM questions');
  if (parseInt(qCountRes.rows[0].count, 10) === 0) {
    console.log('Seeding entrance questions...');
    const seedSql = fs.readFileSync(__dirname + '/seed/seed_data.sql', 'utf8');
    await pg.query(seedSql);
    console.log('Seeded questions successfully.');
  }

  // 3. Create Default Admin & Default Student accounts
  console.log('\n2. Ensuring Default Admin & Student Accounts...');
  const defaultPw = 'admin123';
  const hashedPw = await bcrypt.hash(defaultPw, 10);

  // Admin user
  const adminEmail = 'admin@tatti.edu.in';
  const adminUserRes = await pg.query(`
    INSERT INTO users (email, password_hash)
    VALUES ($1, $2)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id;
  `, [adminEmail, hashedPw]);
  const adminId = adminUserRes.rows[0].id;

  await pg.query(`
    INSERT INTO profiles (id, email, full_name, role)
    VALUES ($1, $2, $3, 'admin')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'admin';
  `, [adminId, adminEmail, 'TATTI Head Administrator']);
  console.log(`Admin account ready: ${adminEmail} (password: ${defaultPw})`);

  // Student user
  const studentEmail = 'student@tatti.edu.in';
  const studentPw = 'student123';
  const studentHashedPw = await bcrypt.hash(studentPw, 10);

  const studentUserRes = await pg.query(`
    INSERT INTO users (email, password_hash)
    VALUES ($1, $2)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id;
  `, [studentEmail, studentHashedPw]);
  const studentId = studentUserRes.rows[0].id;

  await pg.query(`
    INSERT INTO profiles (id, email, full_name, role)
    VALUES ($1, $2, $3, 'student')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'student';
  `, [studentId, studentEmail, 'Rahul Sharma']);

  // Ensure student record exists
  const existingStudentRecord = await pg.query('SELECT id FROM students WHERE profile_id = $1', [studentId]);
  if (existingStudentRecord.rows.length === 0) {
    await pg.query(`
      INSERT INTO students (
        profile_id, student_id, full_name, email, phone, parent_name, parent_phone,
        selected_course, assessment_status, application_status, application_access_status, payment_status, admission_status
      ) VALUES (
        $1, 'TATTI-2026-001', 'Rahul Sharma', $2, '+91 98765 43210', 'Ramesh Sharma', '+91 98765 43200',
        'Full Stack Web Development', 'completed', 'in_progress', 'unlocked', 'unpaid', 'not_applied'
      );
    `, [studentId, studentEmail]);
    console.log(`Created sample student record for ${studentEmail}`);
  }

  // 4. Migrate any other records from Supabase if present
  const otherTables = ['students', 'applications', 'assessments', 'payments', 'counselling', 'notifications', 'follow_ups'];
  for (const table of otherTables) {
    const { data: rows } = await sb.from(table).select('*');
    if (rows && rows.length > 0) {
      console.log(`Found ${rows.length} rows in Supabase ${table}. Migrating...`);
      for (const row of rows) {
        const cols = Object.keys(row);
        const vals = Object.values(row);
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        try {
          await pg.query(`
            INSERT INTO ${table} (${cols.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT (id) DO NOTHING;
          `, vals);
        } catch (e) {
          // ignore duplicate / foreign key warnings
        }
      }
    }
  }

  await pg.end();
  console.log('\nData migration finished successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
