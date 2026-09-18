import { useEffect, useState, useMemo } from 'react';
import { getAllStudents, getAllPayments, getReportsSummary, exportReportCSV, exportReportExcel, exportReportPDF } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import type { Student, Payment } from '@/types/index';
import {
  Users,
  CheckCircle2,
  FileText,
  CreditCard,
  GraduationCap,
  PhoneCall,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import ReportSummaryCard from '@/components/reports/ReportSummaryCard';
import ReportFilters, { ReportFilterValues } from '@/components/reports/ReportFilters';
import StudentReportsTable from '@/components/reports/StudentReportsTable';
import Pagination from '@/components/reports/Pagination';
import StudentReportModal from '@/components/reports/StudentReportModal';
import { getSessionPageSize, setSessionPageSize } from '@/components/common/TablePagination';

export default function Reports() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<{ total_students: number; assessed_count: number; applications_count: number; paid_count: number; counselled_count: number; admitted_count: number; total_payments: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(() => getSessionPageSize('reports', 10));
  const [totalCount, setTotalCount] = useState(0);

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
    let active = true;

    (async () => {
      setLoading(true);
      try {
        const [summaryResult, { data: studs, pagination }, { data: pays }] = await Promise.all([
          getReportsSummary(),
          getAllStudents({
            page: currentPage,
            pageSize,
            search: filters.search,
            assessment_status: filters.assessmentStatus,
            application_status: filters.applicationStatus,
            payment_status: filters.paymentStatus,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            sortField: 'created_at',
            sortOrder: 'desc',
          }),
          getAllPayments({ page: 1, limit: 200 }),
        ]);

        if (!active) return;

        setSummary(summaryResult);
        setStudents(studs || []);
        setPayments(pays || []);
        setTotalCount(pagination?.total ?? studs.length ?? 0);
      } catch (err) {
        if (!active) return;
        toast.error('Failed to load reports data');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentPage, pageSize, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setSessionPageSize('reports', newSize);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedStudents = useMemo(() => students, [students]);

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
    setExportingCsv(true);
    try {
      await exportReportCSV(filters);
      toast.success('Report downloaded successfully');
    } catch {
      toast.error('Unable to generate report. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleDownloadExcel = async () => {
    setExportingExcel(true);
    try {
      await exportReportExcel(filters);
      toast.success('Excel report downloaded successfully');
    } catch {
      toast.error('Unable to generate report. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleDownloadPDF = async () => {
    setExportingPdf(true);
    try {
      await exportReportPDF(filters);
      toast.success('PDF report downloaded successfully');
    } catch {
      toast.error('Unable to generate report. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  // KPIs
  const totalStudents = summary?.total_students ?? students.length;
  const assessedCount = summary?.assessed_count ?? students.filter(s => s.assessment_status === 'completed').length;
  const applicationsCount = summary?.applications_count ?? students.filter(s => s.application_status === 'submitted').length;
  const paidCount = summary?.paid_count ?? students.filter(s => s.payment_status === 'paid').length;
  const counselledCount = summary?.counselled_count ?? students.filter(
    s => s.counselling_status === 'completed' || s.counselling_status === 'selected'
  ).length;
  const admittedCount = summary?.admitted_count ?? students.filter(
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
              onExportCsv={handleExportCSV}
              onDownloadExcel={handleDownloadExcel}
              onDownloadPdf={handleDownloadPDF}
              exportingCsv={exportingCsv}
              exportingExcel={exportingExcel}
              exportingPdf={exportingPdf}
            />

            {/* Student Reports Table */}
            <div className="space-y-0">
              <StudentReportsTable
                students={paginatedStudents}
                startIndex={(currentPage - 1) * pageSize + 1}
                onViewStudent={handleViewStudent}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                itemName="students"
                loading={loading}
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
