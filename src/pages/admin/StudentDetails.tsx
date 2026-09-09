import { useEffect, useState } from 'react';
import { getAllStudents, updateStudent } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Student } from '@/types/index';
import { Search, Eye, Pencil, Trash2, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { format } from 'date-fns';

const PAGE_SIZE = 10;

export default function StudentDetails() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async (p = page, s = search) => {
    setLoading(true);
    const result = await getAllStudents(p, PAGE_SIZE, s);
    setStudents(result.data);
    setTotal(result.count);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
    fetchData(0, v);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('students').delete().eq('id', id);
    toast.success('Student record deleted');
    fetchData();
  };

  const handleSaveEdit = async () => {
    if (!editStudent) return;
    setSaving(true);
    await updateStudent(editStudent.id, {
      full_name: editStudent.full_name,
      phone: editStudent.phone,
      admission_status: editStudent.admission_status,
      counselling_status: editStudent.counselling_status,
    });
    setSaving(false);
    setEditStudent(null);
    toast.success('Student updated');
    fetchData();
  };

  const exportCSV = () => {
    const headers = ['Student ID', 'Name', 'Email', 'Phone', 'Assessment', 'Application', 'Payment', 'Counselling', 'Admission'];
    const rows = students.map(s => [
      s.student_id, s.full_name, s.email, s.phone,
      s.assessment_status, s.application_status, s.payment_status,
      s.counselling_status, s.admission_status
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'students.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Student Details</h1>
            <p className="text-muted-foreground text-sm">{total} students registered</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search students..." value={search}
                onChange={e => handleSearch(e.target.value)}
                className="pl-8 w-56 bg-input border-border" />
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Student ID', 'Name', 'Email', 'Phone', 'Course', 'Assessment', 'Application', 'Payment', 'Counselling', 'Admission', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan={12} className="py-12 text-center text-muted-foreground">No students found</td></tr>
                ) : students.map(s => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">{s.student_id || '-'}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-medium text-foreground">{s.full_name || '-'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">{s.email || '-'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">{s.phone || '-'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">-</td>
                    <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={s.assessment_status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={s.application_status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={s.payment_status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={s.counselling_status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={s.admission_status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(s.created_at), 'dd MMM yy')}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewStudent(s)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditStudent({ ...s })}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Student?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete {s.full_name}'s record.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => { setPage(p => p - 1); fetchData(page - 1); }}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => { setPage(p => p + 1); fetchData(page + 1); }}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewStudent?.full_name || 'Student Details'}</DialogTitle></DialogHeader>
          {viewStudent && (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries({
                'Student ID': viewStudent.student_id, 'Email': viewStudent.email,
                'Phone': viewStudent.phone, 'City': viewStudent.city,
                'State': viewStudent.state, 'Assessment': viewStudent.assessment_status,
                'Application': viewStudent.application_status, 'Payment': viewStudent.payment_status,
                'Counselling': viewStudent.counselling_status, 'Admission': viewStudent.admission_status,
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

      {/* Edit Dialog */}
      <Dialog open={!!editStudent} onOpenChange={() => setEditStudent(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          {editStudent && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Full Name</label>
                <Input value={editStudent.full_name || ''} onChange={e => setEditStudent(p => p ? { ...p, full_name: e.target.value } : null)}
                  className="mt-1 bg-input border-border" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Phone</label>
                <Input value={editStudent.phone || ''} onChange={e => setEditStudent(p => p ? { ...p, phone: e.target.value } : null)}
                  className="mt-1 bg-input border-border" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Admission Status</label>
                <select value={editStudent.admission_status}
                  onChange={e => setEditStudent(p => p ? { ...p, admission_status: e.target.value as Student['admission_status'] } : null)}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground">
                  {['not_applied','application_submitted','under_review','counselling_pending','counselling_completed','selected','admission_confirmed','not_selected'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setEditStudent(null)}>Cancel</Button>
                <Button className="flex-1 gradient-bg border-0 text-white" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
