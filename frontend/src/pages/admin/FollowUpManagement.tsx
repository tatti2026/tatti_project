import { useEffect, useState, useCallback } from 'react';
import {
  getAllStudents, getFollowUps, getAllCounselling, upsertFollowUp,
  unlockStudentApplication, lockStudentApplication,
  getFollowUpNotes, addFollowUpNote, editFollowUpNote,
  type FollowUpNote,
} from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TablePagination, getSessionPageSize, setSessionPageSize } from '@/components/common/TablePagination';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Student, FollowUp, Counselling } from '@/types/index';
import {
  Plus, Pencil, Loader2, Trophy, Target,
  TrendingDown, Eye, Calendar, Lock, Unlock,
  StickyNote, Clock, ChevronRight, X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

function formatCounsellingDateTime(scheduledDate?: string | null, scheduledTime?: string | null): string | null {
  if (!scheduledDate) return null;
  try {
    const d = new Date(scheduledDate);
    if (isNaN(d.getTime())) return null;

    if (scheduledTime) {
      const timeParts = scheduledTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1], 10);
        const minutes = timeParts[2];
        const ampm = timeParts[4]?.toUpperCase();
        if (ampm) {
          return `${format(d, 'dd MMM yyyy')}, ${hours}:${minutes} ${ampm}`;
        } else {
          const ampmCalculated = hours >= 12 ? 'PM' : 'AM';
          const h12 = hours % 12 || 12;
          return `${format(d, 'dd MMM yyyy')}, ${h12}:${minutes} ${ampmCalculated}`;
        }
      }
      return `${format(d, 'dd MMM yyyy')}, ${scheduledTime}`;
    }

    return format(d, 'dd MMM yyyy');
  } catch {
    return null;
  }
}

function formatNoteDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a');
  } catch {
    return dateStr;
  }
}

// ── NOTES COLUMN CELL ──────────────────────────────────────
interface NotesColumnProps {
  student: Student;
  notes: FollowUpNote[];
  notesLoading: boolean;
  onAddNote: (s: Student) => void;
  onViewNotes: (s: Student, notes: FollowUpNote[]) => void;
}

