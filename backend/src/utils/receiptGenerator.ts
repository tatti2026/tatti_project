export interface ReceiptData {
  receiptNumber: string;
  studentName: string;
  studentId: string;
  email: string;
  courseName: string;
  amount: number;
  paymentId: string;
  transactionId: string;
  paidAt: string;
  upiVpa: string;
}

export function formatReceiptDetails(data: ReceiptData) {
  return {
    institution: 'Tamil Nadu Advanced Technical Training Institute (TATTI)',
    address: 'Chennai, Tamil Nadu, India | www.tatti.edu.in',
    receiptNumber: data.receiptNumber,
    paymentMethod: 'UPI',
    student: {
      name: data.studentName,
      id: data.studentId,
      email: data.email,
    },
    transaction: {
      courseName: data.courseName,
      amount: data.amount,
      amountInWords: `INR ${data.amount.toLocaleString()} Only`,
      paymentId: data.paymentId,
      transactionId: data.transactionId,
      vpa: data.upiVpa,
      paidAt: data.paidAt,
      status: 'SUCCESSFUL / PAID',
    }
  };
}
