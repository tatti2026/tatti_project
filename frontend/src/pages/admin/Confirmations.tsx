import { useEffect, useState, useRef } from 'react';
import TablePagination, { getSessionPageSize, setSessionPageSize } from '@/components/common/TablePagination';
import {
  getAllStudents,
  getAllPayments,
  getPendingPayments,
  getRejectedPayments,
  getPaymentDetails,
  approvePayment,
  rejectPayment,
  getPaymentScreenshotUrl,
  type PendingPayment,
  type RejectedPayment,
  type PaymentDetails,
} from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Student, Payment } from '@/types/index';
import {
  Download, Eye, CheckCircle2, XCircle, Search, Loader2,
  ChevronDown, FileSpreadsheet, FileText, AlertCircle, Clock,
  CreditCard, User, BookOpen, ShieldCheck, ZoomIn, Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

export default function Confirmations() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [rejectedPayments, setRejectedPayments] = useState<RejectedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [pendingPage, setPendingPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);
  const [paidPage, setPaidPage] = useState(1);
  const [yettopayPage, setYettopayPage] = useState(1);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);
  const [rejectedTotalPages, setRejectedTotalPages] = useState(1);
  const [paidTotalPages, setPaidTotalPages] = useState(1);
  const [yettopayTotalPages, setYettopayTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Pagination states (persisted in current session)
  const [pageSize, setPageSize] = useState(() => getSessionPageSize('confirmations', 10));
  const [pagePending, setPagePending] = useState(1);
  const [pagePaid, setPagePaid] = useState(1);
  const [pageYettoPay, setPageYettoPay] = useState(1);
  const [pageRejected, setPageRejected] = useState(1);

  // View Payment Modal State
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [enlargedScreenshotUrl, setEnlargedScreenshotUrl] = useState<string | null>(null);

  // Approve Dialog State
  const [paymentToApprove, setPaymentToApprove] = useState<PendingPayment | PaymentDetails | null>(null);
  const [approving, setApproving] = useState(false);

  // Reject Dialog State
  const [paymentToReject, setPaymentToReject] = useState<PendingPayment | PaymentDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const loadData = async () => {
    try {
      const [{ data }, { data: pays }, pending, rejected] = await Promise.all([
        getAllStudents(0, 1000),
        getAllPayments(0, 1000),
        getPendingPayments(),
        getRejectedPayments(),
      ]);
      setStudents(data);
      setPayments(pays);
      setPendingPayments(pending);
      setRejectedPayments(rejected);
    } catch (err) {
      console.error('Failed to load confirmations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close export menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch full details when selectedPaymentId changes
  useEffect(() => {
    if (!selectedPaymentId) {
      setPaymentDetails(null);
      return;
    }
    setLoadingDetails(true);
    getPaymentDetails(selectedPaymentId)
      .then(res => setPaymentDetails(res))
      .catch(err => {
        console.error('Failed to fetch payment details:', err);
        toast.error('Failed to load payment details');
      })
      .finally(() => setLoadingDetails(false));
  }, [selectedPaymentId]);

  const getStudentPayment = (studentId: string) => payments.find(p => p.student_id === studentId);

  const paid = students.filter(s => s.payment_status === 'paid' || s.payment_status === 'Approved');
  const yetToPay = students.filter(
    s => s.payment_status === 'unpaid' && s.application_status !== 'not_started'
  );

  const filterStudents = (list: Student[]) =>
    list.filter(
      s =>
        !search ||
        (s.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.student_id || '').toLowerCase().includes(search.toLowerCase())
    );

  const filterPending = (list: PendingPayment[]) =>
    list.filter(
      p =>
        !search ||
        (p.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.student_email || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.utr_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.course_name || '').toLowerCase().includes(search.toLowerCase())
    );

  const filterRejected = (list: RejectedPayment[]) =>
    list.filter(
      p =>
        !search ||
        (p.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.student_email || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.utr_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.course_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.rejection_reason || '').toLowerCase().includes(search.toLowerCase())
    );

  const downloadReceipt = (s: Student) => {
    const pay = getStudentPayment(s.id);
    const content = [
      'TATTI - Payment Receipt',
      '=======================',
      `Student Name: ${s.full_name || 'N/A'}`,
      `Email: ${s.email || 'N/A'}`,
      `Payment ID: ${pay?.payment_id || 'N/A'}`,
      `Transaction ID / UTR: ${pay?.utr_number || pay?.transaction_id || 'N/A'}`,
      `Amount: ₹${pay?.amount?.toLocaleString() || 'N/A'}`,
      `Method: ${pay?.payment_method || 'UPI'}`,
      `Date: ${pay?.paid_at ? format(new Date(pay.paid_at), 'dd MMM yyyy') : 'N/A'}`,
      `Status: PAID / APPROVED`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${s.full_name || s.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export all paid students to Excel (.xlsx)
  const handleDownloadExcel = () => {
    setShowExportMenu(false);
    const headers = ['Student Name', 'Email', 'Phone', 'Application Status', 'Payment Status', 'Amount', 'Method', 'Date'];
    const rows = paid.map(s => {
      const pay = getStudentPayment(s.id);
      return [
        s.full_name || '',
        s.email || '',
        s.phone || '',
        s.application_status || '',
        s.payment_status || '',
        pay ? `₹${pay.amount.toLocaleString()}` : '',
        pay?.payment_method || '',
        pay?.paid_at ? format(new Date(pay.paid_at), 'dd MMM yyyy') : '',
      ];
    });
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tatti_confirmations_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as Excel (.xlsx)');
  };

  // Export all paid students to PDF (.pdf) using jsPDF
  const handleDownloadPDF = () => {
    setShowExportMenu(false);
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Tamil Nadu Advanced Technical Training Institute (TATTI)', 14, 18);
      doc.setFontSize(12);
      doc.text(`Payment Confirmations Report - ${format(new Date(), 'dd MMM yyyy')}`, 14, 26);
      doc.setFontSize(9);
      doc.text(`Total Paid Records: ${paid.length}`, 14, 33);

      let y = 42;
      doc.setFont('helvetica', 'bold');
      doc.text('Student Name', 14, y);
      doc.text('Email', 65, y);
      doc.text('Phone', 120, y);
      doc.text('Amount', 155, y);
      doc.text('Date', 180, y);
      doc.line(14, y + 2, 196, y + 2);
      y += 8;

      doc.setFont('helvetica', 'normal');
      paid.forEach((s) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        const pay = getStudentPayment(s.id);
        doc.text((s.full_name || '-').substring(0, 24), 14, y);
        doc.text((s.email || '-').substring(0, 26), 65, y);
        doc.text(s.phone || '-', 120, y);
        doc.text(pay ? `Rs.${pay.amount}` : '-', 155, y);
        doc.text(pay?.paid_at ? format(new Date(pay.paid_at), 'dd/MM/yy') : '-', 180, y);
        y += 6;
      });

      doc.save(`tatti_confirmations_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('Downloaded as PDF (.pdf)');
    } catch {
      toast.error('Could not generate PDF');
    }
  };

  // Execute Payment Approval inside transaction
  const handleConfirmApprove = async () => {
    if (!paymentToApprove) return;
    setApproving(true);
    try {
      await approvePayment(paymentToApprove.id);
      toast.success('Payment approved! Student application confirmed and notification dispatched.');
      setPaymentToApprove(null);
      setSelectedPaymentId(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve payment');
    } finally {
      setApproving(false);
    }
  };

  // Execute Payment Rejection inside transaction
  const handleConfirmReject = async () => {
    if (!paymentToReject) return;
    if (!rejectionReason.trim()) {
      toast.error('Please enter a reason for rejection');
      return;
    }
    setRejecting(true);
    try {
      await rejectPayment(paymentToReject.id, rejectionReason.trim());
      toast.success('Payment rejected successfully. The student has been notified.');
      setPaymentToReject(null);
      setRejectionReason('');
      setSelectedPaymentId(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject payment');
    } finally {
      setRejecting(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const StudentTable = ({ list, showPayment = false }: { list: Student[]; showPayment?: boolean }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            {['Student', 'Email', 'Phone', 'Application', 'Payment Status', ...(showPayment ? ['Amount', 'Method', 'Date'] : []), 'Actions'].map(h => (
              <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={10} className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
          ) : list.length === 0 ? (
            <tr><td colSpan={10} className="py-8 text-center text-muted-foreground text-sm">No records found</td></tr>
          ) : filterStudents(list).map(s => {
            const pay = getStudentPayment(s.id);
            return (
              <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-3 py-3 whitespace-nowrap font-medium text-foreground text-xs">{s.full_name || '-'}</td>
                <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">{s.email || '-'}</td>
                <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">{s.phone || '-'}</td>
                <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={s.application_status} /></td>
                <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={s.payment_status} /></td>
                {showPayment && <>
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-semibold text-foreground">
                    {pay ? `₹${pay.amount?.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">{pay?.payment_method || '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                    {pay?.paid_at ? format(new Date(pay.paid_at), 'dd MMM yy') : '-'}
                  </td>
                </>}
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewStudent(s)} title="View Student">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {showPayment && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadReceipt(s)} title="Download Receipt">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Confirmations & Payment Verification</h1>
            <p className="text-muted-foreground text-sm">Review UPI submissions, verify UTR numbers, and confirm student admissions</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students, UTR..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 w-56 bg-input border-border text-xs"
              />
            </div>

            {/* Download dropdown */}
            <div className="relative" ref={exportRef}>
              <Button
                variant="outline"
                className="h-9 px-3 flex items-center gap-1.5 text-xs border-border"
                onClick={() => setShowExportMenu(v => !v)}
              >
                <Download className="w-3.5 h-3.5" />
                Download
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground hover:bg-muted/60 transition-colors"
                    onClick={handleDownloadExcel}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-success" />
                    Download Excel
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground hover:bg-muted/60 transition-colors"
                    onClick={handleDownloadPDF}
                  >
                    <FileText className="w-4 h-4 text-destructive" />
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'PENDING VERIFICATION',
              count: pendingPayments.length,
              color: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
              badge: pendingPayments.length > 0 ? 'Action Required' : 'Up to date',
            },
            {
              label: 'PAID & CONFIRMED',
              count: paid.length,
              color: 'border-success/30 bg-success/10 text-success',
              badge: 'Admissions Confirmed',
            },
            {
              label: 'YET TO PAY',
              count: yetToPay.length,
              color: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
              badge: 'In Progress',
            },
            {
              label: 'PAYMENT REJECTED',
              count: rejectedPayments.length,
              color: 'border-destructive/30 bg-destructive/10 text-destructive',
              badge: rejectedPayments.length > 0 ? 'Needs Attention' : 'None',
            },
          ].map(({ label, count, color, badge }) => (
            <div key={label} className={`glass-card rounded-xl p-4 border ${color}`}>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{count}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/50 border border-border">
                  {badge}
                </span>
              </div>
              <p className="text-xs font-semibold mt-1 tracking-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabbed Content */}
        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <Tabs defaultValue="pending">
            <div className="px-4 pt-4 border-b border-border">
              <TabsList className="bg-muted">
                <TabsTrigger value="pending" className="text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Pending Payments ({pendingPayments.length})
                </TabsTrigger>
                <TabsTrigger value="paid" className="text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  Paid ({paid.length})
                </TabsTrigger>
                <TabsTrigger value="yettopay" className="text-xs">
                  Yet to Pay ({yetToPay.length})
                </TabsTrigger>
                <TabsTrigger value="paymentrejected" className="text-xs flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-destructive" />
                  Payment Rejected ({rejectedPayments.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: PENDING PAYMENTS (UPI Verification) */}
            <TabsContent value="pending" className="mt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Selected Course</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Payment Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">UTR / Reference No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Submitted Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Screenshot</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-xs text-muted-foreground mt-2">Loading pending payments...</p>
                        </td>
                      </tr>
                    ) : filterPending(pendingPayments).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <ShieldCheck className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-foreground">No Pending Payments</p>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                            All student UPI payment submissions have been reviewed and verified.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filterPending(pendingPayments).map(p => {
                        const submittedDate = p.submitted_at
                          ? format(new Date(p.submitted_at), 'dd MMM yyyy, hh:mm a')
                          : format(new Date(p.created_at), 'dd MMM yyyy, hh:mm a');

                        return (
                          <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            {/* Student avatar + name */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {p.student_avatar ? (
                                  <img
                                    src={p.student_avatar}
                                    alt={p.student_name || 'Student'}
                                    className="w-9 h-9 rounded-full object-cover border border-border"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">
                                    {getInitials(p.student_name)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-xs text-foreground">{p.student_name || 'Student'}</p>
                                  <p className="text-[11px] text-muted-foreground font-mono">{p.student_code || p.student_email || '—'}</p>
                                </div>
                              </div>
                            </td>

                            {/* Selected Course */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-xs font-medium text-foreground">{p.course_name || 'Course not specified'}</p>
                            </td>

                            {/* Amount */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-xs font-bold text-foreground gradient-text">
                                ₹{p.amount?.toLocaleString()}
                              </span>
                            </td>

                            {/* UTR */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 rounded bg-muted font-mono text-xs font-semibold text-foreground border border-border/60">
                                {p.utr_number || p.transaction_id || '—'}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                              {submittedDate}
                            </td>

                            {/* Screenshot preview button */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {p.screenshot_url ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPaymentId(p.id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors border border-primary/20"
                                >
                                  <Eye className="w-3 h-3" /> View Proof
                                </button>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">None</span>
                              )}
                            </td>

                            {/* Actions: View | Approve | Reject */}
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-xs border-border hover:border-primary/40"
                                  onClick={() => setSelectedPaymentId(p.id)}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
                                  onClick={() => setPaymentToReject(p)}
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                                  onClick={() => setPaymentToApprove(p)}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB 2: PAID */}
            <TabsContent value="paid" className="mt-0">
              <StudentTable list={paid} showPayment />
            </TabsContent>

            {/* TAB 3: YET TO PAY */}
            <TabsContent value="yettopay" className="mt-0">
              <StudentTable list={yetToPay} />
            </TabsContent>

            {/* TAB 4: PAYMENT REJECTED (from real DB) */}
            <TabsContent value="paymentrejected" className="mt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Selected Course</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">UTR / Reference No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Rejected Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Rejected By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Reason</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-xs text-muted-foreground mt-2">Loading rejected payments...</p>
                        </td>
                      </tr>
                    ) : filterRejected(rejectedPayments).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-foreground">No Rejected Payments</p>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                            No payment submissions have been rejected.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filterRejected(rejectedPayments).map(p => {
                        const rejectedDate = p.rejected_at
                          ? format(new Date(p.rejected_at), 'dd MMM yyyy, hh:mm a')
                          : '—';
                        return (
                          <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            {/* Student */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {p.student_avatar ? (
                                  <img src={p.student_avatar} alt={p.student_name || 'Student'} className="w-9 h-9 rounded-full object-cover border border-border" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-destructive/15 text-destructive border border-destructive/30 flex items-center justify-center font-bold text-xs">
                                    {getInitials(p.student_name)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-xs text-foreground">{p.student_name || 'Student'}</p>
                                  <p className="text-[11px] text-muted-foreground font-mono">{p.student_code || p.student_email || '—'}</p>
                                </div>
                              </div>
                            </td>
                            {/* Course */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-xs font-medium text-foreground">{p.course_name || '—'}</p>
                            </td>
                            {/* Amount */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-xs font-bold text-foreground">₹{p.amount?.toLocaleString()}</span>
                            </td>
                            {/* UTR */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 rounded bg-muted font-mono text-xs font-semibold text-foreground border border-border/60">
                                {p.utr_number || p.transaction_id || '—'}
                              </span>
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <StatusBadge status={p.status} />
                            </td>
                            {/* Rejected Date */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{rejectedDate}</td>
                            {/* Rejected By */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{p.rejected_by || 'Admin'}</td>
                            {/* Reason */}
                            <td className="px-4 py-3 max-w-[180px]">
                              {p.rejection_reason ? (
                                <p className="text-xs text-destructive/80 truncate" title={p.rejection_reason}>{p.rejection_reason}</p>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">—</span>
                              )}
                            </td>
                            {/* View */}
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs border-border hover:border-primary/40"
                                onClick={() => setSelectedPaymentId(p.id)}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> View
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── PROFESSIONAL VIEW PAYMENT MODAL ────────────────────────────────────── */}
      <Dialog open={!!selectedPaymentId} onOpenChange={open => !open && setSelectedPaymentId(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Payment Verification Details</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Comprehensive UPI audit record and student credentials</p>
              </div>
              {paymentDetails && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  paymentDetails.status === 'Approved' || paymentDetails.status === 'paid'
                    ? 'bg-success/15 text-success border border-success/30'
                    : paymentDetails.status === 'Rejected' || paymentDetails.status === 'failed'
                    ? 'bg-destructive/15 text-destructive border border-destructive/30'
                    : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                }`}>
                  {paymentDetails.status === 'Rejected' || paymentDetails.status === 'failed'
                    ? <Ban className="w-3.5 h-3.5" />
                    : <Clock className="w-3.5 h-3.5" />
                  }
                  {paymentDetails.status === 'Rejected' || paymentDetails.status === 'failed'
                    ? 'Payment Rejected'
                    : paymentDetails.status}
                </span>
              )}
            </div>
          </DialogHeader>

          {loadingDetails ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground mt-2">Loading verification details...</p>
            </div>
          ) : paymentDetails ? (
            <div className="p-6 space-y-6">
              {/* Section 1: Student Details */}
              <div className="rounded-xl border border-border p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Section 1: Student Details</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Full Name</p>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{paymentDetails.student.full_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Student ID</p>
                    <p className="text-xs font-semibold font-mono text-foreground mt-0.5">{paymentDetails.student.student_id || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Email Address</p>
                    <p className="text-xs font-semibold text-foreground mt-0.5 truncate" title={paymentDetails.student.email || ''}>{paymentDetails.student.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Phone Number</p>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{paymentDetails.student.phone || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Course Details */}
              <div className="rounded-xl border border-border p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Section 2: Course Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Selected Course</p>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{paymentDetails.course.course_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Course Fee</p>
                    <p className="text-xs font-bold gradient-text mt-0.5">
                      ₹{paymentDetails.course.fee?.toLocaleString() || paymentDetails.amount?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Payment Details */}
              <div className="rounded-xl border border-border p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Section 3: Payment Details</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Payment Amount</p>
                    <p className="text-sm font-extrabold text-foreground mt-0.5">₹{paymentDetails.amount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">UTR / Reference Number</p>
                    <p className="text-xs font-bold font-mono text-foreground mt-0.5 px-2 py-0.5 rounded bg-muted border border-border/80 inline-block">
                      {paymentDetails.utr_number || paymentDetails.transaction_id || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Submitted Date & Time</p>
                    <p className="text-xs font-medium text-foreground mt-0.5">
                      {paymentDetails.submitted_at
                        ? format(new Date(paymentDetails.submitted_at), 'dd MMM yyyy, hh:mm a')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Current Payment Status</p>
                    <div className="mt-0.5">
                      <StatusBadge status={paymentDetails.status} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Payment Screenshot */}
              <div className="rounded-xl border border-border p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Section 4: Payment Screenshot</h3>
                  </div>
                  {paymentDetails.screenshot_url && (
                    <span className="text-[11px] text-muted-foreground">Click image to enlarge</span>
                  )}
                </div>

                {paymentDetails.screenshot_url ? (
                  <div className="text-center">
                    <div
                      className="relative inline-block group cursor-pointer border-2 border-border/70 rounded-xl overflow-hidden shadow-md hover:border-primary/50 transition-all bg-background"
                      onClick={() => setEnlargedScreenshotUrl(
                        paymentDetails.screenshot_url?.startsWith('data:')
                          ? paymentDetails.screenshot_url
                          : getPaymentScreenshotUrl(paymentDetails.id, true)
                      )}
                    >
                      <img
                        src={
                          paymentDetails.screenshot_url.startsWith('data:')
                            ? paymentDetails.screenshot_url
                            : getPaymentScreenshotUrl(paymentDetails.id, true)
                        }
                        alt="Payment Proof"
                        className="max-h-60 max-w-full rounded-lg object-contain mx-auto"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                        <ZoomIn className="w-4 h-4" /> Enlarge Screenshot
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center bg-card rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                    <AlertCircle className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    Payment screenshot not available
                  </div>
                )}
              </div>

              {/* Section 5: Action buttons / Audit */}
              <div className="rounded-xl border border-border p-4 bg-muted/30">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Section 5: Verification & Audit</h3>

                {/* For Pending status: Show Approve & Reject buttons */}
                {(paymentDetails.status === 'pending' ||
                  paymentDetails.status === 'Pending' ||
                  paymentDetails.status === 'Pending Verification' ||
                  paymentDetails.status === 'pending_verification') ? (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive text-xs"
                      onClick={() => setPaymentToReject(paymentDetails)}
                    >
                      <XCircle className="w-4 h-4 mr-1.5" /> Reject Payment
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                      onClick={() => setPaymentToApprove(paymentDetails)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Payment
                    </Button>
                  </div>
                ) : paymentDetails.status === 'Approved' || paymentDetails.status === 'paid' ? (
                  <div className="grid grid-cols-3 gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <div>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Payment Status</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">Approved</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Approved Date</p>
                      <p className="text-xs font-medium text-foreground mt-0.5">
                        {paymentDetails.approved_at
                          ? format(new Date(paymentDetails.approved_at), 'dd MMM yyyy, hh:mm a')
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Approved By</p>
                      <p className="text-xs font-medium text-foreground mt-0.5">{paymentDetails.approved_by || 'TATTI Admin'}</p>
                    </div>
                  </div>
                ) : (
                  /* Rejected payment — read-only audit, NO approve/reject action buttons */
                  <div className="space-y-2 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[11px] text-destructive font-semibold">Payment Status</p>
                        <p className="text-xs font-bold text-foreground mt-0.5">Payment Rejected</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-destructive font-semibold">Rejected Date</p>
                        <p className="text-xs font-medium text-foreground mt-0.5">
                          {paymentDetails.rejected_at
                            ? format(new Date(paymentDetails.rejected_at), 'dd MMM yyyy, hh:mm a')
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-destructive font-semibold">Rejected By</p>
                        <p className="text-xs font-medium text-foreground mt-0.5">{paymentDetails.rejected_by || 'TATTI Admin'}</p>
                      </div>
                    </div>
                    {paymentDetails.rejection_reason && (
                      <div className="pt-2 border-t border-destructive/20">
                        <p className="text-[11px] text-destructive font-semibold">Rejection Reason</p>
                        <p className="text-xs text-foreground mt-0.5">{paymentDetails.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── APPROVE CONFIRMATION DIALOG ────────────────────────────────────────── */}
      <Dialog open={!!paymentToApprove} onOpenChange={open => !open && setPaymentToApprove(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Approve this payment?</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-2 py-2">
            <p className="text-xs text-muted-foreground">
              Once approved, this payment will be marked as verified and the student's application will be confirmed.
            </p>
            {paymentToApprove && (
              <div className="mt-3 p-3 rounded-lg bg-muted/60 text-xs text-left space-y-1 font-mono">
                <p><span className="text-muted-foreground font-sans">Student:</span> {(paymentToApprove as any).student_name || (paymentToApprove as any).student?.full_name}</p>
                <p><span className="text-muted-foreground font-sans">Amount:</span> ₹{paymentToApprove.amount?.toLocaleString()}</p>
                <p><span className="text-muted-foreground font-sans">UTR:</span> {paymentToApprove.utr_number || (paymentToApprove as any).transaction_id}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setPaymentToApprove(null)}
              disabled={approving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApprove}
              disabled={approving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {approving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REJECT CONFIRMATION DIALOG ─────────────────────────────────────────── */}
      <Dialog open={!!paymentToReject} onOpenChange={open => !open && setPaymentToReject(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Reject this payment?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground text-center">
              Please specify the reason for rejecting this payment. The student will receive a notification with these details.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason for rejection *</Label>
              <Textarea
                rows={3}
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="bg-input border-border text-xs resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setPaymentToReject(null);
                setRejectionReason('');
              }}
              disabled={rejecting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejecting || !rejectionReason.trim()}
              className="text-xs font-semibold"
            >
              {rejecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ENLARGED SCREENSHOT MODAL ────────────────────────────────────────── */}
      <Dialog open={!!enlargedScreenshotUrl} onOpenChange={open => !open && setEnlargedScreenshotUrl(null)}>
        <DialogContent className="max-w-3xl bg-card border-border p-4">
          <DialogHeader className="flex items-center justify-between pb-2 border-b border-border">
            <DialogTitle className="text-sm font-semibold">Payment Proof Screenshot</DialogTitle>
          </DialogHeader>
          <div className="p-2 flex justify-center items-center bg-black/5 rounded-xl">
            {enlargedScreenshotUrl && (
              <img
                src={enlargedScreenshotUrl}
                alt="Enlarged Payment Screenshot"
                className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-lg"
              />
            )}
          </div>
          <DialogFooter className="pt-2 border-t border-border flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEnlargedScreenshotUrl(null)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── STUDENT DETAILS MODAL ──────────────────────────────────────────────── */}
      <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewStudent?.full_name || 'Student Details'}</DialogTitle>
          </DialogHeader>
          {viewStudent && (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries({
                'Email': viewStudent.email,
                'Phone': viewStudent.phone,
                'Parent Name': viewStudent.parent_name,
                'Parent Phone': viewStudent.parent_phone,
                'Career Fit Assessment': viewStudent.assessment_status,
                'Application': viewStudent.application_status,
                'Payment': viewStudent.payment_status,
                'Admission': viewStudent.admission_status,
              }).map(
                ([k, v]) =>
                  v && (
                    <div key={k} className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{k}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{v}</p>
                    </div>
                  )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
