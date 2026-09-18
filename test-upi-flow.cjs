const fs = require('fs');
const path = require('path');

async function runUpiFlowTests() {
  console.log('================================================================');
  console.log('=== UPI Payment Verification, Admin Approval & Notification ===');
  console.log('================================================================\n');

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
  let studentProfileId = '';
  let studentRecordId = '';
  let testCourseId = '';
  let testCourseFee = 45000;
  let testApplicationId = '';
  let testPaymentId = '';
  let approvedPaymentNotificationId = '';

  // 1. Health check
  await assertTest('Backend API Health Check', async () => {
    const res = await fetch('http://localhost:5000/health');
    if (!res.ok) throw new Error('Health check status ' + res.status);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Backend health not ok');
  });

  // 2. Admin & Student Logins
  await assertTest('Admin & Student Authentication', async () => {
    // Admin login
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tatti.edu.in', password: 'admin123' }),
    });
    if (!adminRes.ok) throw new Error('Admin login failed');
    const adminData = await adminRes.json();
    adminToken = adminData.token;

    // Student login
    const studRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@tatti.edu.in', password: 'student123' }),
    });
    if (!studRes.ok) throw new Error('Student login failed');
    const studData = await studRes.json();
    studentToken = studData.token;
    studentProfileId = studData.user.id;
  });

  // 3. Retrieve or Create Student Record & Unlock Application
  await assertTest('Get or Create Student Record & Unlock Application', async () => {
    const sRes = await fetch(`${BASE_URL}/students/profile/${studentProfileId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    let student = sRes.ok ? await sRes.json() : null;

    if (!student) {
      const createRes = await fetch(`${BASE_URL}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          profile_id: studentProfileId,
          full_name: 'TATTI Test Student',
          email: 'student@tatti.edu.in',
          phone: '+91 98765 43210',
          student_id: 'TATTI2026_001',
        }),
      });
      if (!createRes.ok) throw new Error('Failed to create student record');
      student = await createRes.json();
    }

    studentRecordId = student.id;

    // Unlock application via Admin endpoint
    const unlockRes = await fetch(`${BASE_URL}/students/${studentRecordId}/application-access`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ unlocked: true, adminName: 'TATTI Super Admin' }),
    });
    if (!unlockRes.ok) throw new Error('Failed to unlock student application');
    console.log(`       -> Student ID: ${studentRecordId} (Unlocked: true)`);
  });

  // 4. Retrieve or Create Course & Application
  await assertTest('Retrieve Course and Upsert Application', async () => {
    const cRes = await fetch(`${BASE_URL}/courses`);
    const courses = await cRes.json();
    const course = courses.find((c) => c.fee > 0) || courses[0];
    testCourseId = course.id;
    testCourseFee = course.fee || 45000;

    // Upsert Application
    const appRes = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        student_id: studentRecordId,
        course_id: testCourseId,
        status: 'in_progress',
        step: 3,
      }),
    });
    if (!appRes.ok) throw new Error('Failed to create application');
    const appData = await appRes.json();
    testApplicationId = appData.id;
    console.log(`       -> Course: "${course.course_name}" (₹${testCourseFee}), App ID: ${testApplicationId}`);
  });

  // 5. Student Submits UPI Payment (12-digit UTR + Screenshot)
  const sample12DigitUtr = `982341${Date.now().toString().slice(-6)}`;
  // Tiny valid 1x1 transparent PNG data URL
  const sampleScreenshotBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  await assertTest('Student Submits UPI Payment for Verification', async () => {
    const payRes = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        application_id: testApplicationId,
        student_id: studentRecordId,
        course_id: testCourseId,
        amount: testCourseFee,
        payment_method: 'UPI (GPay)',
        utr_number: sample12DigitUtr,
        screenshot: sampleScreenshotBase64,
        status: 'pending',
      }),
    });

    if (!payRes.ok) {
      const err = await payRes.json();
      throw new Error(`Payment submission failed: ${JSON.stringify(err)}`);
    }

    const payData = await payRes.json();
    testPaymentId = payData.id;

    if (payData.status !== 'pending') throw new Error(`Expected status 'pending', got '${payData.status}'`);
    if (payData.utr_number !== sample12DigitUtr) throw new Error('UTR number mismatch');
    if (!payData.screenshot_url) throw new Error('Screenshot URL not generated');

    console.log(`       -> Payment ID: ${testPaymentId}, UTR: ${payData.utr_number}, Status: ${payData.status}`);
  });

  // 6. Verify Application is NOT yet Confirmed while pending
  await assertTest('Verify Application Status is NOT Confirmed while Pending', async () => {
    const appRes = await fetch(`${BASE_URL}/applications/student/${studentRecordId}`);
    const app = await appRes.json();
    if (app.status === 'Confirmed' || app.status === 'confirmed') {
      throw new Error('Application should NOT be confirmed before admin verification');
    }
    console.log(`       -> Application Status is correctly: "${app.status}"`);
  });

  // 7. Admin Fetches Pending Payments List
  await assertTest('Admin Fetches Pending Payments Queue', async () => {
    const res = await fetch(`${BASE_URL}/admin/payments/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch pending payments');
    const list = await res.json();
    if (!Array.isArray(list)) throw new Error('Expected array of pending payments');

    const found = list.find((p) => p.id === testPaymentId || p.utr_number === sample12DigitUtr);
    if (!found) throw new Error(`Submitted payment ${sample12DigitUtr} not found in pending list`);

    console.log(`       -> Found in pending queue: Student "${found.student_name}", Course "${found.course_name}", Amount ₹${found.amount}`);
  });

  // 8. Admin Fetches Payment Details by ID
  await assertTest('Admin Fetches Detailed Payment Record by ID', async () => {
    const res = await fetch(`${BASE_URL}/admin/payments/${testPaymentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch payment details');
    const details = await res.json();

    if (!details.student || !details.course || !details.utr_number) {
      throw new Error('Incomplete payment details structure');
    }
    console.log(`       -> Student: ${details.student.full_name}, Email: ${details.student.email}, UTR: ${details.utr_number}`);
  });

  // 9. Admin Fetches Payment Screenshot File Stream
  await assertTest('Admin / API Serves Payment Screenshot', async () => {
    const res = await fetch(`${BASE_URL}/admin/payments/${testPaymentId}/screenshot`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error('Screenshot endpoint returned status ' + res.status);
    const contentType = res.headers.get('content-type');
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) throw new Error('Empty screenshot buffer');
    console.log(`       -> Screenshot served successfully (${contentType}, ${buf.byteLength} bytes)`);
  });

  // 10. Admin Approves Payment inside Atomic Transaction
  await assertTest('Admin Approves Payment (Atomic Transaction)', async () => {
    const res = await fetch(`${BASE_URL}/admin/payments/${testPaymentId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ adminName: 'TATTI Admissions Officer' }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Approval failed: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    if (!data.success) throw new Error('Approval response success is false');

    // Verify payment in DB
    const payCheckRes = await fetch(`${BASE_URL}/admin/payments/${testPaymentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const updatedPay = await payCheckRes.json();
    if (updatedPay.status !== 'Approved') throw new Error(`Expected status 'Approved', got '${updatedPay.status}'`);
    if (!updatedPay.approved_by || !updatedPay.approved_at) throw new Error('Audit fields approved_by/approved_at missing');

    // Verify application in DB is Confirmed
    const appCheckRes = await fetch(`${BASE_URL}/applications/student/${studentRecordId}`);
    const updatedApp = await appCheckRes.json();
    if (updatedApp.status !== 'Confirmed') throw new Error(`Expected app status 'Confirmed', got '${updatedApp.status}'`);
    if (!updatedApp.confirmed_at) throw new Error('confirmed_at timestamp is missing on application');

    // Verify student payment_status = 'paid'
    const studCheckRes = await fetch(`${BASE_URL}/students/profile/${studentProfileId}`);
    const updatedStud = await studCheckRes.json();
    if (updatedStud.payment_status !== 'paid') throw new Error(`Expected student payment_status 'paid', got '${updatedStud.payment_status}'`);

    console.log(`       -> Payment Status: "${updatedPay.status}" (by ${updatedPay.approved_by})`);
    console.log(`       -> Application Status: "${updatedApp.status}" (confirmed_at: ${updatedApp.confirmed_at})`);
    console.log(`       -> Student payment_status: "${updatedStud.payment_status}"`);
  });

  // 11. Verify Student Notification Created & Fetch Unread
  await assertTest('Student Receives "Application Confirmed" Notification (Unread)', async () => {
    const res = await fetch(`${BASE_URL}/notifications/profile/${studentProfileId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch student notifications');
    const notifs = await res.json();

    const confNotif = notifs.find(
      (n) => n.title === 'Application Confirmed' && n.message.includes('confirmed')
    );
    if (!confNotif) throw new Error('Payment confirmation notification not found in student inbox');
    if (confNotif.is_read !== false) throw new Error('Notification should initially have is_read = false');

    approvedPaymentNotificationId = confNotif.id;
    console.log(`       -> Notification ID: ${confNotif.id}, Title: "${confNotif.title}", Unread: ${!confNotif.is_read}`);
  });

  // 12. Student Marks Notification as Read
  await assertTest('Student Marks Notification as Read', async () => {
    const res = await fetch(`${BASE_URL}/notifications/${approvedPaymentNotificationId}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    if (!res.ok) throw new Error('Failed to mark notification read');

    const checkRes = await fetch(`${BASE_URL}/notifications/profile/${studentProfileId}`);
    const notifs = await checkRes.json();
    const updated = notifs.find((n) => n.id === approvedPaymentNotificationId);
    if (!updated || updated.is_read !== true) throw new Error('Notification is_read was not updated to true');
    console.log(`       -> Notification successfully marked as read (is_read: true)`);
  });

  // 13. Test Rejection Flow
  await assertTest('Test Payment Rejection Flow with Reason & Notification', async () => {
    const rejectedUtr = `REJ${Date.now().toString().slice(-8)}`;

    // Student submits second payment
    const payRes = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        application_id: testApplicationId,
        student_id: studentRecordId,
        course_id: testCourseId,
        amount: testCourseFee,
        payment_method: 'UPI (PhonePe)',
        utr_number: rejectedUtr,
        screenshot: sampleScreenshotBase64,
        status: 'pending',
      }),
    });
    const payData = await payRes.json();
    const rejectPaymentId = payData.id;

    // Admin rejects payment
    const reasonText = 'Incorrect UTR reference number. Screenshot does not match institute bank statement.';
    const rejRes = await fetch(`${BASE_URL}/admin/payments/${rejectPaymentId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        reason: reasonText,
        adminName: 'TATTI Finance Team',
      }),
    });

    if (!rejRes.ok) throw new Error('Payment rejection failed');
    const rejData = await rejRes.json();
    if (!rejData.success) throw new Error('Rejection response success is false');

    // Verify rejection in DB
    const payCheck = await fetch(`${BASE_URL}/admin/payments/${rejectPaymentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const rejectedRecord = await payCheck.json();
    if (rejectedRecord.status !== 'Rejected') throw new Error(`Expected status 'Rejected', got '${rejectedRecord.status}'`);
    if (rejectedRecord.rejection_reason !== reasonText) throw new Error('Rejection reason mismatch');

    // Verify student receives rejection notification with reason
    const notifRes = await fetch(`${BASE_URL}/notifications/profile/${studentProfileId}`);
    const notifs = await notifRes.json();
    const rejNotif = notifs.find(
      (n) => n.title === 'Payment Verification Update' && n.message.includes(reasonText)
    );
    if (!rejNotif) throw new Error('Rejection notification not found for student');

    console.log(`       -> Rejected Payment Status: "${rejectedRecord.status}"`);
    console.log(`       -> Reason: "${rejectedRecord.rejection_reason}"`);
    console.log(`       -> Student Notified: "${rejNotif.title}" - "${rejNotif.message}"`);
  });

  console.log('\n================================================================');
  console.log(`=== Result: ${passed} Passed, ${failed} Failed ===`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUpiFlowTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
