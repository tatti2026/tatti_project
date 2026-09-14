import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStudentByProfileId, createStudent, getStudentRecommendations,
  getAllCourses, upsertApplication, getStudentApplication,
  createPayment, getStudentPayment, updateStudent
} from '@/lib/api';
import StudentLayout from '@/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Student, Course, Application, Payment } from '@/types/index';
import {
  CheckCircle2, User, BookOpen, CreditCard, Loader2,
  Shield, ChevronRight, Download, Eye, FileText, Receipt,
  CalendarDays, Clock, BadgeCheck, Hash, Banknote, GraduationCap,
  Lock, Unlock, QrCode, Smartphone, AtSign, Copy, Check
} from 'lucide-react';
import { getApplicationAccess } from '@/services/applicationAccessService';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

type Step = 1 | 2 | 3 | 4;

const PAYMENT_METHODS = ['UPI'] as const;

// ─── Receipt Number Generator ─────────────────────────────────────────────────
function genReceiptNumber(applicationNumber: string | null): string {
  const num = applicationNumber?.replace(/\D/g, '') || Date.now().toString().slice(-6);
  return `REC${new Date().getFullYear()}${num.padStart(6, '0')}`;
}

// ─── PDF Receipt Generator ────────────────────────────────────────────────────
interface ReceiptOpts {
  studentName: string;
  studentId: string;
  email: string;
  phone: string;
  applicationId: string;
  courseName: string;
  courseDuration: string;
  amountPaid: string;
  paymentMethod: string;
  paymentId: string;
  transactionId: string;
  paymentDate: string;
  paymentTime: string;
  receiptNumber: string;
}

function generateReceiptPDF(opts: ReceiptOpts) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 52, 'F');

  // Accent stripe
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 52, W, 3, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('TATTI', W / 2, 18, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 185, 210);
  doc.text('Tamil Nadu Advanced Technical Training Institute', W / 2, 26, { align: 'center' });
  doc.text('Chennai, Tamil Nadu  |  www.tatti.edu.in  |  info@tatti.edu.in', W / 2, 32, { align: 'center' });
  doc.text('+91-44-1234-5678', W / 2, 38, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('PAYMENT RECEIPT', W / 2, 47, { align: 'center' });

  // PAID badge
  doc.setFillColor(220, 252, 231);
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(14, 59, 38, 12, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('✓  PAID', 22, 67);

  // Receipt number & date (top right)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 90);
  doc.text(`Receipt No: ${opts.receiptNumber}`, W - 14, 63, { align: 'right' });
  doc.text(`${opts.paymentDate}  ${opts.paymentTime}`, W - 14, 69, { align: 'right' });

  let y = 82;

  const sectionTitle = (title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 4, W - 28, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(99, 102, 241);
    doc.text(title, 17, y + 1);
    y += 9;
  };

  const row = (label: string, value: string, isStatus = false) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 130);
    doc.text(label, 17, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isStatus ? 22 : 30, isStatus ? 163 : 30, isStatus ? 74 : 50);
    doc.text(value || '—', 95, y);
    y += 6;
  };

  const divider = () => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, y, W - 14, y);
    y += 6;
  };

  // Student
  sectionTitle('STUDENT INFORMATION');
  row('Student Name', opts.studentName);
  row('Student ID', opts.studentId);
  row('Email', opts.email);
  row('Phone', opts.phone);
  y += 2; divider();

  // Application
  sectionTitle('APPLICATION INFORMATION');
  row('Application ID', opts.applicationId);
  row('Course', opts.courseName);
  row('Duration', opts.courseDuration);
  y += 2; divider();

  // Payment
  sectionTitle('PAYMENT INFORMATION');
  row('Payment Method', opts.paymentMethod);
  row('Payment ID', opts.paymentId);
  row('Transaction ID', opts.transactionId);
  row('Payment Date', opts.paymentDate);
  row('Payment Time', opts.paymentTime);
  row('Payment Status', 'PAID', true);
  y += 4;

  // Total bar
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, W - 28, 16, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 170, 200);
  doc.text('Total Amount Paid', 19, y + 10);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(167, 139, 250);
  doc.text(opts.amountPaid, W - 18, y + 10, { align: 'right' });
  y += 22;

  // Verified note
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(14, y, W - 28, 12, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('✓  Payment verified and confirmed. This is an official receipt.', W / 2, y + 7.5, { align: 'center' });
  y += 18;

  // Footer
  doc.setFillColor(248, 250, 252);
  doc.rect(0, y, W, 35, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 140, 160);
  doc.text('This is a computer-generated receipt and does not require a physical signature.', W / 2, y + 9, { align: 'center' });
  doc.text('For any queries, contact: info@tatti.edu.in  |  +91-44-1234-5678', W / 2, y + 16, { align: 'center' });
  doc.text('TATTI – Tamil Nadu Advanced Technical Training Institute, Chennai, Tamil Nadu', W / 2, y + 23, { align: 'center' });

  return doc;
}

