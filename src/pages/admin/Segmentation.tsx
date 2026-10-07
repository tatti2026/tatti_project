import { useEffect, useState, useMemo, useCallback } from 'react';
import { getAllStudents, getAllAssessments, getAllQuestions } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { Student, Assessment, Question } from '@/types/index';
import {
  calculateSegmentation,
  SEGMENTATION_THRESHOLDS,
} from '@/utils/segmentation';
import {
  Trophy, Target, AlertCircle, Users, BarChart3,
  RotateCcw, CheckCircle2, HelpCircle, Eye, X,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SEGMENT_COLORS = {
  high: '#10B981',
  medium: '#F59E0B',
  low: '#EF4444',
  unassessed: '#94A3B8',
};

interface AnswerRow {
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  isCorrect: boolean | null;
  correctAnswer: 'A' | 'B' | 'C' | 'D' | null;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

function AnswersModal({
  open,
  onClose,
  studentName,
  assessment,
  questions,
}: {
  open: boolean;
  onClose: () => void;
  studentName: string;
  assessment: Assessment | null;
  questions: Question[];
}) {
  const rows = useMemo<AnswerRow[]>(() => {
    if (!assessment?.answers || !questions.length) return [];
    const answers = assessment.answers as Record<string, string>;
    return questions.map((q, idx) => {
      const selected = (answers[q.id] || null) as 'A' | 'B' | 'C' | 'D' | null;
      const correctAns = (q.correct_answer || null) as 'A' | 'B' | 'C' | 'D' | null;
      const isCorrect =
        selected && correctAns ? selected === correctAns : null;
      return {
        questionNumber: idx + 1,
        questionText: q.question_text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        selectedAnswer: selected,
        isCorrect,
        correctAnswer: correctAns,
      };
    });
  }, [assessment, questions]);

  const answeredCount = rows.filter(r => r.selectedAnswer).length;
  const correctCount = rows.filter(r => r.isCorrect === true).length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl bg-card border-border max-h-[90dvh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Career Fit Answers — {studentName}
          </DialogTitle>
        </DialogHeader>

        {/* Summary bar */}
        <div className="flex flex-wrap gap-3 px-1 py-2 border-b border-border/60 shrink-0">
          <span className="text-xs bg-muted rounded-lg px-3 py-1.5 font-semibold text-foreground">
            {answeredCount}/{rows.length} Answered
          </span>
          {assessment?.percentage !== null && assessment?.percentage !== undefined && (
            <span className="text-xs bg-primary/10 text-primary rounded-lg px-3 py-1.5 font-semibold border border-primary/20">
              Score: {Number(assessment.percentage).toFixed(1)}%&nbsp;
              ({assessment.score ?? 0}/{assessment.total_marks ?? rows.length} marks)
            </span>
          )}
          {rows.some(r => r.correctAnswer !== null) && (
            <span className="text-xs bg-emerald-500/10 text-emerald-500 rounded-lg px-3 py-1.5 font-semibold border border-emerald-500/20">
              {correctCount} Correct
            </span>
          )}
        </div>

        {/* Scrollable answer list */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-1 mt-1">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No answers recorded for this student.
            </div>
          ) : (
            rows.map(row => {
              const optionMap: Record<string, string> = {
                A: row.optionA,
                B: row.optionB,
                C: row.optionC,
                D: row.optionD,
              };
              return (
                <div
                  key={row.questionNumber}
                  className="glass-card rounded-xl p-4 border border-border"
                >
                  {/* Question */}
                  <div className="flex items-start gap-3 mb-3">
                    <span className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                      Q{row.questionNumber}
                    </span>
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {row.questionText}
                    </p>
                  </div>

                  {/* Options grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {OPTION_LABELS.map(opt => {
                      const isSelected = row.selectedAnswer === opt;
                      const isCorrectOpt = row.correctAnswer === opt;

                      let cls = 'border-border bg-muted/40 text-muted-foreground';
                      if (isSelected && row.isCorrect === true)
                        cls = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600';
                      else if (isSelected && row.isCorrect === false)
                        cls = 'border-rose-500/40 bg-rose-500/10 text-rose-500';
                      else if (isSelected && row.isCorrect === null)
                        cls = 'border-primary/40 bg-primary/10 text-primary';
                      else if (isCorrectOpt && !isSelected && row.correctAnswer !== null)
                        cls = 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600/70';

                      return (
                        <div
                          key={opt}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}
                        >
                          <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isSelected ? 'bg-current text-white opacity-90' : 'bg-muted'
                          }`}>
                            {opt}
                          </span>
                          <span className="flex-1 font-medium leading-snug">{optionMap[opt]}</span>
                          {isSelected && (
                            <span className="text-[10px] font-bold shrink-0 opacity-80 ml-auto">
                              {row.isCorrect === true ? '✓ Correct' : row.isCorrect === false ? '✗ Wrong' : 'Selected'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Skipped badge */}
                  {!row.selectedAnswer && (
                    <p className="text-[11px] text-muted-foreground italic mt-2">
                      — Not answered (skipped)
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 pt-3 border-t border-border flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-3.5 h-3.5 mr-1" /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Segmentation() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [viewingStudent, setViewingStudent] = useState<{ name: string; assessment: Assessment } | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [studentsRes, assessmentsRes, questionsRes] = await Promise.all([
        getAllStudents(0, 1000),
        getAllAssessments(),
        getAllQuestions(),
      ]);

      setStudents(studentsRes.data || []);
      setAssessments(assessmentsRes || []);
      setQuestions(Array.isArray(questionsRes) ? questionsRes : []);
    } catch (err) {
      console.error('Error fetching segmentation data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build a quick lookup: student_id → assessment
  const assessmentByStudentId = useMemo(() => {
    const map = new Map<string, Assessment>();
    assessments.forEach(a => {
      if (!map.has(a.student_id) || a.status === 'completed') {
        map.set(a.student_id, a);
      }
    });
    return map;
  }, [assessments]);

  const summary = useMemo(() => {
    return calculateSegmentation(students, assessments);
  }, [students, assessments]);

  const pieData = useMemo(() => {
    if (summary.totalAssessed === 0) {
      return [
        {
          name: 'NO DATA',
          value: 1,
          percentage: 0,
          color: '#334155',
          desc: 'No completed assessments recorded',
        },
      ];
    }
    return [
      {
        name: 'HIGH',
        value: summary.highCount,
        percentage: summary.highPct,
        color: SEGMENT_COLORS.high,
        desc: `Score ≥ ${SEGMENTATION_THRESHOLDS.HIGH_INTENT_MIN_SCORE}% — High Intent / Top Performers`,
      },
      {
        name: 'MEDIUM',
        value: summary.mediumCount,
        percentage: summary.mediumPct,
        color: SEGMENT_COLORS.medium,
        desc: `Score ${SEGMENTATION_THRESHOLDS.MEDIUM_INTENT_MIN_SCORE}%–${SEGMENTATION_THRESHOLDS.HIGH_INTENT_MIN_SCORE - 1}% — Medium Intent / Qualified`,
      },
      {
        name: 'LOW',
        value: summary.lowCount,
        percentage: summary.lowPct,
        color: SEGMENT_COLORS.low,
        desc: `Score < ${SEGMENTATION_THRESHOLDS.MEDIUM_INTENT_MIN_SCORE}% — Low Intent / Needs Support`,
      },
    ];
  }, [summary]);

  const cards = [
    {
      tier: 'HIGH',
      title: 'High Intent & Qualified',
      subtitle: `Career Fit Score ≥ ${SEGMENTATION_THRESHOLDS.HIGH_INTENT_MIN_SCORE}% (Distinction / Top Performers)`,
      count: summary.highCount,
      pct: summary.highPct,
      icon: Trophy,
      bgGlow: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      barColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    },
    {
      tier: 'MEDIUM',
      title: 'Medium Intent (Qualified)',
      subtitle: `Career Fit Score ${SEGMENTATION_THRESHOLDS.MEDIUM_INTENT_MIN_SCORE}%–${SEGMENTATION_THRESHOLDS.HIGH_INTENT_MIN_SCORE - 1}% (Proficient / Solid Foundation)`,
      count: summary.mediumCount,
      pct: summary.mediumPct,
      icon: Target,
      bgGlow: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      barColor: 'bg-amber-500',
      badgeBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    },
    {
      tier: 'LOW',
      title: 'Low Intent / At Risk',
      subtitle: `Career Fit Score < ${SEGMENTATION_THRESHOLDS.MEDIUM_INTENT_MIN_SCORE}% (Developing / Needs Guidance)`,
      count: summary.lowCount,
      pct: summary.lowPct,
      icon: AlertCircle,
      bgGlow: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      barColor: 'bg-rose-500',
      badgeBg: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-80 rounded-xl bg-muted" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Career Fit Assessment & Segmentation</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dynamically calculated from each student's actual Career Fit Assessment score and performance
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{summary.totalAssessed} Assessed</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-foreground">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>{summary.totalStudents} Total Enrolled</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="text-xs h-8 gap-1.5"
              title="Recalculate and refresh assessment data"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* ── SEGMENT CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <div
                key={card.tier}
                className="glass-card rounded-xl p-5 border border-border flex flex-col justify-between hover:border-primary/40 transition-all shadow-sm h-full"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wider uppercase ${card.badgeBg}`}>
                      {card.tier}
                    </span>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.bgGlow}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h2 className="text-sm font-bold text-foreground">{card.title}</h2>
                  <p className="text-[11px] text-muted-foreground mt-1 min-h-[30px] leading-relaxed">
                    {card.subtitle}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-border/50">
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-foreground">{card.count}</span>
                      <span className="text-xs text-muted-foreground font-medium">
                        / {summary.totalAssessed} assessed
                      </span>
                    </div>
                    <span className="text-sm font-bold text-foreground">{card.pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${card.barColor}`}
                      style={{ width: `${card.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── DISTRIBUTION SECTION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Donut Chart */}
          <div className="lg:col-span-4 glass-card rounded-xl p-5 border border-border flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Distribution Analysis</h2>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">Assessed Cohort</span>
              </div>

              <div className="relative py-4 flex items-center justify-center">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={54}
                        outerRadius={78}
                        paddingAngle={summary.totalAssessed > 0 ? 4 : 0}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            if (summary.totalAssessed === 0) {
                              return (
                                <div className="p-2.5 bg-card/95 backdrop-blur-md rounded-lg border border-border shadow-lg text-xs">
                                  <p className="text-muted-foreground">No assessed students yet</p>
                                </div>
                              );
                            }
                            return (
                              <div className="p-2.5 bg-card/95 backdrop-blur-md rounded-lg border border-border shadow-lg text-xs">
                                <p className="font-bold text-foreground flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                                  {data.name} Segment
                                </p>
                                <p className="text-muted-foreground mt-0.5">
                                  {data.value} students ({data.percentage}%)
                                </p>
                                <p className="text-[10px] text-muted-foreground/80 mt-0.5">{data.desc}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-foreground">{summary.totalAssessed}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Assessed
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-border/60">
              {[
                { name: 'HIGH', value: summary.highCount, percentage: summary.highPct, color: SEGMENT_COLORS.high, desc: `Score ≥ ${SEGMENTATION_THRESHOLDS.HIGH_INTENT_MIN_SCORE}%` },
                { name: 'MEDIUM', value: summary.mediumCount, percentage: summary.mediumPct, color: SEGMENT_COLORS.medium, desc: `Score ${SEGMENTATION_THRESHOLDS.MEDIUM_INTENT_MIN_SCORE}%–${SEGMENTATION_THRESHOLDS.HIGH_INTENT_MIN_SCORE - 1}%` },
                { name: 'LOW', value: summary.lowCount, percentage: summary.lowPct, color: SEGMENT_COLORS.low, desc: `Score < ${SEGMENTATION_THRESHOLDS.MEDIUM_INTENT_MIN_SCORE}%` },
              ].map(item => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-xs leading-none">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight mt-1">{item.desc}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <p className="font-extrabold text-foreground text-xs">
                      {item.value} <span className="font-normal text-[10px] text-muted-foreground">students</span>
                    </p>
                    <p className="text-[11px] font-bold text-primary">{item.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Details Table */}
          <div className="lg:col-span-8 glass-card rounded-xl p-5 border border-border flex flex-col justify-between shadow-sm">
            <Tabs defaultValue="high" className="flex flex-col h-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 mb-4">
                <TabsList className="bg-muted p-1">
                  <TabsTrigger value="high" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
                    HIGH ({summary.highCount})
                  </TabsTrigger>
                  <TabsTrigger value="medium" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
                    MEDIUM ({summary.mediumCount})
                  </TabsTrigger>
                  <TabsTrigger value="low" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
                    LOW ({summary.lowCount})
                  </TabsTrigger>
                  {summary.unassessed.length > 0 && (
                    <TabsTrigger value="unassessed" className="text-xs data-[state=active]:bg-muted-foreground/30">
                      UNASSESSED ({summary.unassessed.length})
                    </TabsTrigger>
                  )}
                </TabsList>
                <span className="text-xs text-muted-foreground">Classified by actual assessment score</span>
              </div>

              {[
                { key: 'high', list: summary.high, label: 'High Intent' },
                { key: 'medium', list: summary.medium, label: 'Medium Intent' },
                { key: 'low', list: summary.low, label: 'Low Intent' },
                ...(summary.unassessed.length > 0
                  ? [{ key: 'unassessed', list: summary.unassessed, label: 'Unassessed' }]
                  : []),
              ].map(({ key, list }) => (
                <TabsContent key={key} value={key} className="m-0 focus-visible:outline-none flex-1">
                  {list.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-xs">
                      No students currently classified in this segment.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/80 text-muted-foreground">
                            <th className="px-3 py-2 text-left font-semibold">Student Name</th>
                            <th className="px-3 py-2 text-left font-semibold">Email</th>
                            <th className="px-3 py-2 text-left font-semibold">Career Fit Score</th>
                            <th className="px-3 py-2 text-left font-semibold">Answers</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.slice(0, 15).map(({ student: s, assessment }) => {
                            const isAssessed = assessment.isCompleted && assessment.percentage != null;
                            const rawAssessment = assessmentByStudentId.get(s.id);

                            return (
                              <tr key={s.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                                <td className="px-3 py-2.5 whitespace-nowrap font-medium text-foreground">
                                  <div>
                                    <p className="font-bold">{s.full_name || '-'}</p>
                                    <p className="text-[10px] text-muted-foreground">{s.student_id || ''}</p>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                                  {s.email || '-'}
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  {isAssessed ? (
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                                          assessment.percentage! >= SEGMENTATION_THRESHOLDS.HIGH_INTENT_MIN_SCORE
                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                            : assessment.percentage! >= SEGMENTATION_THRESHOLDS.MEDIUM_INTENT_MIN_SCORE
                                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                        }`}
                                      >
                                        {assessment.percentage}%
                                      </span>
                                      <span className="text-[11px] text-muted-foreground">
                                        ({assessment.score ?? '-'}/{assessment.totalMarks ?? questions.length} marks)
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <HelpCircle className="w-3.5 h-3.5" />
                                      <span className="italic">Not Completed</span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  {isAssessed && rawAssessment ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2.5 text-[11px] gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                                      onClick={() =>
                                        setViewingStudent({
                                          name: s.full_name || s.email || 'Student',
                                          assessment: rawAssessment,
                                        })
                                      }
                                    >
                                      <Eye className="w-3 h-3" />
                                      View Answers
                                      <ChevronRight className="w-3 h-3 opacity-60" />
                                    </Button>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground italic">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {list.length > 15 && (
                        <p className="text-[11px] text-muted-foreground text-center pt-3 italic">
                          Showing 15 of {list.length} students in this cohort
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Answers Modal */}
      {viewingStudent && (
        <AnswersModal
          open={!!viewingStudent}
          onClose={() => setViewingStudent(null)}
          studentName={viewingStudent.name}
          assessment={viewingStudent.assessment}
          questions={questions}
        />
      )}
    </AdminLayout>
  );
}
