import { useEffect, useState } from 'react';
import { getAllStudents, getFollowUps, upsertFollowUp } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Student, FollowUp } from '@/types/index';
import { ClipboardList, Plus, Pencil, Loader2, Trophy, Target, TrendingDown, CalendarPlus2, RefreshCw } from 'lucide-react';

export default function FollowUpManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFU, setEditFU] = useState<FollowUp | null>(null);
  const [form, setForm] = useState({ student_id: '', intent_level: 'medium', followup_date: '', followup_status: 'pending', notes: '' });

  const fetchData = async () => {
    setLoading(true);
    const [{ data }, fus] = await Promise.all([getAllStudents(0, 1000), getFollowUps()]);
    setStudents(data);
    setFollowUps(fus);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = (intent: string, studentId?: string) => {
    setEditFU(null);
    setForm({ student_id: studentId || '', intent_level: intent, followup_date: '', followup_status: 'pending', notes: '' });
    setShowForm(true);
  };

  const openEdit = (fu: FollowUp) => {
    setEditFU(fu);
    setForm({ student_id: fu.student_id, intent_level: fu.intent_level, followup_date: fu.followup_date || '', followup_status: fu.followup_status || 'pending', notes: fu.notes || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.student_id) { toast.error('Please select a student'); return; }
    setSaving(true);
    await upsertFollowUp({ ...editFU, ...form, intent_level: form.intent_level as FollowUp['intent_level'] });
    setSaving(false);
    setShowForm(false);
    toast.success('Follow-up saved');
    fetchData();
  };

  // Segment students
  const high = students.filter(s => s.assessment_status === 'completed' && (s.payment_status === 'paid' || s.application_status === 'submitted'));
  const medium = students.filter(s => s.assessment_status === 'completed' && s.payment_status !== 'paid');
  const low = students.filter(s => s.assessment_status !== 'completed');

  const getStudentFU = (studentId: string) => followUps.find(f => f.student_id === studentId);

  const segments = [
    { key: 'high', label: 'HIGH INTENT', students: high, icon: Trophy, color: 'text-success', bgColor: 'bg-success/10 border-success/20', tagColor: 'bg-success/20 text-success' },
    { key: 'medium', label: 'MEDIUM INTENT', students: medium, icon: Target, color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20', tagColor: 'bg-warning/20 text-warning' },
    { key: 'low', label: 'LOW INTENT', students: low, icon: TrendingDown, color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20', tagColor: 'bg-destructive/20 text-destructive' },
  ];

  if (loading) return (
    <AdminLayout>
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Follow-up Management</h1>
            <p className="text-muted-foreground text-sm">Track and manage student follow-ups by intent level</p>
          </div>
          <Button onClick={() => openAdd('medium')} className="gradient-bg border-0 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Add Follow-up
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
                <div className="glass-card rounded-xl p-12 text-center text-muted-foreground text-sm">No students in this segment</div>
              ) : (
                <div className="space-y-3">
                  {seg.map(s => {
                    const fu = getStudentFU(s.id);
                    return (
                      <div key={s.id} className="glass-card rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">{(s.full_name || s.email || 'S')[0].toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{s.full_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{s.email}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={s.payment_status} />
                                <StatusBadge status={s.assessment_status} />
                              </div>
                            </div>
                            {fu && (
                              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                {fu.followup_date && <span>ðŸ“… {fu.followup_date}</span>}
                                {fu.followup_status && <StatusBadge status={fu.followup_status} />}
                                {fu.notes && <span className="truncate">ðŸ“ {fu.notes}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Call" onClick={() => {}}>
                              <Phone className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Email" onClick={() => {}}>
                              <Mail className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Add Note" onClick={() => openAdd(key, s.id)}>
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Button>
                            {fu && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(fu)}>
                                <Pencil className="w-3.5 h-3.5" />
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
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <DialogHeader><DialogTitle>{editFU ? 'Edit Follow-up' : 'Add Follow-up'}</DialogTitle></DialogHeader>
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
                <Label className="text-sm">Intent Level</Label>
                <select value={form.intent_level} onChange={e => setForm(p => ({ ...p, intent_level: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground">
                  {['high', 'medium', 'low'].map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)} Intent</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm">Follow-up Date</Label>
                <Input type="date" value={form.followup_date} onChange={e => setForm(p => ({ ...p, followup_date: e.target.value }))}
                  className="mt-1 bg-input border-border" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Status</Label>
              <select value={form.followup_status} onChange={e => setForm(p => ({ ...p, followup_status: e.target.value }))}
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground">
                {['pending', 'contacted', 'interested', 'not_interested', 'converted'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm">Notes</Label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={3} className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground resize-none" />
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