// ─── Payment Success View ─────────────────────────────────────────────────────
interface PaymentSuccessViewProps {
  form: { full_name: string; student_id_text: string; email: string; phone: string };
  application: Application | null;
  payment: Payment;
  selectedCourse: Course | null;
  onNavigateDashboard: () => void;
  onViewApplication: () => void;
}

function PaymentSuccessView({ form, application, payment, selectedCourse, onNavigateDashboard }: PaymentSuccessViewProps) {
  const receiptNumber = genReceiptNumber(application?.application_number ?? null);
  const paidAt = payment.paid_at ? new Date(payment.paid_at) : new Date();
  const paymentDate = format(paidAt, 'dd MMMM yyyy');
  const paymentTime = format(paidAt, 'hh:mm a');

  const receiptOpts: ReceiptOpts = {
    studentName: form.full_name || '—',
    studentId: form.student_id_text || 'N/A',
    email: form.email || '—',
    phone: form.phone || '—',
    applicationId: application?.application_number || 'N/A',
    courseName: selectedCourse?.course_name || 'N/A',
    courseDuration: selectedCourse?.duration || 'N/A',
    amountPaid: `₹${selectedCourse?.fee.toLocaleString() || '0'}`,
    paymentMethod: payment.payment_method || 'N/A',
    paymentId: payment.payment_id || 'N/A',
    transactionId: payment.transaction_id || 'N/A',
    paymentDate,
    paymentTime,
    receiptNumber,
  };

  const handleDownload = () => {
    const doc = generateReceiptPDF(receiptOpts);
    doc.save(`TATTI_Receipt_${application?.application_number || receiptNumber}.pdf`);
    toast.success('Receipt downloaded!');
  };

  const handleViewReceipt = () => {
    const doc = generateReceiptPDF(receiptOpts);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const details = [
    { icon: User, label: 'Student Name', value: form.full_name || '—' },
    { icon: Hash, label: 'Student ID', value: form.student_id_text || 'N/A' },
    { icon: FileText, label: 'Application ID', value: application?.application_number || 'N/A' },
    { icon: GraduationCap, label: 'Course Name', value: selectedCourse?.course_name || 'N/A' },
    { icon: Clock, label: 'Course Duration', value: selectedCourse?.duration || 'N/A' },
    { icon: Banknote, label: 'Amount Paid', value: `₹${selectedCourse?.fee.toLocaleString() || '0'}`, highlight: true },
    { icon: CreditCard, label: 'Payment Method', value: payment.payment_method || 'N/A' },
    { icon: Hash, label: 'Payment ID', value: payment.payment_id || 'N/A' },
    { icon: Hash, label: 'Transaction ID / Order ID', value: payment.transaction_id || 'N/A' },
    { icon: CalendarDays, label: 'Payment Date', value: paymentDate },
    { icon: Clock, label: 'Payment Time', value: paymentTime },
    { icon: BadgeCheck, label: 'Payment Status', value: 'PAID', isStatus: true },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Success Banner ── */}
      <div className="glass-card rounded-2xl p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-72 h-72 rounded-full border border-success/8" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-52 h-52 rounded-full border border-success/12" />
          </div>
        </div>
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-success/30 to-emerald-600/20 flex items-center justify-center mx-auto mb-5 ring-4 ring-success/20">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Payment Successful</h1>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/15 border border-success/30 mb-4">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-success text-xs font-bold tracking-widest">PAYMENT CONFIRMED</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
            Your payment has been successfully completed and your application has been submitted.
          </p>
        </div>
      </div>

      {/* ── Status Badges ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Payment Status</p>
            <p className="text-sm font-bold text-success">PAID</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Application Status</p>
            <p className="text-sm font-bold text-primary">SUBMITTED</p>
          </div>
        </div>
      </div>

      {/* ── Payment Details Card ── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Payment Details</h2>
            <p className="text-xs text-muted-foreground">Verified transaction information</p>
          </div>
        </div>
        <div className="p-6 space-y-0">
          {details.map(({ icon: Icon, label, value, highlight, isStatus }, i) => (
            <div key={label}>
              <div className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                {isStatus ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/15 border border-success/30 text-success text-xs font-bold">
                    <BadgeCheck className="w-3.5 h-3.5" /> {value}
                  </span>
                ) : (
                  <span className={`text-sm font-semibold text-right truncate max-w-[55%] ${highlight ? 'text-xl gradient-text' : 'text-foreground'}`}>
                    {value}
                  </span>
                )}
              </div>
              {i < details.length - 1 && <div className="border-b border-border/40" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Receipt Section ── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Payment Receipt</h2>
            <p className="text-xs text-muted-foreground">Receipt No: {receiptNumber}</p>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Receipt Generated</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your payment receipt is ready. Download it for your records or view it online.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex items-center justify-center gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
            >
              <Download className="w-4 h-4" /> Download Receipt
            </Button>
            <Button
              onClick={handleViewReceipt}
              variant="outline"
              className="flex items-center justify-center gap-2 border-indigo-400/40 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-400"
            >
              <Eye className="w-4 h-4" /> View Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-success/10 border border-success/20">
          <Shield className="w-4 h-4 text-success shrink-0" />
          <p className="text-xs text-success">🔒 Payment verified and secured. Application submitted successfully.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex-1 border-border hover:border-primary/40"
          >
            <FileText className="w-4 h-4 mr-2" /> View Application
          </Button>
          <Button
            onClick={onNavigateDashboard}
            className="flex-1 gradient-bg border-0 text-white font-semibold"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ApplicationProcess() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'UPI'>('UPI');
  const [upiSubMethod, setUpiSubMethod] = useState<'upi_app' | 'upi_qr' | 'upi_id'>('upi_app');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');
  const [upiIdInput, setUpiIdInput] = useState('');
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [form, setForm] = useState({
    full_name: '', student_id_text: '', email: '', phone: '',
    date_of_birth: '', address: '', city: '', state: '', pincode: ''
  });

  useEffect(() => {
    if (!profile) return;
    (async () => {
      let s = await getStudentByProfileId(profile.id);
      if (!s) s = await createStudent({ profile_id: profile.id, email: profile.email, full_name: profile.full_name });
      setStudent(s);
      if (s) {
        const access = getApplicationAccess(s.id);
        setIsUnlocked(access.status === 'unlocked');

        setForm({
          full_name: s.full_name || profile.full_name || '',
          student_id_text: s.student_id || '',
          email: s.email || profile.email || '',
          phone: s.phone || '',
          date_of_birth: s.date_of_birth || '',
          address: s.address || '',
          city: s.city || '',
          state: s.state || '',
          pincode: s.pincode || '',
        });
        const [recs, allCourses, existingApp, existingPay] = await Promise.all([
          getStudentRecommendations(s.id),
          getAllCourses(),
          getStudentApplication(s.id),
          getStudentPayment(s.id),
        ]);
        setCourses(allCourses.filter(c => c.status === 'available'));
        const selRec = recs.find(r => r.is_selected);
        if (selRec) {
          const course = allCourses.find(c => c.id === selRec.course_id);
          setSelectedCourse(course || null);
        }
        if (existingApp) {
          setApplication(existingApp);
          if (existingApp.course_id) {
            const c = allCourses.find(c => c.id === existingApp.course_id);
            if (c) setSelectedCourse(c);
          }
        }
        if (existingPay?.status === 'paid') {
          setPayment(existingPay);
          setStep(4);
        } else if (existingApp?.step) {
          setStep((Math.min(existingApp.step, 3)) as Step);
        }
      }
      setLoading(false);
    })();
  }, [profile]);

  // Real-time access listener
  useEffect(() => {
    if (!student) return;
    const handleAccess = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.studentId || detail.studentId === student.id) {
        setIsUnlocked(detail?.status === 'unlocked');
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tatti_application_access_records') {
        const access = getApplicationAccess(student.id);
        setIsUnlocked(access.status === 'unlocked');
      }
    };
    window.addEventListener('tatti_application_access_changed', handleAccess);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('tatti_application_access_changed', handleAccess);
      window.removeEventListener('storage', handleStorage);
    };
  }, [student]);

  const handleStep1 = async () => {
    if (!form.full_name || !form.email || !form.phone) { toast.error('Please fill in required fields'); return; }
    setSaving(true);
    if (student) {
      await updateStudent(student.id, {
        full_name: form.full_name, email: form.email, phone: form.phone,
        date_of_birth: form.date_of_birth || null, address: form.address,
        city: form.city, state: form.state, pincode: form.pincode,
        student_id: form.student_id_text || null,
        application_status: 'in_progress',
      });
    }
    setSaving(false);
    setStep(2);
  };

  const handleStep2 = async () => {
    if (!selectedCourse) { toast.error('No course selected. Please select a course from Career Fit Assessment recommendations.'); return; }
    setSaving(true);
    if (student) {
      let app = application;
      if (!app) {
        app = await upsertApplication({ student_id: student.id, course_id: selectedCourse.id, status: 'in_progress', step: 2 });
      } else {
        app = await upsertApplication({ ...app, course_id: selectedCourse.id, step: 2 });
      }
      setApplication(app);
    }
    setSaving(false);
    setStep(3);
  };

  const handlePayment = async () => {
    if (!student || !application || !selectedCourse) { toast.error('Application not complete'); return; }
    if (upiSubMethod === 'upi_id' && (!upiIdInput.trim() || !upiIdInput.includes('@'))) {
      toast.error('Please enter a valid UPI ID / VPA (e.g. yourname@okaxis, 9876543210@paytm)');
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 2000));
    const upiDescriptor = upiSubMethod === 'upi_app'
      ? `UPI (${selectedUpiApp.toUpperCase()})`
      : upiSubMethod === 'upi_qr'
      ? 'UPI (QR Code)'
      : `UPI (${upiIdInput.trim()})`;
    const pay = await createPayment({
      application_id: application.id,
      student_id: student.id,
      amount: selectedCourse.fee,
      payment_method: 'UPI',
      status: 'paid',
      paid_at: new Date().toISOString(),
    });
    await upsertApplication({ ...application, status: 'submitted', step: 4, submitted_at: new Date().toISOString() });
    await updateStudent(student.id, { payment_status: 'paid', application_status: 'submitted' });
    setPayment(pay);
    setSaving(false);
    setStep(4);
    toast.success(`UPI Payment of ₹${selectedCourse.fee.toLocaleString()} verified! Application submitted.`);
  };

  const steps = [
    { n: 1, label: 'Personal Details', icon: User },
    { n: 2, label: 'Course Selection', icon: BookOpen },
    { n: 3, label: 'Payment', icon: CreditCard },
    { n: 4, label: 'Confirmation', icon: CheckCircle2 },
  ];

  if (loading) return (
    <StudentLayout>
      <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
    </StudentLayout>
  );

  // 🔒 LOCKED STATE: When Admin has not unlocked Application Process
  if (!isUnlocked) {
    return (
      <StudentLayout>
        <div className="max-w-xl mx-auto py-10 px-4 animate-fade-in">
          <div className="glass-card rounded-2xl p-8 md:p-10 text-center relative overflow-hidden border border-border shadow-2xl">
            {/* Ambient subtle glow */}
            <div className="absolute top-0 right-0 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Lock Icon Badge */}
            <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 ring-4 ring-amber-500/10">
              <Lock className="w-10 h-10 text-amber-400" />
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 mb-4">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 text-xs font-bold tracking-wider uppercase">
                Application Process Locked
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">
              Application Process Locked
            </h1>

            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-2 leading-relaxed">
              Your application process has not been unlocked yet.
            </p>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 font-medium">
              Please wait for TATTI Admin to enable your application.
            </p>

            {/* Access details card */}
            <div className="bg-muted/50 rounded-xl p-5 border border-border text-left mb-8 space-y-3">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                <span className="text-muted-foreground font-medium">Application Status:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                <span className="text-muted-foreground font-medium">Access:</span>
                <span className="font-semibold text-muted-foreground">Not yet available</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="text-muted-foreground font-medium">Next Step:</span>
                <span className="font-medium text-foreground">Admin review & verification</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/student/assessment')}
                className="border-border hover:border-primary/40 text-xs"
              >
                View Career Fit Assessment
              </Button>
              <Button
                onClick={() => navigate('/student/dashboard')}
                className="gradient-bg border-0 text-white text-xs font-semibold shadow-md"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Payment already completed — show success view
  if (step === 4 && payment) {
    return (
      <StudentLayout>
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          {/* All-complete stepper */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              {steps.map(({ n, label }, idx) => (
                <div key={n} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 bg-primary border-primary">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] font-medium whitespace-nowrap hidden md:block text-foreground">{label}</span>
                  </div>
                  {idx < steps.length - 1 && <div className="flex-1 h-0.5 mx-2 mb-4 bg-primary" />}
                </div>
              ))}
            </div>
          </div>

          <PaymentSuccessView
            form={form}
            application={application}
            payment={payment}
            selectedCourse={selectedCourse}
            onNavigateDashboard={() => navigate('/student/dashboard')}
            onViewApplication={() => {/* stays on same page */ }}
          />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Stepper */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            {steps.map(({ n, label, icon: Icon }, idx) => (
              <div key={n} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    step > n ? 'bg-primary border-primary' : step === n ? 'border-primary bg-primary/10' : 'border-border bg-muted'
                  }`}>
                    {step > n ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Icon className={`w-4 h-4 ${step === n ? 'text-primary' : 'text-muted-foreground'}`} />}
                  </div>
                  <span className={`text-[10px] font-medium whitespace-nowrap hidden md:block ${step >= n ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                </div>
                {idx < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${step > n ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'full_name', label: 'Full Name *', placeholder: 'Enter your full name' },
                { id: 'student_id_text', label: 'Student ID', placeholder: 'Enter student ID' },
                { id: 'email', label: 'Email *', placeholder: 'Enter your email' },
                { id: 'phone', label: 'Phone Number *', placeholder: 'Enter phone number' },
                { id: 'date_of_birth', label: 'Date of Birth', placeholder: '', type: 'date' },
                { id: 'pincode', label: 'Pincode', placeholder: 'Enter pincode' },
              ].map(({ id, label, placeholder, type }) => (
                <div key={id}>
                  <Label className="text-sm">{label}</Label>
                  <Input type={type || 'text'} placeholder={placeholder}
                    value={(form as Record<string, string>)[id]} onChange={e => setForm(p => ({ ...p, [id]: e.target.value }))}
                    className="mt-1 bg-input border-border" />
                </div>
              ))}
              <div className="md:col-span-2">
                <Label className="text-sm">Address</Label>
                <Input placeholder="Street address" value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-sm">City</Label>
                <Input placeholder="City" value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-sm">State</Label>
                <Input placeholder="State" value={form.state}
                  onChange={e => setForm(p => ({ ...p, state: e.target.value }))} className="mt-1 bg-input border-border" />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={handleStep1} disabled={saving} className="gradient-bg border-0 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Course Selection */}
        {step === 2 && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Selected Course</h2>
            {selectedCourse ? (
              <div className="bg-muted rounded-xl p-5 mb-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-bold text-foreground">{selectedCourse.course_name}</h3>
                  <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full shrink-0">Selected</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{selectedCourse.description}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Duration', value: selectedCourse.duration },
                    { label: 'Category', value: selectedCourse.category },
                    { label: 'Eligibility', value: selectedCourse.eligibility },
                    { label: 'Available Seats', value: selectedCourse.available_seats?.toString() },
                  ].filter(i => i.value).map(({ label, value }) => (
                    <div key={label} className="bg-background rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border mt-4 pt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Course Fee</span>
                  <span className="text-xl font-bold gradient-text">₹{selectedCourse.fee.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No course selected. Please select a course from your Career Fit Assessment recommendations.</p>
                <Button onClick={() => navigate('/student/assessment?tab=recommendations')} variant="outline" className="mt-3" size="sm">Go to Career Fit Assessment</Button>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleStep2} disabled={saving || !selectedCourse} className="flex-1 gradient-bg border-0 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Continue to Payment <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment (UPI Exclusive) */}
        {step === 3 && selectedCourse && (
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">UPI Payment Gateway</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Pay securely using Unified Payments Interface (UPI)</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                <BadgeCheck className="w-3.5 h-3.5" /> Official UPI Gateway
              </span>
            </div>

            {/* Fee Summary Banner */}
            <div className="text-center p-4 bg-muted/60 rounded-xl mb-6 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Total Payable Amount</p>
              <p className="text-3xl font-extrabold gradient-text">₹{selectedCourse.fee.toLocaleString()}</p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-background border border-border text-xs text-foreground font-medium">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>{selectedCourse.course_name}</span>
              </div>
            </div>

            {/* UPI Option Selector Tabs */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground tracking-wide uppercase">Select UPI Option</Label>
                <span className="text-[11px] text-emerald-500 font-medium">Zero Gateway Charges</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upi_app' as const, label: 'UPI Apps', icon: Smartphone, desc: 'GPay, PhonePe, Paytm' },
                  { id: 'upi_qr' as const, label: 'Scan QR Code', icon: QrCode, desc: 'Scan & Pay Instantly' },
                  { id: 'upi_id' as const, label: 'UPI ID / VPA', icon: AtSign, desc: 'Enter your UPI ID' },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setUpiSubMethod(id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      upiSubMethod === id
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20 text-foreground font-semibold shadow-sm'
                        : 'border-border bg-card/50 hover:border-border/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${upiSubMethod === id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>

              {/* Sub-view: UPI Apps */}
              {upiSubMethod === 'upi_app' && (
                <div className="p-4 rounded-xl bg-card border border-border space-y-3 animate-fade-in">
                  <p className="text-xs text-muted-foreground">Select your preferred UPI application to complete payment:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'gpay' as const, name: 'Google Pay', color: 'border-blue-500/40 hover:bg-blue-500/10', logoText: 'GPay' },
                      { id: 'phonepe' as const, name: 'PhonePe', color: 'border-purple-500/40 hover:bg-purple-500/10', logoText: 'PhonePe' },
                      { id: 'paytm' as const, name: 'Paytm UPI', color: 'border-cyan-500/40 hover:bg-cyan-500/10', logoText: 'Paytm' },
                      { id: 'bhim' as const, name: 'BHIM UPI', color: 'border-emerald-500/40 hover:bg-emerald-500/10', logoText: 'BHIM' },
                    ].map(app => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSelectedUpiApp(app.id)}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                          selectedUpiApp === app.id
                            ? 'border-primary bg-primary/15 ring-2 ring-primary/30'
                            : `border-border bg-muted/40 ${app.color}`
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center font-bold text-[11px] text-foreground shadow-xs">
                          {app.logoText}
                        </div>
                        <span className="text-xs font-semibold text-foreground">{app.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Clicking "Proceed to Pay" will trigger UPI checkout via <span className="font-semibold text-foreground">{selectedUpiApp.toUpperCase()}</span>.
                  </p>
                </div>
              )}

              {/* Sub-view: Scan QR Code */}
              {upiSubMethod === 'upi_qr' && (
                <div className="p-5 rounded-xl bg-card border border-border text-center space-y-4 animate-fade-in">
                  <div className="inline-block p-4 bg-white rounded-2xl shadow-md border border-slate-200">
                    {/* Visual QR Code Representation */}
                    <svg className="w-44 h-44 mx-auto" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="160" height="160" fill="white" rx="10" />
                      {/* Corner 1 */}
                      <rect x="12" y="12" width="40" height="40" rx="4" fill="#0f172a" />
                      <rect x="18" y="18" width="28" height="28" rx="2" fill="white" />
                      <rect x="24" y="24" width="16" height="16" rx="2" fill="#6366f1" />
                      {/* Corner 2 */}
                      <rect x="108" y="12" width="40" height="40" rx="4" fill="#0f172a" />
                      <rect x="114" y="18" width="28" height="28" rx="2" fill="white" />
                      <rect x="120" y="24" width="16" height="16" rx="2" fill="#6366f1" />
                      {/* Corner 3 */}
                      <rect x="12" y="108" width="40" height="40" rx="4" fill="#0f172a" />
                      <rect x="18" y="114" width="28" height="28" rx="2" fill="white" />
                      <rect x="24" y="120" width="16" height="16" rx="2" fill="#6366f1" />
                      {/* QR matrix dots */}
                      <rect x="60" y="16" width="8" height="8" fill="#1e293b" rx="1" />
                      <rect x="76" y="16" width="8" height="16" fill="#1e293b" rx="1" />
                      <rect x="92" y="20" width="8" height="8" fill="#6366f1" rx="1" />
                      <rect x="60" y="32" width="16" height="8" fill="#1e293b" rx="1" />
                      <rect x="84" y="36" width="8" height="16" fill="#1e293b" rx="1" />
                      <rect x="16" y="60" width="16" height="8" fill="#1e293b" rx="1" />
                      <rect x="40" y="64" width="8" height="16" fill="#1e293b" rx="1" />
                      <rect x="56" y="56" width="16" height="16" fill="#6366f1" rx="2" />
                      <rect x="80" y="60" width="24" height="8" fill="#1e293b" rx="1" />
                      <rect x="112" y="64" width="16" height="8" fill="#1e293b" rx="1" />
                      <rect x="136" y="60" width="12" height="16" fill="#1e293b" rx="1" />
                      <rect x="20" y="84" width="8" height="16" fill="#1e293b" rx="1" />
                      <rect x="36" y="88" width="16" height="8" fill="#1e293b" rx="1" />
                      <rect x="60" y="80" width="8" height="20" fill="#1e293b" rx="1" />
                      <rect x="76" y="88" width="16" height="8" fill="#6366f1" rx="1" />
                      <rect x="100" y="80" width="16" height="16" fill="#1e293b" rx="1" />
                      <rect x="124" y="84" width="12" height="8" fill="#1e293b" rx="1" />
                      <rect x="60" y="112" width="16" height="12" fill="#1e293b" rx="1" />
                      <rect x="84" y="108" width="8" height="16" fill="#6366f1" rx="1" />
                      <rect x="100" y="116" width="16" height="8" fill="#1e293b" rx="1" />
                      <rect x="124" y="108" width="16" height="16" fill="#1e293b" rx="1" />
                      <rect x="64" y="132" width="12" height="16" fill="#1e293b" rx="1" />
                      <rect x="84" y="136" width="20" height="8" fill="#1e293b" rx="1" />
                      <rect x="112" y="132" width="8" height="16" fill="#6366f1" rx="1" />
                      <rect x="128" y="136" width="20" height="8" fill="#1e293b" rx="1" />
                      {/* TATTI Center Stamp */}
                      <circle cx="80" cy="80" r="14" fill="#0f172a" />
                      <text x="80" y="83" fill="white" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">TATTI</text>
                    </svg>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">Scan with Any UPI App</p>
                    <p className="text-[11px] text-muted-foreground">Google Pay, PhonePe, Paytm, BHIM, CRED, Amazon Pay</p>
                  </div>

                  {/* Merchant VPA & Copy */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs">
                    <span className="text-muted-foreground font-mono">UPI ID: <strong className="text-foreground">tatti.admissions@icici</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('tatti.admissions@icici');
                        setCopiedVpa(true);
                        setTimeout(() => setCopiedVpa(false), 2000);
                        toast.success('UPI ID copied to clipboard');
                      }}
                      className="p-1 hover:text-primary transition-colors"
                      title="Copy UPI ID"
                    >
                      {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-view: UPI ID / VPA */}
              {upiSubMethod === 'upi_id' && (
                <div className="p-4 rounded-xl bg-card border border-border space-y-3 animate-fade-in">
                  <Label className="text-xs font-medium text-foreground">Enter your Virtual Payment Address (UPI ID)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. mobileNumber@upi or name@okaxis"
                      value={upiIdInput}
                      onChange={e => setUpiIdInput(e.target.value)}
                      className="bg-input border-border text-xs sm:text-sm font-mono"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    <span>Common handles:</span>
                    {['@okaxis', '@okhdfcbank', '@okicici', '@ybl', '@paytm'].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          const base = upiIdInput.includes('@') ? upiIdInput.split('@')[0] : upiIdInput;
                          setUpiIdInput(base ? `${base}${h}` : `student${h}`);
                        }}
                        className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground text-[10px] font-mono border border-border"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Security Guarantee */}
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 mb-5">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                🔒 100% Encrypted UPI Payment via NPCI (National Payments Corporation of India). Instant receipt generated upon payment.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handlePayment} disabled={saving} className="flex-1 gradient-bg border-0 text-white font-semibold">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Verifying UPI Payment...
                  </>
                ) : (
                  `Proceed to Pay ₹${selectedCourse.fee.toLocaleString()} via UPI`
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
