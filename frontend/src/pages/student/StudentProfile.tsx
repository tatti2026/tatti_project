import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentByProfileId, createStudent, updateStudent, updateProfile } from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Student } from '@/types/index';
import { User, Loader2, Save, BadgeCheck, Lock } from 'lucide-react';

export default function StudentProfile() {
  const { profile, refreshProfile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '', phone: '', date_of_birth: '',
    address: '', city: '', state: '', pincode: '',
  });

  useEffect(() => {
    if (!profile) return;
    (async () => {
      let s = await getStudentByProfileId(profile.id);
      if (!s) s = await createStudent({ profile_id: profile.id, email: profile.email, full_name: profile.full_name });
      setStudent(s);
      setForm({
        full_name: s?.full_name || profile.full_name || '',
        phone: s?.phone || '',
        date_of_birth: s?.date_of_birth || '',
        address: s?.address || '',
        city: s?.city || '',
        state: s?.state || '',
        pincode: s?.pincode || '',
      });
      setLoading(false);
    })();
  }, [profile]);

  const handleSave = async () => {
    if (!student || !profile) return;
    setSaving(true);
    await updateStudent(student.id, {
      full_name: form.full_name, phone: form.phone,
      date_of_birth: form.date_of_birth || null,
      address: form.address, city: form.city, state: form.state, pincode: form.pincode,
    });
    await updateProfile(profile.id, { full_name: form.full_name });
    await refreshProfile();
    setSaving(false);
    toast.success('Profile updated successfully!');
  };

  if (loading) return (
    <StudentLayout>
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
    </StudentLayout>
  );

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">My Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your personal information</p>
        </div>

        {/* Avatar + Student ID card */}
        <div className="glass-card rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-white">{(form.full_name || profile?.email || 'S')[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground">{form.full_name || 'Student'}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

        {/* Student ID — Prominent Read-Only Card */}
        <div className="glass-card rounded-xl p-5 border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <BadgeCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Student ID</span>
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Lock className="w-2.5 h-2.5" /> Read-only
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold text-foreground tracking-wider">
              {student?.student_id || '—'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This is your permanent Student ID. Use it to sign in to the TATTI Portal.
          </p>
        </div>

        {/* Read-only info: email, username, parent */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" /> Account Information
            <span className="text-[10px] text-muted-foreground ml-1">(read-only)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Username</Label>
              <Input
                value={student?.username || '—'}
                disabled
                className="mt-1 bg-muted border-border text-muted-foreground text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email Address</Label>
              <Input
                value={profile?.email || '—'}
                disabled
                className="mt-1 bg-muted border-border text-muted-foreground text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Parent / Guardian Name</Label>
              <Input
                value={student?.parent_name || '—'}
                disabled
                className="mt-1 bg-muted border-border text-muted-foreground text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Parent / Guardian Phone</Label>
              <Input
                value={student?.parent_phone || '—'}
                disabled
                className="mt-1 bg-muted border-border text-muted-foreground text-sm"
              />
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Full Name</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                className="mt-1 bg-input border-border" placeholder="Full name" />
            </div>
            <div>
              <Label className="text-sm">Email</Label>
              <Input value={profile?.email || ''} disabled className="mt-1 bg-muted border-border text-muted-foreground" />
            </div>
            <div>
              <Label className="text-sm">Phone Number</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="mt-1 bg-input border-border" placeholder="Phone number" />
            </div>
            <div>
              <Label className="text-sm">Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))}
                className="mt-1 bg-input border-border" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm">Address</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                className="mt-1 bg-input border-border" placeholder="Street address" />
            </div>
            <div>
              <Label className="text-sm">City</Label>
              <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                className="mt-1 bg-input border-border" placeholder="City" />
            </div>
            <div>
              <Label className="text-sm">State</Label>
              <Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                className="mt-1 bg-input border-border" placeholder="State" />
            </div>
            <div>
              <Label className="text-sm">Pincode</Label>
              <Input value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))}
                className="mt-1 bg-input border-border" placeholder="Pincode" />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={saving} className="gradient-bg border-0 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
