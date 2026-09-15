import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';
import { initiateUpiPayment, verifyUpiTransaction } from '../services/upiPaymentService.js';
import { isStudentApplicationUnlocked } from '../services/applicationAccessService.js';
import { formatReceiptDetails } from '../utils/receiptGenerator.js';
import { createSystemNotification } from '../services/notificationService.js';

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

    const result = await query(`
      INSERT INTO payments (
        application_id, student_id, payment_id, transaction_id,
        amount, payment_method, status, paid_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [
      payment.application_id || null, studentId,
      payment.payment_id || `PAY_${Date.now()}`,
      payment.transaction_id || `TXN_${Date.now()}`,
      payment.amount || 0,
      payment.payment_method || 'UPI',
      payment.status || 'paid',
      payment.paid_at || new Date().toISOString()
    ]);

    // Update student payment_status to 'paid'
    if (studentId) {
      await query("UPDATE students SET payment_status = 'paid', updated_at = now() WHERE id = $1", [studentId]);
    }

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating payment record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllPayments(req: Request, res: Response) {
  try {
    const { page = 0, pageSize = 20 } = req.query;
    const p = Number(page);
    const ps = Number(pageSize);

    const countRes = await query('SELECT COUNT(*) FROM payments');
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(
      'SELECT * FROM payments ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [ps, p * ps]
    );

    return res.json({ data: dataRes.rows, count: totalCount });
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
