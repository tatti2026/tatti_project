import { useEffect, useMemo, useState } from 'react';
import {
  getAllStudents,
  getDashboardStats,
  getReportsSummary,
  exportReportExcel,
  exportReportPDF,
  type DashboardStats,
} from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TablePagination, getSessionPageSize, setSessionPageSize } from '@/components/common/TablePagination';
import type { Student } from '@/types/index';
import { Calendar, ChevronDown, Download, Eye, GraduationCap, RotateCcw, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ReportFilters {
  search: string;
  assessmentStatus: string;
  applicationStatus: string;
  paymentStatus: string;
  fromDate: string;
  toDate: string;
}

const PAGE_SIZE_DEFAULT = 10;

export default function Reports() {
  const [students, setStudents] = useState<Student[]>([]);
  const [summary, setSummary] = useState<{ total_students: number; assessed_count: number; applications_count: number; paid_count: number; counselled_count: number; admitted_count: number; total_payments: number } | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalStudents: 0,
    newStudents7d: 0,
    assessmentCompleted: 0,
    assessmentPending: 0,
    applicationsSubmitted: 0,
    paidApplications: 0,
    unpaidApplications: 0,
    counsellingPending: 0,
    admissionsConfirmed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pageSize, setPageSize] = useState(() => getSessionPageSize('reports', PAGE_SIZE_DEFAULT));
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    search: '',
    assessmentStatus: 'all',
    applicationStatus: 'all',
    paymentStatus: 'all',
    fromDate: '',
    toDate: '',
  });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [{ data: studentsData }, summaryResult, dashboardResult] = await Promise.all([
          getAllStudents(0, 1000),
          getReportsSummary(),
          getDashboardStats(),
        ]);

        if (!active) return;

        setStudents(studentsData || []);
        setSummary(summaryResult);
        setDashboardStats(dashboardResult);
      } catch {
        if (active) {
          toast.error('Failed to load reports data');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch = !query || [student.full_name, student.email, student.student_id].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      );
      const matchesAssessment = filters.assessmentStatus === 'all' || student.assessment_status === filters.assessmentStatus;
      const matchesApplication = filters.applicationStatus === 'all' || student.application_status === filters.applicationStatus;
      const matchesPayment = filters.paymentStatus === 'all' || student.payment_status === filters.paymentStatus;

      const createdAt = student.created_at ? new Date(student.created_at) : null;
      const matchesFromDate = !filters.fromDate || !createdAt || createdAt >= new Date(`${filters.fromDate}T00:00:00`);
      const matchesToDate = !filters.toDate || !createdAt || createdAt <= new Date(`${filters.toDate}T23:59:59`);

      return matchesSearch && matchesAssessment && matchesApplication && matchesPayment && matchesFromDate && matchesToDate;
    });
  }, [students, filters]);

  const totalCount = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = filteredStudents.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      assessmentStatus: 'all',
      applicationStatus: 'all',
      paymentStatus: 'all',
      fromDate: '',
      toDate: '',
    });
  };

  const totalStudents = summary?.total_students ?? students.length;
  const newStudents7d = dashboardStats.newStudents7d;
  const applicationsSubmitted = summary?.applications_count ?? dashboardStats.applicationsSubmitted;
  const paidFees = summary?.paid_count ?? dashboardStats.paidApplications;
  const admitted = summary?.admitted_count ?? dashboardStats.admissionsConfirmed;

  const handleDownloadExcel = async () => {
    setExportingExcel(true);
    try {
      await exportReportExcel({
        search: filters.search,
        assessmentStatus: filters.assessmentStatus,
        applicationStatus: filters.applicationStatus,
        paymentStatus: filters.paymentStatus,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      });
      toast.success('Excel report downloaded successfully');
    } catch {
      toast.error('Unable to generate Excel report. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleDownloadPDF = async () => {
    setExportingPdf(true);
    try {
      await exportReportPDF({
        search: filters.search,
        assessmentStatus: filters.assessmentStatus,
        applicationStatus: filters.applicationStatus,
        paymentStatus: filters.paymentStatus,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      });
      toast.success('PDF report downloaded successfully');
    } catch {
      toast.error('Unable to generate PDF report. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const summaryCards = [
    { label: 'Total Enrolled', value: totalStudents, subtitle: 'All Registered', icon: Users },
    { label: 'New Students (7D)', value: newStudents7d, subtitle: 'Past 7 days', icon: Users },
    { label: 'Applications Submitted', value: applicationsSubmitted, subtitle: 'Form Submitted', icon: Download },
    { label: 'Paid Fees', value: paidFees, subtitle: `${summary?.total_payments ?? 0} Transactions`, icon: Download },
    { label: 'Admitted', value: admitted, subtitle: 'Confirmed Seats', icon: GraduationCap },
  ];

  const renderStatusBadge = (status: string, type: 'assessment' | 'application' | 'payment') => {
    const normalized = String(status || '').toLowerCase();

    if (type === 'assessment') {
      if (normalized === 'completed') return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">Completed</span>;
      if (normalized === 'pending' || normalized === 'in_progress') return <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-400">Pending</span>;
      return <span className="rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">Not Started</span>;
    }

    if (type === 'application') {
      if (normalized === 'confirmed' || normalized === 'approved') return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">Confirmed</span>;
      if (normalized === 'submitted') return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">Submitted</span>;
      if (normalized === 'in_progress' || normalized === 'started') return <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-400">Started</span>;
      if (normalized === 'under_review') return <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-400">Under Review</span>;
      if (normalized === 'rejected') return <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-400">Rejected</span>;
      return <span className="rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">Not Started</span>;
    }

    if (normalized === 'paid' || normalized === 'approved') return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">Paid</span>;
    if (normalized === 'pending' || normalized === 'pending_verification') return <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-400">Pending</span>;
    if (normalized === 'failed') return <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-400">Failed</span>;
    if (normalized === 'rejected' || normalized === 'refunded') return <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-400">Rejected</span>;
    if (normalized === 'unpaid' || normalized === 'not_paid') return <span className="rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">Not Paid</span>;
    return <span className="rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">Not Paid</span>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in pb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Analytics & Reports</h1>
          <p className="text-xs text-muted-foreground">Comprehensive student enrollment, assessment progress, and financial summaries</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="h-24 rounded-2xl bg-muted/60 animate-pulse" />
              ))}
            </div>
            <div className="h-40 rounded-2xl bg-muted/40 animate-pulse" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {summaryCards.map(({ label, value, subtitle, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filters.search}
                    onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Search by student name, email, roll number..."
                    className="h-10 border-border bg-input/70 pl-9 text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleResetFilters} className="h-9 text-xs">
                    <RotateCcw className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                    Reset
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm" disabled={exportingExcel || exportingPdf} className="h-9 text-xs">
                        Export
                        <ChevronDown className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-xl border border-border bg-popover p-1">
                      <DropdownMenuItem onSelect={(event) => { event.preventDefault(); void handleDownloadExcel(); }} className="cursor-pointer text-xs">
                        <Download className="mr-2 h-3.5 w-3.5" />
                        {exportingExcel ? 'Generating Excel...' : 'Download as Excel'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(event) => { event.preventDefault(); void handleDownloadPDF(); }} className="cursor-pointer text-xs">
                        <Download className="mr-2 h-3.5 w-3.5" />
                        {exportingPdf ? 'Generating PDF...' : 'Download as PDF'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Assessment</label>
                  <select
                    value={filters.assessmentStatus}
                    onChange={(event) => setFilters((current) => ({ ...current, assessmentStatus: event.target.value }))}
                    className="w-full rounded-lg border border-border bg-input px-2.5 py-2 text-xs text-foreground outline-none"
                  >
                    <option value="all">All Assessments</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="not_started">Not Started</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Application</label>
                  <select
                    value={filters.applicationStatus}
                    onChange={(event) => setFilters((current) => ({ ...current, applicationStatus: event.target.value }))}
                    className="w-full rounded-lg border border-border bg-input px-2.5 py-2 text-xs text-foreground outline-none"
                  >
                    <option value="all">All Applications</option>
                    <option value="submitted">Submitted</option>
                    <option value="in_progress">In Progress</option>
                    <option value="not_started">Not Started</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Payment</label>
                  <select
                    value={filters.paymentStatus}
                    onChange={(event) => setFilters((current) => ({ ...current, paymentStatus: event.target.value }))}
                    className="w-full rounded-lg border border-border bg-input px-2.5 py-2 text-xs text-foreground outline-none"
                  >
                    <option value="all">All Payments</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    <Calendar className="h-3 w-3" /> From Date
                  </label>
                  <Input
                    type="date"
                    value={filters.fromDate}
                    onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
                    className="h-9 border-border bg-input text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    <Calendar className="h-3 w-3" /> To Date
                  </label>
                  <Input
                    type="date"
                    value={filters.toDate}
                    onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
                    className="h-9 border-border bg-input text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card/70">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-xs">
                  <thead className="border-b border-border bg-muted/70">
                    <tr>
                      {['#', 'ROLL NO', 'STUDENT NAME', 'ASSESSMENT', 'APPLICATION', 'PAYMENT', 'ACTION'].map((header) => (
                        <th key={header} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-16 text-center text-xs text-muted-foreground">
                          No student records match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map((student, index) => (
                        <tr key={student.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/40">
                          <td className="px-3 py-3 text-muted-foreground">{(safePage - 1) * pageSize + index + 1}</td>
                          <td className="px-3 py-3 font-mono font-bold text-primary">{student.student_id || 'ID-N/A'}</td>
                          <td className="px-3 py-3">
                            <div>
                              <p className="font-semibold text-foreground">{student.full_name || 'Unnamed Student'}</p>
                              <p className="text-[11px] text-muted-foreground">{student.email || '-'}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3">{renderStatusBadge(student.assessment_status, 'assessment')}</td>
                          <td className="px-3 py-3">{renderStatusBadge(student.application_status, 'application')}</td>
                          <td className="px-3 py-3">{renderStatusBadge(student.payment_status, 'payment')}</td>
                          <td className="px-3 py-3 text-right">
                            <Button size="sm" variant="outline" onClick={() => { setSelectedStudent(student); setShowStudentModal(true); }} className="h-7 px-2.5 text-[11px]">
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  setSessionPageSize('reports', nextPageSize);
                  setCurrentPage(1);
                }}
                itemName="students"
                loading={loading}
              />
            </div>
          </>
        )}
      </div>

      {showStudentModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Student Details</p>
                <h2 className="text-xl font-bold text-foreground">{selectedStudent.full_name || 'Unnamed Student'}</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowStudentModal(false)}>
                Close
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Roll No</p>
                <p className="mt-1 font-semibold text-foreground">{selectedStudent.student_id || 'ID-N/A'}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Email</p>
                <p className="mt-1 font-semibold text-foreground">{selectedStudent.email || '-'}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Assessment</p>
                <p className="mt-1 font-semibold text-foreground">{selectedStudent.assessment_status}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Application</p>
                <p className="mt-1 font-semibold text-foreground">{selectedStudent.application_status}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Payment</p>
                <p className="mt-1 font-semibold text-foreground">{selectedStudent.payment_status}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Admission</p>
                <p className="mt-1 font-semibold text-foreground">{selectedStudent.admission_status}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
