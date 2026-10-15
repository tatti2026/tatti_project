import { useEffect, useState, useCallback } from 'react';
import {
  getAllStudents, getAllCounselling, upsertCounselling, updateStudent,
  getPrivateNotesForCounselling, addPrivateNote, updatePrivateNote, deletePrivateNote,
} from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TablePagination, getSessionPageSize, setSessionPageSize } from '@/components/common/TablePagination';
import { toast } from 'sonner';
import type { Student, Counselling, CounsellorPrivateNote } from '@/types/index';
import { Plus, Pencil, Loader2, Search, Calendar, Lock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { usePortal } from '@/contexts/PortalContext';

type CounsForm = {
  student_id: string;
  counsellor_name: string;
  scheduled_date: string;
  scheduled_time: string;
  counselling_type: string;
  notes: string;
  reminder: string;
  status: string;
};

// ── Private Notes Modal ────────────────────────────────────────────────────────
interface PrivateNotesModalProps {
  open: boolean;
  onClose: () => void;
  counselling: Counselling | null;
  students: Student[];
  existingNote: CounsellorPrivateNote | null;
  onSaved: (note: CounsellorPrivateNote) => void;
}

function PrivateNotesModal({ open, onClose, counselling, students, existingNote, onSaved }: PrivateNotesModalProps) {
  const [text, setText] = useState(existingNote?.note_text ?? '');
  const [saving, setSaving] = useState(false);
  const MAX_CHARS = 2000;

  // Sync text when the modal opens for a new row or edit
  useEffect(() => {
    setText(existingNote?.note_text ?? '');
  }, [existingNote, open]);

  const student = counselling ? students.find(s => s.id === counselling.student_id) : null;

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error('Note cannot be empty.');
      return;
    }
    if (trimmed.length > MAX_CHARS) {
      toast.error(`Note cannot exceed ${MAX_CHARS} characters.`);
      return;
    }
    if (!counselling) return;
    setSaving(true);

    let saved: CounsellorPrivateNote | null = null;
    if (existingNote) {
      saved = await updatePrivateNote(existingNote.id, trimmed);
    } else {
      const studentId = counselling.student_id;
      saved = await addPrivateNote(counselling.id, studentId, trimmed);
    }

    setSaving(false);
    if (saved) {
      toast.success(existingNote ? 'Private note updated.' : 'Private note saved.');
      onSaved(saved);
      onClose();
    } else {
      toast.error('Failed to save note. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <span
              style={{
                background: '#FEF3C7',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Lock style={{ width: 14, height: 14, color: '#F59E0B' }} />
            </span>
            {existingNote ? 'Edit Private Note' : 'Add Private Note'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 pt-1 text-xs">
          {/* Private indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFF7ED',
              border: '1px solid #FED7AA',
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            <Lock style={{ width: 12, height: 12, color: '#F59E0B', flexShrink: 0 }} />
            <span style={{ color: '#9A3412', fontStyle: 'italic', fontSize: 11 }}>
              Private – only you can see this
            </span>
          </div>

          {/* Student reference */}
          {student && (
            <div style={{ background: '#FFF7ED', borderRadius: 8, padding: '8px 12px', border: '1px solid #FED7AA' }}>
              <p style={{ color: '#172554', fontWeight: 600 }}>{student.full_name || student.email}</p>
              {student.student_id && (
                <p style={{ color: '#9A3412', fontFamily: 'monospace', fontSize: 11 }}>{student.student_id}</p>
              )}
            </div>
          )}

          {/* Textarea */}
          <div>
            <Label className="text-xs font-semibold" style={{ color: '#172554' }}>
              Private Note
            </Label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={6}
              maxLength={MAX_CHARS}
              placeholder="Write your private counselling note here…"
              style={{
                width: '100%',
                marginTop: 6,
                background: '#FFFFFF',
                border: '1px solid #FED7AA',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12,
                color: '#172554',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#F59E0B';
                e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.2)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#FED7AA';
                e.target.style.boxShadow = 'none';
              }}
            />
            <p style={{ textAlign: 'right', marginTop: 3, color: text.length > MAX_CHARS ? '#DC2626' : '#94A3B8', fontSize: 10 }}>
              {text.length} / {MAX_CHARS}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              type="button"
              className="text-xs"
              style={{ borderColor: '#FED7AA', color: '#172554' }}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="text-xs font-semibold px-5 text-white border-0"
              style={{ background: '#F59E0B' }}
              onClick={handleSave}
              disabled={saving || text.trim().length === 0}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Lock className="w-3.5 h-3.5 mr-1.5" />}
              Save Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CounsellingManagement() {
  const portal = usePortal();
  const isCounsellor = portal === 'counsellor';

  const [students, setStudents] = useState<Student[]>([]);
  const [counsellings, setCounsellings] = useState<Counselling[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editCounselling, setEditCounselling] = useState<Counselling | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getSessionPageSize('counselling', 10));
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Private notes state (counsellor portal only)
  const [privateNotes, setPrivateNotes] = useState<Record<string, CounsellorPrivateNote | null>>({});
  const [notesLoading, setNotesLoading] = useState<Record<string, boolean>>({});
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteTargetCounselling, setNoteTargetCounselling] = useState<Counselling | null>(null);
  const [noteEditing, setNoteEditing] = useState<CounsellorPrivateNote | null>(null);

  const [form, setForm] = useState<CounsForm>({
    student_id: '',
    counsellor_name: 'PSY CARE Counsellor',
    scheduled_date: '2026-09-15',
    scheduled_time: '10:30 AM',
    counselling_type: 'Online',
    notes: '',
    reminder: '1 day before',
    status: 'scheduled',
  });

  const fetchData = async () => {
    setLoading(true);
    const [{ data }, cList] = await Promise.all([
      getAllStudents(1, 1000),
      getAllCounselling(page, pageSize, search),
    ]);
    setStudents(data || []);
    const rows = Array.isArray(cList?.data) ? cList.data : Array.isArray(cList) ? cList : [];
    setCounsellings(rows);
    setTotalCount(cList?.pagination?.total ?? rows.length ?? 0);
    setTotalPages(cList?.pagination?.totalPages ?? 1);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, search]);

  // Load private notes when counsellings change (counsellor portal only)
  const loadPrivateNote = useCallback(async (counsellingId: string) => {
    if (!isCounsellor) return;
    setNotesLoading(prev => ({ ...prev, [counsellingId]: true }));
    const note = await getPrivateNotesForCounselling(counsellingId);
    setPrivateNotes(prev => ({ ...prev, [counsellingId]: note }));
    setNotesLoading(prev => ({ ...prev, [counsellingId]: false }));
  }, [isCounsellor]);

  useEffect(() => {
    if (isCounsellor && counsellings.length > 0) {
      counsellings.forEach(c => loadPrivateNote(c.id));
    }
  }, [counsellings, isCounsellor, loadPrivateNote]);

  const openSchedule = (studentId?: string) => {
    setEditCounselling(null);
    setForm({
      student_id: studentId || '',
      counsellor_name: 'PSY CARE Counsellor',
      scheduled_date: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
      scheduled_time: '10:30 AM',
      counselling_type: 'Online',
      notes: '',
      reminder: '1 day before',
      status: 'scheduled',
    });
    setShowForm(true);
  };

  const openEdit = (c: Counselling) => {
    setEditCounselling(c);
    setForm({
      student_id: c.student_id,
      counsellor_name: c.counsellor_name || 'PSY CARE Counsellor',
      scheduled_date: c.scheduled_date || '',
      scheduled_time: c.scheduled_time || '10:30 AM',
      counselling_type: c.mode || 'Online',
      notes: c.notes || '',
      reminder: '1 day before',
      status: c.status || 'scheduled',
    });
    setShowForm(true);
  };

  const openAddNote = (c: Counselling) => {
    setNoteTargetCounselling(c);
    setNoteEditing(null);
    setShowNotesModal(true);
  };

  const openEditNote = (c: Counselling) => {
    setNoteTargetCounselling(c);
    setNoteEditing(privateNotes[c.id] ?? null);
    setShowNotesModal(true);
  };

  const handleNoteSaved = (note: CounsellorPrivateNote) => {
    setPrivateNotes(prev => ({ ...prev, [note.counselling_id]: note }));
  };

  const handleDeleteNote = async (counsellingId: string) => {
    const note = privateNotes[counsellingId];
    if (!note) return;
    const confirmed = window.confirm('Delete this private note? This cannot be undone.');
    if (!confirmed) return;
    const ok = await deletePrivateNote(note.id);
    if (ok) {
      setPrivateNotes(prev => ({ ...prev, [counsellingId]: null }));
      toast.success('Private note deleted.');
    } else {
      toast.error('Failed to delete note.');
    }
  };

  // Schedule Counselling Handler
  const handleScheduleCounselling = async () => {
    if (!form.student_id) {
      toast.error('Please select a student');
      return;
    }
    setSaving(true);

    const payload = {
      ...editCounselling,
      student_id: form.student_id,
      counsellor_name: form.counsellor_name,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      mode: form.counselling_type,
      notes: form.notes,
      reminder_option: form.reminder,
      status: 'scheduled' as const,
    };

    await upsertCounselling(payload as any);
    await updateStudent(form.student_id, { counselling_status: 'scheduled' });

    setSaving(false);
    setShowForm(false);
    toast.success('Counselling scheduled and student notified!');
    fetchData();
  };

  const studentsNeedingCounselling = students.filter(s =>
    s.payment_status === 'paid' &&
    (s.counselling_status === 'pending' || s.counselling_status === 'not_scheduled')
  );

  const filteredCounsellings = counsellings;

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setSessionPageSize('counselling', newSize);
    setPage(1);
  };

  // Column headers change based on portal
  const tableHeaders = isCounsellor
    ? ['Student', 'Student ID', 'Counsellor', 'Date', 'Time', 'Type', 'Status', 'Private Notes', 'Actions']
    : ['Student', 'Student ID', 'Counsellor', 'Date', 'Time', 'Type', 'Status', 'Actions'];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Counselling Management</h1>
            <p className="text-muted-foreground text-sm">
              Assign counsellors, set dates &amp; times, schedule sessions and dispatch student notifications
            </p>
          </div>
          <Button onClick={() => openSchedule()} className="gradient-bg border-0 text-white shrink-0 text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Schedule Counselling
          </Button>
        </div>

        {/* Students needing counselling */}
        {studentsNeedingCounselling.length > 0 && (
          <div className="glass-card rounded-xl p-5 border border-border">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-warning" /> Pending Counselling Assignment ({studentsNeedingCounselling.length})
            </h2>
            <div className="space-y-2">
              {studentsNeedingCounselling.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {s.full_name || s.email}
                      {s.student_id && <span className="text-xs text-muted-foreground ml-2 font-mono">[{s.student_id}]</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.selected_course || 'Not Selected'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s.counselling_status} />
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => openSchedule(s.id)}>
                      <Calendar className="w-3.5 h-3.5 mr-1" /> Schedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Sessions Table */}
        <div className="glass-card rounded-xl overflow-hidden border border-border shadow-sm">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground">All Counselling Sessions</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student or ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 w-52 bg-input border-border text-xs h-8"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {tableHeaders.map(h => (
                    <th key={h} className="px-3 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                      {h === 'Private Notes' ? (
                        <span className="flex items-center gap-1">
                          <Lock style={{ width: 12, height: 12, color: '#F59E0B' }} />
                          Private Notes
                        </span>
                      ) : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tableHeaders.length} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      <p className="mt-2 text-xs">Loading sessions...</p>
                    </td>
                  </tr>
                ) : filteredCounsellings.length === 0 ? (
                  <tr>
                    <td colSpan={tableHeaders.length} className="py-12 text-center text-muted-foreground">
                      No counselling sessions scheduled yet. Click &quot;Schedule Counselling&quot; above to create one.
                    </td>
                  </tr>
                ) : (
                  filteredCounsellings.map(c => {
                    const s = students.find(st => st.id === c.student_id);
                    const note = privateNotes[c.id];
                    const noteLoading = notesLoading[c.id];

                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-foreground">
                          {s?.full_name || 'Student'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-mono text-muted-foreground">
                          {s?.student_id || '-'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-foreground">
                          {c.counsellor_name || 'PSY CARE Counsellor'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                          {c.scheduled_date || '-'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                          {c.scheduled_time || '-'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium text-[11px]">
                            {c.mode || 'Online'}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <StatusBadge status={c.status} />
                        </td>

                        {/* Private Notes column — counsellor portal only */}
                        {isCounsellor && (
                          <td className="px-3 py-3" style={{ minWidth: 200, maxWidth: 260 }}>
                            {noteLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                            ) : note ? (
                              <div className="space-y-1">
                                <p
                                  className="text-xs leading-snug"
                                  style={{ color: '#172554' }}
                                  title={note.note_text}
                                >
                                  {note.note_text.length > 60
                                    ? note.note_text.slice(0, 60) + '…'
                                    : note.note_text}
                                </p>
                                <p style={{ color: '#94A3B8', fontSize: 10 }}>
                                  Updated {new Date(note.updated_at).toLocaleString()}
                                </p>
                                <div className="flex items-center gap-1 pt-0.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[11px]"
                                    style={{ color: '#172554' }}
                                    onClick={() => openEditNote(c)}
                                  >
                                    <Pencil className="w-3 h-3 mr-0.5" /> View / Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[11px]"
                                    style={{ color: '#DC2626' }}
                                    onClick={() => handleDeleteNote(c.id)}
                                  >
                                    <Trash2 className="w-3 h-3 mr-0.5" /> Delete
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-start gap-1">
                                <span style={{ color: '#64748B', fontSize: 11 }}>No private notes</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[11px]"
                                  style={{ borderColor: '#FED7AA', color: '#9A3412' }}
                                  onClick={() => openAddNote(c)}
                                >
                                  <Plus className="w-3 h-3 mr-0.5" /> Add Note
                                </Button>
                              </div>
                            )}
                          </td>
                        )}

                        <td className="px-3 py-3 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => openEdit(c)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })
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
            itemName="sessions"
            loading={loading}
          />
        </div>

        {/* ── SCHEDULE COUNSELLING DIALOG ── */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                {editCounselling ? 'Edit Counselling Details' : 'Assign & Schedule Student Counselling'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 pt-2 text-xs">
              {/* Select Student */}
              <div>
                <Label className="text-xs font-semibold">Select Student</Label>
                <select
                  value={form.student_id}
                  onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  className="w-full mt-1 bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none"
                >
                  <option value="">-- Choose student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.student_id ? `[${s.student_id}] ` : ''}{s.full_name || s.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Counsellor */}
              <div>
                <Label className="text-xs font-semibold">Counsellor</Label>
                <Input
                  value={form.counsellor_name}
                  onChange={e => setForm(f => ({ ...f, counsellor_name: e.target.value }))}
                  placeholder="PSY CARE Counsellor"
                  className="mt-1 bg-input border-border text-xs"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Counselling Date</Label>
                  <Input
                    type="date"
                    value={form.scheduled_date}
                    onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                    className="mt-1 bg-input border-border text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Counselling Time</Label>
                  <Input
                    value={form.scheduled_time}
                    onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                    placeholder="10:30 AM"
                    className="mt-1 bg-input border-border text-xs"
                  />
                </div>
              </div>

              {/* Counselling Type */}
              <div>
                <Label className="text-xs font-semibold">Counselling Type</Label>
                <select
                  value={form.counselling_type}
                  onChange={e => setForm(f => ({ ...f, counselling_type: e.target.value }))}
                  className="w-full mt-1 bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none"
                >
                  <option value="Online">Online (Google Meet / Zoom)</option>
                  <option value="In-Person">In-Person (PSY CARE Campus)</option>
                  <option value="Telephone">Telephone Guidance</option>
                </select>
              </div>

              {/* Reminder */}
              <div>
                <Label className="text-xs font-semibold">Reminder</Label>
                <select
                  value={form.reminder}
                  onChange={e => setForm(f => ({ ...f, reminder: e.target.value }))}
                  className="w-full mt-1 bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none"
                >
                  <option value="1 day before">1 day before</option>
                  <option value="3 days before">3 days before</option>
                  <option value="1 week before">1 week before</option>
                  <option value="3 hours before">3 hours before</option>
                  <option value="1 hour before">1 hour before</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs font-semibold">Notes &amp; Instructions</Label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Notes regarding academic questions, documents to keep ready, etc."
                  className="w-full mt-1 bg-input border border-border rounded-lg p-2.5 text-xs text-foreground outline-none resize-none"
                />
              </div>

              {/* Message Preview */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                <p className="text-[11px] font-bold text-foreground">Dispatched Student Notification Preview:</p>
                <p className="text-[11px] text-muted-foreground italic">
                  &quot;Your PSY CARE counselling session is scheduled for {form.scheduled_date || 'date'} at {form.scheduled_time || 'time'} with {form.counsellor_name}.&quot;
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  className="text-xs"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="gradient-bg border-0 text-white text-xs font-semibold px-5"
                  onClick={handleScheduleCounselling}
                  disabled={saving || !form.student_id}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Calendar className="w-3.5 h-3.5 mr-1.5" />}
                  Schedule Counselling
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── PRIVATE NOTES MODAL ── */}
        {isCounsellor && (
          <PrivateNotesModal
            open={showNotesModal}
            onClose={() => setShowNotesModal(false)}
            counselling={noteTargetCounselling}
            students={students}
            existingNote={noteEditing}
            onSaved={handleNoteSaved}
          />
        )}
      </div>
    </AdminLayout>
  );
}