function NotesColumn({ student, notes, notesLoading, onAddNote, onViewNotes }: NotesColumnProps) {
  const latest = notes[0];

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {notesLoading ? (
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      ) : latest ? (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-foreground/80 line-clamp-2 max-w-[160px] leading-snug">
            {latest.note}
          </p>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-2.5 h-2.5 shrink-0" />
            {formatNoteDate(latest.created_at)}
          </span>
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground italic">No notes yet</span>
      )}
      <div className="flex items-center gap-1 flex-wrap mt-0.5">
        <button
          type="button"
          onClick={() => onAddNote(student)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors border border-primary/25"
        >
          <Plus className="w-2.5 h-2.5" /> Add Note
        </button>
        {notes.length > 0 && (
          <button
            type="button"
            onClick={() => onViewNotes(student, notes)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground hover:bg-muted/70 transition-colors border border-border"
          >
            <StickyNote className="w-2.5 h-2.5" />
            View Notes ({notes.length})
            <ChevronRight className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function FollowUpManagement() {
  const { profile } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [counsellings, setCounsellings] = useState<Counselling[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFU, setEditFU] = useState<FollowUp | null>(null);
  const [pageSize, setPageSize] = useState(() => getSessionPageSize('followup', 10));
  const [pageBySegment, setPageBySegment] = useState<Record<string, number>>({ high: 1, medium: 1, low: 1 });
  const [totalsBySegment, setTotalsBySegment] = useState<Record<string, number>>({ high: 0, medium: 0, low: 0 });
  const [segmentPages, setSegmentPages] = useState<Record<string, number>>({ high: 1, medium: 1, low: 1 });
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    student: Student | null;
    action: 'unlock' | 'lock';
  }>({ open: false, student: null, action: 'unlock' });
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    intent_level: 'medium',
    followup_date: '',
    followup_status: 'pending',
    notes: ''
  });

  // ── NOTES STATE ──────────────────────────────────────────
  // Map of studentId → FollowUpNote[]
  const [notesMap, setNotesMap] = useState<Record<string, FollowUpNote[]>>({});
  const [notesLoadingSet, setNotesLoadingSet] = useState<Set<string>>(new Set());

  // Add Note Modal state
  const [addNoteDialog, setAddNoteDialog] = useState<{
    open: boolean;
    student: Student | null;
    editNote: FollowUpNote | null;
    text: string;
    saving: boolean;
  }>({ open: false, student: null, editNote: null, text: '', saving: false });

  // View Notes Modal state
  const [viewNotesDialog, setViewNotesDialog] = useState<{
    open: boolean;
    student: Student | null;
    notes: FollowUpNote[];
    editingId: string | null;
    editText: string;
    savingId: string | null;
  }>({ open: false, student: null, notes: [], editingId: null, editText: '', savingId: null });

  // ── FETCH NOTES FOR VISIBLE STUDENTS ─────────────────────
  const fetchNotesBatch = useCallback(async (studentIds: string[], force = false) => {
    const toFetch = force ? studentIds : studentIds.filter(id => !(id in notesMap));
    if (toFetch.length === 0) return;

    setNotesLoadingSet(prev => {
      const next = new Set(prev);
      toFetch.forEach(id => next.add(id));
      return next;
    });

    const results = await Promise.all(
      toFetch.map(async id => ({ id, notes: await getFollowUpNotes(id) }))
    );

    setNotesMap(prev => {
      const next = { ...prev };
      results.forEach(({ id, notes }) => { next[id] = notes; });
      return next;
    });

    setNotesLoadingSet(prev => {
      const next = new Set(prev);
      toFetch.forEach(id => next.delete(id));
      return next;
    });
  }, [notesMap]);

  // ── CORE DATA ─────────────────────────────────────────────
  const handleConfirmAction = async () => {
    if (!confirmDialog.student) return;
    setActionLoading(true);
    try {
      if (confirmDialog.action === 'unlock') {
        await unlockStudentApplication(confirmDialog.student.id, 'TATTI Head Administrator');
        toast.success(`Application unlocked for ${confirmDialog.student.full_name || 'student'}`);
      } else {
        await lockStudentApplication(confirmDialog.student.id, 'TATTI Head Administrator');
        toast.success(`Application locked for ${confirmDialog.student.full_name || 'student'}`);
      }
      await fetchData();
    } catch {
      toast.error(`Failed to ${confirmDialog.action} application`);
    } finally {
      setActionLoading(false);
      setConfirmDialog({ open: false, student: null, action: 'unlock' });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data }, fus, cList] = await Promise.all([
        getAllStudents(1, 1000),
        getFollowUps(),
        getAllCounselling(1, 1000),
      ]);
      setStudents(data || []);
      setFollowUps(Array.isArray(fus) ? fus : fus?.data || []);
      const cRows = Array.isArray(cList?.data) ? cList.data : Array.isArray(cList) ? cList : [];
      setCounsellings(cRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    (async () => {
      const nextTotals: Record<string, number> = { high: 0, medium: 0, low: 0 };
      for (const key of Object.keys(nextTotals) as Array<keyof typeof nextTotals>) {
        const result = await getFollowUps(pageBySegment[key] ?? 1, pageSize, key, '');
        const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
        nextTotals[key] = result?.pagination?.total ?? rows.length ?? 0;
      }
      setTotalsBySegment(nextTotals);
      setSegmentPages({ high: Math.max(1, Math.ceil((nextTotals.high || 0) / pageSize)), medium: Math.max(1, Math.ceil((nextTotals.medium || 0) / pageSize)), low: Math.max(1, Math.ceil((nextTotals.low || 0) / pageSize)) });
    })();
  }, [pageSize, pageBySegment]);

  // ── FOLLOW-UP helpers ─────────────────────────────────────
  const getStudentFU = (studentId: string) => followUps.find(f => f.student_id === studentId);

  const openAdd = (intent: string, studentId?: string) => {
    const existing = studentId ? getStudentFU(studentId) : null;
    if (existing) {
      openEdit(existing);
      return;
    }
    setEditFU(null);
    const sid = studentId || '';
    const stNotes = sid && notesMap[sid] ? notesMap[sid] : [];
    const latestNoteText = stNotes.length > 0 ? stNotes[0].note : '';
    setForm({
      student_id: sid,
      intent_level: intent,
      followup_date: format(new Date(), 'yyyy-MM-dd'),
      followup_status: 'pending',
      notes: latestNoteText
    });
    setShowForm(true);

    if (sid && !notesMap[sid]) {
      getFollowUpNotes(sid).then(fetched => {
        setNotesMap(prev => ({ ...prev, [sid]: fetched }));
        if (fetched.length > 0) {
          setForm(curr => (curr.student_id === sid ? { ...curr, notes: fetched[0].note } : curr));
        }
      });
    }
  };

  const openEdit = (fu: FollowUp) => {
    setEditFU(fu);
    const stNotes = notesMap[fu.student_id];
    const initialNote = stNotes && stNotes.length > 0 ? stNotes[0].note : fu.notes || '';
    setForm({
      student_id: fu.student_id,
      intent_level: fu.intent_level || 'medium',
      followup_date: fu.followup_date || format(new Date(), 'yyyy-MM-dd'),
      followup_status: fu.followup_status || 'pending',
      notes: initialNote
    });
    setShowForm(true);

    if (!notesMap[fu.student_id]) {
      getFollowUpNotes(fu.student_id).then(fetched => {
        setNotesMap(prev => ({ ...prev, [fu.student_id]: fetched }));
        if (fetched.length > 0) {
          setForm(curr => (curr.student_id === fu.student_id ? { ...curr, notes: fetched[0].note } : curr));
        }
      });
    }
  };

  const handleSave = async () => {
    if (!form.student_id) {
      toast.error('Please select a student');
      return;
    }
    setSaving(true);
    try {
      const existing = editFU || getStudentFU(form.student_id);
      const adminName = profile?.full_name || profile?.email || 'Admin';

      await upsertFollowUp({
        ...(existing ? { id: existing.id } : {}),
        ...form,
        admin_name: adminName,
        intent_level: form.intent_level as FollowUp['intent_level']
      });

      // Refetch the updated notes for this student immediately from the backend database
      const updatedNotes = await getFollowUpNotes(form.student_id);
      setNotesMap(prev => ({
        ...prev,
        [form.student_id]: updatedNotes,
      }));

      setShowForm(false);
      toast.success('Follow-up record saved successfully');
      await fetchData();
    } catch (err) {
      console.error('Failed to save follow-up:', err);
      toast.error('Failed to save follow-up');
    } finally {
      setSaving(false);
    }
  };

  // ── NOTES handlers ────────────────────────────────────────
  const openAddNoteDialog = (student: Student, editNote?: FollowUpNote) => {
    setAddNoteDialog({
      open: true,
      student,
      editNote: editNote || null,
      text: editNote?.note || '',
      saving: false,
    });
  };

  const handleSaveNote = async () => {
    const { student, editNote, text } = addNoteDialog;
    if (!student) return;
    if (!text.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }
    setAddNoteDialog(d => ({ ...d, saving: true }));
    try {
      const adminName = profile?.full_name || profile?.email || 'Admin';
      if (editNote) {
        const updated = await editFollowUpNote(student.id, editNote.id, text.trim());
        if (updated) {
          setNotesMap(prev => ({
            ...prev,
            [student.id]: (prev[student.id] || []).map(n => n.id === editNote.id ? updated : n),
          }));
          toast.success('Note updated successfully');
        } else {
          toast.error('Failed to update note');
        }
      } else {
        const created = await addFollowUpNote(student.id, text.trim(), adminName);
        if (created) {
          setNotesMap(prev => ({
            ...prev,
            [student.id]: [created, ...(prev[student.id] || [])],
          }));
          setFollowUps(prev => prev.map(fu => fu.student_id === student.id ? { ...fu, notes: text.trim() } : fu));
          toast.success('Note added successfully');
        } else {
          toast.error('Failed to add note');
        }
      }
      setAddNoteDialog({ open: false, student: null, editNote: null, text: '', saving: false });
    } finally {
      setAddNoteDialog(d => ({ ...d, saving: false, open: d.saving ? false : d.open }));
    }
  };

  const openViewNotes = (student: Student, notes: FollowUpNote[]) => {
    setViewNotesDialog({
      open: true, student, notes,
      editingId: null, editText: '', savingId: null,
    });
  };

  const handleInlineEdit = async (noteId: string) => {
    const { student, editText } = viewNotesDialog;
    if (!student || !editText.trim()) return;
    setViewNotesDialog(d => ({ ...d, savingId: noteId }));
    try {
      const updated = await editFollowUpNote(student.id, noteId, editText.trim());
      if (updated) {
        const newNotes = viewNotesDialog.notes.map(n => n.id === noteId ? updated : n);
        setViewNotesDialog(d => ({ ...d, notes: newNotes, editingId: null, editText: '', savingId: null }));
        setNotesMap(prev => ({ ...prev, [student.id]: newNotes }));
        toast.success('Note updated');
      } else {
        toast.error('Failed to update note');
        setViewNotesDialog(d => ({ ...d, savingId: null }));
      }
    } catch {
      toast.error('Failed to update note');
      setViewNotesDialog(d => ({ ...d, savingId: null }));
    }
  };

  // ── SEGMENTATION ──────────────────────────────────────────
  const getStudentIntent = (studentId: string): 'high' | 'medium' | 'low' => {
    const fu = getStudentFU(studentId);
    if (fu?.intent_level === 'high') return 'high';
    if (fu?.intent_level === 'medium') return 'medium';
    if (fu?.intent_level === 'low') return 'low';
    return 'low';
  };

  const high = students.filter(s => getStudentIntent(s.id) === 'high');
  const medium = students.filter(s => getStudentIntent(s.id) === 'medium');
  const low = students.filter(s => getStudentIntent(s.id) === 'low');

  const segmentData = {
    high: high.slice((pageBySegment.high - 1) * pageSize, (pageBySegment.high) * pageSize),
    medium: medium.slice((pageBySegment.medium - 1) * pageSize, (pageBySegment.medium) * pageSize),
    low: low.slice((pageBySegment.low - 1) * pageSize, (pageBySegment.low) * pageSize),
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setSessionPageSize('followup', newSize);
    setPageBySegment(prev => ({ ...prev, high: 1, medium: 1, low: 1 }));
  };

  const segments = [
    { key: 'high', label: 'HIGH INTENT', students: high, icon: Trophy, color: 'text-success', bgColor: 'bg-success/10 border-success/20', tagColor: 'bg-success/20 text-success' },
    { key: 'medium', label: 'MEDIUM INTENT', students: medium, icon: Target, color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20', tagColor: 'bg-warning/20 text-warning' },
    { key: 'low', label: 'LOW INTENT', students: low, icon: TrendingDown, color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20', tagColor: 'bg-destructive/20 text-destructive' },
  ];

  // Prefetch notes for currently visible students
  useEffect(() => {
    const visibleIds = [
      ...segmentData.high,
      ...segmentData.medium,
      ...segmentData.low,
    ].map(s => s.id);
    if (visibleIds.length > 0) {
      fetchNotesBatch(visibleIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, pageBySegment, pageSize]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Follow-up Management</h1>
            <p className="text-muted-foreground text-sm">Track admissions progress, follow-ups, and update student status</p>
          </div>
          <Button onClick={() => openAdd('medium')} className="gradient-bg border-0 text-white text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Follow-up
          </Button>
        </div>

        <Tabs defaultValue="high">
          <TabsList className="bg-muted">
            {segments.map(({ key, label, students: seg }) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {label} ({seg.length})
              </TabsTrigger>
            ))}
          </TabsList>

          {segments.map(({ key, label, students: seg, icon: Icon, color, bgColor, tagColor }) => (
            <TabsContent key={key} value={key} className="mt-4">
              <div className={`rounded-xl p-4 border mb-4 ${bgColor}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className={`text-sm font-bold ${color}`}>{label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tagColor}`}>{seg.length} students</span>
                </div>
              </div>

              {seg.length === 0 ? (
                <div className="glass-card rounded-xl p-12 text-center text-muted-foreground text-sm">
                  No students in this segment
                </div>
              ) : (
                <div className="glass-card rounded-xl overflow-hidden border border-border">
                  {/* ── DESKTOP TABLE ── */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-xs" style={{ minWidth: '900px' }}>
                      <colgroup>
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '6%' }} />
                      </colgroup>
                      <thead className="bg-muted/50 border-b border-border text-muted-foreground sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Student Name</th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Student ID</th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Career Fit Assessment</th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Counselling</th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Notes</th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Application Access</th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-[10px]">Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {segmentData[key as keyof typeof segmentData].map(s => {
                          const fu = getStudentFU(s.id);
                          const c = counsellings.find(couns => couns.student_id === s.id);
                          const formattedDate = formatCounsellingDateTime(c?.scheduled_date, c?.scheduled_time);
                          const isScheduled = c && c.status && c.status !== 'not_scheduled' && formattedDate;
                          const studentNotes = notesMap[s.id] || [];
                          const noteLoading = notesLoadingSet.has(s.id);

                          return (
                            <tr key={s.id} className="hover:bg-muted/40 transition-colors align-top">
                              {/* Student Name */}
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center shrink-0 shadow-sm text-xs font-bold text-white">
                                    {(s.full_name || s.email || 'S')[0].toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => setViewStudent(s)}
                                      className="font-semibold text-foreground text-xs hover:text-primary transition-colors flex items-center gap-1 text-left w-full min-w-0"
                                      title="View Student Details"
                                    >
                                      <span className="truncate block max-w-[150px]">{s.full_name || 'Unnamed Student'}</span>
                                      <Eye className="w-3 h-3 text-muted-foreground hover:text-primary shrink-0" />
                                    </button>
                                    <p className="text-[11px] text-muted-foreground truncate max-w-[150px]" title={s.email || '-'}>{s.email || '-'}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Student ID */}
                              <td className="px-3 py-3 font-mono font-bold text-primary text-[11px] whitespace-normal break-all">
                                {s.student_id || '-'}
                              </td>

                              {/* Career Fit Assessment */}
                              <td className="px-3 py-3">
                                <StatusBadge status={s.assessment_status || 'not_started'} />
                              </td>

                              {/* Counselling */}
                              <td className="px-3 py-3">
                                {isScheduled ? (
                                  <div className="flex flex-col gap-1 items-start">
                                    <StatusBadge status={c.status || s.counselling_status || 'scheduled'} />
                                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-primary shrink-0" />
                                      {formattedDate}
                                    </span>
                                  </div>
                                ) : s.counselling_status && s.counselling_status !== 'not_scheduled' ? (
                                  <StatusBadge status={s.counselling_status} />
                                ) : (
                                  <StatusBadge status="not_scheduled" />
                                )}
                              </td>

                              {/* Notes */}
                              <td className="px-3 py-3 align-top">
                                <NotesColumn
                                  student={s}
                                  notes={studentNotes}
                                  notesLoading={noteLoading}
                                  onAddNote={st => openAddNoteDialog(st)}
                                  onViewNotes={(st, notes) => openViewNotes(st, notes)}
                                />
                              </td>

                              {/* Application Access */}
                              <td className="px-3 py-3 align-top">
                                <div className="flex flex-col gap-2">
                                  {s.application_access_status === 'unlocked' ? (
                                    <>
                                      <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full font-medium text-[11px] w-fit" title={s.application_unlocked_by ? `Unlocked by ${s.application_unlocked_by}` : 'Application Unlocked'}>
                                        <Unlock className="w-3 h-3" />
                                        <span>Unlocked</span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px] text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 w-fit"
                                        title="Lock student application access"
                                        onClick={() => setConfirmDialog({ open: true, student: s, action: 'lock' })}
                                      >
                                        <Lock className="w-3 h-3 mr-1" /> Lock
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-full font-medium text-[11px] w-fit" title="Application Locked">
                                        <Lock className="w-3 h-3" />
                                        <span>Locked</span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px] text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 w-fit"
                                        title="Unlock student application access"
                                        onClick={() => setConfirmDialog({ open: true, student: s, action: 'unlock' })}
                                      >
                                        <Unlock className="w-3 h-3 mr-1" /> Unlock
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* Update */}
                              <td className="px-3 py-3 text-right align-top">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-[11px] text-foreground hover:border-primary hover:text-primary"
                                  title="Update Follow-up Status"
                                  onClick={() => (fu ? openEdit(fu) : openAdd(key, s.id))}
                                >
                                  <Pencil className="w-3 h-3 mr-1 text-primary" /> Update
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* ── MOBILE CARDS ── */}
                  <div className="lg:hidden space-y-3 p-3">
                    {segmentData[key as keyof typeof segmentData].map(s => {
                      const fu = getStudentFU(s.id);
                      const c = counsellings.find(couns => couns.student_id === s.id);
                      const formattedDate = formatCounsellingDateTime(c?.scheduled_date, c?.scheduled_time);
                      const isScheduled = c && c.status && c.status !== 'not_scheduled' && formattedDate;
                      const studentNotes = notesMap[s.id] || [];
                      const noteLoading = notesLoadingSet.has(s.id);

                      return (
                        <div key={s.id} className="rounded-xl border border-border bg-card/60 p-3 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center shrink-0 shadow-sm text-sm font-bold text-white">
                              {(s.full_name || s.email || 'S')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => setViewStudent(s)}
                                className="font-semibold text-foreground text-sm hover:text-primary transition-colors flex items-center gap-1 text-left"
                                title="View Student Details"
                              >
                                <span className="truncate block">{s.full_name || 'Unnamed Student'}</span>
                                <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              </button>
                              <p className="text-[11px] text-muted-foreground mt-0.5 break-all">{s.email || '-'}</p>
                            </div>
                          </div>

                          <div className="space-y-2 text-[11px] text-muted-foreground">
                            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2 py-1.5 border border-border/40">
                              <span>Student ID</span>
                              <span className="font-mono font-bold text-primary text-right break-all">{s.student_id || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2 py-1.5 border border-border/40">
                              <span>Assessment</span>
                              <StatusBadge status={s.assessment_status || 'not_started'} />
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2 py-1.5 border border-border/40">
                              <span>Counselling</span>
                              <div className="flex flex-col items-end gap-1">
                                {isScheduled ? (
                                  <>
                                    <StatusBadge status={c.status || s.counselling_status || 'scheduled'} />
                                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                      <Calendar className="w-2.5 h-2.5 text-primary shrink-0" />
                                      {formattedDate}
                                    </span>
                                  </>
                                ) : s.counselling_status && s.counselling_status !== 'not_scheduled' ? (
                                  <StatusBadge status={s.counselling_status} />
                                ) : (
                                  <StatusBadge status="not_scheduled" />
                                )}
                              </div>
                            </div>

                            {/* Mobile Notes section */}
                            <div className="rounded-md bg-muted/30 px-2 py-2 border border-border/40 space-y-2">
                              <span className="font-semibold text-foreground text-[11px]">Notes</span>
                              <NotesColumn
                                student={s}
                                notes={studentNotes}
                                notesLoading={noteLoading}
                                onAddNote={st => openAddNoteDialog(st)}
                                onViewNotes={(st, n) => openViewNotes(st, n)}
                              />
                            </div>

                            <div className="rounded-md bg-muted/30 px-2 py-1.5 border border-border/40">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span>Application Access</span>
                              </div>
                              {s.application_access_status === 'unlocked' ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full font-medium text-[11px]">
                                    <Unlock className="w-3 h-3" />
                                    <span>Unlocked</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[11px] text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                                    onClick={() => setConfirmDialog({ open: true, student: s, action: 'lock' })}
                                  >
                                    <Lock className="w-3 h-3 mr-1" /> Lock
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-full font-medium text-[11px]">
                                    <Lock className="w-3 h-3" />
                                    <span>Locked</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[11px] text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
                                    onClick={() => setConfirmDialog({ open: true, student: s, action: 'unlock' })}
                                  >
                                    <Unlock className="w-3 h-3 mr-1" /> Unlock
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 px-3 text-xs text-foreground hover:border-primary hover:text-primary"
                            onClick={() => (fu ? openEdit(fu) : openAdd(key, s.id))}
                          >
                            <Pencil className="w-3 h-3 mr-1 text-primary" /> Update
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  <TablePagination
                    currentPage={pageBySegment[key] ?? 1}
                    totalPages={Math.max(1, Math.ceil((seg.length || 0) / pageSize))}
                    totalItems={seg.length}
                    pageSize={pageSize}
                    onPageChange={page => setPageBySegment(prev => ({ ...prev, [key]: page }))}
                    onPageSizeChange={handlePageSizeChange}
                    itemName="students"
                    loading={loading}
                  />
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* ── FOLLOW-UP / EDIT DIALOG ── */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                {editFU ? 'Update Follow-up Status' : 'Follow-up & Add Note'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3.5 pt-2">
              <div>
                <Label className="text-xs font-semibold">Student</Label>
                <select
                  value={form.student_id}
                  onChange={e => {
                    const sid = e.target.value;
                    const existingFU = getStudentFU(sid);
                    const stNotes = sid && notesMap[sid] ? notesMap[sid] : [];
                    const latestNoteText = stNotes.length > 0 ? stNotes[0].note : existingFU?.notes || '';
                    setEditFU(existingFU || null);
                    setForm(f => ({
                      ...f,
                      student_id: sid,
                      intent_level: existingFU?.intent_level || f.intent_level || 'medium',
                      followup_date: existingFU?.followup_date || f.followup_date || format(new Date(), 'yyyy-MM-dd'),
                      followup_status: existingFU?.followup_status || f.followup_status || 'pending',
                      notes: latestNoteText
                    }));
                    if (sid && !notesMap[sid]) {
                      getFollowUpNotes(sid).then(fetched => {
                        setNotesMap(prev => ({ ...prev, [sid]: fetched }));
                        if (fetched.length > 0) {
                          setForm(curr => (curr.student_id === sid ? { ...curr, notes: fetched[0].note } : curr));
                        }
                      });
                    }
                  }}
                  className="w-full mt-1 bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none"
                >
                  <option value="">Select a student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.email} {s.student_id ? `(${s.student_id})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Follow-up Date</Label>
                  <Input
                    type="date"
                    value={form.followup_date}
                    onChange={e => setForm(f => ({ ...f, followup_date: e.target.value }))}
                    className="mt-1 bg-input border-border text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Status</Label>
                  <select
                    value={form.followup_status}
                    onChange={e => setForm(f => ({ ...f, followup_status: e.target.value }))}
                    className="w-full mt-1 bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Intent Level</Label>
                <select
                  value={form.intent_level}
                  onChange={e => setForm(f => ({ ...f, intent_level: e.target.value }))}
                  className="w-full mt-1 bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none"
                >
                  <option value="high">High Intent</option>
                  <option value="medium">Medium Intent</option>
                  <option value="low">Low Intent</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Follow-up Notes / Remarks</Label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Enter details regarding discussions, candidate intent, next steps..."
                  className="w-full mt-1 bg-input border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 text-xs" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 gradient-bg border-0 text-white text-xs font-semibold"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Save Follow-up
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── ADD / EDIT NOTE DIALOG ── */}
        <Dialog open={addNoteDialog.open} onOpenChange={open => !addNoteDialog.saving && setAddNoteDialog(d => ({ ...d, open }))}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-primary" />
                {addNoteDialog.editNote ? 'Edit Note' : 'Add Note'}
              </DialogTitle>
            </DialogHeader>
            {addNoteDialog.student && (
              <div className="space-y-4 pt-1">
                {/* Student info pill */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
                  <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center shrink-0 text-sm font-bold text-white shadow-sm">
                    {(addNoteDialog.student.full_name || addNoteDialog.student.email || 'S')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm truncate">{addNoteDialog.student.full_name || 'Unnamed Student'}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{addNoteDialog.student.student_id || '-'}</p>
                  </div>
                </div>

                {/* Note textarea */}
                <div>
                  <Label className="text-xs font-semibold text-foreground mb-1.5 block">Notes / Remarks</Label>
                  <textarea
                    value={addNoteDialog.text}
                    onChange={e => setAddNoteDialog(d => ({ ...d, text: e.target.value }))}
                    rows={5}
                    autoFocus
                    placeholder="Enter your note about this student — next steps, discussions, observations..."
                    className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-xs text-foreground outline-none resize-none focus:border-primary/50 transition-colors leading-relaxed"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => setAddNoteDialog({ open: false, student: null, editNote: null, text: '', saving: false })}
                    disabled={addNoteDialog.saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gradient-bg border-0 text-white text-xs font-semibold"
                    onClick={handleSaveNote}
                    disabled={addNoteDialog.saving || !addNoteDialog.text.trim()}
                  >
                    {addNoteDialog.saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <StickyNote className="w-3.5 h-3.5 mr-1.5" />}
                    {addNoteDialog.editNote ? 'Update Note' : 'Save Note'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── VIEW NOTES HISTORY DIALOG ── */}
        <Dialog open={viewNotesDialog.open} onOpenChange={open => setViewNotesDialog(d => ({ ...d, open }))}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl bg-card border-border max-h-[80vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-primary" />
                Notes History
                {viewNotesDialog.student && (
                  <span className="text-muted-foreground font-normal text-sm ml-1">
                    — {viewNotesDialog.student.full_name || 'Student'}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
              {viewNotesDialog.notes.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">No notes yet</div>
              ) : (
                viewNotesDialog.notes.map((n, idx) => (
                  <div
                    key={n.id}
                    className="relative rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 group hover:border-primary/30 transition-colors"
                    style={{ borderLeft: '3px solid hsl(var(--primary) / 0.4)' }}
                  >
                    {/* Note header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center shrink-0 text-[10px] font-bold text-white">
                          {(n.admin_name || 'A')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground text-[12px]">{n.admin_name}</span>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>{formatNoteDate(n.created_at)}</span>
                            {n.updated_at !== n.created_at && (
                              <span className="text-muted-foreground/60 italic ml-1">(edited)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewNotesDialog(d => ({
                          ...d,
                          editingId: d.editingId === n.id ? null : n.id,
                          editText: n.note,
                        }))}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary shrink-0"
                        title="Edit note"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Note body / edit */}
                    {viewNotesDialog.editingId === n.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={viewNotesDialog.editText}
                          onChange={e => setViewNotesDialog(d => ({ ...d, editText: e.target.value }))}
                          rows={3}
                          autoFocus
                          className="w-full bg-input border border-primary/30 rounded-lg px-2.5 py-2 text-xs text-foreground outline-none resize-none"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setViewNotesDialog(d => ({ ...d, editingId: null, editText: '' }))}
                            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Cancel
                          </button>
                          <Button
                            size="sm"
                            className="h-7 px-3 text-[11px] gradient-bg border-0 text-white font-semibold"
                            onClick={() => handleInlineEdit(n.id)}
                            disabled={viewNotesDialog.savingId === n.id}
                          >
                            {viewNotesDialog.savingId === n.id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{n.note}</p>
                    )}

                    {/* Timeline connector */}
                    {idx < viewNotesDialog.notes.length - 1 && (
                      <div className="absolute left-[-1px] bottom-[-13px] w-[3px] h-3 bg-primary/20" />
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="shrink-0 pt-2 flex justify-between items-center border-t border-border mt-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                onClick={() => {
                  if (viewNotesDialog.student) {
                    openAddNoteDialog(viewNotesDialog.student);
                    setViewNotesDialog(d => ({ ...d, open: false }));
                  }
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add New Note
              </button>
              <Button variant="outline" size="sm" onClick={() => setViewNotesDialog(d => ({ ...d, open: false }))}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── VIEW STUDENT DETAILS DIALOG ── */}
        <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                {viewStudent?.full_name || 'Student Details'}
              </DialogTitle>
            </DialogHeader>
            {viewStudent && (
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg border border-border">
                  <p className="text-muted-foreground">Student ID: <span className="font-mono font-medium text-foreground">{viewStudent.student_id || '-'}</span></p>
                  <p className="text-muted-foreground mt-1">Email: <span className="font-medium text-foreground">{viewStudent.email || '-'}</span></p>
                  <p className="text-muted-foreground mt-1">Phone: <span className="font-medium text-foreground">{viewStudent.phone || '-'}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-muted/30 rounded-lg border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Parent Name</p>
                    <p className="font-medium text-foreground mt-0.5">{viewStudent.parent_name || '-'}</p>
                  </div>
                  <div className="p-2.5 bg-muted/30 rounded-lg border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Parent Phone</p>
                    <p className="font-medium text-foreground mt-0.5">{viewStudent.parent_phone || '-'}</p>
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Course:</span>
                    <span className="font-medium text-foreground">{viewStudent.selected_course || 'Not Selected'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Career Fit Assessment:</span>
                    <StatusBadge status={viewStudent.assessment_status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Counselling Status:</span>
                    <StatusBadge status={viewStudent.counselling_status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Payment Status:</span>
                    <StatusBadge status={viewStudent.payment_status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Admission Status:</span>
                    <StatusBadge status={viewStudent.admission_status} />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="outline" size="sm" onClick={() => setViewStudent(null)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── LOCK / UNLOCK CONFIRMATION DIALOG ── */}
        <AlertDialog open={confirmDialog.open} onOpenChange={open => !actionLoading && setConfirmDialog(d => ({ ...d, open }))}>
          <AlertDialogContent className="bg-card border-border max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                {confirmDialog.action === 'unlock' ? (
                  <>
                    <Unlock className="w-5 h-5 text-emerald-500" />
                    Unlock Application Process?
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 text-rose-500" />
                    Lock Application Process?
                  </>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-sm pt-1">
                {confirmDialog.action === 'unlock'
                  ? `Are you sure you want to allow ${confirmDialog.student?.full_name || 'this student'} to start the application process? They will be permitted to fill out their personal details, select courses, and proceed to payment.`
                  : `Are you sure you want to prevent ${confirmDialog.student?.full_name || 'this student'} from accessing the application process? Their application form, submissions, and payments will be strictly locked.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault();
                  handleConfirmAction();
                }}
                disabled={actionLoading}
                className={
                  confirmDialog.action === 'unlock'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
                    : 'bg-destructive hover:bg-destructive/90 text-white font-semibold'
                }
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : confirmDialog.action === 'unlock' ? (
                  <Unlock className="w-4 h-4 mr-1.5" />
                ) : (
                  <Lock className="w-4 h-4 mr-1.5" />
                )}
                {confirmDialog.action === 'unlock' ? 'Unlock' : 'Lock'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
