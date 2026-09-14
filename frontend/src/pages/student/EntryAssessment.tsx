import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStudentByProfileId, createStudent, getActiveQuestions,
  getStudentAssessment, createAssessment, submitAssessment,
  updateStudent, getAllCourses, getStudentRecommendations,
  upsertRecommendation, upsertApplication, getStudentApplication
} from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Question, Assessment, Student, Course, CourseRecommendation as CourseRecommendationType } from '@/types/index';
import {
  CheckCircle2, Clock, ClipboardList, ChevronLeft, ChevronRight,
  Trophy, Sparkles, BookOpen, Users, Star, ArrowRight,
  Loader2, AlertCircle, Award, Target, Check, CheckCircle,
  Lock, Unlock
} from 'lucide-react';
import { getApplicationAccess, isApplicationUnlocked } from '@/services/applicationAccessService';

export default function EntryAssessment() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Core state
  const [student, setStudent] = useState<Student | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [recommendations, setRecommendations] = useState<CourseRecommendationType[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [interestedCourseIds, setInterestedCourseIds] = useState<Set<string>>(new Set());

  // Assessment execution state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [examActive, setExamActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectingCourse, setSelectingCourse] = useState(false);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // ── 1. INITIAL DATA FETCH ──────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      try {
        let s = await getStudentByProfileId(profile.id);
        if (!s) s = await createStudent({ profile_id: profile.id, email: profile.email, full_name: profile.full_name });
        setStudent(s);

        const [qs, existingAssessment, allCourses, existingRecs, app] = await Promise.all([
          getActiveQuestions(),
          s ? getStudentAssessment(s.id) : null,
          getAllCourses(),
          s ? getStudentRecommendations(s.id) : [],
          s ? getStudentApplication(s.id) : null,
        ]);

        setQuestions(qs);
        setCourses(allCourses.filter(c => c.status === 'available'));

        if (existingAssessment?.status === 'completed') {
          setAssessment(existingAssessment);
          if (existingRecs.length > 0) {
            const enriched = existingRecs.map(r => ({ ...r, course: allCourses.find(c => c.id === r.course_id) }));
            setRecommendations(enriched as CourseRecommendationType[]);
            setInterestedCourseIds(new Set(existingRecs.filter(r => r.is_interested).map(r => r.course_id)));
            const sel = existingRecs.find(r => r.is_selected);
            if (sel) setSelectedCourseId(sel.course_id);
            else if (app?.course_id) setSelectedCourseId(app.course_id);
          } else if (s) {
            await generateRecommendations(s.id, existingAssessment.percentage ?? 0, allCourses);
          }
        }
      } catch (err) {
        console.error('Failed to load assessment data', err);
        toast.error('Failed to load assessment data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  // ── 2. COUNTDOWN TIMER ──────────────────────────────────────
  useEffect(() => {
    if (!examActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examActive]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ── 3. START ASSESSMENT ────────────────────────────────────
  const handleStartAssessment = async () => {
    if (!student) return;
    try {
      const a = await createAssessment(student.id);
      setAssessment(a);
      setExamActive(true);
    } catch (err) {
      toast.error('Could not start assessment. Please try again.');
    }
  };

  const handleAutoSubmit = () => handleSubmitAssessment(true);

  // ── 4. SUBMIT ASSESSMENT & GENERATE RECOMMENDATIONS ────────
  const handleSubmitAssessment = async (auto = false) => {
    if (!assessment || !student) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    try {
      let score = 0;
      let totalMarks = 0;
      questions.forEach(q => {
        totalMarks += q.marks;
        if (answers[q.id] === q.correct_answer) score += q.marks;
      });

      const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
      await submitAssessment(assessment.id, score, totalMarks, answers);
      await updateStudent(student.id, { assessment_status: 'completed' });

      const updated: Assessment = {
        ...assessment,
        score,
        total_marks: totalMarks,
        percentage,
        status: 'completed'
      };
      setAssessment(updated);
      setExamActive(false);

      // Generate intelligent course recommendations based on score & percentage
      await generateRecommendations(student.id, percentage, courses);

      if (auto) toast.info('Time is up! Assessment auto-submitted.');
      else toast.success('Assessment submitted! Your score & course recommendations are ready.');
    } catch (err) {
      console.error('Failed to submit assessment', err);
      toast.error('Failed to submit assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 5. RECOMMENDATION ENGINE ────────────────────────────────
  const generateRecommendations = async (studentId: string, percentage: number, availableCourses: Course[]) => {
    const newRecs: CourseRecommendationType[] = [];

    for (let i = 0; i < availableCourses.length; i++) {
      const course = availableCourses[i];
      let baseMatch = Math.round(percentage);

      if (percentage >= 80) {
        baseMatch = Math.min(98, Math.max(78, baseMatch - (i * 3)));
      } else if (percentage >= 60) {
        baseMatch = Math.min(88, Math.max(65, baseMatch - (i * 3)));
      } else {
        baseMatch = Math.min(80, Math.max(55, 60 + (i * 4) % 25));
      }

      await upsertRecommendation({
        student_id: studentId,
        course_id: course.id,
        recommendation_percentage: baseMatch,
        is_interested: false,
        is_selected: false,
      });

      newRecs.push({
        id: `rec-${course.id}`,
        student_id: studentId,
        course_id: course.id,
        recommendation_percentage: baseMatch,
        is_interested: false,
        is_selected: false,
        created_at: new Date().toISOString(),
        course,
      });
    }

    newRecs.sort((a, b) => b.recommendation_percentage - a.recommendation_percentage);
    setRecommendations(newRecs);
  };

  // ── 6. SELECT COURSE & NAVIGATE TO APPLICATION ──────────────
  const handleSelectCourse = async (courseId: string) => {
    if (!student) return;
    setSelectingCourse(true);
    try {
      setSelectedCourseId(courseId);

      for (const rec of recommendations) {
        await upsertRecommendation({
          ...rec,
          is_selected: rec.course_id === courseId,
          is_interested: interestedCourseIds.has(rec.course_id) || rec.course_id === courseId,
        });
      }

      const unlocked = isApplicationUnlocked(student.id);

      if (unlocked) {
        const existingApp = await getStudentApplication(student.id);
        if (!existingApp) {
          await upsertApplication({
            student_id: student.id,
            course_id: courseId,
            status: 'in_progress',
            step: 2,
          });
        } else {
          await upsertApplication({
            ...existingApp,
            course_id: courseId,
          });
        }
        toast.success('Course selected! Proceeding to application process...');
      } else {
        toast.info('Course selected! Application process is currently locked awaiting TATTI Admin unlock.');
      }

      navigate('/student/application');
    } catch (err) {
      console.error('Failed to select course', err);
      toast.error('Could not select course. Please try again.');
    } finally {
      setSelectingCourse(false);
    }
  };

  const toggleInterest = async (courseId: string) => {
    const next = new Set(interestedCourseIds);
    const isNowInterested = !next.has(courseId);
    if (isNowInterested) next.add(courseId);
    else next.delete(courseId);
    setInterestedCourseIds(next);

    const targetRec = recommendations.find(r => r.course_id === courseId);
    if (targetRec && student) {
      await upsertRecommendation({
        ...targetRec,
        is_interested: isNowInterested,
      });
    }
  };

  // ── 7. COMPUTED HELPERS ────────────────────────────────────
  const isCompleted = assessment?.status === 'completed';
  const pct = assessment?.percentage ?? 0;

  const performanceTier = useMemo(() => {
    if (pct >= 80) return { title: 'Distinction (Advanced Tier)', color: 'text-emerald-500', badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', note: 'Exceptional performance across analytical, technical, and aptitude questions.' };
    if (pct >= 65) return { title: 'Proficient (First Class Tier)', color: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', note: 'Strong foundational grasp with good analytical problem-solving competence.' };
    if (pct >= 45) return { title: 'Qualified (Second Class Tier)', color: 'text-amber-500', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', note: 'Eligible for core technology, management, and certification programs.' };
    return { title: 'Foundation (Needs Improvement)', color: 'text-rose-500', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20', note: 'Eligible for foundational skill enhancement programs with personalized mentoring.' };
  }, [pct]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return ['all', ...Array.from(set)];
  }, [courses]);

  const filteredRecommendations = useMemo(() => {
    if (selectedCategory === 'all') return recommendations;
    return recommendations.filter(r => r.course?.category === selectedCategory);
  }, [recommendations, selectedCategory]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="space-y-4 max-w-5xl mx-auto">
          <div className="h-14 rounded-xl bg-muted animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)}
          </div>
        </div>
      </StudentLayout>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // STATE 1: DURING ASSESSMENT (EXAM IN PROGRESS)
  // Course Recommendation is completely hidden.
  // ═════════════════════════════════════════════════════════════
  if (examActive && questions.length > 0) {
    const q = questions[currentQ];
    const options = ['A', 'B', 'C', 'D'] as const;
    const optionTexts: Record<string, string> = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
    const answeredCount = Object.keys(answers).length;

    return (
      <StudentLayout>
        <div className="max-w-3xl mx-auto animate-fade-in space-y-4">
          {/* Header Card with Timer & Progress */}
          <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Question {currentQ + 1} of {questions.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  {answeredCount} of {questions.length} Answered
                </span>
              </div>
              <Progress value={((currentQ + 1) / questions.length) * 100} className="h-2" />
            </div>

            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-lg shrink-0 ${
              timeLeft < 300 ? 'bg-destructive/15 text-destructive animate-pulse' : 'bg-muted text-foreground'
            }`}>
              <Clock className="w-4 h-4 text-primary" />
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Time Left</span>
                <span className="font-mono text-base font-bold leading-tight">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-start gap-3 mb-6">
              <span className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
                Q{currentQ + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {q.difficulty}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{q.marks} Mark{q.marks > 1 ? 's' : ''}</span>
                </div>
                <p className="text-foreground font-semibold text-base leading-relaxed">{q.question_text}</p>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {options.map(opt => {
                const isSelected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    className={`w-full flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isSelected ? 'bg-primary text-white shadow-sm' : 'bg-muted text-foreground border border-border'
                    }`}>
                      {opt}
                    </span>
                    <span className="text-sm font-medium text-foreground flex-1">{optionTexts[opt]}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Palette & Navigation Controls */}
          <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
              disabled={currentQ === 0}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>

            {/* Palette */}
            <div className="flex-1 flex gap-1.5 overflow-x-auto py-1 max-w-full justify-start sm:justify-center">
              {questions.map((ques, idx) => {
                const isAnswered = !!answers[ques.id];
                const isCurrent = idx === currentQ;
                return (
                  <button
                    key={ques.id}
                    onClick={() => setCurrentQ(idx)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold shrink-0 transition-all ${
                      isCurrent
                        ? 'bg-primary text-white ring-2 ring-primary/40 shadow-sm'
                        : isAnswered
                        ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {currentQ < questions.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}
                className="gradient-bg border-0 text-white w-full sm:w-auto"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="gradient-bg border-0 text-white w-full sm:w-auto shadow-md">
                    Submit Assessment
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg">Submit Assessment?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      You have answered <span className="font-bold text-foreground">{answeredCount}</span> of{' '}
                      <span className="font-bold text-foreground">{questions.length}</span> questions.
                      Once submitted, your score will be generated and your personalized course recommendations will unlock.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Review Answers</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleSubmitAssessment()}
                      disabled={submitting}
                      className="gradient-bg border-0 text-white"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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

  // ═════════════════════════════════════════════════════════════
  // STATE 2: BEFORE ASSESSMENT COMPLETION
  // Student sees only the Entry Assessment instructions & Start button.
  // Course Recommendation is completely hidden.
  // ═════════════════════════════════════════════════════════════
  if (!isCompleted) {
    return (
      <StudentLayout>
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <p className="text-xs uppercase tracking-wider font-bold text-primary">Entrance Assessment</p>
            </div>
            <h1 className="text-2xl font-bold text-foreground">TATTI Career Fit Assessment</h1>
            <p className="text-muted-foreground text-xs md:text-sm">
              Read the exam instructions carefully before commencing.
            </p>
          </div>

          {/* Instructions Box */}
          <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3.5 pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shrink-0 shadow-sm">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Assessment Instructions & Guidelines</h2>
                <p className="text-xs text-muted-foreground">Standardized entrance evaluation for academic admissions.</p>
              </div>
            </div>

            {/* Assessment Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Questions', value: questions.length.toString(), icon: ClipboardList },
                { label: 'Time Limit', value: '45 Minutes', icon: Clock },
                { label: 'Total Marks', value: questions.reduce((s, q) => s + q.marks, 0).toString(), icon: Award },
                { label: 'Exam Format', value: 'MCQ Single Choice', icon: Target },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-muted/60 rounded-xl p-3.5 border border-border/50 text-center">
                  <Icon className="w-4 h-4 text-primary mx-auto mb-1 opacity-80" />
                  <p className="text-lg font-bold gradient-text">{value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Guidelines List */}
            <div className="bg-muted/40 rounded-xl p-5 border border-border/50 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary" /> Exam Guidelines
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {[
                  'Each question has 4 options. Select the single correct answer.',
                  'You can navigate back and forth between questions anytime.',
                  'The 45-minute countdown starts automatically when you begin.',
                  'The exam will automatically submit when the timer reaches 00:00.',
                  'Each question carries 1 mark. No negative marking for wrong answers.',
                  'Scores are generated immediately upon submission.',
                ].map((inst, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{inst}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Small subtle unlock message as requested */}
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground italic">
                Complete the assessment to unlock your personalized course recommendations.
              </p>
            </div>

            {/* Start Button */}
            <div className="pt-2 flex justify-center">
              <Button
                onClick={handleStartAssessment}
                className="w-full sm:w-auto px-10 h-11 gradient-bg border-0 text-white font-semibold shadow-md text-sm"
              >
                Start Assessment <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // STATE 3: AFTER ASSESSMENT SUBMISSION (RESULT + UNLOCKED COURSES)
  // Shows Scorecard, then immediately below shows "Your Course Recommendations".
  // ═════════════════════════════════════════════════════════════
  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Section 1: Result Header & Success Badges */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-xs uppercase tracking-wider font-bold text-emerald-600">Evaluation Completed</p>
              </div>
              <h1 className="text-2xl font-bold text-foreground">Career Fit Assessment Result</h1>
              <p className="text-muted-foreground text-xs md:text-sm">
                Your performance scorecard and eligible course recommendations.
              </p>
            </div>

            {/* Clear Success State Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold">
                <Check className="w-3.5 h-3.5" /> Assessment Completed
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold">
                <Check className="w-3.5 h-3.5" /> Score Generated
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold">
                <Check className="w-3.5 h-3.5" /> Course Recommendations Unlocked
              </Badge>
              {isApplicationUnlocked(student?.id || '') ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold">
                  <Unlock className="w-3.5 h-3.5" /> Application Process Unlocked
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold">
                  <Lock className="w-3.5 h-3.5" /> Application Process 🔒 Locked (Pending Admin Unlock)
                </Badge>
              )}
            </div>
          </div>

          {/* Scorecard Hero Card */}
          <div className="glass-card rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shrink-0 shadow-lg">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Performance Tier:</span>
                    <Badge className={performanceTier.badgeClass}>
                      {performanceTier.title}
                    </Badge>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">Assessment Evaluated Successfully</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{performanceTier.note}</p>
                </div>
              </div>

              {/* Percentage & Score Pill */}
              <div className="bg-muted/80 rounded-2xl p-5 border border-border text-center min-w-[180px] shadow-sm">
                <span className="text-4xl font-extrabold gradient-text">{pct.toFixed(1)}%</span>
                <p className="text-xs font-bold text-foreground mt-1">Overall Percentage</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total Score: <span className="font-bold text-foreground">{assessment?.score}</span> / {assessment?.total_marks}
                </p>
              </div>
            </div>

            {/* Score Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Total Questions</p>
                <p className="text-lg font-bold text-foreground">{questions.length}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Correct Answers</p>
                <p className="text-lg font-bold text-emerald-500">{assessment?.score}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Wrong / Skipped</p>
                <p className="text-lg font-bold text-rose-500">
                  {Math.max(0, (assessment?.total_marks ?? 0) - (assessment?.score ?? 0))}
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Assessment Status</p>
                <p className="text-lg font-bold text-emerald-500">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Section 2: Course Recommendations (Immediately Below Result) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="space-y-5 pt-2">
          {/* Heading & Subtitle as requested */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Personalized Recommendations</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Your Course Recommendations</h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Based on your assessment performance and interests, we have selected the most suitable courses for you.
              </p>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  }`}
                >
                  {cat === 'all' ? 'All Courses' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Recommended Course Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRecommendations.map(rec => {
              const course = rec.course;
              if (!course) return null;
              const isSelected = selectedCourseId === course.id;
              const isInterested = interestedCourseIds.has(course.id);
              return (
                <div
                  key={course.id}
                  className={`glass-card rounded-2xl p-5 flex flex-col justify-between transition-all border ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/40 shadow-lg'
                      : 'border-border hover:border-primary/40 hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Top: Category & Match Percentage */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {course.category || 'Professional'}
                      </Badge>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-extrabold shrink-0 ${
                        rec.recommendation_percentage >= 80
                          ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                          : rec.recommendation_percentage >= 65
                          ? 'bg-blue-500/15 text-blue-600 border border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                      }`}>
                        {rec.recommendation_percentage}% Match
                      </div>
                    </div>

                    {/* Course Title */}
                    <h3 className="text-base font-bold text-foreground mb-1 leading-snug">
                      {course.course_name}
                    </h3>

                    {/* Recommendation note */}
                    <p className="text-[11px] text-primary font-medium mb-2.5">
                      Recommended based on your assessment performance and interests.
                    </p>

                    {/* Course Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {course.description}
                    </p>

                    {/* Meta: Duration, Seats, Eligibility */}
                    <div className="space-y-1.5 py-2.5 border-y border-border text-xs text-muted-foreground mb-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary shrink-0" /> Duration:
                        </span>
                        <span className="font-semibold text-foreground">{course.duration}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-primary shrink-0" /> Available Seats:
                        </span>
                        <span className="font-semibold text-foreground">{course.available_seats || 30} Seats</span>
                      </div>
                      {course.eligibility && (
                        <div className="pt-1 text-[11px]">
                          <span className="font-semibold text-foreground">Eligibility: </span>
                          <span>{course.eligibility}</span>
                        </div>
                      )}
                    </div>

                    {/* Skills Covered */}
                    {course.skills && course.skills.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                          Skills Covered
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {course.skills.map(s => (
                            <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Career Opportunities */}
                    {course.career_opportunities && course.career_opportunities.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                          Career Opportunities
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {course.career_opportunities.slice(0, 3).map(c => (
                            <Badge key={c} variant="outline" className="text-[10px] px-1.5 py-0.5 border-border">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fee */}
                    <div className="flex items-baseline justify-between mb-4 pt-1">
                      <span className="text-[11px] text-muted-foreground">Course Fee</span>
                      <span className="text-xl font-extrabold gradient-text">
                        ₹{course.fee.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setDetailCourse(course)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant={isInterested ? 'outline' : 'secondary'}
                        className={`text-xs ${
                          isInterested ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : ''
                        }`}
                        onClick={() => toggleInterest(course.id)}
                      >
                        {isInterested ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Star className="w-3.5 h-3.5 mr-1" />}
                        {isInterested ? 'Saved' : 'Save'}
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      disabled={selectingCourse}
                      onClick={() => handleSelectCourse(course.id)}
                      className={`w-full text-xs font-semibold ${
                        isSelected ? 'gradient-bg border-0 text-white shadow-md' : ''
                      }`}
                      variant={isSelected ? 'default' : 'outline'}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1.5" /> Selected & Applied
                        </>
                      ) : (
                        <>
                          Select Course <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── COURSE DETAIL MODAL ────────────────────────────────────── */}
      <Dialog open={!!detailCourse} onOpenChange={() => setDetailCourse(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px]">{detailCourse?.category}</Badge>
              <span className="text-xs text-muted-foreground">{detailCourse?.course_code}</span>
            </div>
            <DialogTitle className="text-lg font-bold">{detailCourse?.course_name}</DialogTitle>
          </DialogHeader>

          {detailCourse && (
            <div className="space-y-4 text-xs md:text-sm">
              <p className="text-muted-foreground leading-relaxed">{detailCourse.description}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/60 rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Duration</span>
                  <p className="font-bold text-foreground mt-0.5">{detailCourse.duration}</p>
                </div>
                <div className="bg-muted/60 rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Course Fee</span>
                  <p className="font-bold text-foreground mt-0.5">₹{detailCourse.fee.toLocaleString()}</p>
                </div>
                <div className="bg-muted/60 rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Seats Available</span>
                  <p className="font-bold text-foreground mt-0.5">{detailCourse.available_seats || 30} Seats</p>
                </div>
                <div className="bg-muted/60 rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Category</span>
                  <p className="font-bold text-foreground mt-0.5">{detailCourse.category}</p>
                </div>
              </div>

              {detailCourse.eligibility && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
                  <p className="text-xs font-bold text-foreground mb-1">Eligibility Criteria</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{detailCourse.eligibility}</p>
                </div>
              )}

              {detailCourse.skills && detailCourse.skills.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-foreground mb-2">Skills You Will Acquire</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailCourse.skills.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {detailCourse.career_opportunities && detailCourse.career_opportunities.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-foreground mb-2">Career & Placement Pathways</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailCourse.career_opportunities.map(c => (
                      <Badge key={c} variant="outline" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3">
                <Button
                  className="w-full gradient-bg border-0 text-white font-semibold h-10"
                  onClick={() => {
                    handleSelectCourse(detailCourse.id);
                    setDetailCourse(null);
                  }}
                >
                  Select Course & Proceed to Application <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
}
