import { useEffect, useState } from 'react';
import { getAllStudents, getAllPayments, getAllCounselling, getAllQuestions } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Student, Payment } from '@/types/index';
import { Download, FileBarChart, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type ReportType = 'registration' | 'assessment' | 'application' | 'payment' | 'counselling' | 'admission';

export default function Reports() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: pays }] = await Promise.all([getAllStudents(0, 1000), getAllPayments(0, 1000)]);
      setStudents(data);
      setPayments(pays);
      setLoading(false);
    })();
  }, []);

  const exportReport = async (type: ReportType) => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 500));

    let headers: string[] = [];
    let rows: (string | number | null)[][] = [];

    if (type === 'registration') {
      headers = ['Student ID', 'Name', 'Email', 'Phone', 'City', 'State', 'Registered Date'];
      rows = students.map(s => [s.student_id, s.full_name, s.email, s.phone, s.city, s.state, format(new Date(s.created_at), 'dd MMM yyyy')]);
    } else if (type === 'assessment') {
      headers = ['Name', 'Email', 'Assessment Status', 'Registered Date'];
      rows = students.map(s => [s.full_name, s.email, s.assessment_status, format(new Date(s.created_at), 'dd MMM yyyy')]);
    } else if (type === 'application') {
      headers = ['Name', 'Email', 'Application Status', 'Payment Status'];
      rows = students.map(s => [s.full_name, s.email, s.application_status, s.payment_status]);
    } else if (type === 'payment') {
      headers = ['Student ID', 'Amount', 'Method', 'Status', 'Date'];
      rows = payments.map(p => {
        const s = students.find(st => st.id === p.student_id);
        return [s?.full_name ?? '', p.amount ?? 0, p.payment_method ?? '', p.status, p.paid_at ? format(new Date(p.paid_at), 'dd MMM yyyy') : '-'];
      });
    } else if (type === 'counselling') {
      headers = ['Name', 'Email', 'Counselling Status', 'Payment Status'];
      rows = students.map(s => [s.full_name, s.email, s.counselling_status, s.payment_status]);
    } else if (type === 'admission') {
      headers = ['Name', 'Email', 'Admission Status', 'Application Status'];
      rows = students.map(s => [s.full_name, s.email, s.admission_status, s.application_status]);
    }

    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `tatti_${type}_report_${format(new Date(), 'yyyyMMdd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const reportTypes: { key: ReportType; label: string; desc: string; count: number }[] = [
    { key: 'registration', label: 'Student Registration', desc: 'All registered students with contact details', count: students.length },
    { key: 'assessment', label: 'Assessment Performance', desc: 'Assessment completion status per student', count: students.filter(s => s.assessment_status === 'completed').length },
    { key: 'application', label: 'Application Report', desc: 'Application and payment status overview', count: students.filter(s => s.application_status !== 'not_started').length },
    { key: 'payment', label: 'Payment Report', desc: 'All payment transactions', count: payments.length },
    { key: 'counselling', label: 'Counselling Report', desc: 'Counselling status for all students', count: students.filter(s => s.counselling_status !== 'not_scheduled').length },
    { key: 'admission', label: 'Admission Report', desc: 'Admission status overview', count: students.filter(s => s.admission_status !== 'not_applied').length },
  ];

  const summaryStats = [
    { label: 'Total Students', value: students.length },
    { label: 'Assessed', value: students.filter(s => s.assessment_status === 'completed').length },
    { label: 'Applications', value: students.filter(s => s.application_status === 'submitted').length },
    { label: 'Paid', value: students.filter(s => s.payment_status === 'paid').length },
    { label: 'Counselled', value: students.filter(s => s.counselling_status === 'completed' || s.counselling_status === 'selected').length },
    { label: 'Admitted', value: students.filter(s => s.admission_status === 'admission_confirmed').length },
  ];

  if (loading) return (
    <AdminLayout>
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm">Generate and export comprehensive reports</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {summaryStats.map(({ label, value }) => (
            <div key={label} className="glass-card rounded-xl p-3 text-center">
              <p className="text-xl font-bold gradient-text">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map(({ key, label, desc, count }) => (
            <div key={key} className="glass-card rounded-xl p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileBarChart className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-muted-foreground">{count} records</span>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => exportReport(key)} disabled={exporting}>
                  {exporting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                  Export CSV
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Preview Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Student Overview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Name', 'Assessment', 'Application', 'Payment', 'Counselling', 'Admission'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 10).map(s => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-foreground">{s.full_name || s.email || '-'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{s.assessment_status.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{s.application_status.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{s.payment_status}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{s.counselling_status.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{s.admission_status.replace(/_/g, ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
