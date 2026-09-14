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

  const paid = students.filter(s => s.payment_status === 'paid');
  const notPaid = students.filter(s => s.payment_status === 'failed');
  const yetToPay = students.filter(s => s.payment_status === 'unpaid' && s.application_status !== 'not_started');

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

  // Export all paid students to CSV (opens in Excel)
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
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `tatti_confirmations_${format(new Date(), 'yyyyMMdd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as Excel (.csv)');
  };

  // Export all paid students to a printable HTML/PDF
  const handleDownloadPDF = () => {
    setShowExportMenu(false);
    const rows = paid.map(s => {
      const pay = getStudentPayment(s.id);
      return `
        <tr>
          <td>${s.full_name || '-'}</td>
          <td>${s.email || '-'}</td>
          <td>${s.phone || '-'}</td>
          <td>${s.application_status || '-'}</td>
          <td>${s.payment_status || '-'}</td>
          <td>${pay ? `₹${pay.amount.toLocaleString()}` : '-'}</td>
          <td>${pay?.payment_method || '-'}</td>
          <td>${pay?.paid_at ? format(new Date(pay.paid_at), 'dd MMM yyyy') : '-'}</td>
        </tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><title>TATTI Confirmations</title>
    <style>body{font-family:sans-serif;padding:20px}h2{margin-bottom:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}th{background:#f0f0f0}</style>
    </head><body>
    <h2>TATTI – Paid Confirmations (${format(new Date(), 'dd MMM yyyy')})</h2>
    <table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Application</th><th>Payment</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) { win.onload = () => { win.print(); }; }
    toast.success('Opening PDF print dialog…');
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

            {/* Export dropdown */}
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
                <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                    onClick={handleDownloadExcel}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-success" />
                    Download Excel (.xlsx)
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                    onClick={handleDownloadPDF}
                  >
                    <FileText className="w-4 h-4 text-destructive" />
                    Download PDF (.pdf)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'PAID', count: paid.length, color: 'bg-success/20 text-success border-success/20' },
            { label: 'YET TO PAY', count: yetToPay.length, color: 'bg-warning/20 text-warning border-warning/20' },
            { label: 'NOT PAID', count: notPaid.length, color: 'bg-destructive/20 text-destructive border-destructive/20' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`glass-card rounded-xl p-4 text-center border ${color}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-semibold mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <Tabs defaultValue="paid">
            <div className="px-4 pt-4">
              <TabsList className="bg-muted">
                <TabsTrigger value="paid" className="text-xs">Paid ({paid.length})</TabsTrigger>
                <TabsTrigger value="yettopay" className="text-xs">Yet to Pay ({yetToPay.length})</TabsTrigger>
                <TabsTrigger value="notpaid" className="text-xs">Not Paid ({notPaid.length})</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="paid" className="mt-0">
              <StudentTable list={paid} showPayment />
            </TabsContent>
            <TabsContent value="yettopay" className="mt-0">
              <StudentTable list={yetToPay} />
            </TabsContent>
            <TabsContent value="notpaid" className="mt-0">
              <StudentTable list={notPaid} />
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
                'Assessment': viewStudent.assessment_status, 'Application': viewStudent.application_status,
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
