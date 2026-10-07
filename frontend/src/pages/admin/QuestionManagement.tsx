import { useEffect, useState } from 'react';
import { getAllQuestions, upsertQuestion, deleteQuestion } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Question } from '@/types/index';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, Search } from 'lucide-react';

const emptyQ = (): Partial<Question> => ({
  question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
  correct_answer: null, marks: null, difficulty: 'medium', category: '', is_active: true,
});

const difficultyColors: Record<string, string> = {
  easy: 'bg-success/20 text-success', medium: 'bg-warning/20 text-warning', hard: 'bg-destructive/20 text-destructive',
};

export default function QuestionManagement() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filtered, setFiltered] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Question>>(emptyQ());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = await getAllQuestions();
      setQuestions(qs);
      setFiltered(search.trim() ? qs.filter(q =>
        q.question_text.toLowerCase().includes(search.toLowerCase()) ||
        (q.category || '').toLowerCase().includes(search.toLowerCase())
      ) : qs);
    } catch (err: any) {
      console.error('Failed to load questions:', err);
      toast.error(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (!v) { setFiltered(questions); return; }
    setFiltered(questions.filter(q =>
      q.question_text.toLowerCase().includes(v.toLowerCase()) ||
      (q.category || '').toLowerCase().includes(v.toLowerCase())
    ));
  };

  const openAdd = () => { setFormData(emptyQ()); setShowForm(true); };
  const openEdit = (q: Question) => { setFormData({ ...q }); setShowForm(true); };

  const handleSave = async () => {
    if (!formData.question_text?.trim()) {
      toast.error('Question text is required');
      return;
    }
    if (
      !formData.option_a?.trim() ||
      !formData.option_b?.trim() ||
      !formData.option_c?.trim() ||
      !formData.option_d?.trim()
    ) {
      toast.error('All 4 options are required');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Question> = {
        ...formData,
        question_text: formData.question_text.trim(),
        option_a: formData.option_a.trim(),
        option_b: formData.option_b.trim(),
        option_c: formData.option_c.trim(),
        option_d: formData.option_d.trim(),
        correct_answer: formData.correct_answer ? formData.correct_answer : null,
        marks: formData.marks !== null && formData.marks !== undefined && formData.marks !== ('' as any)
          ? Number(formData.marks)
          : null,
        category: formData.category?.trim() ? formData.category.trim() : null,
        difficulty: formData.difficulty || 'medium',
        is_active: formData.is_active ?? true,
      };

      await upsertQuestion(payload);
      setShowForm(false);
      toast.success(formData.id ? 'Question updated' : 'Question added');
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save question:', err);
      toast.error(err.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuestion(id);
      toast.success('Question deleted');
      await fetchData();
    } catch (err: any) {
      console.error('Failed to delete question:', err);
      toast.error(err.message || 'Failed to delete question');
    }
  };

  const handleToggle = async (q: Question) => {
    try {
      await upsertQuestion({ ...q, is_active: !q.is_active });
      await fetchData();
    } catch (err: any) {
      console.error('Failed to toggle question status:', err);
      toast.error(err.message || 'Failed to toggle question status');
    }
  };

  const set = (key: keyof Question, val: unknown) => setFormData(p => ({ ...p, [key]: val }));

  return (
    <AdminLayout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Career Fit Assessment — Question Management</h1>
            <p className="text-muted-foreground text-sm">{questions.filter(q => q.is_active).length} active / {questions.length} total questions</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search questions..." value={search}
                onChange={e => handleSearch(e.target.value)}
                className="pl-8 w-48 bg-input border-border" />
            </div>
            <Button onClick={openAdd} className="gradient-bg border-0 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> Add Question
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)
          ) : filtered.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <p className="text-muted-foreground">No questions found. Click "Add Question" to get started.</p>
            </div>
          ) : filtered.map((q, idx) => (
            <div key={q.id} className={`glass-card rounded-xl p-4 ${!q.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground mb-2">{q.question_text}</p>
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {[{ label: 'A', text: q.option_a }, { label: 'B', text: q.option_b }, { label: 'C', text: q.option_c }, { label: 'D', text: q.option_d }].map(({ label, text }) => (
                      <div key={label} className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 ${q.correct_answer === label ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                        <span className="font-bold">{label}.</span> {text}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {q.category && <Badge variant="secondary" className="text-xs">{q.category}</Badge>}
                    {q.difficulty && <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyColors[q.difficulty] || 'bg-muted text-muted-foreground'}`}>{q.difficulty}</span>}
                    {q.marks !== null && q.marks !== undefined && <span className="text-xs text-muted-foreground">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggle(q)} title={q.is_active ? 'Disable' : 'Enable'}>
                    {q.is_active ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(q)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this question.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(q.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Edit Question' : 'Add Question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Question Text *</Label>
              <textarea value={formData.question_text || ''}
                onChange={e => set('question_text', e.target.value)}
                rows={3}
                placeholder="Enter the question text..."
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground resize-none focus:outline-none focus:border-primary" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'option_a', label: 'Option A *', placeholder: 'Enter option A' },
                { key: 'option_b', label: 'Option B *', placeholder: 'Enter option B' },
                { key: 'option_c', label: 'Option C *', placeholder: 'Enter option C' },
                { key: 'option_d', label: 'Option D *', placeholder: 'Enter option D' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label className="text-sm">{label}</Label>
                  <Input
                    placeholder={placeholder}
                    value={(formData as Record<string, string>)[key] || ''}
                    onChange={e => set(key as keyof Question, e.target.value)}
                    className="mt-1 bg-input border-border"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">Correct Answer (Optional)</Label>
                <select
                  value={formData.correct_answer || ''}
                  onChange={e => set('correct_answer', e.target.value ? (e.target.value as 'A' | 'B' | 'C' | 'D') : null)}
                  className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">None / Optional</option>
                  {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>Option {o}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-sm">Marks (Optional)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 1"
                  value={formData.marks !== null && formData.marks !== undefined ? formData.marks : ''}
                  onChange={e => set('marks', e.target.value === '' ? null : (parseInt(e.target.value, 10) || null))}
                  className="mt-1 bg-input border-border"
                />
              </div>
              <div>
                <Label className="text-sm">Category (Optional)</Label>
                <Input
                  value={formData.category || ''}
                  onChange={e => set('category', e.target.value)}
                  className="mt-1 bg-input border-border"
                  placeholder="e.g. Web Dev"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="q-active" checked={formData.is_active ?? true}
                onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
              <Label htmlFor="q-active" className="text-sm cursor-pointer">Active (visible to students)</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gradient-bg border-0 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
