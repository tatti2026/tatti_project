import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAllStudents, getFollowUps, getAllCounselling, upsertFollowUp, unlockStudentApplication, lockStudentApplication } from '@/lib/api';
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
  TrendingDown, Eye, Calendar, Lock, Unlock, BellRing, CheckCircle2, Clock3, CalendarClock
} from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { getFollowUpScheduledAt, isFollowUpReminderDue } from '@/utils/followUpReminder';

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

export default function FollowUpManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [reminderClock, setReminderClock] = useState(() => new Date());
  const [activeReminderKey, setActiveReminderKey] = useState<string | null>(null);
  const [acknowledgedReminderKeys, setAcknowledgedReminderKeys] = useState<Set<string>>(() => new Set());
  const [snoozedReminders, setSnoozedReminders] = useState<Record<string, number>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeReminderKeyRef = useRef<string | null>(null);
  const playedReminderKeyRef = useRef<string | null>(null);
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
    followup_time: '',
    followup_status: 'pending',
    notes: ''
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setReminderClock(new Date());
      getFollowUps()
        .then(result => setFollowUps(Array.isArray(result) ? result : result?.data || []))
        .catch(error => console.error('Failed to refresh follow-up reminders:', error));
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const handleConfirmAction = async () => {
    if (!confirmDialog.student) return;
    setActionLoading(true);
    try {
      if (confirmDialog.action === 'unlock') {
        await unlockStudentApplication(confirmDialog.student.id, 'PSY CARE Head Administrator');
        toast.success(`Application unlocked for ${confirmDialog.student.full_name || 'student'}`);
      } else {
        await lockStudentApplication(confirmDialog.student.id, 'PSY CARE Head Administrator');
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

  const upcomingFollowUpReminders = useMemo(() => followUps.flatMap(followUp => {
      if (!isFollowUpReminderDue(followUp, reminderClock)) return [];

      const scheduledAt = getFollowUpScheduledAt(followUp);
      if (!scheduledAt) return [];

      const student = students.find(item => item.id === followUp.student_id);
      return [{
        key: `${followUp.id}-${scheduledAt.getTime()}`,
        studentName: student?.full_name || student?.email || 'Student',
        studentId: student?.student_id || '-',
        studentEmail: student?.email || '-',
        followUpNote: followUp.notes?.trim() || '',
        scheduledAt,
      }];
    }), [followUps, reminderClock, students]);

  const eligibleFollowUpReminders = upcomingFollowUpReminders.filter(reminder =>
    !acknowledgedReminderKeys.has(reminder.key) &&
    (!snoozedReminders[reminder.key] || snoozedReminders[reminder.key] <= reminderClock.getTime())
  );

  useEffect(() => {
    if (activeReminderKey && !eligibleFollowUpReminders.some(reminder => reminder.key === activeReminderKey)) {
      setActiveReminderKey(null);
    } else if (!activeReminderKey && eligibleFollowUpReminders.length > 0) {
      setActiveReminderKey(eligibleFollowUpReminders[0].key);
    }
  }, [activeReminderKey, eligibleFollowUpReminders]);

  const activeReminder = eligibleFollowUpReminders.find(reminder => reminder.key === activeReminderKey) || null;
  activeReminderKeyRef.current = activeReminderKey;

  const playReminderSound = useCallback(() => {
    const reminderKey = activeReminderKeyRef.current;
    const context = audioContextRef.current;
    if (!reminderKey || !context || playedReminderKeyRef.current === reminderKey) return;

    playedReminderKeyRef.current = reminderKey;
    void context.resume().then(() => {
      if (activeReminderKeyRef.current !== reminderKey) return;
      const startAt = context.currentTime;
      [880, 660, 880].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const toneStart = startAt + index * 0.18;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, toneStart);
        gain.gain.exponentialRampToValueAtTime(0.14, toneStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.14);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(toneStart);
        oscillator.stop(toneStart + 0.15);
      });
    }).catch(error => {
      if (playedReminderKeyRef.current === reminderKey) playedReminderKeyRef.current = null;
      console.warn('Could not play follow-up reminder sound:', error);
    });
  }, []);

  useEffect(() => {
    if (typeof window.AudioContext !== 'undefined') {
      try {
        audioContextRef.current ??= new window.AudioContext();
        playReminderSound();
      } catch (error) {
        console.warn('Could not initialize follow-up reminder sound:', error);
      }
    }
    const activateReminderSound = () => {
      if (typeof window.AudioContext === 'undefined') return;
      try {
        audioContextRef.current ??= new window.AudioContext();
        if (audioContextRef.current.state === 'suspended') {
          void audioContextRef.current.resume().catch(error => {
            console.warn('Could not enable follow-up reminder sound:', error);
          });
        }
        playReminderSound();
      } catch (error) {
        console.warn('Could not initialize follow-up reminder sound:', error);
      }
    };
    window.addEventListener('pointerdown', activateReminderSound);
    window.addEventListener('keydown', activateReminderSound);
    return () => {
      window.removeEventListener('pointerdown', activateReminderSound);
      window.removeEventListener('keydown', activateReminderSound);
      const context = audioContextRef.current;
      audioContextRef.current = null;
      void context?.close();
    };
  }, [playReminderSound]);

  useEffect(() => {
    if (activeReminderKey) playReminderSound();
  }, [activeReminderKey, playReminderSound]);

  const acknowledgeReminder = () => {
    if (!activeReminder) return;
    setAcknowledgedReminderKeys(previous => new Set(previous).add(activeReminder.key));
    setActiveReminderKey(null);
  };

  const snoozeReminder = () => {
    if (!activeReminder) return;
    playedReminderKeyRef.current = null;
    setSnoozedReminders(previous => ({
      ...previous,
      [activeReminder.key]: Date.now() + 5 * 60 * 1000,
    }));
    setActiveReminderKey(null);
  };

  const viewReminderStudent = () => {
    if (!activeReminder) return;
    const followUpId = activeReminder.key.slice(0, activeReminder.key.lastIndexOf('-'));
    const followUp = followUps.find(item => item.id === followUpId);
    const student = students.find(item => item.id === followUp?.student_id);
    if (student) setViewStudent(student);
    acknowledgeReminder();
  };

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

  const getStudentFU = (studentId: string) => followUps.find(f => f.student_id === studentId);

  const openAdd = (intent: string, studentId?: string) => {
    const existing = studentId ? getStudentFU(studentId) : null;
    if (existing) {
      openEdit(existing);
      return;
    }
    setEditFU(null);
    setForm({
      student_id: studentId || '',
      intent_level: intent,
      followup_date: format(new Date(), 'yyyy-MM-dd'),
      followup_time: '',
      followup_status: 'pending',
      notes: ''
    });
    setShowForm(true);
  };

  const openEdit = (fu: FollowUp) => {
    setEditFU(fu);
    setForm({
      student_id: fu.student_id,
      intent_level: fu.intent_level || 'medium',
      followup_date: fu.followup_date?.slice(0, 10) || format(new Date(), 'yyyy-MM-dd'),
      followup_time: fu.followup_time?.slice(0, 5) || '',
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
    if (!form.followup_date || !form.followup_time) {
      toast.error('Please select a follow-up date and time');
      return;
    }
    setSaving(true);
    try {
      const existing = editFU || getStudentFU(form.student_id);
      await upsertFollowUp({
        ...(existing ? { id: existing.id } : {}),
        ...form,
        intent_level: form.intent_level as FollowUp['intent_level']
      });
      setShowForm(false);
      toast.success('Follow-up record saved successfully');
      await fetchData();
    } catch (err) {
      console.error('Failed to save follow-up:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save follow-up');
    } finally {
      setSaving(false);
    }
  };

  // Intent segmentation based on saved intent_level in follow_ups
  const getStudentIntent = (studentId: string): 'high' | 'medium' | 'low' => {
    const fu = getStudentFU(studentId);
    if (fu?.intent_level === 'high') return 'high';
    if (fu?.intent_level === 'medium') return 'medium';
    if (fu?.intent_level === 'low') return 'low';
    return 'low'; // Default unassigned students to low intent
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
                  <div className="hidden lg:block overflow-hidden">
                    <table className="w-full table-fixed text-xs">
                      <colgroup>
                        <col className="w-[26%]" />
                        <col className="w-[14%]" />
                        <col className="w-[16%]" />
                        <col className="w-[18%]" />
                        <col className="w-[16%]" />
                        <col className="w-[10%]" />
                      </colgroup>
                      <thead className="bg-muted/50 border-b border-border text-muted-foreground sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Student Name</th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Student ID</th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Career Fit Assessment</th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Counselling</th>
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px]">Application Access</th>
                          <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wider text-[10px]">Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {segmentData[key].map(s => {
                          const fu = getStudentFU(s.id);
                          const fuScheduledAt = fu ? getFollowUpScheduledAt(fu) : null;
                          const c = counsellings.find(couns => couns.student_id === s.id);
                          const formattedDate = formatCounsellingDateTime(c?.scheduled_date, c?.scheduled_time);
                          const isScheduled = c && c.status && c.status !== 'not_scheduled' && formattedDate;

                          return (
                            <tr key={s.id} className="hover:bg-muted/40 transition-colors align-top">
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
                                      <span className="truncate block max-w-[170px]">{s.full_name || 'Unnamed Student'}</span>
                                      <Eye className="w-3 h-3 text-muted-foreground hover:text-primary shrink-0" />
                                    </button>
                                    <p className="text-[11px] text-muted-foreground truncate max-w-[170px]" title={s.email || '-'}>{s.email || '-'}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-3 py-3 font-mono font-bold text-primary text-[11px] whitespace-normal break-all">
                                {s.student_id || '-'}
                              </td>

                              <td className="px-3 py-3">
                                <StatusBadge status={s.assessment_status || 'not_started'} />
                              </td>

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
                                {fuScheduledAt && (
                                  <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-700">
                                    <BellRing className="h-3 w-3 shrink-0" />
                                    Follow-up: {format(fuScheduledAt, 'dd MMM yyyy, h:mm a')}
                                  </span>
                                )}
                              </td>

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

                  <div className="lg:hidden space-y-3 p-3">
                    {segmentData[key].map(s => {
                      const fu = getStudentFU(s.id);
                      const fuScheduledAt = fu ? getFollowUpScheduledAt(fu) : null;
                      const c = counsellings.find(couns => couns.student_id === s.id);
                      const formattedDate = formatCounsellingDateTime(c?.scheduled_date, c?.scheduled_time);
                      const isScheduled = c && c.status && c.status !== 'not_scheduled' && formattedDate;

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
                            {fuScheduledAt && (
                              <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300/50 bg-amber-50/60 px-2 py-1.5 text-amber-800">
                                <span>Follow-up reminder</span>
                                <span className="flex items-center gap-1 text-right font-medium">
                                  <BellRing className="h-3 w-3 shrink-0" />
                                  {format(fuScheduledAt, 'dd MMM, h:mm a')}
                                </span>
                              </div>
                            )}

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

        {activeReminder && (
          <section
            role="alertdialog"
            aria-labelledby="follow-up-reminder-title"
            aria-describedby="follow-up-reminder-description"
            className="pointer-events-auto fixed left-1/2 top-1/2 z-[100] max-h-[calc(100vh-2rem)] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl"
          >
            {activeReminder && (() => {
              const minutesUntil = Math.max(0, Math.round((activeReminder.scheduledAt.getTime() - reminderClock.getTime()) / 60_000));
              return (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700">
                        <BellRing className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 id="follow-up-reminder-title" className="text-base font-semibold">Follow-up Reminder!</h2>
                        <p className="mt-0.5 text-xs text-slate-500">PSY CARE · Scheduled follow-up</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-700">
                      {minutesUntil <= 5 ? 'Due now' : `Due in ${formatDistanceToNowStrict(activeReminder.scheduledAt)}`}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-sm">
                    <p className="font-semibold">{activeReminder.studentName}</p>
                    <p className="text-xs text-slate-600">Student ID: {activeReminder.studentId}</p>
                    <p className="text-xs text-slate-600">Email: {activeReminder.studentEmail}</p>
                  </div>

                  <div id="follow-up-reminder-description" className="space-y-1.5 rounded-lg bg-slate-100 p-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <CalendarClock className="h-4 w-4 text-blue-600" />
                      {format(activeReminder.scheduledAt, 'dd MMM yyyy')} · {format(activeReminder.scheduledAt, 'h:mm a')}
                    </p>
                    <p className="text-xs text-slate-600">
                      Reminder: {activeReminder.followUpNote || 'Contact the student for the scheduled follow-up.'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Button onClick={acknowledgeReminder} className="h-9 w-full rounded-full bg-slate-950 text-sm text-white hover:bg-slate-800">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Acknowledge
                    </Button>
                    <Button onClick={snoozeReminder} variant="outline" className="h-9 w-full rounded-full border-slate-300 text-sm text-slate-600">
                      <Clock3 className="mr-2 h-4 w-4" /> Snooze for 5 minutes
                    </Button>
                    <Button onClick={viewReminderStudent} variant="outline" className="h-9 w-full rounded-full border-slate-300 text-sm text-slate-600">
                      View student details
                    </Button>
                  </div>
                </div>
              );
            })()}
          </section>
        )}

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
                    const studentId = e.target.value;
                    const existingFollowUp = getStudentFU(studentId);
                    setEditFU(existingFollowUp || null);
                    setForm(formState => ({
                      ...formState,
                      student_id: studentId,
                      intent_level: existingFollowUp?.intent_level || formState.intent_level,
                      followup_date: existingFollowUp?.followup_date?.slice(0, 10) || formState.followup_date,
                      followup_time: existingFollowUp?.followup_time?.slice(0, 5) || '',
                      followup_status: existingFollowUp?.followup_status || formState.followup_status,
                      notes: existingFollowUp?.notes || '',
                    }));
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
                    required
                    type="date"
                    value={form.followup_date}
                    onChange={e => setForm(f => ({ ...f, followup_date: e.target.value }))}
                    className="mt-1 bg-input border-border text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Follow-up Time</Label>
                  <Input
                    required
                    type="time"
                    value={form.followup_time}
                    onChange={e => setForm(f => ({ ...f, followup_time: e.target.value }))}
                    className="mt-1 bg-input border-border text-xs"
                  />
                </div>
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
