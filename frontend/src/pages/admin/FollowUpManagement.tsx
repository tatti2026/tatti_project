import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getAllStudents, getFollowUps, getAllCounselling, getAllAssessments, upsertFollowUp,
  unlockStudentApplication, lockStudentApplication,
} from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Student, FollowUp, Counselling, Assessment } from '@/types/index';
import {
  Plus, Pencil, Loader2, Eye, Calendar, Lock, Unlock, BellRing, CheckCircle2,
  Clock3, CalendarClock, Search, X, ChevronLeft, ChevronRight, RotateCcw, Users, AlertCircle, Award
} from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { usePortal } from '@/contexts/PortalContext';
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

/**
 * Color mapping for saved intent levels:
 * High Intent -> Light blue (#EFF6FF / #DBEAFE)
 * Medium Intent -> Light purple (#FAF5FF / #F3E8FF)
 * Low Intent -> Light red (#FFF1F2 / #FFE4E6)
 * No intent text labels are displayed in the results table or cards.
 */
const INTENT_COLOR_MAP = {
  high: {
    colorName: 'Light Blue',
    rowClass: 'bg-[#EFF6FF] hover:bg-[#DBEAFE] border-b border-[#BFDBFE] text-[#0C4A6E]',
    textColor: 'text-[#0C4A6E]',
    badgeClass: 'bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD] font-semibold',
    dotBg: 'bg-[#3B82F6]',
  },
  medium: {
    colorName: 'Light Purple',
    rowClass: 'bg-[#FAF5FF] hover:bg-[#F3E8FF] border-b border-[#E9D5FF] text-[#4C1D95]',
    textColor: 'text-[#4C1D95]',
    badgeClass: 'bg-[#F3E8FF] text-[#6B21A8] border border-[#D8B4FE] font-semibold',
    dotBg: 'bg-[#A855F7]',
  },
  low: {
    colorName: 'Light Red',
    rowClass: 'bg-[#FFF1F2] hover:bg-[#FFE4E6] border-b border-[#FECDD3] text-[#881337]',
    textColor: 'text-[#881337]',
    badgeClass: 'bg-[#FFE4E6] text-[#9F1239] border border-[#FDA4AF] font-semibold',
    dotBg: 'bg-[#F43F5E]',
  },
  none: {
    colorName: 'No Follow-up',
    rowClass: 'bg-white hover:bg-slate-50/80 border-b border-slate-200 text-[#172554]',
    textColor: 'text-slate-600',
    badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200 font-medium',
    dotBg: 'bg-slate-400',
  },
};

