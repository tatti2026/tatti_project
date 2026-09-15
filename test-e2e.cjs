async function runTests() {
  console.log('=== TATTI Portal Standalone PostgreSQL & Express End-to-End Verification ===\n');
  const BASE_URL = 'http://localhost:5000/api';
  let passed = 0;
  let failed = 0;

  async function assertTest(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  let adminToken = '';
  let studentToken = '';
  let sampleStudentProfileId = '';
  let sampleStudentId = '';

  // Test 1: Health check
  await assertTest('Backend Health Check', async () => {
    const res = await fetch('http://localhost:5000/health');
    if (!res.ok) throw new Error('Health check returned ' + res.status);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Unexpected status: ' + data.status);
  });

  // Test 2: Admin Login
  await assertTest('Admin Login (admin@tatti.edu.in)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tatti.edu.in', password: 'admin123' })
    });
    if (!res.ok) throw new Error('Login failed with status ' + res.status);
    const data = await res.json();
    if (!data.token || data.user.role !== 'admin') throw new Error('Invalid login payload');
    adminToken = data.token;
  });

  // Test 3: Student Login
  await assertTest('Student Login (student@tatti.edu.in)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@tatti.edu.in', password: 'student123' })
    });
    if (!res.ok) throw new Error('Login failed with status ' + res.status);
    const data = await res.json();
    if (!data.token || data.user.role !== 'student') throw new Error('Invalid login payload');
    studentToken = data.token;
    sampleStudentProfileId = data.user.id;
  });

  // Test 4: Fetch Courses
  await assertTest('Fetch Courses from PostgreSQL', async () => {
    const res = await fetch(`${BASE_URL}/courses`);
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const courses = await res.json();
    if (!Array.isArray(courses) || courses.length === 0) throw new Error('No courses returned');
    console.log(`       -> Retrieved ${courses.length} courses from PostgreSQL (First: "${courses[0].course_name}")`);
  });

  // Test 5: Fetch Active Questions
  await assertTest('Fetch Active Entrance Questions from PostgreSQL', async () => {
    const res = await fetch(`${BASE_URL}/questions/active`);
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const questions = await res.json();
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('No questions returned');
    console.log(`       -> Retrieved ${questions.length} active questions`);
  });

  // Test 6: Fetch All Students (Admin View with parent details & enriched courses)
  await assertTest('Fetch All Students for Admin (Student Details table)', async () => {
    const res = await fetch(`${BASE_URL}/students?page=0&pageSize=20`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const result = await res.json();
    if (!Array.isArray(result.data)) throw new Error('Invalid students response');
    const firstStudent = result.data[0];
    sampleStudentId = firstStudent?.id;
    console.log(`       -> Students count: ${result.count}. Sample: "${firstStudent?.full_name}", Parent: "${firstStudent?.parent_name}", Course: "${firstStudent?.selected_course}"`);
  });

  // Test 7: Fetch Student by Profile ID
  await assertTest('Fetch Student by Profile ID', async () => {
    const res = await fetch(`${BASE_URL}/students/profile/${sampleStudentProfileId}`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const student = await res.json();
    if (!student || student.email !== 'student@tatti.edu.in') throw new Error('Student mismatch');
  });

  // Test 8: Submit Assessment & Get Recommendations
  await assertTest('Submit Student Assessment & Generate Recommendations', async () => {
    const res = await fetch(`${BASE_URL}/assessment/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
      body: JSON.stringify({
        studentId: sampleStudentId,
        answers: { 'q1': 'B', 'q2': 'B', 'q3': 'C', 'q4': 'C', 'q5': 'A' }
      })
    });
    if (!res.ok) throw new Error('Assessment submission failed: ' + res.status);
    const data = await res.json();
    if (!data.evaluation || !data.recommendations) throw new Error('Missing assessment output');
    console.log(`       -> Score: ${data.evaluation.score}/${data.evaluation.totalMarks} (${data.evaluation.percentage}%), Recommendations count: ${data.recommendations.length}`);
  });

  // Test 9: Fetch Notifications
  await assertTest('Fetch Notifications for Student Profile', async () => {
    const res = await fetch(`${BASE_URL}/notifications/profile/${sampleStudentProfileId}`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const notifs = await res.json();
    console.log(`       -> Retrieved ${notifs.length} notifications`);
  });

  // Test 10: Frontend Server response
  await assertTest('Frontend Server HTML response (http://localhost:5173)', async () => {
    const res = await fetch('http://localhost:5173');
    if (!res.ok) throw new Error('Frontend server returned ' + res.status);
    const html = await res.text();
    if (!html.includes('id="root"') && !html.includes('TATTI')) throw new Error('Invalid HTML');
    console.log('       -> Frontend Vite dev server responding cleanly with SPA root');
  });

  console.log(`\n=== Final Results: ${passed} Passed, ${failed} Failed ===\n`);
  if (failed > 0) process.exit(1);
}

runTests();
