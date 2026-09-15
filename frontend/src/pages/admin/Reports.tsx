import { useEffect, useState, useMemo } from 'react';
import { getAllStudents, getAllPayments } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import type { Student, Payment } from '@/types/index';
import {
  Users,
  CheckCircle2,
  FileText,
  CreditCard,
  GraduationCap,
  PhoneCall,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import ReportSummaryCard from '@/components/reports/ReportSummaryCard';
import ReportFilters, { ReportFilterValues } from '@/components/reports/ReportFilters';
import StudentReportsTable from '@/components/reports/StudentReportsTable';
import Pagination from '@/components/reports/Pagination';
import StudentReportModal from '@/components/reports/StudentReportModal';

const PAGE_SIZE = 10;

export default function Reports() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<ReportFilterValues>({
    search: '',
    assessmentStatus: 'all',
    applicationStatus: 'all',
    paymentStatus: 'all',
    fromDate: '',
    toDate: '',
  });

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: studs }, { data: pays }] = await Promise.all([
          getAllStudents(0, 1000),
          getAllPayments(0, 1000),
        ]);
        setStudents(studs || []);
        setPayments(pays || []);
      } catch (err) {
        toast.error('Failed to load reports data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Search
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchesName = (s.full_name || '').toLowerCase().includes(q);
        const matchesEmail = (s.email || '').toLowerCase().includes(q);
        const matchesId = (s.student_id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesId) return false;
      }

      // Assessment status
      if (filters.assessmentStatus !== 'all' && s.assessment_status !== filters.assessmentStatus) {
        return false;
      }

      // Application status
      if (filters.applicationStatus !== 'all' && s.application_status !== filters.applicationStatus) {
        return false;
      }

      // Payment status
      if (filters.paymentStatus !== 'all' && s.payment_status !== filters.paymentStatus) {
        return false;
      }

      // Date range (by created_at)
      if (filters.fromDate) {
        const created = new Date(s.created_at);
        const from = new Date(filters.fromDate);
        if (created < from) return false;
      }
      if (filters.toDate) {
        const created = new Date(s.created_at);
        const to = new Date(filters.toDate);
        to.setHours(23, 59, 59, 999);
        if (created > to) return false;
      }

      return true;
    });
  }, [students, filters]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Paginated students
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

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

  const handleExportCSV = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 400));

    try {
      const headers = [
        'Roll Number',
        'Student Name',
        'Email',
        'Phone',
        'City',
        'State',
        'Assessment Status',
        'Application Status',
        'Payment Status',
        'Counselling Status',
        'Admission Status',
        'Application Lock Status',
        'Registered Date',
      ];

      const rows = filteredStudents.map(s => [
        s.student_id || '',
        s.full_name || '',
        s.email || '',
        s.phone || '',
        s.city || '',
        s.state || '',
        s.assessment_status || '',
        s.application_status || '',
        s.payment_status || '',
        s.counselling_status || '',
        s.admission_status || '',
        s.application_access_status || 'locked',
        s.created_at ? format(new Date(s.created_at), 'yyyy-MM-dd') : '',
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `TATTI_Reports_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Report downloaded successfully');
    } catch {
      toast.error('Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  // KPIs
  const totalStudents = students.length;
  const assessedCount = students.filter(s => s.assessment_status === 'completed').length;
  const applicationsCount = students.filter(s => s.application_status === 'submitted').length;
  const paidCount = students.filter(s => s.payment_status === 'paid').length;
  const counselledCount = students.filter(
    s => s.counselling_status === 'completed' || s.counselling_status === 'selected'
  ).length;
  const admittedCount = students.filter(
    s => s.admission_status === 'admission_confirmed'
  ).length;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Analytics & Reports</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive student enrollment, assessment progress, and financial summaries
            </p>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-muted/50 animate-pulse" />
              ))}
            </div>
            <div className="h-48 rounded-2xl bg-muted/40 animate-pulse" />
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <ReportSummaryCard
                title="Total Enrolled"
                value={totalStudents}
                subtitle="All Registered"
                icon={Users}
                color="primary"
              />
              <ReportSummaryCard
                title="Assessed"
                value={assessedCount}
                subtitle={`${totalStudents > 0 ? Math.round((assessedCount / totalStudents) * 100) : 0}% Complete`}
                icon={CheckCircle2}
                color="blue"
              />
              <ReportSummaryCard
                title="Applications"
                value={applicationsCount}
                subtitle="Form Submitted"
                icon={FileText}
                color="purple"
              />
              <ReportSummaryCard
                title="Paid Fees"
                value={paidCount}
                subtitle={`${payments.length} Transactions`}
                icon={CreditCard}
                color="emerald"
              />
              <ReportSummaryCard
                title="Counselled"
                value={counselledCount}
                subtitle="Sessions Handled"
                icon={PhoneCall}
                color="amber"
              />
              <ReportSummaryCard
                title="Admitted"
                value={admittedCount}
                subtitle="Confirmed Seats"
                icon={GraduationCap}
                color="emerald"
                badge="Final"
              />
            </div>

            {/* Filters */}
            <ReportFilters
              filters={filters}
              onChange={setFilters}
              onReset={handleResetFilters}
              onExport={handleExportCSV}
              exporting={exporting}
            />

            {/* Student Reports Table */}
            <div className="space-y-0">
              <StudentReportsTable
                students={paginatedStudents}
                startIndex={(currentPage - 1) * PAGE_SIZE + 1}
                onViewStudent={handleViewStudent}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredStudents.length}
                pageSize={PAGE_SIZE}
              />
            </div>
          </>
        )}
      </div>

      {/* Student Detail Modal */}
      <StudentReportModal
        student={selectedStudent}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStudent(null);
        }}
      />
    </AdminLayout>
  );
}