export default function FollowUpManagement() {
  const { profile } = useAuth();
  const portal = usePortal();
  const isCounsellor = portal === 'counsellor' || profile?.role === 'counsellor';

  const [students, setStudents] = useState<Student[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [counsellings, setCounsellings] = useState<Counselling[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'none'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Form & Modals state
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFU, setEditFU] = useState<FollowUp | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  // Confirmation dialog for application lock/unlock
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    student: Student | null;
    action: 'unlock' | 'lock';
  }>({ open: false, student: null, action: 'unlock' });
  const [actionLoading, setActionLoading] = useState(false);

  // Follow-up form fields
  const [form, setForm] = useState({
    student_id: '',
    intent_level: 'medium',
    followup_date: '',
    followup_time: '',
    followup_status: 'pending',
    notes: ''
  });

  // Scheduled audio & popup reminders
  const [reminderClock, setReminderClock] = useState(() => new Date());
  const [activeReminderKey, setActiveReminderKey] = useState<string | null>(null);
  const [acknowledgedReminderKeys, setAcknowledgedReminderKeys] = useState<Set<string>>(() => new Set());
  const [snoozedReminders, setSnoozedReminders] = useState<Record<string, number>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeReminderKeyRef = useRef<string | null>(null);
  const playedReminderKeyRef = useRef<string | null>(null);

  // Periodic reminder clock update
  useEffect(() => {
    const interval = window.setInterval(() => {
      setReminderClock(new Date());
      getFollowUps()
        .then(result => setFollowUps(Array.isArray(result) ? result : result?.data || []))
        .catch(error => console.error('Failed to refresh follow-up reminders:', error));
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  // Fetch all core data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [{ data }, fus, cList, aList] = await Promise.all([
        getAllStudents(1, 1000),
        getFollowUps(),
        getAllCounselling(1, 1000),
        getAllAssessments(),
      ]);

      setStudents(data || []);
      setFollowUps(Array.isArray(fus) ? fus : fus?.data || []);
      const cRows = Array.isArray(cList?.data) ? cList.data : Array.isArray(cList) ? cList : [];
      setCounsellings(cRows);
      setAssessments(Array.isArray(aList) ? aList : []);
    } catch (err) {
      console.error('Failed to fetch follow-up data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Assessment lookup map by student.id
  const assessmentByStudentId = useMemo(() => {
    const map = new Map<string, Assessment>();
    assessments.forEach(a => {
      if (!map.has(a.student_id) || a.status === 'completed') {
        map.set(a.student_id, a);
      }
    });
    return map;
  }, [assessments]);

  // Student follow-up lookup
  const getStudentFU = useCallback((studentId: string) => {
    return followUps.find(f => f.student_id === studentId);
  }, [followUps]);

  // Lock / Unlock student application
  const handleConfirmAction = async () => {
    if (!confirmDialog.student) return;
    setActionLoading(true);
    try {
      const operatorName = profile?.full_name || profile?.email || 'PSY CARE Staff';
      if (confirmDialog.action === 'unlock') {
        await unlockStudentApplication(confirmDialog.student.id, operatorName);
        toast.success(`Application access unlocked for ${confirmDialog.student.full_name || 'student'}`);
      } else {
        await lockStudentApplication(confirmDialog.student.id, operatorName);
        toast.success(`Application access locked for ${confirmDialog.student.full_name || 'student'}`);
      }
      await fetchData();
    } catch {
      toast.error(`Failed to ${confirmDialog.action} application access`);
    } finally {
      setActionLoading(false);
      setConfirmDialog({ open: false, student: null, action: 'unlock' });
    }
  };

  // Open Follow-up form
  const openAdd = (defaultIntent = 'medium', studentId?: string) => {
    const existing = studentId ? getStudentFU(studentId) : null;
    if (existing) {
      openEdit(existing);
      return;
    }
    setEditFU(null);
    setForm({
      student_id: studentId || '',
      intent_level: defaultIntent,
      followup_date: format(new Date(), 'yyyy-MM-dd'),
      followup_time: format(new Date(), 'HH:mm'),
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

  // Save follow-up and refresh table immediately
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
      const adminName = profile?.full_name || profile?.email || 'Staff';

      await upsertFollowUp({
        ...(existing ? { id: existing.id } : {}),
        ...form,
        admin_name: adminName,
        intent_level: form.intent_level as FollowUp['intent_level']
      });

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

  // Follow-up reminder audio logic
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
    }).catch(() => {
      if (playedReminderKeyRef.current === reminderKey) playedReminderKeyRef.current = null;
    });
  }, []);

  useEffect(() => {
    if (typeof window.AudioContext !== 'undefined') {
      try {
        audioContextRef.current ??= new window.AudioContext();
        playReminderSound();
      } catch {
        // ignore
      }
    }
  }, [playReminderSound]);

  useEffect(() => {
    if (activeReminderKey) playReminderSound();
  }, [activeReminderKey, playReminderSound]);

  const acknowledgeReminder = () => {
    if (!activeReminder) return;
    setAcknowledgedReminderKeys(prev => new Set(prev).add(activeReminder.key));
    setActiveReminderKey(null);
  };

  const snoozeReminder = () => {
    if (!activeReminder) return;
    playedReminderKeyRef.current = null;
    setSnoozedReminders(prev => ({
      ...prev,
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

  // Consolidated table rows data
  const consolidatedRows = useMemo(() => {
    return students.map(student => {
      const fu = getStudentFU(student.id);
      const rawIntent = fu?.intent_level as 'high' | 'medium' | 'low' | undefined;
      const intentKey: 'high' | 'medium' | 'low' | 'none' = rawIntent && INTENT_COLOR_MAP[rawIntent] ? rawIntent : 'none';
      const assessment = assessmentByStudentId.get(student.id) || null;
      const counselling = counsellings.find(c => c.student_id === student.id);
      const fuScheduledAt = fu ? getFollowUpScheduledAt(fu) : null;

      return {
        student,
        followUp: fu,
        intentKey,
        assessment,
        counselling,
        fuScheduledAt,
      };
    });
  }, [students, getStudentFU, assessmentByStudentId, counsellings]);

  // Stats for color categories
  const counts = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    let none = 0;

    consolidatedRows.forEach(r => {
      if (r.intentKey === 'high') high++;
      else if (r.intentKey === 'medium') medium++;
      else if (r.intentKey === 'low') low++;
      else none++;
    });

    return {
      total: consolidatedRows.length,
      withFollowUp: high + medium + low,
      high,
      medium,
      low,
      none,
    };
  }, [consolidatedRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return consolidatedRows.filter(r => {
      // Color category filter
      if (colorFilter !== 'all' && r.intentKey !== colorFilter) {
        return false;
      }

      // Search query
      if (q) {
        const name = (r.student.full_name || '').toLowerCase();
        const sid = (r.student.student_id || '').toLowerCase();
        const email = (r.student.email || '').toLowerCase();
        if (!name.includes(q) && !sid.includes(q) && !email.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [consolidatedRows, search, colorFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, colorFilter, pageSize]);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#FED7AA]/60 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#172554] tracking-tight">Follow-up Management</h1>
            <p className="text-sm text-[#64748B] mt-1">
              Track student admissions progress, application access, and follow-up status.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="text-xs h-9 gap-1.5 border-[#FFCC99] text-[#7C2D12] hover:bg-[#FFF1E5] hover:text-[#9A3412]"
              title="Refresh data"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={() => openAdd('medium')}
              className="text-xs h-9 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold shadow-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record Follow-up</span>
            </Button>
          </div>
        </div>

        {/* Summary Metric Cards (Pure student management metrics, no intent segmentation) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white border border-[#FED7AA] rounded-xl p-4 shadow-xs">
            <p className="text-xs font-medium text-[#64748B]">Total Students</p>
            <p className="text-2xl font-bold text-[#172554] mt-1">{counts.total}</p>
          </div>

          <div className="bg-white border border-[#FED7AA] rounded-xl p-4 shadow-xs">
            <p className="text-xs font-medium text-[#64748B]">Active Follow-ups</p>
            <p className="text-2xl font-bold text-[#172554] mt-1">{counts.withFollowUp}</p>
          </div>

          <div className="bg-white border border-[#FED7AA] rounded-xl p-4 shadow-xs">
            <p className="text-xs font-medium text-[#64748B]">Applications Unlocked</p>
            <p className="text-2xl font-bold text-[#0284C7] mt-1">
              {students.filter(s => s.application_access_status === 'unlocked').length}
            </p>
          </div>
        </div>

        {/* Consolidated Student Results Table Container */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 shadow-sm space-y-4">
          {/* Search & Color-Based Filter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by student name or student ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white border border-[#FED7AA] text-sm text-[#172554] placeholder:text-slate-400 focus:border-[#F59E0B] focus:ring-[#F59E0B] rounded-lg h-10 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Color-based filter buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setColorFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  colorFilter === 'all'
                    ? 'bg-[#0B1F3A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({counts.total})
              </button>

              <button
                type="button"
                onClick={() => setColorFilter('high')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  colorFilter === 'high'
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] hover:bg-[#DBEAFE]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span>Light Blue ({counts.high})</span>
              </button>

              <button
                type="button"
                onClick={() => setColorFilter('medium')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  colorFilter === 'medium'
                    ? 'bg-[#7C3AED] text-white shadow-xs'
                    : 'bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF] hover:bg-[#F3E8FF]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
                <span>Light Purple ({counts.medium})</span>
              </button>

              <button
                type="button"
                onClick={() => setColorFilter('low')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  colorFilter === 'low'
                    ? 'bg-[#E11D48] text-white shadow-xs'
                    : 'bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3] hover:bg-[#FFE4E6]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                <span>Light Red ({counts.low})</span>
              </button>

              {counts.none > 0 && (
                <button
                  type="button"
                  onClick={() => setColorFilter('none')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    colorFilter === 'none'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  No Follow-up ({counts.none})
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-12 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredRows.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-[#172554]">No Student Records Found</p>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                {search
                  ? `No students matching "${search}" were found.`
                  : 'There are currently no student records in this follow-up category.'}
              </p>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch('')}
                  className="text-xs border-[#FFCC99] text-[#7C2D12] hover:bg-[#FFF1E5]"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}

          {/* Consolidated Student Results Table */}
          {!loading && filteredRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs border-collapse" style={{ minWidth: '950px' }}>
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '19%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-[#0B1F3A] text-white text-xs uppercase tracking-wider">
                    <th className="px-4 py-3.5 text-left font-bold">Student Name</th>
                    <th className="px-4 py-3.5 text-left font-bold">Student ID</th>
                    <th className="px-4 py-3.5 text-left font-bold">Career Fit Assessment</th>
                    <th className="px-4 py-3.5 text-left font-bold">Counselling</th>
                    <th className="px-4 py-3.5 text-left font-bold">Application Access</th>
                    <th className="px-4 py-3.5 text-right font-bold">Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map(({ student: s, followUp: fu, intentKey, assessment, counselling: c, fuScheduledAt }) => {
                    const style = INTENT_COLOR_MAP[intentKey];
                    const studentName = s.full_name || s.email || 'Unnamed Student';
                    const formattedDate = formatCounsellingDateTime(c?.scheduled_date, c?.scheduled_time);
                    const isCounsellingScheduled = c && c.status && c.status !== 'not_scheduled' && formattedDate;
                    const hasAssessmentScore = assessment?.status === 'completed' && assessment.percentage != null;

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors duration-150 align-top ${style.rowClass}`}
                      >
                        {/* 1. Student Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#0B1F3A] flex items-center justify-center shrink-0 shadow-xs text-xs font-bold text-white">
                              {studentName[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => setViewStudent(s)}
                                className="font-bold text-[#172554] text-xs hover:text-[#F59E0B] transition-colors flex items-center gap-1 text-left w-full min-w-0"
                                title="View Student Details"
                              >
                                <span className="truncate block max-w-[150px]">{studentName}</span>
                                <Eye className="w-3 h-3 text-slate-400 hover:text-[#F59E0B] shrink-0" />
                              </button>
                              <p className="text-[11px] opacity-75 truncate max-w-[150px]" title={s.email || '-'}>
                                {s.email || '-'}
                              </p>
                              {intentKey !== 'none' && (
                                <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] ${style.badgeClass}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${style.dotBg}`} />
                                  <span>{style.colorName}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Student ID */}
                        <td className="px-4 py-3 font-mono font-bold text-xs whitespace-nowrap">
                          <span className="text-[#172554]">{s.student_id || '-'}</span>
                        </td>

                        {/* 3. Career Fit Assessment (Score or Status) */}
                        <td className="px-4 py-3">
                          {hasAssessmentScore ? (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#172554] border border-[#FED7AA] shadow-2xs">
                                <Award className="w-3 h-3 text-[#F59E0B]" />
                                <span>{Number(assessment.percentage).toFixed(1)}%</span>
                              </span>
                              <span className="text-[10px] opacity-75 font-medium">
                                Score: {assessment.score ?? 0}/{assessment.total_marks ?? '-'} marks
                              </span>
                            </div>
                          ) : (
                            <StatusBadge status={s.assessment_status || 'not_started'} />
                          )}
                        </td>

                        {/* 4. Counselling */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            {isCounsellingScheduled ? (
                              <>
                                <StatusBadge status={c.status || s.counselling_status || 'scheduled'} />
                                <span className="text-[11px] opacity-80 font-medium flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-[#D97706] shrink-0" />
                                  {formattedDate}
                                </span>
                              </>
                            ) : s.counselling_status && s.counselling_status !== 'not_scheduled' ? (
                              <StatusBadge status={s.counselling_status} />
                            ) : (
                              <StatusBadge status="not_scheduled" />
                            )}

                            {fu && (
                              <div className="mt-1 pt-1 border-t border-slate-200/60 w-full flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold opacity-75 uppercase tracking-wider">Follow-up:</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <StatusBadge status={fu.followup_status || 'pending'} />
                                  {fuScheduledAt && (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#B45309]">
                                      <BellRing className="h-3 w-3 shrink-0 text-[#F59E0B]" />
                                      <span>{format(fuScheduledAt, 'dd MMM, h:mm a')}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 5. Application Access */}
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-1.5 items-start">
                            {s.application_access_status === 'unlocked' ? (
                              <>
                                <div className="flex items-center gap-1 text-[#0369A1] bg-[#E0F2FE] border border-[#BAE6FD] px-2 py-0.5 rounded-full font-semibold text-[11px] w-fit">
                                  <Unlock className="w-3 h-3 text-[#0284C7]" />
                                  <span>Unlocked</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] text-rose-600 border-rose-300 hover:bg-rose-50 w-fit"
                                  title="Lock student application access"
                                  onClick={() => setConfirmDialog({ open: true, student: s, action: 'lock' })}
                                >
                                  <Lock className="w-2.5 h-2.5 mr-1" /> Lock
                                </Button>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-semibold text-[11px] w-fit">
                                  <Lock className="w-3 h-3 text-rose-500" />
                                  <span>Locked</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] text-sky-700 border-sky-300 hover:bg-sky-50 w-fit"
                                  title="Unlock student application access"
                                  onClick={() => setConfirmDialog({ open: true, student: s, action: 'unlock' })}
                                >
                                  <Unlock className="w-2.5 h-2.5 mr-1" /> Unlock
                                </Button>
                              </>
                            )}
                          </div>
                        </td>

                        {/* 6. Update Status Action */}
                        <td className="px-4 py-3 text-right align-top">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-[11px] font-semibold bg-white border-[#FED7AA] text-[#172554] hover:border-[#F59E0B] hover:text-[#D97706] hover:bg-[#FFF7ED] shadow-2xs whitespace-nowrap"
                            title="Update Student Follow-up Status"
                            onClick={() => (fu ? openEdit(fu) : openAdd('medium', s.id))}
                          >
                            <Pencil className="w-3 h-3 mr-1 text-[#F59E0B]" />
                            <span>Update Status</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && filteredRows.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#FED7AA]/60 text-xs text-[#64748B]">
              <div className="flex items-center gap-2">
                <span>
                  Showing{' '}
                  <strong className="text-[#172554]">
                    {Math.min((currentPage - 1) * pageSize + 1, filteredRows.length)}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-[#172554]">
                    {Math.min(currentPage * pageSize, filteredRows.length)}
                  </strong>{' '}
                  of <strong className="text-[#172554]">{filteredRows.length}</strong> students
                </span>

                <span className="text-slate-300">|</span>

                <div className="flex items-center gap-1">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="border border-[#FED7AA] bg-white text-[#172554] rounded-md px-1.5 py-0.5 text-xs focus:ring-[#F59E0B]"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 border-[#FED7AA] text-[#172554] hover:bg-[#FFF1E5] disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <span className="px-2 font-medium">
                  Page <strong className="text-[#172554]">{currentPage}</strong> of{' '}
                  <strong className="text-[#172554]">{totalPages}</strong>
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 border-[#FED7AA] text-[#172554] hover:bg-[#FFF1E5] disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Follow-up Reminder Alert Dialog */}
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

        {/* ── FOLLOW-UP / UPDATE STATUS DIALOG ── */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-white border border-[#FED7AA]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#172554]">
                {editFU ? 'Update Follow-up Status' : 'Record Follow-up'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              {/* 1. Student Field */}
              <div>
                <Label className="text-xs font-semibold text-[#172554]">Student</Label>
                <select
                  value={form.student_id}
                  onChange={e => {
                    const sid = e.target.value;
                    const existingFU = getStudentFU(sid);
                    setEditFU(existingFU || null);
                    setForm(f => ({
                      ...f,
                      student_id: sid,
                      intent_level: existingFU?.intent_level || f.intent_level || 'medium',
                      followup_date: existingFU?.followup_date?.slice(0, 10) || f.followup_date || format(new Date(), 'yyyy-MM-dd'),
                      followup_time: existingFU?.followup_time?.slice(0, 5) || format(new Date(), 'HH:mm'),
                      followup_status: existingFU?.followup_status || f.followup_status || 'pending',
                      notes: existingFU?.notes || ''
                    }));
                  }}
                  className="w-full mt-1 bg-white border border-[#FED7AA] rounded-md px-3 py-2 text-xs text-[#172554] outline-none focus:border-[#F59E0B]"
                >
                  <option value="">Select a student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.email} {s.student_id ? `(${s.student_id})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2 & 3. Follow-up Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-[#172554]">Follow-up Date</Label>
                  <Input
                    required
                    type="date"
                    value={form.followup_date}
                    onChange={e => setForm(f => ({ ...f, followup_date: e.target.value }))}
                    className="mt-1 bg-white border-[#FED7AA] text-xs text-[#172554]"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#172554]">Follow-up Time</Label>
                  <Input
                    required
                    type="time"
                    value={form.followup_time}
                    onChange={e => setForm(f => ({ ...f, followup_time: e.target.value }))}
                    className="mt-1 bg-white border-[#FED7AA] text-xs text-[#172554]"
                  />
                </div>
              </div>

              {/* 4. Status Field */}
              <div>
                <Label className="text-xs font-semibold text-[#172554]">Status</Label>
                <select
                  value={form.followup_status}
                  onChange={e => setForm(f => ({ ...f, followup_status: e.target.value }))}
                  className="w-full mt-1 bg-white border border-[#FED7AA] rounded-md px-3 py-2 text-xs text-[#172554] outline-none focus:border-[#F59E0B]"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* 5. Intent Level Dropdown (Saves high/medium/low, maps to colors) */}
              <div>
                <Label className="text-xs font-semibold text-[#172554]">Intent Level</Label>
                <select
                  value={form.intent_level}
                  onChange={e => setForm(f => ({ ...f, intent_level: e.target.value }))}
                  className="w-full mt-1 bg-white border border-[#FED7AA] rounded-md px-3 py-2 text-xs text-[#172554] outline-none focus:border-[#F59E0B]"
                >
                  <option value="high">High Intent (Light Blue)</option>
                  <option value="medium">Medium Intent (Light Purple)</option>
                  <option value="low">Low Intent (Light Red)</option>
                </select>
              </div>

              {!isCounsellor && (
                <div>
                  <Label className="text-xs font-semibold text-[#172554]">Follow-up Notes / Remarks</Label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Enter discussion notes or follow-up details..."
                    className="w-full mt-1 bg-white border border-[#FED7AA] rounded-md px-3 py-2 text-xs text-[#172554] outline-none resize-none focus:border-[#F59E0B]"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs border-[#FFCC99] text-[#7C2D12] hover:bg-[#FFF1E5]"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-semibold"
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
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-white border border-[#FED7AA]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#172554]">
                {viewStudent?.full_name || 'Student Details'}
              </DialogTitle>
            </DialogHeader>
            {viewStudent && (
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 bg-[#FFF7ED] rounded-xl border border-[#FED7AA]">
                  <p className="text-[#64748B]">Student ID: <span className="font-mono font-bold text-[#172554]">{viewStudent.student_id || '-'}</span></p>
                  <p className="text-[#64748B] mt-1">Email: <span className="font-medium text-[#172554]">{viewStudent.email || '-'}</span></p>
                  <p className="text-[#64748B] mt-1">Phone: <span className="font-medium text-[#172554]">{viewStudent.phone || '-'}</span></p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[10px] text-[#64748B] uppercase font-semibold">Parent Name</p>
                    <p className="font-medium text-[#172554] mt-0.5">{viewStudent.parent_name || '-'}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[10px] text-[#64748B] uppercase font-semibold">Parent Phone</p>
                    <p className="font-medium text-[#172554] mt-0.5">{viewStudent.parent_phone || '-'}</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#FED7AA] space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#64748B]">Course:</span>
                    <span className="font-semibold text-[#172554]">{viewStudent.selected_course || 'Not Selected'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#64748B]">Career Fit Assessment:</span>
                    <StatusBadge status={viewStudent.assessment_status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#64748B]">Counselling Status:</span>
                    <StatusBadge status={viewStudent.counselling_status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#64748B]">Payment Status:</span>
                    <StatusBadge status={viewStudent.payment_status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#64748B]">Admission Status:</span>
                    <StatusBadge status={viewStudent.admission_status} />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#FFCC99] text-[#7C2D12] hover:bg-[#FFF1E5]"
                    onClick={() => setViewStudent(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── LOCK / UNLOCK APPLICATION CONFIRMATION DIALOG ── */}
        <AlertDialog open={confirmDialog.open} onOpenChange={open => !actionLoading && setConfirmDialog(d => ({ ...d, open }))}>
          <AlertDialogContent className="bg-white border border-[#FED7AA] max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-[#172554]">
                {confirmDialog.action === 'unlock' ? (
                  <>
                    <Unlock className="w-5 h-5 text-[#0284C7]" />
                    Unlock Application Process?
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 text-rose-500" />
                    Lock Application Process?
                  </>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#64748B] text-sm pt-1">
                {confirmDialog.action === 'unlock'
                  ? `Are you sure you want to allow ${confirmDialog.student?.full_name || 'this student'} to start the application process? They will be permitted to fill out personal details, select courses, and proceed to payment.`
                  : `Are you sure you want to prevent ${confirmDialog.student?.full_name || 'this student'} from accessing the application process? Their application form, submissions, and payments will be strictly locked.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={actionLoading} className="border-[#FED7AA]">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault();
                  handleConfirmAction();
                }}
                disabled={actionLoading}
                className={
                  confirmDialog.action === 'unlock'
                    ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold'
                    : 'bg-rose-600 hover:bg-rose-700 text-white font-semibold'
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
