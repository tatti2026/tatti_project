import { useEffect, useState } from 'react';
import { getAllStudents, getAllPayments } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Student, Payment } from '@/types/index';
import { Download, Eye, CheckCircle2, Phone, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Confirmations() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data }, { data: pays }] = await Promise.all([getAllStudents(0, 1000), getAllPayments(0, 1000)]);
      setStudents(data);
      setPayments(pays);
      setLoading(false);
    })();
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
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Contact"
                      onClick={() => window.open(`tel:${s.phone}`)}>
                      <Phone className="w-3.5 h-3.5" />
                    </Button>
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
          <div className="relative shrink-0">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search students..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 w-48 bg-input border-border" />
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
                'Payment': viewStudent.payment_status, 'Counselling': viewStudent.counselling_status,
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
