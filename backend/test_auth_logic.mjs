import { app } from './dist/app.js';
import http from 'http';

const server = http.createServer(app);

async function runTests() {
  await new Promise(resolve => server.listen(5099, resolve));
  const baseUrl = 'http://localhost:5099/api/auth/login';

  const testCases = [
    {
      name: 'Admin - Exact email and password',
      payload: { email: 'admin@tatti.edu.in', password: 'admin123' },
      expectedStatus: 200,
      expectedRole: 'admin',
    },
    {
      name: 'Admin - Email alias @tatti.edu (without .in)',
      payload: { email: 'admin@tatti.edu', password: 'admin123' },
      expectedStatus: 200,
      expectedRole: 'admin',
    },
    {
      name: 'Admin - Invalid password',
      payload: { email: 'admin@tatti.edu.in', password: 'wrongpassword' },
      expectedStatus: 401,
    },
    {
      name: 'Counsellor - Valid login',
      payload: { email: 'counsellor@tatti.edu.in', password: 'counsellor123' },
      expectedStatus: 200,
      expectedRole: 'counsellor',
    },
    {
      name: 'Student 017 - Exact uppercase Student ID',
      payload: { email: '2026-TATTI-017', password: 'Swetha@123' },
      expectedStatus: 200,
      expectedRole: 'student',
    },
    {
      name: 'Student 017 - Lowercase Student ID',
      payload: { email: '2026-tatti-017', password: 'Swetha@123' },
      expectedStatus: 200,
      expectedRole: 'student',
    },
    {
      name: 'Student 017 - Student ID with trailing whitespace',
      payload: { email: '2026-TATTI-017  ', password: 'Swetha@123' },
      expectedStatus: 200,
      expectedRole: 'student',
    },
    {
      name: 'Student 017 - Login by username (Swetha)',
      payload: { email: 'Swetha', password: 'Swetha@123' },
      expectedStatus: 200,
      expectedRole: 'student',
    },
    {
      name: 'Student 017 - Password with accidental trailing whitespace',
      payload: { email: '2026-TATTI-017', password: 'Swetha@123 ' },
      expectedStatus: 200,
      expectedRole: 'student',
    },
    {
      name: 'Student 018 - Exact Student ID',
      payload: { email: '2026-TATTI-018', password: 'thara@123' },
      expectedStatus: 200,
      expectedRole: 'student',
    },
    {
      name: 'Student 018 - Invalid password',
      payload: { email: '2026-TATTI-018', password: 'wrongpassword' },
      expectedStatus: 401,
    },
    {
      name: 'Nonexistent user',
      payload: { email: 'nobody@nowhere.com', password: 'anypassword' },
      expectedStatus: 401,
    },
  ];

  console.log('\n=== RUNNING AUTHENTICATION VERIFICATION TESTS ===\n');
  let passed = 0;
  for (const tc of testCases) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tc.payload),
    });
    const body = await res.json().catch(() => ({}));
    const statusMatch = res.status === tc.expectedStatus;
    const roleMatch = !tc.expectedRole || body.user?.role === tc.expectedRole;

    if (statusMatch && roleMatch) {
      console.log(`[PASS] ${tc.name} -> HTTP ${res.status}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name} -> HTTP ${res.status} (expected ${tc.expectedStatus}), body:`, body);
    }
  }

  console.log(`\nResults: ${passed} / ${testCases.length} tests passed.\n`);
  server.close();
  process.exit(passed === testCases.length ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  server.close();
  process.exit(1);
});
