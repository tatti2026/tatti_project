import type { Request, Response } from 'express';
import path from 'path';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { query, pool } from '../database/pgPool.js';
import { findScreenshotFile } from '../services/paymentStorageService.js';
import {
  setStudentApplicationAccess,
  getStudentApplicationAccess,
  getAuditLogsForStudent,
} from '../services/applicationAccessService.js';
import { createSystemNotification } from '../services/notificationService.js';
import type { StudentRecord } from '../models/index.js';

const REPORT_EXPORT_COLUMNS = [
  'Roll Number',
  'Student Name',
  'Email',
  'Phone',
  'City',
  'State',
  'Assessment Status',
  'Application Status',
  'Payment Status',
  'Counselling Status',
  'Admission Status',
  'Application Access',
  'Registered Date',
];

function formatDateValue(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function stringifyCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function buildFilteredStudentQuery(reqQuery: Record<string, any>) {
  const {
    search = '',
    assessment_status,
    application_status,
    payment_status,
    admission_status,
    fromDate,
    toDate,
  } = reqQuery;

  const conditions: string[] = [];
  const params: any[] = [];

  if (typeof search === 'string' && search.trim()) {
    const q = `%${search.trim()}%`;
    params.push(q);
    conditions.push(`(s.full_name ILIKE $${params.length} OR s.email ILIKE $${params.length} OR s.student_id ILIKE $${params.length} OR s.phone ILIKE $${params.length} OR s.parent_name ILIKE $${params.length} OR s.selected_course ILIKE $${params.length})`);
  }

  if (assessment_status && assessment_status !== 'all') {
    params.push(String(assessment_status));
    conditions.push(`s.assessment_status = $${params.length}`);
  }

  if (application_status && application_status !== 'all') {
    params.push(String(application_status));
    conditions.push(`s.application_status = $${params.length}`);
  }

  if (payment_status && payment_status !== 'all') {
    params.push(String(payment_status));
    conditions.push(`s.payment_status = $${params.length}`);
  }

  if (admission_status && admission_status !== 'all') {
    params.push(String(admission_status));
    conditions.push(`s.admission_status = $${params.length}`);
  }

  if (typeof fromDate === 'string' && fromDate.trim()) {
    params.push(new Date(fromDate).toISOString());
    conditions.push(`s.created_at >= $${params.length}`);
  }

  if (typeof toDate === 'string' && toDate.trim()) {
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    params.push(endDate.toISOString());
    conditions.push(`s.created_at <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

  return {
    whereClause,
    params,
  };
}

async function getFilteredStudentsForExport(reqQuery: Record<string, any>) {
  const { whereClause, params } = buildFilteredStudentQuery(reqQuery);

  const rows = await query(`
    SELECT s.*
    FROM students s
    ${whereClause}
    ORDER BY s.created_at DESC
  `, params);

  return rows.rows as StudentRecord[];
}

function getExportDateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function exportStudentsAsCsv(req: Request, res: Response) {
  const students = await getFilteredStudentsForExport(req.query as Record<string, any>);
  const rows = students.map(student => [
    student.student_id || '',
    student.full_name || '',
    student.email || '',
    student.phone || '',
    student.city || '',
    student.state || '',
    student.assessment_status || '',
    student.application_status || '',
    student.payment_status || '',
    student.counselling_status || '',
    student.admission_status || '',
    student.application_access_status || 'locked',
    formatDateValue(student.created_at),
  ]);

  const csvRows = [[...REPORT_EXPORT_COLUMNS], ...rows]
    .map(row => row.map(stringifyCsvCell).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="tatti-report-${getExportDateStamp()}.csv"`);
  return res.send(csvRows);
}

async function exportStudentsAsExcel(req: Request, res: Response) {
  const students = await getFilteredStudentsForExport(req.query as Record<string, any>);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TATTI Admin Portal';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('TATTI Report');

  sheet.mergeCells('A1:M1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'TATTI Report';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1F2A44' } };
  titleCell.alignment = { horizontal: 'center' };

  sheet.getCell('A2').value = 'Generated:';
  sheet.getCell('B2').value = new Date().toISOString();
  sheet.getCell('A3').value = 'Filters:';
  sheet.getCell('B3').value = `search=${String(req.query.search || '')}; assessment=${String(req.query.assessment_status || 'all')}; application=${String(req.query.application_status || 'all')}; payment=${String(req.query.payment_status || 'all')}; from=${String(req.query.fromDate || '')}; to=${String(req.query.toDate || '')}`;

  const headers = REPORT_EXPORT_COLUMNS.map(header => ({ header, key: header, width: 18 }));
  sheet.columns = headers.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  sheet.addRows(students.map(student => ({
    'Roll Number': student.student_id || '',
    'Student Name': student.full_name || '',
    'Email': student.email || '',
    'Phone': student.phone || '',
    'City': student.city || '',
    'State': student.state || '',
    'Assessment Status': student.assessment_status || '',
    'Application Status': student.application_status || '',
    'Payment Status': student.payment_status || '',
    'Counselling Status': student.counselling_status || '',
    'Admission Status': student.admission_status || '',
    'Application Access': student.application_access_status || 'locked',
    'Registered Date': formatDateValue(student.created_at),
  })));

  const headerRow = sheet.getRow(5);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.eachRow((row) => {
    row.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="tatti-report-${getExportDateStamp()}.xlsx"`);
  return res.send(Buffer.from(buffer));
}

async function exportStudentsAsPdf(req: Request, res: Response) {
  const students = await getFilteredStudentsForExport(req.query as Record<string, any>);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const columns = REPORT_EXPORT_COLUMNS;
  const colWidth = (pageWidth - margin * 2) / columns.length;

  const drawTableHeader = (y: number) => {
    doc.setFillColor(59, 130, 246);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    columns.forEach((column, index) => {
      const x = margin + index * colWidth;
      doc.rect(x, y, colWidth, 22, 'F');
      doc.text(column, x + 6, y + 14);
    });
  };

  let y = 100;
  doc.setTextColor(31, 42, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('TATTI Report', margin, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toISOString()}`, margin, 75);

  const appliedFilters = [
    `Search: ${String(req.query.search || '')}`,
    `Assessment: ${String(req.query.assessment_status || 'all')}`,
    `Application: ${String(req.query.application_status || 'all')}`,
    `Payment: ${String(req.query.payment_status || 'all')}`,
    `From: ${String(req.query.fromDate || '')}`,
    `To: ${String(req.query.toDate || '')}`,
  ].join(' | ');
  doc.text(`Filters: ${appliedFilters}`, margin, 90, { maxWidth: pageWidth - margin * 2 });

  drawTableHeader(y);
  y += 22;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  students.forEach((student, index) => {
    const row = [
      student.student_id || '',
      student.full_name || '',
      student.email || '',
      student.phone || '',
      student.city || '',
      student.state || '',
      student.assessment_status || '',
      student.application_status || '',
      student.payment_status || '',
      student.counselling_status || '',
      student.admission_status || '',
      student.application_access_status || 'locked',
      formatDateValue(student.created_at),
    ];

    const rowHeight = 16;
    const lineCount = Math.max(1, ...row.map((value) => doc.splitTextToSize(String(value || ''), colWidth - 8).length));

    if (y + lineCount * rowHeight > pageHeight - 40) {
      doc.addPage();
      y = 40;
      drawTableHeader(y);
      y += 22;
    }

    row.forEach((value, columnIndex) => {
      const text = doc.splitTextToSize(String(value || ''), colWidth - 8);
      const x = margin + columnIndex * colWidth;
      doc.rect(x, y, colWidth, lineCount * rowHeight, 'S');
      doc.text(text, x + 6, y + 12);
    });

    y += lineCount * rowHeight + 2;
    if (index === students.length - 1 && y > pageHeight - 30) {
      doc.addPage();
    }
  });

  doc.setDrawColor(148, 163, 184);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 50, pageHeight - 20);
  }

  const buffer = doc.output('arraybuffer');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="tatti-report-${getExportDateStamp()}.pdf"`);
  return res.send(Buffer.from(buffer));
}

export async function exportReportCsv(req: Request, res: Response) {
  try {
    return await exportStudentsAsCsv(req, res);
  } catch (error) {
    console.error('Error exporting reports CSV:', error);
    return res.status(500).json({ error: 'Unable to generate report. Please try again.' });
  }
}

export async function exportReportExcel(req: Request, res: Response) {
  try {
    return await exportStudentsAsExcel(req, res);
  } catch (error) {
    console.error('Error exporting reports Excel:', error);
    return res.status(500).json({ error: 'Unable to generate report. Please try again.' });
  }
}

export async function exportReportPdf(req: Request, res: Response) {
  try {
    return await exportStudentsAsPdf(req, res);
  } catch (error) {
    console.error('Error exporting reports PDF:', error);
    return res.status(500).json({ error: 'Unable to generate report. Please try again.' });
  }
}

export async function exportStudentsExcel(req: Request, res: Response) {
  try {
    return await exportStudentsAsExcel(req, res);
  } catch (error) {
    console.error('Error exporting student details Excel:', error);
    return res.status(500).json({ error: 'Unable to generate the file. Please try again.' });
  }
}

export async function exportStudentsPdf(req: Request, res: Response) {
  try {
    return await exportStudentsAsPdf(req, res);
  } catch (error) {
    console.error('Error exporting student details PDF:', error);
    return res.status(500).json({ error: 'Unable to generate the file. Please try again.' });
  }
}

export async function updateStudentApplicationAccess(req: Request, res: Response) {
  try {
    const { id, studentId } = req.params;
    const targetStudentId = id || studentId;
    const { unlocked, adminName } = req.body;
    const isUnlocked = !!unlocked;
    const status = isUnlocked ? 'unlocked' : 'locked';
    const adminDisplayName = adminName || 'TATTI Head Administrator';

    // Verify student exists
    const checkRes = await query('SELECT id, full_name, email FROM students WHERE id = $1', [targetStudentId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = checkRes.rows[0];

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const updatedRes = await query(
      `UPDATE students 
       SET application_access_status = $1, 
           application_unlocked_by = $2, 
           application_unlocked_at = $3,
           updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [
        status,
        isUnlocked ? adminDisplayName : null,
        isUnlocked ? now.toISOString() : null,
        targetStudentId
      ]
    );

    setStudentApplicationAccess(targetStudentId, status, {
      adminId: (req as any).user?.userId || 'admin',
      adminName: adminDisplayName,
    });

    try {
      await query(
        `INSERT INTO admin_audit_logs (student_id, admin_name, action, date, time)
         VALUES ($1, $2, $3, $4, $5)`,
        [targetStudentId, adminDisplayName, isUnlocked ? 'UNLOCK' : 'LOCK', dateStr, timeStr]
      );
    } catch (auditErr) {
      console.warn('Audit log table insert warning:', auditErr);
    }

    if (isUnlocked) {
      createSystemNotification(
        targetStudentId,
        '🎉 Application Process Unlocked',
        'Congratulations! TATTI Admin has unlocked your application process. You can now start your application.',
        'application'
      );
    }

    return res.json({
      success: true,
      applicationAccess: isUnlocked,
      application_access_status: status,
      student: updatedRes.rows[0],
      message: `Application access ${status} successfully for ${student.full_name || 'student'}.`,
    });
  } catch (err) {
    console.error('Error updating student application access:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function unlockStudentApplication(req: Request, res: Response) {
  req.body = { ...req.body, unlocked: true };
  return updateStudentApplicationAccess(req, res);
}

export async function lockStudentApplication(req: Request, res: Response) {
  req.body = { ...req.body, unlocked: false };
  return updateStudentApplicationAccess(req, res);
}

export async function getStudentAuditLogs(req: Request, res: Response) {
  const { studentId } = req.params;
  try {
    const resDb = await query(
      'SELECT * FROM admin_audit_logs WHERE student_id = $1 ORDER BY created_at DESC',
      [studentId]
    );
    return res.json(resDb.rows);
  } catch {
    const logs = getAuditLogsForStudent(studentId);
    return res.json(logs);
  }
}

export async function listAllStudents(req: Request, res: Response) {
  const { page = 1, pageSize, limit, search = '' } = req.query;
  const rawPage = Number(page);
  const p = isNaN(rawPage) || rawPage <= 0 ? 1 : rawPage;
  const ps = Math.max(1, Number(limit || pageSize) || 10);
  const offset = (p - 1) * ps;

  try {
    let countQueryStr = 'SELECT COUNT(*) FROM students';
    let dataQueryStr = 'SELECT * FROM students';
    let queryParams: any[] = [];
    
    if (search && typeof search === 'string' && search.trim()) {
        const searchStr = `%${search.trim()}%`;
        const whereClause = ' WHERE full_name ILIKE $1 OR email ILIKE $1 OR student_id ILIKE $1 OR phone ILIKE $1';
        countQueryStr += whereClause;
        dataQueryStr += whereClause;
        queryParams.push(searchStr);
    }
    
    dataQueryStr += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    
    const countRes = await query(countQueryStr, queryParams);
    const totalCount = parseInt(countRes.rows[0].count, 10);
    
    const dataRes = await query(dataQueryStr, [...queryParams, ps, offset]);
    const data = dataRes.rows as StudentRecord[];

    const list = data.map(s => {
      return {
        ...s,
        application_access_status: s.application_access_status || 'locked',
        application_unlocked_by: s.application_unlocked_by || null,
        application_unlocked_at: s.application_unlocked_at || null,
      };
    });

    return res.json({
      data: list,
      pagination: {
        page: p,
        limit: ps,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / ps)),
      },
      count: totalCount,
    });
  } catch (err) {
      console.error('Error listing students:', err);
      res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDashboardStats(_req: Request, res: Response) {
  try {
    // ── Single aggregate query from the students table ────────────────────────
    const statsResult = await query(`
      SELECT
        -- 1. Total students
        COUNT(*)::int AS total_students,

        -- 2. New students registered in the last 7 days
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_students_7d,

        -- 3. Assessment completed (authoritative field on students row)
        COUNT(*) FILTER (WHERE assessment_status = 'completed')::int AS assessment_completed,

        -- 4. Assessment pending = Total - Completed (clamped to 0)
        GREATEST(0,
          COUNT(*) - COUNT(*) FILTER (WHERE assessment_status = 'completed')
        )::int AS assessment_pending,

        -- 5. Applications submitted: any app actually submitted
        --    (submitted_at set OR status moved past draft stage)
        COALESCE((
          SELECT COUNT(*)::int
          FROM applications
          WHERE submitted_at IS NOT NULL
             OR LOWER(status) IN ('submitted', 'under_review', 'approved', 'rejected', 'confirmed')
        ), 0) AS applications_submitted,

        -- 6. Paid applications: payment verified/approved by admin
        --    Primary: students.payment_status = 'paid' (set by approvePayment transaction)
        --    Also catches any student with an approved payment record
        COALESCE((
          SELECT COUNT(DISTINCT s2.id)::int
          FROM students s2
          WHERE s2.payment_status = 'paid'
             OR EXISTS (
               SELECT 1 FROM payments p
               WHERE p.student_id = s2.id
                 AND LOWER(p.status) IN ('approved', 'paid')
             )
        ), 0) AS paid_applications,

        -- 7. Unpaid / pending payment: submitted applications where payment not yet verified
        COALESCE((
          SELECT COUNT(DISTINCT a2.id)::int
          FROM applications a2
          JOIN students s3 ON a2.student_id = s3.id
          WHERE (
            a2.submitted_at IS NOT NULL
            OR LOWER(a2.status) IN ('submitted', 'under_review', 'approved', 'rejected', 'confirmed')
          )
          AND s3.payment_status != 'paid'
          AND NOT EXISTS (
            SELECT 1 FROM payments p2
            WHERE p2.student_id = s3.id
              AND LOWER(p2.status) IN ('approved', 'paid')
          )
        ), 0) AS unpaid_applications,

        -- 8. Counselling pending: count from the real counselling table
        --    CounsellingManagement inserts into counselling.status = 'scheduled',
        --    NOT into students.admission_status, so query counselling table directly.
        COALESCE((
          SELECT COUNT(*)::int
          FROM counselling
          WHERE LOWER(status) IN ('scheduled', 'pending', 'rescheduled')
            AND LOWER(status) NOT IN ('completed', 'cancelled', 'no_show')
        ), 0) AS counselling_pending,

        -- 9. Admissions confirmed: students with admission_status = 'admission_confirmed'
        --    OR applications with status = 'Confirmed' (set by approvePayment transaction)
        COALESCE((
          SELECT COUNT(DISTINCT s4.id)::int
          FROM students s4
          LEFT JOIN applications a3 ON a3.student_id = s4.id
          WHERE LOWER(s4.admission_status) = 'admission_confirmed'
             OR LOWER(a3.status) = 'confirmed'
        ), 0) AS admissions_confirmed

      FROM students;
    `);

    const row = statsResult.rows[0] || {};

    // ── 7-day registration trend: one row per day ─────────────────────────────
    const trendResult = await query(`
      SELECT
        DATE_TRUNC('day', created_at AT TIME ZONE 'UTC') AS day,
        COUNT(*)::int AS count
      FROM students
      WHERE created_at >= NOW() AT TIME ZONE 'UTC' - INTERVAL '6 days'
      GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')
      ORDER BY day ASC;
    `);

    // Build a map keyed by ISO date string (YYYY-MM-DD)
    const trendMap: Record<string, number> = {};
    for (const trow of trendResult.rows) {
      const isoDay = new Date(trow.day).toISOString().slice(0, 10);
      trendMap[isoDay] = Number(trow.count);
    }

    // Fill all 7 days (most recent first then ascending), filling gaps with 0
    const registrationTrend: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const iso = d.toISOString().slice(0, 10);
      // Format as "Sep 13" style label matching date-fns format('MMM dd')
      const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
      registrationTrend.push({ date: label, count: trendMap[iso] ?? 0 });
    }

    return res.json({
      totalStudents: Number(row.total_students || 0),
      newStudents7d: Number(row.new_students_7d || 0),
      assessmentCompleted: Number(row.assessment_completed || 0),
      assessmentPending: Number(row.assessment_pending || 0),
      applicationsSubmitted: Number(row.applications_submitted || 0),
      paidApplications: Number(row.paid_applications || 0),
      unpaidApplications: Number(row.unpaid_applications || 0),
      counsellingPending: Number(row.counselling_pending || 0),
      admissionsConfirmed: Number(row.admissions_confirmed || 0),
      registrationTrend,
    });
  } catch (err) {
    console.error('Error getting dashboard stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getReportsSummary(_req: Request, res: Response) {
  try {
    const result = await query(`
      SELECT 
        COUNT(*)::int as total_students,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int as new_students_7d,
        COUNT(*) FILTER (WHERE assessment_status = 'completed')::int as assessed_count,
        COUNT(*) FILTER (WHERE application_status = 'submitted')::int as applications_count,
        COUNT(*) FILTER (WHERE payment_status IN ('paid', 'Approved'))::int as paid_count,
        COUNT(*) FILTER (WHERE admission_status IN ('counselling_completed', 'selected'))::int as counselled_count,
        COUNT(*) FILTER (WHERE admission_status = 'admission_confirmed')::int as admitted_count
      FROM students;
    `);
    const paysRes = await query('SELECT COUNT(*)::int as total_payments FROM payments;');
    return res.json({
      ...(result.rows[0] || {}),
      total_payments: paysRes.rows[0]?.total_payments || 0,
    });
  } catch (err) {
    console.error('Error getting reports summary:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── UPI PAYMENT VERIFICATION & APPROVAL / REJECTION ──────────────────────────

export async function getPendingPayments(req: Request, res: Response) {
  try {
    const { page, pageSize, limit, search = '' } = req.query;
    const isPaginated = page !== undefined || limit !== undefined || pageSize !== undefined;

    const rawPage = Number(page);
    const p = isNaN(rawPage) || rawPage <= 0 ? 1 : rawPage;
    const ps = Math.max(1, Number(limit || pageSize) || 10);
    const offset = (p - 1) * ps;

    let baseWhere = "p.status IN ('pending', 'Pending', 'Pending Verification', 'pending_verification')";
    const queryParams: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      const searchStr = `%${search.trim()}%`;
      queryParams.push(searchStr);
      baseWhere += ` AND (s.full_name ILIKE $${queryParams.length} OR s.email ILIKE $${queryParams.length} OR p.utr_number ILIKE $${queryParams.length} OR c.course_name ILIKE $${queryParams.length})`;
    }

    const countRes = await query(`
      SELECT COUNT(*) 
      FROM payments p
      LEFT JOIN students s ON s.id = p.student_id
      LEFT JOIN courses c ON c.id = p.course_id
      WHERE ${baseWhere}
    `, queryParams);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    let dataQuery = `
      SELECT 
        p.id,
        p.student_id,
        p.application_id,
        p.course_id,
        p.payment_id,
        p.transaction_id,
        p.utr_number,
        p.amount,
        p.payment_method,
        p.screenshot_url,
        p.screenshot_path,
        p.status,
        p.submitted_at,
        p.created_at,
        COALESCE(s.full_name, 'Unknown Student') as student_name,
        s.student_id as student_code,
        s.email as student_email,
        s.phone as student_phone,
        pr.avatar_url as student_avatar,
        c.course_name,
        c.fee as course_fee,
        a.status as application_status
      FROM payments p
      LEFT JOIN students s ON s.id = p.student_id
      LEFT JOIN profiles pr ON pr.id = s.profile_id
      LEFT JOIN courses c ON c.id = p.course_id
      LEFT JOIN applications a ON a.id = p.application_id
      WHERE ${baseWhere}
      ORDER BY p.submitted_at DESC NULLS LAST, p.created_at DESC
    `;

    if (isPaginated) {
      dataQuery += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      const result = await query(dataQuery, [...queryParams, ps, offset]);
      return res.json({
        data: result.rows,
        pagination: {
          page: p,
          limit: ps,
          total: totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / ps)),
        },
      });
    }

    const result = await query(dataQuery, queryParams);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error getting pending payments:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRejectedPayments(req: Request, res: Response) {
  try {
    const { page, pageSize, limit, search = '' } = req.query;
    const isPaginated = page !== undefined || limit !== undefined || pageSize !== undefined;

    const rawPage = Number(page);
    const p = isNaN(rawPage) || rawPage <= 0 ? 1 : rawPage;
    const ps = Math.max(1, Number(limit || pageSize) || 10);
    const offset = (p - 1) * ps;

    let baseWhere = "p.status IN ('rejected', 'Rejected')";
    const queryParams: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      const searchStr = `%${search.trim()}%`;
      queryParams.push(searchStr);
      baseWhere += ` AND (s.full_name ILIKE $${queryParams.length} OR s.email ILIKE $${queryParams.length} OR p.utr_number ILIKE $${queryParams.length} OR c.course_name ILIKE $${queryParams.length} OR p.rejection_reason ILIKE $${queryParams.length})`;
    }

    const countRes = await query(`
      SELECT COUNT(*) 
      FROM payments p
      LEFT JOIN students s ON s.id = p.student_id
      LEFT JOIN courses c ON c.id = p.course_id
      WHERE ${baseWhere}
    `, queryParams);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    let dataQuery = `
      SELECT 
        p.id,
        p.student_id,
        p.application_id,
        p.course_id,
        p.payment_id,
        p.transaction_id,
        p.utr_number,
        p.amount,
        p.payment_method,
        p.screenshot_url,
        p.screenshot_path,
        p.status,
        p.submitted_at,
        p.created_at,
        p.rejected_by,
        p.rejected_at,
        p.rejection_reason,
        COALESCE(s.full_name, 'Unknown Student') as student_name,
        s.student_id as student_code,
        s.email as student_email,
        s.phone as student_phone,
        pr.avatar_url as student_avatar,
        c.course_name,
        c.fee as course_fee,
        a.status as application_status
      FROM payments p
      LEFT JOIN students s ON s.id = p.student_id
      LEFT JOIN profiles pr ON pr.id = s.profile_id
      LEFT JOIN courses c ON c.id = p.course_id
      LEFT JOIN applications a ON a.id = p.application_id
      WHERE ${baseWhere}
      ORDER BY p.rejected_at DESC NULLS LAST, p.created_at DESC
    `;

    if (isPaginated) {
      dataQuery += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      const result = await query(dataQuery, [...queryParams, ps, offset]);
      return res.json({
        data: result.rows,
        pagination: {
          page: p,
          limit: ps,
          total: totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / ps)),
        },
      });
    }

    const result = await query(dataQuery, queryParams);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error getting rejected payments:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPaymentDetailsById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT 
        p.*,
        s.full_name as student_name,
        s.student_id as student_code,
        s.email as student_email,
        s.phone as student_phone,
        pr.avatar_url as student_avatar,
        pr.id as profile_id,
        c.course_name,
        c.fee as course_fee,
        a.id as app_id,
        a.status as app_status,
        a.step as app_step,
        a.submitted_at as app_submitted_at,
        a.confirmed_at as app_confirmed_at
      FROM payments p
      JOIN students s ON s.id = p.student_id
      LEFT JOIN profiles pr ON pr.id = s.profile_id
      LEFT JOIN courses c ON c.id = p.course_id
      LEFT JOIN applications a ON a.id = p.application_id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const row = result.rows[0];
    const details = {
      id: row.id,
      student_id: row.student_id,
      application_id: row.application_id || row.app_id,
      course_id: row.course_id,
      amount: row.amount,
      utr_number: row.utr_number || row.transaction_id,
      transaction_id: row.transaction_id,
      payment_id: row.payment_id,
      status: row.status,
      submitted_at: row.submitted_at || row.created_at,
      screenshot_url: row.screenshot_url,
      screenshot_path: row.screenshot_path,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      payment_verified_at: row.payment_verified_at,
      rejected_by: row.rejected_by,
      rejected_at: row.rejected_at,
      rejection_reason: row.rejection_reason,
      student: {
        id: row.student_id,
        profile_id: row.profile_id,
        full_name: row.student_name,
        student_id: row.student_code,
        email: row.student_email,
        phone: row.student_phone,
        avatar_url: row.student_avatar,
      },
      course: {
        id: row.course_id,
        course_name: row.course_name,
        fee: row.course_fee || row.amount,
      },
      application: {
        id: row.app_id,
        status: row.app_status,
        step: row.app_step,
        submitted_at: row.app_submitted_at,
        confirmed_at: row.app_confirmed_at,
      }
    };

    return res.json(details);
  } catch (err) {
    console.error('Error fetching payment details:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function approvePayment(req: Request, res: Response) {
  const { id } = req.params;
  const adminName = (req as any).user?.full_name || (req as any).body?.adminName || 'TATTI Head Administrator';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // STEP 1: Verify payment exists and lock the row
    const payRes = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [id]);
    if (payRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found' });
    }
    const payment = payRes.rows[0];

    const now = new Date();

    // STEP 2 & 4: Update payment: Pending -> Approved, Save approved_by, approved_at, payment_verified_at
    const updatedPayRes = await client.query(`
      UPDATE payments 
      SET status = 'Approved', 
          approved_by = $1, 
          approved_at = $2, 
          payment_verified_at = $2,
          paid_at = COALESCE(paid_at, $2)
      WHERE id = $3
      RETURNING *
    `, [adminName, now.toISOString(), id]);

    // STEP 3: Update application: Pending / Payment Pending / Pending Verification -> Confirmed
    if (payment.application_id) {
      await client.query(`
        UPDATE applications 
        SET status = 'Confirmed', 
            confirmed_at = $1, 
            updated_at = $1 
        WHERE id = $2
      `, [now.toISOString(), payment.application_id]);
    } else {
      // Find latest application for student
      const appRes = await client.query(`
        SELECT id FROM applications WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1
      `, [payment.student_id]);
      if (appRes.rows.length > 0) {
        await client.query(`
          UPDATE applications 
          SET status = 'Confirmed', 
              confirmed_at = $1, 
              updated_at = $1 
          WHERE id = $2
        `, [now.toISOString(), appRes.rows[0].id]);
      }
    }

    // Update student status: payment_status = 'paid', application_status = 'approved',
    // admission_status = 'admission_confirmed' (triggers Admissions Confirmed KPI on dashboard)
    await client.query(`
      UPDATE students 
      SET payment_status = 'paid', 
          application_status = 'approved',
          admission_status = 'admission_confirmed',
          updated_at = $1 
      WHERE id = $2
    `, [now.toISOString(), payment.student_id]);

    // STEP 5 & 6: Create a notification for ONLY the corresponding student with is_read = false
    const studRes = await client.query('SELECT profile_id FROM students WHERE id = $1', [payment.student_id]);
    const profileId = studRes.rows[0]?.profile_id || null;

    await client.query(`
      INSERT INTO notifications (student_id, profile_id, title, message, type, is_read, created_at)
      VALUES ($1, $2, $3, $4, 'payment', false, $5)
    `, [
      payment.student_id,
      profileId,
      'Application Confirmed',
      'Congrats! Your application has been confirmed.',
      now.toISOString()
    ]);

    // STEP 7: Commit transaction
    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Payment approved successfully. Application confirmed and student notified.',
      payment: updatedPayRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error approving payment inside transaction:', err);
    return res.status(500).json({ error: 'Failed to approve payment. Transaction rolled back.' });
  } finally {
    client.release();
  }
}

export async function rejectPayment(req: Request, res: Response) {
  const { id } = req.params;
  const { reason, adminName: bodyAdminName } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Rejection reason is required.' });
  }

  const adminName = (req as any).user?.full_name || bodyAdminName || 'TATTI Head Administrator';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // STEP 1: Verify payment exists
    const payRes = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [id]);
    if (payRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found' });
    }
    const payment = payRes.rows[0];
    const now = new Date();

    // STEP 2: Update payment: status = 'Rejected', rejected_by, rejected_at, rejection_reason
    const updatedPayRes = await client.query(`
      UPDATE payments 
      SET status = 'Rejected', 
          rejected_by = $1, 
          rejected_at = $2, 
          rejection_reason = $3
      WHERE id = $4
      RETURNING *
    `, [adminName, now.toISOString(), reason.trim(), id]);

    // STEP 3: Update application: status = 'rejected' (DO NOT mark as Confirmed)
    if (payment.application_id) {
      await client.query(`
        UPDATE applications 
        SET status = 'rejected', 
            updated_at = $1 
        WHERE id = $2
      `, [now.toISOString(), payment.application_id]);
    }

    // Update student payment & application status
    await client.query(`
      UPDATE students 
      SET payment_status = 'failed', 
          application_status = 'rejected', 
          updated_at = $1 
      WHERE id = $2
    `, [now.toISOString(), payment.student_id]);

    // STEP 4: Create notification for the student
    const studRes = await client.query('SELECT profile_id FROM students WHERE id = $1', [payment.student_id]);
    const profileId = studRes.rows[0]?.profile_id || null;

    const notifMessage = `Your payment could not be verified. Please check the payment details and contact TATTI support. Reason: ${reason.trim()}`;

    await client.query(`
      INSERT INTO notifications (student_id, profile_id, title, message, type, is_read, created_at)
      VALUES ($1, $2, $3, $4, 'payment', false, $5)
    `, [
      payment.student_id,
      profileId,
      'Payment Verification Update',
      notifMessage,
      now.toISOString()
    ]);

    // Commit transaction
    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Payment rejected. Notification sent to student.',
      payment: updatedPayRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error rejecting payment inside transaction:', err);
    return res.status(500).json({ error: 'Failed to reject payment. Transaction rolled back.' });
  } finally {
    client.release();
  }
}

export async function getAdminPaymentScreenshot(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, student_id, screenshot_path, screenshot_url FROM payments WHERE id::text = $1 OR payment_id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const row = result.rows[0];
    if (row.screenshot_path && findScreenshotFile(row.screenshot_path)) {
      return res.sendFile(path.resolve(row.screenshot_path));
    }

    if (row.screenshot_url && row.screenshot_url.startsWith('data:image/')) {
      const parts = row.screenshot_url.split(';base64,');
      const mime = parts[0].replace('data:', '');
      const buffer = Buffer.from(parts[1], 'base64');
      res.setHeader('Content-Type', mime);
      return res.send(buffer);
    }

    return res.status(404).json({ error: 'Payment screenshot not available' });
  } catch (err) {
    console.error('Error serving admin payment screenshot:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

