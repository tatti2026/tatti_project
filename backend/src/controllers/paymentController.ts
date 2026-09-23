import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query } from '../database/pgPool.js';
import { initiateUpiPayment, verifyUpiTransaction } from '../services/upiPaymentService.js';
import { isStudentApplicationUnlocked } from '../services/applicationAccessService.js';
import { formatReceiptDetails } from '../utils/receiptGenerator.js';
import { createSystemNotification } from '../services/notificationService.js';
import { savePaymentScreenshot, findScreenshotFile } from '../services/paymentStorageService.js';

export async function getStudentPayment(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const result = await query(
      'SELECT * FROM payments WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1',
      [studentId]
    );
    return res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error getting student payment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPaymentById(req: Request, res: Response) {

  try {
    const { id } = req.params;
    const result = await query(
      `SELECT p.*, c.course_name, c.fee as course_fee, s.full_name as student_name, s.student_id as student_code, s.email, s.phone
       FROM payments p
       LEFT JOIN courses c ON c.id = p.course_id
       LEFT JOIN students s ON s.id = p.student_id
       WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting payment by id:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPaymentScreenshot(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, student_id, screenshot_path, screenshot_url FROM payments WHERE id::text = $1 OR payment_id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const row = result.rows[0];
    if (row.screenshot_path && findScreenshotFile(row.screenshot_path)) {
      return res.sendFile(path.resolve(row.screenshot_path));
    }

    // If screenshot_url is a base64 string or data URL
    if (row.screenshot_url && row.screenshot_url.startsWith('data:image/')) {
      const parts = row.screenshot_url.split(';base64,');
      const mime = parts[0].replace('data:', '');
      const buffer = Buffer.from(parts[1], 'base64');
      res.setHeader('Content-Type', mime);
      return res.send(buffer);
    }

    return res.status(404).json({ error: 'Payment screenshot not available' });
  } catch (err) {
    console.error('Error serving payment screenshot:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createPayment(req: Request, res: Response) {
  try {
    const payment = req.body;
    const studentId = payment.student_id;

    if (studentId && !isStudentApplicationUnlocked(studentId)) {
      return res.status(403).json({
        error: 'Application process is locked by TATTI Admin. Payment cannot be initiated.',
        code: 'APPLICATION_LOCKED'
      });
    }

    const paymentId = payment.payment_id || `PAY_${Date.now()}`;
    const utrNumber = payment.utr_number || payment.transaction_id || `UTR${Date.now()}`;
    const transactionId = payment.transaction_id || utrNumber;
    const status = payment.status || 'Pending Verification';
    const amount = Number(payment.amount) || 0;
    const courseId = payment.course_id || null;
    const applicationId = payment.application_id || null;

    let screenshotPath: string | null = null;
    let screenshotUrl: string | null = payment.screenshot_url || null;

    // Handle screenshot file data if provided
    if (payment.screenshot && typeof payment.screenshot === 'string' && payment.screenshot.trim().length > 0) {
      try {
        const saved = await savePaymentScreenshot(paymentId, payment.screenshot);
        screenshotPath = saved.filePath;
        screenshotUrl = saved.screenshotUrl;
      } catch (uploadErr) {
        console.warn('Failed to save screenshot to disk, storing raw URL if available:', uploadErr);
        screenshotUrl = payment.screenshot.startsWith('data:') ? payment.screenshot : null;
      }
    }

    // Check for existing pending payment to prevent duplicates
    let existingPendingRes = null;
    if (applicationId) {
      existingPendingRes = await query(
        "SELECT * FROM payments WHERE application_id = $1 AND status IN ('pending', 'Pending', 'Pending Verification', 'pending_verification') ORDER BY created_at DESC LIMIT 1",
        [applicationId]
      );
    }
    if ((!existingPendingRes || existingPendingRes.rows.length === 0) && studentId) {
      existingPendingRes = await query(
        "SELECT * FROM payments WHERE student_id = $1 AND status IN ('pending', 'Pending', 'Pending Verification', 'pending_verification') ORDER BY created_at DESC LIMIT 1",
        [studentId]
      );
    }

    let createdPayment;
    if (existingPendingRes && existingPendingRes.rows.length > 0) {
      const existingId = existingPendingRes.rows[0].id;
      const updateRes = await query(`
        UPDATE payments SET
          application_id = COALESCE($1, application_id),
          student_id = COALESCE($2, student_id),
          course_id = COALESCE($3, course_id),
          payment_id = $4,
          transaction_id = $5,
          utr_number = $6,
          amount = $7,
          payment_method = $8,
          screenshot_url = COALESCE($9, screenshot_url),
          screenshot_path = COALESCE($10, screenshot_path),
          status = $11,
          submitted_at = now()
        WHERE id = $12
        RETURNING *;
      `, [
        applicationId,
        studentId,
        courseId,
        paymentId,
        transactionId,
        utrNumber,
        amount,
        payment.payment_method || 'UPI',
        screenshotUrl,
        screenshotPath,
        status,
        existingId
      ]);
      createdPayment = updateRes.rows[0];
    } else {
      const result = await query(`
        INSERT INTO payments (
          application_id, student_id, course_id, payment_id, transaction_id,
          utr_number, amount, payment_method, screenshot_url, screenshot_path,
          status, submitted_at, paid_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), $12)
        RETURNING *;
      `, [
        applicationId,
        studentId,
        courseId,
        paymentId,
        transactionId,
        utrNumber,
        amount,
        payment.payment_method || 'UPI',
        screenshotUrl,
        screenshotPath,
        status,
        status === 'paid' || status === 'approved' || status === 'Approved' ? new Date().toISOString() : null
      ]);
      createdPayment = result.rows[0];
    }

    // Update student payment status (keep as pending if submitted for verification)
    if (studentId) {
      const studentPaymentStatus = (status === 'paid' || status === 'Approved') ? 'paid' : 'pending';
      await query("UPDATE students SET payment_status = $1, updated_at = now() WHERE id = $2", [studentPaymentStatus, studentId]);
    }

    // Update application if pending verification (DO NOT mark as confirmed here)
    if (applicationId) {
      const appStatus = (status === 'paid' || status === 'Approved') ? 'approved' : 'in_progress';
      await query("UPDATE applications SET status = $1, updated_at = now() WHERE id = $2", [appStatus, applicationId]);
    }

    return res.status(201).json(createdPayment);
  } catch (err) {
    console.error('Error creating payment record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}


export async function getAllPayments(req: Request, res: Response) {
  try {
    const { page = 1, pageSize, limit, status, search = '' } = req.query;
    const rawPage = Number(page);
    const p = isNaN(rawPage) || rawPage <= 0 ? 1 : rawPage;
    const ps = Math.max(1, Number(limit || pageSize) || 10);
    const offset = (p - 1) * ps;

    let countQueryStr = 'SELECT COUNT(*) FROM payments p LEFT JOIN students s ON s.id = p.student_id';
    let dataQueryStr = `
      SELECT p.*, s.full_name as student_name, s.student_id as student_code, s.email as student_email, s.phone as student_phone
      FROM payments p
      LEFT JOIN students s ON s.id = p.student_id
    `;

    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (status && status !== 'all') {
      queryParams.push(status);
      conditions.push(`p.status = $${queryParams.length}`);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchStr = `%${search.trim()}%`;
      queryParams.push(searchStr);
      conditions.push(`(p.utr_number ILIKE $${queryParams.length} OR p.payment_id ILIKE $${queryParams.length} OR s.full_name ILIKE $${queryParams.length} OR s.email ILIKE $${queryParams.length})`);
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      countQueryStr += whereClause;
      dataQueryStr += whereClause;
    }

    dataQueryStr += ` ORDER BY p.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;

    const countRes = await query(countQueryStr, queryParams);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(dataQueryStr, [...queryParams, ps, offset]);

    return res.json({
      data: dataRes.rows,
      pagination: {
        page: p,
        limit: ps,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / ps)),
      },
      count: totalCount,
    });
  } catch (err) {
    console.error('Error getting all payments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function initiatePayment(req: Request, res: Response) {
  const { studentId, courseId, amount, studentName } = req.body;

  if (!isStudentApplicationUnlocked(studentId)) {
    return res.status(403).json({
      error: 'Application process is locked. Payment initiation is disabled.',
      code: 'APPLICATION_LOCKED',
    });
  }

  const result = await initiateUpiPayment(studentId, courseId, Number(amount), studentName || 'Student');

  return res.json({
    message: 'UPI payment intent generated successfully.',
    payment: result,
  });
}

export async function verifyPayment(req: Request, res: Response) {
  const { studentId, paymentId, transactionId, courseName, amount, studentName, email } = req.body;

  const verification = verifyUpiTransaction(transactionId);
  const receiptNumber = `REC${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`;

  const receipt = formatReceiptDetails({
    receiptNumber,
    studentName: studentName || 'Student',
    studentId,
    email: email || '',
    courseName: courseName || 'Technical Course',
    amount: Number(amount),
    paymentId: paymentId || `PAY_${Date.now()}`,
    transactionId: transactionId || `TXN_${Date.now()}`,
    paidAt: verification.verifiedAt,
    upiVpa: 'tatti.admissions@upi',
  });

  // Persist to payments table
  try {
    await query(`
      INSERT INTO payments (
        student_id, payment_id, transaction_id, amount, payment_method, status, paid_at
      ) VALUES ($1, $2, $3, $4, 'UPI', 'paid', now())
      ON CONFLICT (payment_id) DO UPDATE SET status = 'paid', paid_at = now();
    `, [studentId, paymentId || `PAY_${Date.now()}`, transactionId || `TXN_${Date.now()}`, Number(amount)]);

    await query("UPDATE students SET payment_status = 'paid', updated_at = now() WHERE id = $1", [studentId]);
  } catch (e) {
    console.warn('Could not persist payment record to postgres:', e);
  }

  createSystemNotification(
    studentId,
    '✓ Payment Successful',
    `Your UPI payment of ₹${Number(amount).toLocaleString()} for ${courseName} has been received. Receipt #${receiptNumber} generated.`,
    'payment'
  );

  return res.json({
    message: 'Payment verified successfully.',
    status: 'paid',
    receipt,
  });
}
