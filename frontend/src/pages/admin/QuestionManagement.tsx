import { useEffect, useRef, useState } from 'react';
import { getAllQuestions, importQuestions, upsertQuestion, deleteQuestion } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Question } from '@/types/index';
import { readQuestionsFromFile, type ImportedQuestion } from '@/utils/questionDocumentImport';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, Search, Upload } from 'lucide-react';

const emptyQ = (): Partial<Question> => ({
  question_text: '',
  option_a: '', option_b: '', option_c: '', option_d: '',
  marks_a: 4, marks_b: 3, marks_c: 2, marks_d: 1,
  is_active: true,
});

interface MarksInputProps {
  value: number | null | undefined;
  onChange: (val: number | null) => void;
  label: string;
}

function MarksInput({ value, onChange, label }: MarksInputProps) {
  return (
    <Input
      type="number"
      min={0}
      step={1}
      placeholder="e.g. 4"
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0))}
      className="w-20 shrink-0 bg-input border-border text-center"
      title={`Marks for ${label}`}
    />
  );
}

function optionMarksLabel(q: Question, opt: 'a' | 'b' | 'c' | 'd'): string {
  const key = `marks_${opt}` as 'marks_a' | 'marks_b' | 'marks_c' | 'marks_d';
  const v = q[key];
  return v !== null && v !== undefined ? `${v} mk` : '1 mk';
}

