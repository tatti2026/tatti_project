import { useEffect, useState } from 'react';
import { getAllStudents, getFollowUps, upsertFollowUp, unlockStudentApplication, lockStudentApplication } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Student, FollowUp } from '@/types/index';
import {
  ClipboardList, Plus, Pencil, Loader2, Trophy, Target,
  TrendingDown, CalendarPlus2, Eye, Calendar, Clock, Lock, Unlock, Shield
} from 'lucide-react';
import { format } from 'date-fns';

export default function FollowUpManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFU, setEditFU] = useState<FollowUp | null>(null);
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
    const [{ data }, fus] = await Promise.all([getAllStudents(0, 1000), getFollowUps()]);
    setStudents(data);
    setFollowUps(fus);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = (intent: string, studentId?: string) => {
    setEditFU(null);
    setForm({
      student_id: studentId || '',
      intent_level: intent,
      followup_date: format(new Date(), 'yyyy-MM-dd'),
      followup_status: 'pending',
      notes: ''
    });
    setShowForm(true);
  };

  const openEdit = (fu: FollowUp) => {
    setEditFU(fu);
    setForm({
      student_id: fu.student_id,
      intent_level: fu.intent_level,
      followup_date: fu.followup_date || '',
      followup_status: fu.followup_status || 'pending',
      notes: fu.notes || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.student_id) {
      toast.error('Please select a student');
      return;
    }
    setSaving(true);
    await upsertFollowUp({
      ...editFU,
      ...form,
      intent_level: form.intent_level as FollowUp['intent_level']
    });
    setSaving(false);
    setShowForm(false);
    toast.success('Follow-up record saved successfully');
    fetchData();
  };

  // Segment students
  const high = students.filter(s =>
    s.assessment_status === 'completed' &&
    (s.payment_status === 'paid' || s.application_status === 'submitted')
  );
  const medium = students.filter(s =>
    s.assessment_status === 'completed' && s.payment_status !== 'paid'
  );
  const low = students.filter(s => s.assessment_status !== 'completed');

  const getStudentFU = (studentId: string) => followUps.find(f => f.student_id === studentId);

  const segments = [
    { key: 'high', label: 'HIGH INTENT', students: high, icon: Trophy, color: 'text-success', bgColor: 'bg-success/10 border-success/20', tagColor: 'bg-success/20 text-success' },
    { key: 'medium', label: 'MEDIUM INTENT', students: medium, icon: Target, color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20', tagColor: 'bg-warning/20 text-warning' },
    { key: 'low', label: 'LOW INTENT', students: low, icon: TrendingDown, color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20', tagColor: 'bg-destructive/20 text-destructive' },
  ];

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
            <p className="text-muted-foreground text-sm">Track admissions progress, schedule follow-ups, and update student status</p>
          </div>
          <Button onClick={() => openAdd('medium')} className="gradient-bg border-0 text-white text-xs">
            <Plus className="w-4 h-4 mr-1.5" /> Schedule Follow-up
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
                <div className="space-y-3">
                  {seg.map(s => {
                    const fu = getStudentFU(s.id);
                    return (
                      <div key={s.id} className="glass-card rounded-xl p-4 hover:border-primary/30 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center shrink-0 shadow-sm">
                              <span className="text-xs font-bold text-white">{(s.full_name || s.email || 'S')[0].toUpperCase()}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-foreground">{s.full_name || 'Student'}</p>
                                <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.2 rounded bg-muted">
                                  {s.student_id || '-'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{s.email || '-'}</p>

                              {fu && (
                                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                  {fu.followup_date && (
                                    <span className="flex items-center gap-1 font-medium text-foreground">
                                      <Calendar className="w-3 h-3 text-primary" /> {fu.followup_date}
                                    </span>
                                  )}
                                  {fu.followup_status && <StatusBadge status={fu.followup_status} />}
                                  {fu.notes && (
                                    <span className="truncate max-w-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                                      Note: {fu.notes}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                            <StatusBadge status={s.payment_status} />
                            <StatusBadge status={s.assessment_status} />

                            {/* Application Access Badge */}
                            <div className="flex flex-col items-start text-[11px]">
                              {s.application_access_status === 'unlocked' ? (
                                <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium" title={s.application_unlocked_by ? `Unlocked by ${s.application_unlocked_by}` : 'Application Unlocked'}>
                                  <Unlock className="w-3 h-3" />
                                  <span>Unlocked</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full font-medium" title="Application Locked">
                                  <Lock className="w-3 h-3" />
                                  <span>Locked</span>
                                </div>
                              )}
                            </div>

                            {/* Lock / Unlock Application Process Action Button */}
                            {s.application_access_status === 'unlocked' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                                title="Lock student application access"
                                onClick={() => setConfirmDialog({ open: true, student: s, action: 'lock' })}
                              >
                                <Lock className="w-3.5 h-3.5 mr-1" /> Lock Application
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
                                title="Unlock student application access"
                                onClick={() => setConfirmDialog({ open: true, student: s, action: 'unlock' })}
                              >
                                <Unlock className="w-3.5 h-3.5 mr-1" /> Unlock Application
                              </Button>
                            )}

                            {/* Action Buttons: View Student, Add Note / Schedule Follow-up, Update Status */}
                            {/* Strictly NO Call, Email or Message icon buttons */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-xs hover:text-primary"
                              title="View Student Details"
                              onClick={() => setViewStudent(s)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View Student
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs"
                              title="Add Note or Schedule Follow-up"
                              onClick={() => openAdd(key, s.id)}
                            >
                              <CalendarPlus2 className="w-3.5 h-3.5 mr-1 text-primary" /> Add Note
                            </Button>

                            {fu && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs text-foreground"
                                title="Update Follow-up Status"
                                onClick={() => openEdit(fu)}
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1 text-primary" /> Update Status
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* ── SCHEDULE / EDIT FOLLOW-UP DIALOG ── */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                {editFU ? 'Update Follow-up Status' : 'Schedule Follow-up & Add Note'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3.5 pt-2">
              <div>
                <Label className="text-xs font-semibold">Student</Label>
                <select
                  value={form.student_id}
                  onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
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
