import { useEffect, useState } from 'react';
import { getAllStudents, updateStudent, deleteStudent } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TablePagination, getSessionPageSize, setSessionPageSize } from '@/components/common/TablePagination';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Student, AssessmentStatus, ApplicationStatus, PaymentStatus } from '@/types/index';
import {
  Search, Eye, Pencil, Trash2, Download,
  Loader2, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportStudentExcel, exportStudentPDF } from '@/lib/api';

type SortField = 'student_id' | 'full_name' | 'created_at' | 'selected_course';
type SortOrder = 'asc' | 'desc';

export default function StudentDetails() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(() => getSessionPageSize('student-details', 10));
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Filters
  const [filterAssessment, setFilterAssessment] = useState<string>('all');
  const [filterApplication, setFilterApplication] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Dialogs
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const result = await getAllStudents({
      page,
      pageSize,
      search,
      assessment_status: filterAssessment,
      application_status: filterApplication,
      payment_status: filterPayment,
      sortField,
      sortOrder,
    });
    setStudents(result.data || []);
    setTotalCount(result.pagination?.total ?? result.count ?? 0);
    setTotalPages(result.pagination?.totalPages ?? 1);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, search, filterAssessment, filterApplication, filterPayment, sortField, sortOrder]);

  const handleDelete = async (id: string) => {
    try {
      await deleteStudent(id);
      toast.success('Student record deleted');
    } catch {
      toast.error('Failed to delete student record');
    }
    setDeleteStudentId(null);
    fetchData();
  };

  const handleSaveEdit = async () => {
    if (!editStudent) return;
    setSaving(true);
    await updateStudent(editStudent.id, {
      full_name: editStudent.full_name,
      phone: editStudent.phone,
      parent_name: editStudent.parent_name,
      parent_phone: editStudent.parent_phone,
      selected_course: editStudent.selected_course,
      admission_status: editStudent.admission_status,
    });
    setSaving(false);
    setEditStudent(null);
    toast.success('Student details updated successfully');
    fetchData();
  };

  const resetFilters = () => {
    setSearch('');
    setFilterAssessment('all');
    setFilterApplication('all');
    setFilterPayment('all');
    setSortField('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setSessionPageSize('student-details', newSize);
    setPage(1);
  };

  const stickyStudentIdWidth = 180;
  const stickyStudentIdClass = 'sticky left-0 z-30 bg-background/95 backdrop-blur-sm border-r border-border/60';
  const stickyStudentNameClass = 'sticky z-20 bg-background/95 backdrop-blur-sm border-r border-border/60';

  const stickyStudentIdStyle = { minWidth: `${stickyStudentIdWidth}px`, width: `${stickyStudentIdWidth}px` } as const;
  const stickyStudentNameStyle = { left: `${stickyStudentIdWidth}px`, minWidth: '200px', width: '200px' } as const;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleDownloadExcel = async () => {
    setExportingExcel(true);
    try {
      await exportStudentExcel({
        search,
        assessmentStatus: filterAssessment,
        applicationStatus: filterApplication,
        paymentStatus: filterPayment,
      });
      toast.success('Student detail export downloaded successfully');
    } catch {
      toast.error('Unable to generate the file. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      await exportStudentPDF({
        search,
        assessmentStatus: filterAssessment,
        applicationStatus: filterApplication,
        paymentStatus: filterPayment,
      });
      toast.success('Student detail PDF downloaded successfully');
    } catch {
      toast.error('Unable to generate the file. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const tableHeaders: { label: string; field?: SortField }[] = [
    { label: 'Student ID', field: 'student_id' },
    { label: 'Student Name', field: 'full_name' },
    { label: 'Email' },
    { label: 'Phone Number' },
    { label: 'Parent Name' },
    { label: 'Parent Phone Number' },
    { label: 'Selected Course', field: 'selected_course' },
    { label: 'Assessment Status' },
    { label: 'Application Status' },
    { label: 'Payment Status' },
    { label: 'Created Date', field: 'created_at' },
    { label: 'Actions' }
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Student Details</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {totalCount} student{totalCount === 1 ? '' : 's'} found • Institute admissions record
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-9 border-border bg-background hover:border-primary/50">
                  Export
                  <ChevronDown className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl border border-border bg-popover p-1 shadow-lg">
                <DropdownMenuItem
                  onSelect={event => {
                    event.preventDefault();
                    void handleDownloadExcel();
                  }}
                  className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-2 text-xs"
                  disabled={exportingExcel || exportingPdf}
                >
                  <Download className="w-3.5 h-3.5" />
                  {exportingExcel ? 'Generating Excel...' : 'Download as Excel'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={event => {
                    event.preventDefault();
                    void handleDownloadPdf();
                  }}
                  className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-2 text-xs"
                  disabled={exportingExcel || exportingPdf}
                >
                  <Download className="w-3.5 h-3.5" />
                  {exportingPdf ? 'Generating PDF...' : 'Download as PDF'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search, Filter and Sort Bar */}
        <div className="glass-card rounded-xl p-3 border border-border space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ID, name, email, phone, parent, course..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 bg-input border-border text-xs h-9"
              />
            </div>

            {/* Assessment Filter */}
            <div className="w-36">
              <select
                value={filterAssessment}
                onChange={e => { setFilterAssessment(e.target.value); setPage(1); }}
                className="w-full bg-input border border-border rounded-md px-2.5 py-2 text-xs text-foreground outline-none"
              >
                <option value="all">Assessment: All</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Application Filter */}
            <div className="w-36">
              <select
                value={filterApplication}
                onChange={e => { setFilterApplication(e.target.value); setPage(1); }}
                className="w-full bg-input border border-border rounded-md px-2.5 py-2 text-xs text-foreground outline-none"
              >
                <option value="all">Application: All</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div className="w-32">
              <select
                value={filterPayment}
                onChange={e => { setFilterPayment(e.target.value); setPage(1); }}
                className="w-full bg-input border border-border rounded-md px-2.5 py-2 text-xs text-foreground outline-none"
              >
                <option value="all">Payment: All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(search || filterAssessment !== 'all' || filterApplication !== 'all' || filterPayment !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Students Table */}
        <div className="glass-card rounded-xl overflow-hidden border border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {tableHeaders.map(({ label, field }) => {
                    const isStudentId = label === 'Student ID';
                    const isStudentName = label === 'Student Name';

                    return (
                      <th
                        key={label}
                        onClick={() => field && handleSort(field)}
                        style={isStudentId ? stickyStudentIdStyle : isStudentName ? stickyStudentNameStyle : undefined}
                        className={`px-3 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap ${
                          field ? 'cursor-pointer hover:text-foreground transition-colors select-none' : ''
                        } ${isStudentId ? stickyStudentIdClass : ''} ${isStudentName ? stickyStudentNameClass : ''}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{label}</span>
                          {field && (
                            <span className="text-muted-foreground/60">
                              {sortField === field ? (
                                sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tableHeaders.length} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      <p className="mt-2 text-xs">Loading student records...</p>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={tableHeaders.length} className="py-12 text-center text-muted-foreground">
                      No students found matching your search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  students.map(s => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      {/* 1. Student ID */}
                      <td style={stickyStudentIdStyle} className={`px-3 py-3 whitespace-nowrap font-mono font-medium text-foreground ${stickyStudentIdClass}`}>
                        {s.student_id || '-'}
                      </td>

                      {/* 2. Student Name */}
                      <td style={stickyStudentNameStyle} className={`px-3 py-3 whitespace-nowrap font-semibold text-foreground ${stickyStudentNameClass}`}>
                        {s.full_name || '-'}
                      </td>

                      {/* 3. Email */}
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                        {s.email || '-'}
                      </td>

                      {/* 4. Phone Number */}
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                        {s.phone || '-'}
                      </td>

                      {/* 5. Parent Name */}
                      <td className="px-3 py-3 whitespace-nowrap font-medium text-foreground">
                        {s.parent_name || '-'}
                      </td>

                      {/* 6. Parent Phone Number */}
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                        {s.parent_phone || '-'}
                      </td>

                      {/* 7. Selected Course */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="inline-block max-w-[160px] truncate px-2 py-0.5 rounded bg-primary/10 text-primary font-medium text-[11px] border border-primary/20" title={s.selected_course || 'Not Selected'}>
                          {s.selected_course || 'Not Selected'}
                        </span>
                      </td>

                      {/* 8. Assessment Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge status={s.assessment_status} />
                      </td>

                      {/* 9. Application Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge status={s.application_status} />
                      </td>

                      {/* 10. Payment Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge status={s.payment_status} />
                      </td>

                      {/* 11. Created Date */}
                      <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                        {s.created_at ? format(new Date(s.created_at), 'dd MMM yyyy') : '-'}
                      </td>

                      {/* 12. Actions */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs hover:text-primary"
                            onClick={() => setViewStudent(s)}
                            title="View Student"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditStudent({ ...s })}
                            title="Edit Student"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteStudentId(s.id)}
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            itemName="students"
            loading={loading}
          />
        </div>
      </div>

      {/* ── VIEW STUDENT DIALOG ── */}
      <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base">
              <span>{viewStudent?.full_name || 'Student Details'}</span>
              <span className="text-xs font-mono font-normal text-muted-foreground px-2 py-0.5 rounded bg-muted">
                {viewStudent?.student_id || '-'}
              </span>
            </DialogTitle>
          </DialogHeader>

          {viewStudent && (
            <div className="space-y-4 pt-2">
              {/* Primary Identity Banner */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{viewStudent.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{viewStudent.email || 'No email provided'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-medium">Selected Course</p>
                  <p className="text-xs font-semibold text-primary">{viewStudent.selected_course || 'Not Selected'}</p>
                </div>
              </div>

              {/* Detailed Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-muted/40 rounded-lg border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Student Contact Phone</p>
                  <p className="text-sm font-medium text-foreground mt-1">{viewStudent.phone || '-'}</p>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Parent / Guardian Name</p>
                  <p className="text-sm font-medium text-foreground mt-1">{viewStudent.parent_name || '-'}</p>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Parent Contact Phone</p>
                  <p className="text-sm font-medium text-foreground mt-1">{viewStudent.parent_phone || '-'}</p>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Enrollment Date</p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {viewStudent.created_at ? format(new Date(viewStudent.created_at), 'dd MMMM yyyy') : '-'}
                  </p>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Career Fit Assessment</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <StatusBadge status={viewStudent.assessment_status} />
                    {viewStudent.assessment_percentage != null && (
                      <span className="text-xs font-bold text-primary">
                        Score: {viewStudent.assessment_score ?? '-'}/{viewStudent.assessment_total_marks ?? 4} ({viewStudent.assessment_percentage}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Application Status</p>
                  <div className="mt-1"><StatusBadge status={viewStudent.application_status} /></div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Payment Status</p>
                  <div className="mt-1"><StatusBadge status={viewStudent.payment_status} /></div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Admission Status</p>
                  <div className="mt-1"><StatusBadge status={viewStudent.admission_status} /></div>
                </div>

                {viewStudent.city && (
                  <div className="sm:col-span-2 p-3 bg-muted/40 rounded-lg border border-border/60">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Address / Location</p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {[viewStudent.address, viewStudent.city, viewStudent.state, viewStudent.pincode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setViewStudent(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── EDIT STUDENT DIALOG ── */}
      <Dialog open={!!editStudent} onOpenChange={() => setEditStudent(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Student Details</DialogTitle>
          </DialogHeader>
          {editStudent && (
            <div className="space-y-3.5 pt-1">
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input
                  value={editStudent.full_name || ''}
                  onChange={e => setEditStudent(p => p ? { ...p, full_name: e.target.value } : null)}
                  className="mt-1 bg-input border-border text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Student Phone</Label>
                  <Input
                    value={editStudent.phone || ''}
                    onChange={e => setEditStudent(p => p ? { ...p, phone: e.target.value } : null)}
                    className="mt-1 bg-input border-border text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Selected Course</Label>
                  <Input
                    value={editStudent.selected_course || ''}
                    onChange={e => setEditStudent(p => p ? { ...p, selected_course: e.target.value } : null)}
                    placeholder="e.g. Full Stack Web Development"
                    className="mt-1 bg-input border-border text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Parent Name</Label>
                  <Input
                    value={editStudent.parent_name || ''}
                    onChange={e => setEditStudent(p => p ? { ...p, parent_name: e.target.value } : null)}
                    placeholder="Enter parent/guardian name"
                    className="mt-1 bg-input border-border text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Parent Phone Number</Label>
                  <Input
                    value={editStudent.parent_phone || ''}
                    onChange={e => setEditStudent(p => p ? { ...p, parent_phone: e.target.value } : null)}
                    placeholder="Enter parent phone number"
                    className="mt-1 bg-input border-border text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Admission Status</Label>
                <select
                  value={editStudent.admission_status}
                  onChange={e => setEditStudent(p => p ? { ...p, admission_status: e.target.value as Student['admission_status'] } : null)}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-xs text-foreground outline-none"
                >
                  {[
                    'not_applied','application_submitted','under_review',
                    'counselling_pending','counselling_completed','selected',
                    'admission_confirmed','not_selected'
                  ].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <Button variant="outline" className="flex-1 text-xs" onClick={() => setEditStudent(null)}>Cancel</Button>
                <Button className="flex-1 gradient-bg border-0 text-white text-xs font-semibold" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DELETE DIALOG ── */}
      <AlertDialog open={!!deleteStudentId} onOpenChange={() => setDeleteStudentId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Student Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This action cannot be undone. It will permanently remove this student record from the TATTI database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStudentId && handleDelete(deleteStudentId)}
              className="bg-destructive text-destructive-foreground text-xs font-semibold"
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