export default function QuestionManagement() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filtered, setFiltered] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Question>>(emptyQ());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportedQuestion[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [parsingDocument, setParsingDocument] = useState(false);
  const [importingQuestions, setImportingQuestions] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = await getAllQuestions();
      setQuestions(qs);
      setFiltered(search.trim() ? qs.filter(q =>
        q.question_text.toLowerCase().includes(search.toLowerCase())
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
      q.question_text.toLowerCase().includes(v.toLowerCase())
    ));
  };

  const openAdd = () => { setFormData(emptyQ()); setShowForm(true); };
  const openEdit = (q: Question) => {
    setFormData({
      ...q,
      marks_a: q.marks_a ?? 1,
      marks_b: q.marks_b ?? 1,
      marks_c: q.marks_c ?? 1,
      marks_d: q.marks_d ?? 1,
    });
    setShowForm(true);
  };

  const validateOptionMarks = (val: unknown, label: string): number | null => {
    if (val === null || val === undefined || val === '') {
      toast.error(`Marks for ${label} are required.`);
      return null;
    }
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) {
      toast.error(`Marks for ${label} must be a non-negative number.`);
      return null;
    }
    return Math.round(n);
  };

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

    const mA = validateOptionMarks(formData.marks_a, 'Option A');
    const mB = validateOptionMarks(formData.marks_b, 'Option B');
    const mC = validateOptionMarks(formData.marks_c, 'Option C');
    const mD = validateOptionMarks(formData.marks_d, 'Option D');
    if (mA === null || mB === null || mC === null || mD === null) return;

    setSaving(true);
    try {
      const payload: Partial<Question> = {
        ...formData,
        question_text: formData.question_text.trim(),
        option_a: formData.option_a.trim(),
        option_b: formData.option_b.trim(),
        option_c: formData.option_c.trim(),
        option_d: formData.option_d.trim(),
        marks_a: mA,
        marks_b: mB,
        marks_c: mC,
        marks_d: mD,
        // Clear legacy/removed fields so backend stays clean
        correct_answer: null,
        category: null,
        is_active: formData.is_active ?? true,
      };

      const saved = await upsertQuestion(payload);
      if (!saved || typeof saved !== 'object') {
        throw new Error('Failed to save question: invalid server response.');
      }

      // Verify that the marks were saved accurately
      if (
        formData.id &&
        saved.marks_a !== undefined &&
        saved.marks_a !== null &&
        (Number(saved.marks_a) !== mA || Number(saved.marks_b) !== mB || Number(saved.marks_c) !== mC || Number(saved.marks_d) !== mD)
      ) {
        throw new Error(`Server failed to update option marks (returned A=${saved.marks_a}, B=${saved.marks_b}, C=${saved.marks_c}, D=${saved.marks_d}).`);
      }

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

  const handleDocumentSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.(docx|pdf)$/i.test(file.name)) {
      toast.error('Choose a Word .docx or PDF file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('The Word document must be 10 MB or smaller.');
      return;
    }

    setParsingDocument(true);
    setImportPreview([]);
    setImportFileName(file.name);
    try {
      const parsed = await readQuestionsFromFile(file);
      if (parsed.length > 100) throw new Error('Import up to 100 questions per Word document.');
      setImportPreview(parsed);
    } catch (err) {
      console.error('Failed to parse question document:', err);
      toast.error(err instanceof Error ? err.message : 'Could not read questions from this document.');
    } finally {
      setParsingDocument(false);
    }
  };

  const handleImportQuestions = async () => {
    if (!importPreview.length) return;
    setImportingQuestions(true);
    try {
      const imported = await importQuestions(importPreview);
      toast.success(`${imported.length} question${imported.length === 1 ? '' : 's'} imported.`);
      setShowImport(false);
      setImportPreview([]);
      setImportFileName('');
      await fetchData();
    } catch (err) {
      console.error('Failed to import questions:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to import questions.');
    } finally {
      setImportingQuestions(false);
    }
  };

  const set = (key: keyof Question, val: unknown) => setFormData(p => ({ ...p, [key]: val }));

  return (
    <AdminLayout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Career Fit Assessment — Question Management</h1>
            <p className="text-muted-foreground text-sm">{questions.filter(q => q.is_active).length} active / {questions.length} total questions</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 md:ml-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search questions..." value={search}
                onChange={e => handleSearch(e.target.value)}
                className="pl-8 w-48 bg-input border-border" />
            </div>
            <Button variant="outline" onClick={() => { setImportPreview([]); setImportFileName(''); setShowImport(true); }}>
              <Upload className="w-4 h-4 mr-1.5" /> Import Word
            </Button>
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
                    {([
                      { label: 'A', text: q.option_a, mk: optionMarksLabel(q, 'a') },
                      { label: 'B', text: q.option_b, mk: optionMarksLabel(q, 'b') },
                      { label: 'C', text: q.option_c, mk: optionMarksLabel(q, 'c') },
                      { label: 'D', text: q.option_d, mk: optionMarksLabel(q, 'd') },
                    ]).map(({ label, text, mk }) => (
                      <div key={label} className="text-xs px-2 py-1 rounded flex items-center gap-1.5 bg-muted text-muted-foreground">
                        <span className="font-bold shrink-0">{label}.</span>
                        <span className="flex-1 truncate">{text}</span>
                        {mk && <span className="shrink-0 font-semibold text-primary/80">{mk}</span>}
                      </div>
                    ))}
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

      <input
        ref={importInputRef}
        type="file"
        accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
        className="hidden"
        onChange={handleDocumentSelected}
      />
      <Dialog open={showImport} onOpenChange={open => { if (!importingQuestions) setShowImport(open); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Import Questions from Word</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a .docx or text-based PDF. Number each question and put options A–D on separate lines.
              Import up to 100 questions at a time. Option marks are optional; omitted marks default to 4, 3, 2, and 1.
              Scanned PDFs without selectable text are not supported.
            </p>
            <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-foreground">{`1. Question text goes here
A. First answer - 4 marks
B. Second answer - 3 marks
C. Third answer (2 marks)
D. Fourth answer - 1 mark

2. Next question
A. ...`}</pre>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => importInputRef.current?.click()} disabled={parsingDocument || importingQuestions}>
                {parsingDocument ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Choose .docx or PDF file
              </Button>
              {importFileName && <span className="text-sm text-muted-foreground">{importFileName}</span>}
            </div>
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{importPreview.length} question{importPreview.length === 1 ? '' : 's'} ready to import</p>
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                  {importPreview.map((question, index) => (
                    <div key={`${index}-${question.question_text}`} className="rounded bg-muted p-3 text-sm">
                      <p className="font-medium">{index + 1}. {question.question_text}</p>
                      <ul className="mt-1 grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                        {([
                          ['A', question.option_a, question.marks_a],
                          ['B', question.option_b, question.marks_b],
                          ['C', question.option_c, question.marks_c],
                          ['D', question.option_d, question.marks_d],
                        ] as const).map(([label, option, marks]) => <li key={label}>{label}. {option} ({marks} marks)</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImport(false)} disabled={importingQuestions}>Cancel</Button>
              <Button onClick={handleImportQuestions} disabled={!importPreview.length || parsingDocument || importingQuestions} className="gradient-bg border-0 text-white">
                {importingQuestions && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import {importPreview.length || ''} Questions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Edit Question' : 'Add Question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">

            {/* Question Text */}
            <div>
              <Label className="text-sm">Question Text *</Label>
              <textarea value={formData.question_text || ''}
                onChange={e => set('question_text', e.target.value)}
                rows={3}
                placeholder="Enter the question text..."
                className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground resize-none focus:outline-none focus:border-primary" />
            </div>

            {/* Options with individual marks */}
            <div>
              <Label className="text-sm mb-2 block">Options &amp; Marks *</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Enter each option's answer text and the marks awarded when a student selects it.
              </p>
              <div className="space-y-3">
                {([
                  { optKey: 'option_a' as const, marksKey: 'marks_a' as const, label: 'Option A' },
                  { optKey: 'option_b' as const, marksKey: 'marks_b' as const, label: 'Option B' },
                  { optKey: 'option_c' as const, marksKey: 'marks_c' as const, label: 'Option C' },
                  { optKey: 'option_d' as const, marksKey: 'marks_d' as const, label: 'Option D' },
                ]).map(({ optKey, marksKey, label }) => (
                  <div key={optKey} className="flex items-center gap-2">
                    {/* Option badge */}
                    <span className="w-7 h-7 rounded-md gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {label.slice(-1)}
                    </span>
                    {/* Option text input */}
                    <Input
                      placeholder={`${label} answer text *`}
                      value={(formData as Record<string, string>)[optKey] || ''}
                      onChange={e => set(optKey, e.target.value)}
                      className="flex-1 bg-input border-border"
                    />
                    {/* Marks label + input */}
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">Marks</span>
                    <MarksInput value={formData[marksKey]} onChange={v => set(marksKey, v)} label={label} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Tip: Use different marks (e.g. 4, 3, 2, 1) to reflect how well each answer aligns with a career path.
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="q-active" checked={formData.is_active ?? true}
                onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
              <Label htmlFor="q-active" className="text-sm cursor-pointer">Active (visible to students)</Label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
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
