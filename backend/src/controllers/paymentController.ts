import type { Request, Response } from 'express';
import { initiateUpiPayment, verifyUpiTransaction } from '../services/upiPaymentService.js';
import { isStudentApplicationUnlocked } from '../services/applicationAccessService.js';
import { formatReceiptDetails } from '../utils/receiptGenerator.js';
import { createSystemNotification } from '../services/notificationService.js';

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
