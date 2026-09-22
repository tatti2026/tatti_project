const { query } = require('../backend/dist/database/pgPool.js');

async function verify() {
  try {
    const studentsRes = await query(`
      SELECT s.*, 
        (SELECT row_to_json(c.*) FROM courses c 
         JOIN applications a ON a.course_id = c.id 
         WHERE a.student_id = s.id ORDER BY a.created_at DESC LIMIT 1) as course_info,
        (SELECT row_to_json(ast.*) FROM (
           SELECT id, score, total_marks, percentage, status, submitted_at
           FROM assessments
           WHERE student_id = s.id
           ORDER BY created_at DESC LIMIT 1
         ) ast) as assessment_info
      FROM students s
    `);

    const students = studentsRes.rows;
    console.log(`Total Students found: ${students.length}`);

    let high = 0;
    let medium = 0;
    let low = 0;
    let unassessed = 0;

    students.forEach((s, idx) => {
      const info = s.assessment_info;
      const isCompleted = info?.status === 'completed' || s.assessment_status === 'completed';
      const pct = info?.percentage != null ? Number(info.percentage) : null;
      const score = info?.score != null ? Number(info.score) : null;
      const totalMarks = info?.total_marks != null ? Number(info.total_marks) : null;

      let intent = 'UNASSESSED';
      if (isCompleted && pct != null) {
        if (pct >= 80) {
          intent = 'HIGH INTENT';
          high++;
        } else if (pct >= 60) {
          intent = 'MEDIUM INTENT';
          medium++;
        } else {
          intent = 'LOW INTENT';
          low++;
        }
      } else {
        unassessed++;
      }

      console.log(`[${idx + 1}] ${s.full_name} (${s.email})`);
      console.log(`    Score: ${score}/${totalMarks} (${pct}%)`);
      console.log(`    Status: ${s.assessment_status}`);
      console.log(`    Calculated Segment: ${intent}`);
    });

    const totalAssessed = high + medium + low;
    const highPct = totalAssessed > 0 ? Math.round((high / totalAssessed) * 100) : 0;
    const medPct = totalAssessed > 0 ? Math.round((medium / totalAssessed) * 100) : 0;
    const lowPct = totalAssessed > 0 ? (low === 0 ? 0 : 100 - highPct - medPct) : 0;

    console.log('\n--- Segmentation Summary Verification ---');
    console.log(`Total Assessed: ${totalAssessed}`);
    console.log(`HIGH: ${high} (${highPct}%)`);
    console.log(`MEDIUM: ${medium} (${medPct}%)`);
    console.log(`LOW: ${low} (${lowPct}%)`);
    console.log(`UNASSESSED: ${unassessed}`);
    console.log('\n--- Test User Prompt Example ---');
    // Test user prompt example: High = 1, Medium = 2, Low = 1, Unassessed = 1
    const testCases = [
      { name: 'Student A', score: 90, status: 'completed' },
      { name: 'Student B', score: 70, status: 'completed' },
      { name: 'Student C', score: 65, status: 'completed' },
      { name: 'Student D', score: 30, status: 'completed' },
      { name: 'Student E (Unassessed)', score: null, status: 'not_started' }
    ];

    let tHigh = 0, tMed = 0, tLow = 0, tUnassessed = 0;
    testCases.forEach(tc => {
      if (tc.status !== 'completed' || tc.score == null) {
        tUnassessed++;
        return;
      }
      if (tc.score >= 80) tHigh++;
      else if (tc.score >= 60) tMed++;
      else tLow++;
    });

    const tTotalAssessed = tHigh + tMed + tLow;
    const tHighPct = Math.round((tHigh / tTotalAssessed) * 100);
    const tMedPct = Math.round((tMed / tTotalAssessed) * 100);
    const tLowPct = 100 - tHighPct - tMedPct;

    console.log(`Calculated: HIGH (${tHigh}) = ${tHighPct}%, MEDIUM (${tMed}) = ${tMedPct}%, LOW (${tLow}) = ${tLowPct}%, UNASSESSED = ${tUnassessed}`);
    console.log(`Total Assessed = ${tTotalAssessed}, Sum of % = ${tHighPct + tMedPct + tLowPct}%`);
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    process.exit(0);
  }
}

verify();
