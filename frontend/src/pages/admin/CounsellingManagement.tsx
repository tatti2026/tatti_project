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
import { Phone, Plus, Pencil, Loader2, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';

type CounsForm = {
  student_id: string;
  counsellor_name: string;
  scheduled_date: string;
  scheduled_time: string;
  mode: string;
  venue_or_link: string;
  instructions: string;
  notes: string;
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
    student_id: '', counsellor_name: '', scheduled_date: '',
    scheduled_time: '', mode: 'Online', venue_or_link: '', instructions: '', notes: '', status: 'scheduled',
  });

  const fetchData = async () => {
    setLoading(true);
    const [{ data }, cList] = await Promise.all([getAllStudents(0, 1000), getAllCounselling()]);
    setStudents(data);
    setCounsellings(cList);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openSchedule = (studentId?: string) => {
    setEditCounselling(null);
    setForm({ student_id: studentId || '', counsellor_name: '', scheduled_date: '', scheduled_time: '', mode: 'Online', venue_or_link: '', instructions: '', notes: '', status: 'scheduled' });
    setShowForm(true);
  };

  const openEdit = (c: Counselling) => {
    setEditCounselling(c);
    setForm({
      student_id: c.student_id, counsellor_name: c.counsellor_name || '',
      scheduled_date: c.scheduled_date || '', scheduled_time: c.scheduled_time || '',
      mode: c.mode || 'Online', venue_or_link: c.venue_or_link || '',
      instructions: c.instructions || '', notes: c.notes || '', status: c.status,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.student_id) { toast.error('Please select a student'); return; }
    setSaving(true);
    const payload = { ...editCounselling, ...form };
    await upsertCounselling(payload as import('@/types/index').Counselling);
    await updateStudent(form.student_id, { counselling_status: form.status as Student['counselling_status'] });

    // Get student's profile_id for notification
    const student = students.find(s => s.id === form.student_id);
    if (student) {
      const { data: profileData } = await supabase.from('profiles').select('id').eq('id', student.profile_id).maybeSingle();
      if (profileData) {
        await createNotification({
          profile_id: student.profile_id,
          title: 'Counselling Scheduled',
          message: `Your counselling is scheduled for ${form.scheduled_date} at ${form.scheduled_time || 'TBD'}.`,
          type: 'counselling',
          is_read: false,
        });
      }
    }

    setSaving(false);
    setShowForm(false);
    toast.success('Counselling saved successfully');
    fetchData();
  };

  const studentsNeedingCounselling = students.filter(s =>
    s.payment_status === 'paid' &&
    (s.counselling_status === 'pending' || s.counselling_status === 'not_scheduled')
  );

  const filteredCounsellings = counsellings.filter(c => {
    const s = students.find(st => st.id === c.student_id);
    if (!search) return true;
    return (s?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s?.email || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Counselling Management</h1>
            <p className="text-muted-foreground text-sm">{studentsNeedingCounselling.length} students pending counselling</p>
          </div>
          <Button onClick={() => openSchedule()} className="gradient-bg border-0 text-white shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Schedule Counselling
          </Button>
        </div>

        {/* Students needing counselling */}
        {studentsNeedingCounselling.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-warning" /> Requires Counselling ({studentsNeedingCounselling.length})
            </h2>
            <div className="space-y-2">
              {studentsNeedingCounselling.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.full_name || s.email || 'Student'}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <StatusBadge status={s.counselling_status} />
                  <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => openSchedule(s.id)}>
                    <Calendar className="w-3 h-3 mr-1" /> Schedule
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Counselling List */}
        <div className="glass-card rounded-xl">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex-1">All Counselling Sessions</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 w-40 bg-input border-border h-8" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Student', 'Counsellor', 'Date', 'Time', 'Mode', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : filteredCounsellings.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No counselling sessions yet</td></tr>
                ) : filteredCounsellings.map(c => {
                  const s = students.find(st => st.id === c.student_id);
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-xs font-medium text-foreground">{s?.full_name || '-'}</p>
                        <p className="text-[10px] text-muted-foreground">{s?.email || '-'}</p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">{c.counsellor_name || '-'}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {c.scheduled_date ? format(new Date(c.scheduled_date), 'dd MMM yyyy') : '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">{c.scheduled_time || '-'}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">{c.mode || '-'}</td>
                      <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={c.status} /></td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(c)}>
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCounselling ? 'Edit Counselling' : 'Schedule Counselling'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Student *</Label>
              <select value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground">
                <option value="">Select student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email || s.id}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Counsellor Name</Label>
                <Input value={form.counsellor_name} onChange={e => setForm(p => ({ ...p, counsellor_name: e.target.value }))}
                  className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-sm">Mode</Label>
                <select value={form.mode} onChange={e => setForm(p => ({ ...p, mode: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground">
                  {['Online', 'In-person', 'Phone'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm">Date</Label>
                <Input type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))}
                  className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-sm">Time</Label>
                <Input type="time" value={form.scheduled_time} onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))}
                  className="mt-1 bg-input border-border" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Venue / Meeting Link</Label>
              <Input value={form.venue_or_link} onChange={e => setForm(p => ({ ...p, venue_or_link: e.target.value }))}
                placeholder="Google Meet link or venue address" className="mt-1 bg-input border-border" />
            </div>
            <div>
              <Label className="text-sm">Instructions</Label>
              <textarea value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
                rows={2} className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground resize-none" />
            </div>
            <div>
              <Label className="text-sm">Status</Label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground">
                {['pending', 'scheduled', 'completed', 'selected', 'rejected', 'follow_up_required'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gradient-bg border-0 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
