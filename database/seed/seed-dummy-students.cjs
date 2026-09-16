const path = require('path');
const fs = require('fs');
const bcrypt = require('../../backend/node_modules/bcrypt');
const { Client } = require('../../backend/node_modules/pg');

// Load environment variables if .env exists
const envPath = path.resolve(__dirname, '../../backend/.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      if (k && v.length) process.env[k.trim()] = v.join('=').trim();
    }
  });
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tatti_portal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const DUMMY_PASSWORD_RAW = 'Test@12345';

const DUMMY_STUDENTS = [
  {
    student_id: '2026-TEST-001',
    full_name: 'Arjun Kumar',
    email: 'arjun.test@tatti.edu.in',
    phone: '+91 98765 43210',
    parent_name: 'Ramesh Kumar',
    parent_phone: '+91 98765 43211',
    date_of_birth: '2004-05-15',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    assessment_status: 'not_started',
    application_access_status: 'locked',
    selected_course: null,
    course_code: null,
    application_status: 'not_started',
    payment_status: 'unpaid',
    admission_status: 'not_applied',
    assessment_score: null,
  },
  {
    student_id: '2026-TEST-002',
    full_name: 'Priya S',
    email: 'priya.test@tatti.edu.in',
    phone: '+91 98765 43212',
    parent_name: 'Suresh S',
    parent_phone: '+91 98765 43213',
    date_of_birth: '2004-08-22',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641001',
    assessment_status: 'in_progress',
    application_access_status: 'locked',
    selected_course: null,
    course_code: null,
    application_status: 'not_started',
    payment_status: 'unpaid',
    admission_status: 'not_applied',
    assessment_score: null,
  },
  {
    student_id: '2026-TEST-003',
    full_name: 'Karthik R',
    email: 'karthik.test@tatti.edu.in',
    phone: '+91 98765 43214',
    parent_name: 'Rajendran R',
    parent_phone: '+91 98765 43215',
    date_of_birth: '2003-11-10',
    city: 'Madurai',
    state: 'Tamil Nadu',
    pincode: '625001',
    assessment_status: 'completed',
    application_access_status: 'unlocked',
    selected_course: null, // Assessment complete & unlocked, but student hasn't picked a course yet
    course_code: null,
    application_status: 'not_started',
    payment_status: 'unpaid',
    admission_status: 'not_applied',
    assessment_score: 85.0,
  },
  {
    student_id: '2026-TEST-004',
    full_name: 'Ananya M',
    email: 'ananya.test@tatti.edu.in',
    phone: '+91 98765 43216',
    parent_name: 'Murugan M',
    parent_phone: '+91 98765 43217',
    date_of_birth: '2004-02-18',
    city: 'Trichy',
    state: 'Tamil Nadu',
    pincode: '620001',
    assessment_status: 'completed',
    application_access_status: 'unlocked',
    selected_course: 'Full Stack Web Development',
    course_code: 'FSWD-2026',
    application_status: 'in_progress',
    payment_status: 'unpaid',
    admission_status: 'not_applied',
    assessment_score: 92.0,
  },
  {
    student_id: '2026-TEST-005',
    full_name: 'Naveen Kumar',
    email: 'naveen.test@tatti.edu.in',
    phone: '+91 98765 43218',
    parent_name: 'Vijay Kumar',
    parent_phone: '+91 98765 43219',
    date_of_birth: '2003-09-05',
    city: 'Salem',
    state: 'Tamil Nadu',
    pincode: '636001',
    assessment_status: 'completed',
    application_access_status: 'unlocked',
    selected_course: 'Artificial Intelligence & Data Science',
    course_code: 'AIDS-2026',
    application_status: 'submitted',
    payment_status: 'paid',
    admission_status: 'application_submitted',
    assessment_score: 88.0,
  },
  {
    student_id: '2026-TEST-006',
    full_name: 'Deepa Lakshmi',
    email: 'deepa.test@tatti.edu.in',
    phone: '+91 98765 43220',
    parent_name: 'Lakshmanan V',
    parent_phone: '+91 98765 43221',
    date_of_birth: '2004-07-30',
    city: 'Tirunelveli',
    state: 'Tamil Nadu',
    pincode: '627001',
    assessment_status: 'completed',
    application_access_status: 'unlocked',
    selected_course: 'Cybersecurity & Ethical Hacking',
    course_code: 'CYBER-2026',
    application_status: 'under_review',
    payment_status: 'paid',
    admission_status: 'under_review',
    assessment_score: 94.0,
  },
  {
    student_id: '2026-TEST-007',
    full_name: 'Siddharth V',
    email: 'siddharth.test@tatti.edu.in',
    phone: '+91 98765 43222',
    parent_name: 'Venkatraman S',
    parent_phone: '+91 98765 43223',
    date_of_birth: '2003-12-14',
    city: 'Vellore',
    state: 'Tamil Nadu',
    pincode: '632001',
    assessment_status: 'completed',
    application_access_status: 'unlocked',
    selected_course: 'Cloud Computing & DevOps Architecture',
    course_code: 'DEVOPS-2026',
    application_status: 'approved',
    payment_status: 'paid',
    admission_status: 'counselling_pending',
    assessment_score: 90.0,
  },
  {
    student_id: '2026-TEST-008',
    full_name: 'Meera Krishnan',
    email: 'meera.test@tatti.edu.in',
    phone: '+91 98765 43224',
    parent_name: 'Radhakrishnan P',
    parent_phone: '+91 98765 43225',
    date_of_birth: '2004-04-12',
    city: 'Erode',
    state: 'Tamil Nadu',
    pincode: '638001',
    assessment_status: 'completed',
    application_access_status: 'unlocked',
    selected_course: 'Data Science & Analytics',
    course_code: 'DS-AN-004',
    application_status: 'approved',
    payment_status: 'paid',
    admission_status: 'counselling_completed',
    assessment_score: 96.0,
  },
  {
    student_id: '2026-TEST-009',
    full_name: 'Vigneshwaran K',
    email: 'vignesh.test@tatti.edu.in',
    phone: '+91 98765 43226',
    parent_name: 'Kannan T',
    parent_phone: '+91 98765 43227',
    date_of_birth: '2003-06-25',
    city: 'Thanjavur',
    state: 'Tamil Nadu',
    pincode: '613001',
    assessment_status: 'completed',
    application_access_status: 'unlocked',
    selected_course: 'Internet of Things (IoT)',
    course_code: 'IOT-006',
    application_status: 'approved',
    payment_status: 'paid',
    admission_status: 'admission_confirmed',
    assessment_score: 91.0,
  },
  {
    student_id: '2026-TEST-010',
    full_name: 'Kavitha Mohan',
    email: 'kavitha.test@tatti.edu.in',
    phone: '+91 98765 43228',
    parent_name: 'Mohanraj G',
    parent_phone: '+91 98765 43229',
    date_of_birth: '2004-10-08',
    city: 'Kanchipuram',
    state: 'Tamil Nadu',
    pincode: '631501',
    assessment_status: 'completed',
    application_access_status: 'unlocked',
    selected_course: 'Full Stack Web Development',
    course_code: 'FSWD-2026',
    application_status: 'rejected',
    payment_status: 'failed',
    admission_status: 'not_selected',
    assessment_score: 45.0,
  },
];

