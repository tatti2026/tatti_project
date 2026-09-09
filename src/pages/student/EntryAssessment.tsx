import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStudentByProfileId, createStudent, getActiveQuestions,
  getStudentAssessment, createAssessment, submitAssessment,
  updateStudent
} from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Question, Assessment, Student } from '@/types/index';
import { CheckCircle2, Clock, ClipboardList, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';

export default function EntryAssessment() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'instructions' | 'exam' | 'result'>('loading');
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      let s = await getStudentByProfileId(profile.id);
      if (!s) s = await createStudent({ profile_id: profile.id, email: profile.email, full_name: profile.full_name });
      setStudent(s);
      const [qs, existing] = await Promise.all([getActiveQuestions(), s ? getStudentAssessment(s.id) : null]);
      setQuestions(qs);
      if (existing?.status === 'completed') { setAssessment(existing); setPhase('result'); }
      else { setPhase('instructions'); }
    })();
  }, [profile]);

  // Timer
  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); handleAutoSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const startExam = async () => {
    if (!student) return;
    const a = await createAssessment(student.id);
    setAssessment(a);
    setPhase('exam');
  };

  const handleAutoSubmit = () => handleSubmit(true);

  const handleSubmit = async (auto = false) => {
    if (!assessment || !student) return;
    if (timerRef.current) clearInterval(timerRef.current);

    let score = 0;
    let totalMarks = 0;
    questions.forEach(q => {
      totalMarks += q.marks;
      if (answers[q.id] === q.correct_answer) score += q.marks;
    });

    await submitAssessment(assessment.id, score, totalMarks, answers);
    await updateStudent(student.id, { assessment_status: 'completed' });

    const updated = { ...assessment, score, total_marks: totalMarks, percentage: (score / totalMarks) * 100, status: 'completed' as const };
    setAssessment(updated);
    setPhase('result');

    if (auto) toast.info('Time is up! Assessment auto-submitted.');
    else toast.success('Assessment submitted successfully!');
  };

  if (phase === 'loading') {
    return (
      <StudentLayout>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </StudentLayout>
    );
  }

  if (phase === 'result' && assessment) {
    const pct = assessment.percentage ?? 0;
    const grade = pct >= 75 ? 'Excellent' : pct >= 50 ? 'Good' : 'Needs Improvement';
    const gradeColor = pct >= 75 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-destructive';
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto animate-fade-in">
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center mx-auto mb-5">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Assessment Completed!</h1>
            <p className="text-muted-foreground text-sm mb-6">TAT Entrance Assessment Result</p>
            <div className="bg-muted rounded-xl p-6 mb-6">
              <div className="text-5xl font-bold gradient-text mb-2">{pct.toFixed(1)}%</div>
              <p className={`text-lg font-semibold ${gradeColor} mb-1`}>{grade}</p>
              <p className="text-muted-foreground text-sm">Score: {assessment.score} / {assessment.total_marks}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs mb-1">Correct</p>
                <p className="font-bold text-success">{assessment.score}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs mb-1">Wrong</p>
                <p className="font-bold text-destructive">{(assessment.total_marks ?? 0) - (assessment.score ?? 0)}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs mb-1">Total</p>
                <p className="font-bold text-foreground">{questions.length}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/student/courses')} className="flex-1 gradient-bg border-0 text-white">
                View Recommendations
              </Button>
              <Button onClick={() => navigate('/student/dashboard')} variant="outline" className="flex-1">
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (phase === 'instructions') {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto animate-fade-in">
          <div className="glass-card rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">TAT Entrance Assessment</h1>
                <p className="text-muted-foreground text-sm">Read instructions carefully before starting</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Questions', value: questions.length.toString() },
                { label: 'Duration', value: '45 Min' },
                { label: 'Marks', value: questions.reduce((s, q) => s + q.marks, 0).toString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xl font-bold gradient-text">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-semibold text-foreground">Instructions:</h3>
              {[
                'Each question has 4 options. Select the best answer.',
                'You can navigate between questions freely.',
                'The timer starts once you begin the exam.',
                'Assessment auto-submits when time runs out.',
                'Results are available immediately after submission.',
                'You can take the assessment only once.',
              ].map((inst, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{inst}</span>
                </div>
              ))}
            </div>

            <Button onClick={startExam} className="w-full gradient-bg border-0 text-white font-semibold h-11">
              Start Assessment
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Exam phase
  const q = questions[currentQ];
  const options = ['A', 'B', 'C', 'D'] as const;
  const optionTexts: Record<string, string> = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
  const answeredCount = Object.keys(answers).length;

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="glass-card rounded-xl p-4 mb-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">Question {currentQ + 1} of {questions.length}</span>
              <span className="text-xs text-muted-foreground">({answeredCount} answered)</span>
            </div>
            <Progress value={((currentQ + 1) / questions.length) * 100} className="h-1.5" />
          </div>
          <div className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg ${timeLeft < 300 ? 'bg-destructive/20 text-destructive' : 'bg-muted'}`}>
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono text-sm font-semibold">{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Question */}
        <div className="glass-card rounded-xl p-6 mb-4">
          <div className="flex items-start gap-3 mb-6">
            <span className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
              {currentQ + 1}
            </span>
            <p className="text-foreground font-medium leading-relaxed">{q.question_text}</p>
          </div>
          <div className="space-y-3">
            {options.map(opt => (
              <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                className={`w-full flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                  answers[q.id] === opt
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border hover:border-primary/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  answers[q.id] === opt ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>{opt}</span>
                <span className="text-sm">{optionTexts[opt]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <div className="flex-1 flex gap-1 overflow-x-auto pb-1">
            {questions.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentQ(idx)}
                className={`w-7 h-7 rounded text-xs font-medium shrink-0 transition-colors ${
                  idx === currentQ ? 'bg-primary text-white' :
                  answers[questions[idx].id] ? 'bg-success/20 text-success' :
                  'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                }`}>{idx + 1}</button>
            ))}
          </div>
          {currentQ < questions.length - 1 ? (
            <Button onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))} className="gradient-bg border-0 text-white">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="gradient-bg border-0 text-white">Submit Assessment</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You have answered {answeredCount} of {questions.length} questions. Are you sure you want to submit? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Review Answers</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleSubmit()} className="gradient-bg border-0 text-white">
                    Submit Now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
