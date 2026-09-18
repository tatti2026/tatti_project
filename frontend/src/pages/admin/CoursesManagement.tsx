import { useEffect, useState } from 'react';
import { getAllCourses, upsertCourse } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Course } from '@/types/index';
import { Plus, Pencil, BookOpen, Loader2, Search, ToggleLeft, ToggleRight } from 'lucide-react';

const emptyCourse = (): Partial<Course> => ({
  course_name: '', course_code: '', description: '', duration: '',
  eligibility: '', fee: 0, category: '', skills: [], career_opportunities: [],
  available_seats: 30, status: 'available',
});

export default function CoursesManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Course>>(emptyCourse());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [careersInput, setCareersInput] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const data = await getAllCourses();
    setCourses(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setFormData(emptyCourse());
    setSkillsInput('');
    setCareersInput('');
    setShowForm(true);
  };

  const openEdit = (c: Course) => {
    setFormData({ ...c });
    setSkillsInput((c.skills || []).join(', '));
    setCareersInput((c.career_opportunities || []).join(', '));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.course_name?.trim()) { toast.error('Course name is required'); return; }
    setSaving(true);
    const payload = {
      ...formData,
      skills: skillsInput.split(',').map(s => s.trim()).filter(Boolean),
      career_opportunities: careersInput.split(',').map(s => s.trim()).filter(Boolean),
    };
    await upsertCourse(payload);
    setSaving(false);
    setShowForm(false);
    toast.success(formData.id ? 'Course updated' : 'Course added');
    fetchData();
  };

  const handleToggle = async (c: Course) => {
    await upsertCourse({ ...c, status: c.status === 'available' ? 'not_available' : 'available' });
    fetchData();
  };

  const set = (key: keyof Course, val: unknown) => setFormData(p => ({ ...p, [key]: val }));

  const filtered = courses.filter(c =>
    !search || c.course_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Courses Management</h1>
            <p className="text-muted-foreground text-sm">{courses.filter(c => c.status === 'available').length} available / {courses.length} total courses</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search courses..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 w-44 bg-input border-border" />
            </div>
            <Button onClick={openAdd} className="gradient-bg border-0 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> Add Course
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No courses found. Click "Add Course" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <div key={c.id} className="glass-card rounded-xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-foreground leading-tight flex-1 min-w-0">{c.course_name}</h3>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-xs text-muted-foreground mb-2 font-mono">{c.course_code}</p>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">{c.description}</p>
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium text-foreground">{c.duration || '-'}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-muted-foreground">Fee</p>
                    <p className="font-medium text-foreground">₹{c.fee.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-muted-foreground">Seats</p>
                    <p className="font-medium text-foreground">{c.available_seats}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-medium text-foreground truncate">{c.category || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleToggle(c)} title={c.status === 'available' ? 'Deactivate' : 'Activate'}>
                    {c.status === 'available'
                      ? <ToggleRight className="w-4 h-4 text-success mr-1" />
                      : <ToggleLeft className="w-4 h-4 text-muted-foreground mr-1" />}
                    {c.status === 'available' ? 'Active' : 'Inactive'}
                  </Button>
                  <div className="ml-auto flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{formData.id ? 'Edit Course' : 'Add Course'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Course Name *</Label>
                <Input value={formData.course_name || ''} onChange={e => set('course_name', e.target.value)} className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-sm">Course Code</Label>
                <Input value={formData.course_code || ''} onChange={e => set('course_code', e.target.value)} className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-sm">Duration</Label>
                <Input value={formData.duration || ''} onChange={e => set('duration', e.target.value)} placeholder="e.g. 6 months" className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-sm">Category</Label>
                <Input value={formData.category || ''} onChange={e => set('category', e.target.value)} className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-sm">Fee (₹)</Label>
                <Input type="number" value={formData.fee || 0} onChange={e => set('fee', parseFloat(e.target.value) || 0)} className="mt-1 bg-input border-border" />
              </div>
              <div>
                <Label className="text-sm">Available Seats</Label>
                <Input type="number" value={formData.available_seats || 30} onChange={e => set('available_seats', parseInt(e.target.value) || 30)} className="mt-1 bg-input border-border" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <textarea value={formData.description || ''} onChange={e => set('description', e.target.value)}
                rows={3} className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground resize-none" />
            </div>
            <div>
              <Label className="text-sm">Eligibility</Label>
              <Input value={formData.eligibility || ''} onChange={e => set('eligibility', e.target.value)} className="mt-1 bg-input border-border" />
            </div>
            <div>
              <Label className="text-sm">Skills (comma-separated)</Label>
              <Input value={skillsInput} onChange={e => setSkillsInput(e.target.value)} placeholder="e.g. Python, Machine Learning, Data Analysis" className="mt-1 bg-input border-border" />
            </div>
            <div>
              <Label className="text-sm">Career Opportunities (comma-separated)</Label>
              <Input value={careersInput} onChange={e => setCareersInput(e.target.value)} placeholder="e.g. Data Scientist, ML Engineer" className="mt-1 bg-input border-border" />
            </div>
            <div>
              <Label className="text-sm">Status</Label>
              <select value={formData.status || 'available'} onChange={e => set('status', e.target.value as Course['status'])}
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground">
                <option value="available">Available</option>
                <option value="not_available">Not Available</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gradient-bg border-0 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Course
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