async function seedDummyStudents() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully!');

    // Hash the standard password
    const passwordHash = await bcrypt.hash(DUMMY_PASSWORD_RAW, 10);

    // Fetch existing courses map: course_code -> id
    const coursesRes = await client.query('SELECT id, course_name, course_code FROM public.courses');
    const courseByCode = new Map();
    const courseByName = new Map();
    coursesRes.rows.forEach(c => {
      if (c.course_code) courseByCode.set(c.course_code, c);
      if (c.course_name) courseByName.set(c.course_name, c);
    });

    console.log(`Loaded ${coursesRes.rows.length} existing courses from database.`);

    for (const s of DUMMY_STUDENTS) {
      // 1. Check or Insert User in public.users
      let userRes = await client.query('SELECT id FROM public.users WHERE email = $1', [s.email]);
      let userId;
      if (userRes.rows.length === 0) {
        const insertUserRes = await client.query(
          `INSERT INTO public.users (email, password_hash, created_at)
           VALUES ($1, $2, now())
           RETURNING id`,
          [s.email, passwordHash]
        );
        userId = insertUserRes.rows[0].id;
      } else {
        userId = userRes.rows[0].id;
        // Update password hash to guarantee Test@12345
        await client.query('UPDATE public.users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
      }

      // 2. Check or Insert Profile in public.profiles
      const profileRes = await client.query('SELECT id FROM public.profiles WHERE id = $1', [userId]);
      if (profileRes.rows.length === 0) {
        await client.query(
          `INSERT INTO public.profiles (id, email, full_name, phone, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'student', now(), now())`,
          [userId, s.email, s.full_name, s.phone]
        );
      } else {
        await client.query(
          `UPDATE public.profiles
           SET full_name = $1, phone = $2, role = 'student', updated_at = now()
           WHERE id = $3`,
          [s.full_name, s.phone, userId]
        );
      }

      // 3. Find matched course record if student has a selected course
      let matchedCourseId = null;
      if (s.course_code && courseByCode.has(s.course_code)) {
        matchedCourseId = courseByCode.get(s.course_code).id;
      } else if (s.selected_course && courseByName.has(s.selected_course)) {
        matchedCourseId = courseByName.get(s.selected_course).id;
      }

      const unlockedBy = s.application_access_status === 'unlocked' ? 'Admin System' : null;
      const unlockedAt = s.application_access_status === 'unlocked' ? new Date().toISOString() : null;

      // 4. Upsert Student Record in public.students
      const studentCheck = await client.query(
        'SELECT id FROM public.students WHERE email = $1 OR student_id = $2',
        [s.email, s.student_id]
      );

      let studentId;
      if (studentCheck.rows.length === 0) {
        const insertStudentRes = await client.query(
          `INSERT INTO public.students (
            profile_id, student_id, username, full_name, email, phone,
            date_of_birth, city, state, pincode,
            parent_name, parent_phone, selected_course,
            assessment_status, application_status, application_access_status,
            application_unlocked_by, application_unlocked_at,
            payment_status, admission_status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13,
            $14, $15, $16,
            $17, $18,
            $19, $20, now(), now()
          ) RETURNING id`,
          [
            userId, s.student_id, s.email.split('@')[0], s.full_name, s.email, s.phone,
            s.date_of_birth, s.city, s.state, s.pincode,
            s.parent_name, s.parent_phone, s.selected_course,
            s.assessment_status, s.application_status, s.application_access_status,
            unlockedBy, unlockedAt,
            s.payment_status, s.admission_status,
          ]
        );
        studentId = insertStudentRes.rows[0].id;
      } else {
        studentId = studentCheck.rows[0].id;
        await client.query(
          `UPDATE public.students SET
            profile_id = $1,
            student_id = $2,
            username = $3,
            full_name = $4,
            phone = $5,
            date_of_birth = $6,
            city = $7,
            state = $8,
            pincode = $9,
            parent_name = $10,
            parent_phone = $11,
            selected_course = $12,
            assessment_status = $13,
            application_status = $14,
            application_access_status = $15,
            application_unlocked_by = $16,
            application_unlocked_at = $17,
            payment_status = $18,
            admission_status = $19,
            updated_at = now()
          WHERE id = $20`,
          [
            userId, s.student_id, s.email.split('@')[0], s.full_name, s.phone,
            s.date_of_birth, s.city, s.state, s.pincode,
            s.parent_name, s.parent_phone, s.selected_course,
            s.assessment_status, s.application_status, s.application_access_status,
            unlockedBy, unlockedAt,
            s.payment_status, s.admission_status,
            studentId,
          ]
        );
      }

      // 5. If assessment is completed, create or update assessment record
      if (s.assessment_status === 'completed' && s.assessment_score !== null) {
        const assessCheck = await client.query('SELECT id FROM public.assessments WHERE student_id = $1', [studentId]);
        if (assessCheck.rows.length === 0) {
          await client.query(
            `INSERT INTO public.assessments (student_id, score, total_marks, percentage, status, started_at, submitted_at, created_at)
             VALUES ($1, $2, 100.0, $2, 'completed', now() - interval '2 days', now() - interval '2 days', now())`,
            [studentId, s.assessment_score]
          );
        }
      }

      // 6. If student has selected a course and application has progress, create application record
      if (matchedCourseId && s.application_status !== 'not_started') {
        const appCheck = await client.query('SELECT id FROM public.applications WHERE student_id = $1', [studentId]);
        const appNum = `APP-2026-${s.student_id.replace('2026-TEST-', '')}`;
        if (appCheck.rows.length === 0) {
          const appInsert = await client.query(
            `INSERT INTO public.applications (student_id, course_id, application_number, status, step, submitted_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 4, now() - interval '1 day', now() - interval '1 day', now())
             RETURNING id`,
            [studentId, matchedCourseId, appNum, s.application_status]
          );
          const appId = appInsert.rows[0].id;

          // 7. If paid, create payment record
          if (s.payment_status === 'paid') {
            const payCheck = await client.query('SELECT id FROM public.payments WHERE student_id = $1', [studentId]);
            if (payCheck.rows.length === 0) {
              await client.query(
                `INSERT INTO public.payments (application_id, student_id, payment_id, transaction_id, amount, payment_method, status, paid_at, created_at)
                 VALUES ($1, $2, $3, $4, 1500.00, 'UPI', 'paid', now() - interval '1 day', now() - interval '1 day')`,
                [appId, studentId, `PAY-${s.student_id}`, `UPI-TXN-${Date.now().toString().slice(-6)}-${s.student_id.replace('2026-TEST-', '')}`]
              );
            }
          }
        } else {
          await client.query(
            `UPDATE public.applications
             SET course_id = $1, status = $2, updated_at = now()
             WHERE id = $3`,
            [matchedCourseId, s.application_status, appCheck.rows[0].id]
          );
        }
      }

      console.log(`✓ [${s.student_id}] ${s.full_name} (${s.email}) — Course: ${s.selected_course || 'NULL'}, AppStatus: ${s.application_status}, Payment: ${s.payment_status}`);
    }

    console.log('\n--- 10 Dummy Students Seeded Successfully! ---');
    console.log('Credentials for all dummy students:');
    console.log('Password: ' + DUMMY_PASSWORD_RAW);
    console.log('Emails: arjun.test@tatti.edu.in ... kavitha.test@tatti.edu.in\n');

    await client.end();
  } catch (err) {
    console.error('Error seeding dummy students:', err);
    process.exit(1);
  }
}

seedDummyStudents();
