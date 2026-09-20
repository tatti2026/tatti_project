import { useEffect, useState, useRef } from 'react';
import { getAllStudents, getAllPayments } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Student, Payment } from '@/types/index';
import { Download, Eye, CheckCircle2, Search, Loader2, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

export default function Confirmations() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: pays }] = await Promise.all([getAllStudents(0, 1000), getAllPayments(0, 1000)]);
      setStudents(data);
      setPayments(pays);
      setLoading(false);
    })();
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

  const getStudentPayment = (studentId: string) => payments.find(p => p.student_id === studentId);

  const normalizePaymentStatus = (status?: string | null) => (status ?? '').trim().toLowerCase();

  const newPayments = students.filter((s) => {
    const status = normalizePaymentStatus(getStudentPayment(s.id)?.status);
    return ['pending', 'pending_verification', 'submitted', 'in_progress'].includes(status);
  });

  const paid = students.filter((s) => {
    const status = normalizePaymentStatus(getStudentPayment(s.id)?.status);
    return ['paid', 'approved'].includes(status);
  });

  const paymentFailed = students.filter((s) => {
    const status = normalizePaymentStatus(getStudentPayment(s.id)?.status);
    return ['failed', 'rejected', 'refunded'].includes(status);
  });

  const filterStudents = (list: Student[]) =>
    list.filter(s => !search || (s.full_name || '').toLowerCase().includes(search.toLowerCase()) || (s.email || '').toLowerCase().includes(search.toLowerCase()));

  const downloadReceipt = (s: Student) => {
    const pay = getStudentPayment(s.id);
    const content = [
      'TATTI - Payment Receipt', '=======================',
      `Student Name: ${s.full_name || 'N/A'}`,
      `Email: ${s.email || 'N/A'}`,
      `Payment ID: ${pay?.payment_id || 'N/A'}`,
      `Transaction ID: ${pay?.transaction_id || 'N/A'}`,
      `Amount: ₹${pay?.amount.toLocaleString() || 'N/A'}`,
      `Method: ${pay?.payment_method || 'N/A'}`,
      `Date: ${pay?.paid_at ? format(new Date(pay.paid_at), 'dd MMM yyyy') : 'N/A'}`,
      `Status: PAID`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `receipt_${s.full_name || s.id}.txt`; a.click();
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

  const renderPaymentBadge = (status?: string | null) => {
    const value = normalizePaymentStatus(status);

    if (['paid', 'approved'].includes(value)) {
      return <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Paid</span>;
    }

    if (['pending', 'pending_verification', 'submitted', 'in_progress'].includes(value)) {
      return <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">New Payment</span>;
    }

    if (['failed', 'rejected', 'refunded'].includes(value)) {
      return <span className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">Payment Failed</span>;
    }

    return <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Not Paid</span>;
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
                <td className="px-3 py-3 whitespace-nowrap">{renderPaymentBadge(pay?.status)}</td>
                {showPayment && <>
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-semibold text-foreground">
                    {pay ? `₹${pay.amount.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">{pay?.payment_method || '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                    {pay?.paid_at ? format(new Date(pay.paid_at), 'dd MMM yy') : '-'}
                  </td>
                </>}
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewStudent(s)} title="View">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {showPayment && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadReceipt(s)} title="Download Receipt">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {!showPayment && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success" title="Verify Payment"
                        onClick={() => toast.success(`Payment verified for ${s.full_name}`)}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
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
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Confirmations</h1>
            <p className="text-muted-foreground text-sm">Track payment confirmations and application statuses</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search students..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 w-48 bg-input border-border" />
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

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'NEW PAYMENTS', count: newPayments.length, color: 'bg-warning/20 text-warning border-warning/20' },
            { label: 'PAID', count: paid.length, color: 'bg-success/20 text-success border-success/20' },
            { label: 'PAYMENT FAILED', count: paymentFailed.length, color: 'bg-destructive/20 text-destructive border-destructive/20' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`glass-card rounded-xl p-4 text-center border ${color}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-semibold mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <Tabs defaultValue="newpayments">
            <div className="px-4 pt-4">
              <TabsList className="bg-muted">
                <TabsTrigger value="newpayments" className="text-xs">New Payments ({newPayments.length})</TabsTrigger>
                <TabsTrigger value="paid" className="text-xs">Paid ({paid.length})</TabsTrigger>
                <TabsTrigger value="paymentfailed" className="text-xs">Payment Failed ({paymentFailed.length})</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="newpayments" className="mt-0">
              <StudentTable list={newPayments} showPayment />
            </TabsContent>
            <TabsContent value="paid" className="mt-0">
              <StudentTable list={paid} showPayment />
            </TabsContent>
            <TabsContent value="paymentfailed" className="mt-0">
              <StudentTable list={paymentFailed} showPayment />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewStudent?.full_name || 'Student Details'}</DialogTitle></DialogHeader>
          {viewStudent && (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries({
                'Email': viewStudent.email, 'Phone': viewStudent.phone,
                'Parent Name': viewStudent.parent_name, 'Parent Phone': viewStudent.parent_phone,
                'Career Fit Assessment': viewStudent.assessment_status, 'Application': viewStudent.application_status,
                'Payment': viewStudent.payment_status,
                'Admission': viewStudent.admission_status,
              }).map(([k, v]) => v && (
                <div key={k} className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
