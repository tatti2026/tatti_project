import { useEffect, useState } from 'react';
import { getAllStudents, getAllCounselling, upsertCounselling, updateStudent, createNotification } from '@/lib/api';
import { supabase } from '@/db/supabase';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Student, Counselling } from '@/types/index';
import { Plus, Pencil, Loader2, Search, Calendar, Bell, Clock, User, CheckCircle2, Shield } from 'lucide-react';
import { sendChatMessage } from '@/services/messagingService';
import { format } from 'date-fns';

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

export default function CounsellingManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [counsellings, setCounsellings] = useState<Counselling[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editCounselling, setEditCounselling] = useState<Counselling | null>(null);

  const [form, setForm] = useState<CounsForm>({
    student_id: '',
    counsellor_name: 'TATTI Counsellor',
    scheduled_date: '2026-09-15',
    scheduled_time: '10:30 AM',
    counselling_type: 'Online',
    notes: '',
    reminder: '1 day before',
    status: 'scheduled',
  });

  const fetchData = async () => {
    setLoading(true);
    const [{ data }, cList] = await Promise.all([getAllStudents(0, 1000), getAllCounselling()]);
    setStudents(data);
    setCounsellings(cList);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openSchedule = (studentId?: string) => {
    setEditCounselling(null);
    setForm({
      student_id: studentId || '',
      counsellor_name: 'TATTI Counsellor',
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
      counsellor_name: c.counsellor_name || 'TATTI Counsellor',
      scheduled_date: c.scheduled_date || '',
      scheduled_time: c.scheduled_time || '10:30 AM',
      counselling_type: c.mode || 'Online',
      notes: c.notes || '',
      reminder: '1 day before',
      status: c.status || 'scheduled',
    });
    setShowForm(true);
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
      status: 'scheduled' as const,
    };

    await upsertCounselling(payload as any);
    await updateStudent(form.student_id, { counselling_status: 'scheduled' });

    // Send student notification & message
    const student = students.find(s => s.id === form.student_id);
    const messageContent = `Your counselling session has been scheduled.\nDate: ${form.scheduled_date}\nTime: ${form.scheduled_time}\nCounsellor: ${form.counsellor_name}\nType: ${form.counselling_type}${form.notes ? `\nNotes: ${form.notes}` : ''}`;

    if (student) {
      // 1. Send system notification to student profile
      if (student.profile_id) {
        await createNotification({
          profile_id: student.profile_id,
          title: '📅 Counselling Scheduled',
          message: messageContent,
          type: 'counselling',
          is_read: false,
        });
      }

      // 2. Also send chat message
      sendChatMessage({
        studentId: student.id,
        senderId: 'admin',
        senderName: 'TATTI Admin',
        senderType: 'admin',
        text: `📅 Counselling Scheduled: Your counselling session has been scheduled for ${form.scheduled_date} at ${form.scheduled_time} with ${form.counsellor_name}.`,
      });
    }

    setSaving(false);
    setShowForm(false);
    toast.success('Counselling scheduled and student notified!');
    fetchData();
  };

  // Set Reminder Handler
  const handleSetReminder = async () => {
    if (!form.student_id) {
      toast.error('Please select a student');
      return;
    }
    setSaving(true);

    const student = students.find(s => s.id === form.student_id);
    const reminderMsg = `Your TATTI counselling session is scheduled for ${form.scheduled_date} at ${form.scheduled_time}.\nCounsellor: ${form.counsellor_name}\nReminder: ${form.reminder}`;

    if (student) {
      if (student.profile_id) {
        await createNotification({
          profile_id: student.profile_id,
          title: '📅 Counselling Reminder',
          message: reminderMsg,
          type: 'counselling',
          is_read: false,
        });
      }

      sendChatMessage({
        studentId: student.id,
        senderId: 'admin',
        senderName: 'TATTI Admin',
        senderType: 'admin',
        text: `🔔 Counselling Reminder: ${reminderMsg}`,
      });
    }

    setSaving(false);
    setShowForm(false);
    toast.success(`Reminder set (${form.reminder}) and notification dispatched to student!`);
    fetchData();
  };

  const studentsNeedingCounselling = students.filter(s =>
    s.payment_status === 'paid' &&
    (s.counselling_status === 'pending' || s.counselling_status === 'not_scheduled')
  );

  const filteredCounsellings = counsellings.filter(c => {
    const s = students.find(st => st.id === c.student_id);
    if (!search) return true;
    return (
      (s?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s?.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (s?.student_id || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Counselling Management</h1>
            <p className="text-muted-foreground text-sm">
              Assign counsellors, set dates & times, schedule sessions and dispatch student notifications
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
                    <p className="text-xs text-muted-foreground">{s.selected_course || 'Course Selected'}</p>
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
                onChange={e => setSearch(e.target.value)}
                className="pl-8 w-52 bg-input border-border text-xs h-8"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Student', 'Student ID', 'Counsellor', 'Date', 'Time', 'Type', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      <p className="mt-2 text-xs">Loading sessions...</p>
                    </td>
                  </tr>
                ) : filteredCounsellings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No counselling sessions scheduled yet. Click &quot;Schedule Counselling&quot; above to create one.
                    </td>
                  </tr>
                ) : (
                  filteredCounsellings.map(c => {
                    const s = students.find(st => st.id === c.student_id);
                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-foreground">
                          {s?.full_name || 'Student'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-mono text-muted-foreground">
                          {s?.student_id || '-'}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-medium text-foreground">
                          {c.counsellor_name || 'TATTI Counsellor'}
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
                  placeholder="TATTI Counsellor"
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
                  <option value="In-Person">In-Person (TATTI Campus)</option>
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
                <Label className="text-xs font-semibold">Notes & Instructions</Label>
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
                  &quot;Your TATTI counselling session is scheduled for {form.scheduled_date || 'date'} at {form.scheduled_time || 'time'} with {form.counsellor_name}.&quot;
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={handleSetReminder}
                  disabled={saving || !form.student_id}
                >
                  <Bell className="w-3.5 h-3.5 mr-1.5 text-warning" /> Set Reminder
                </Button>
                <Button
                  className="flex-1 gradient-bg border-0 text-white text-xs font-semibold"
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
      </div>
    </AdminLayout>
  );
}
