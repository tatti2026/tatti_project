import { useEffect, useState, useMemo, useCallback } from 'react';
import { getAllStudents, getAllAssessments, getAllQuestions } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import type { Student, Assessment, Question } from '@/types/index';
import {
  RotateCcw, Eye, X, Search, ChevronLeft, ChevronRight,
  HelpCircle, Award, Users, AlertCircle, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type ScoreTier = 'all' | 'high' | 'medium' | 'low' | 'unassessed';

/**
 * Score calculation thresholds:
 * High Score: score >= 75 (Light Blue)
 * Medium Score: score >= 35 && score < 75 (Light Purple)
 * Low Score: score < 35 (Light Red)
 * No percentage-range labels are rendered in the UI.
 */
export function getScoreCategory(percentage: number | null | undefined): 'high' | 'medium' | 'low' | 'unassessed' {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return 'unassessed';
  }
  if (percentage >= 75) return 'high';
  if (percentage >= 35) return 'medium';
  return 'low';
}

const CATEGORY_STYLES = {
  high: {
    tierName: 'High Score',
    colorName: 'Light Blue',
    rowClass: 'bg-[#EFF6FF] hover:bg-[#DBEAFE] border-b border-[#BFDBFE] text-[#0C4A6E]',
    textColor: 'text-[#0C4A6E]',
    idColor: 'text-[#1D4ED8]',
    badgeClass: 'bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD] font-bold',
    btnClass: 'bg-white hover:bg-[#DBEAFE] text-[#1D4ED8] border-[#93C5FD]',
    dotBg: 'bg-[#3B82F6]',
  },
  medium: {
    tierName: 'Medium Score',
    colorName: 'Light Purple',
    rowClass: 'bg-[#FAF5FF] hover:bg-[#F3E8FF] border-b border-[#E9D5FF] text-[#4C1D95]',
    textColor: 'text-[#4C1D95]',
    idColor: 'text-[#7C3AED]',
    badgeClass: 'bg-[#F3E8FF] text-[#6B21A8] border border-[#D8B4FE] font-bold',
    btnClass: 'bg-white hover:bg-[#F3E8FF] text-[#7C3AED] border-[#D8B4FE]',
    dotBg: 'bg-[#A855F7]',
  },
  low: {
    tierName: 'Low Score',
    colorName: 'Light Red',
    rowClass: 'bg-[#FFF1F2] hover:bg-[#FFE4E6] border-b border-[#FECDD3] text-[#881337]',
    textColor: 'text-[#881337]',
    idColor: 'text-[#E11D48]',
    badgeClass: 'bg-[#FFE4E6] text-[#9F1239] border border-[#FDA4AF] font-bold',
    btnClass: 'bg-white hover:bg-[#FFE4E6] text-[#E11D48] border-[#FDA4AF]',
    dotBg: 'bg-[#F43F5E]',
  },
  unassessed: {
    tierName: 'Unassessed',
    colorName: 'Neutral',
    rowClass: 'bg-slate-50/70 hover:bg-slate-100/70 border-b border-slate-200 text-slate-700',
    textColor: 'text-slate-600',
    idColor: 'text-slate-500',
    badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200 font-medium',
    btnClass: 'bg-white text-slate-400 border-slate-200 cursor-not-allowed opacity-50',
    dotBg: 'bg-slate-400',
  },
};

interface AnswerRow {
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  marksA: number;
  marksB: number;
  marksC: number;
  marksD: number;
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  marksAwarded: number;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

function AnswersModal({
  open,
  onClose,
  studentName,
  studentId,
  assessment,
  questions,
}: {
  open: boolean;
  onClose: () => void;
  studentName: string;
  studentId: string;
  assessment: Assessment | null;
  questions: Question[];
}) {
  const rows = useMemo<AnswerRow[]>(() => {
    if (!assessment?.answers || !questions.length) return [];
    const answers = (assessment.answers || {}) as Record<string, string>;
    return questions.map((q, idx) => {
      const selected = (answers[q.id] || null) as 'A' | 'B' | 'C' | 'D' | null;
      const mA = Number(q.marks_a) || 1;
      const mB = Number(q.marks_b) || 1;
      const mC = Number(q.marks_c) || 1;
      const mD = Number(q.marks_d) || 1;
      let marksAwarded = 0;
      if (selected === 'A') marksAwarded = mA;
      else if (selected === 'B') marksAwarded = mB;
      else if (selected === 'C') marksAwarded = mC;
      else if (selected === 'D') marksAwarded = mD;
      return {
        questionNumber: idx + 1,
        questionText: q.question_text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        marksA: mA,
        marksB: mB,
        marksC: mC,
        marksD: mD,
        selectedAnswer: selected,
        marksAwarded,
      };
    });
  }, [assessment, questions]);

  const answeredCount = rows.filter(r => r.selectedAnswer).length;
  const totalAwarded = rows.reduce((sum, r) => sum + r.marksAwarded, 0);
  const percentage = assessment?.percentage != null ? Number(assessment.percentage) : null;
  const cat = getScoreCategory(percentage);
  const catStyle = CATEGORY_STYLES[cat];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl bg-white border border-[#FED7AA] max-h-[90dvh] overflow-hidden flex flex-col shadow-xl">
        <DialogHeader className="shrink-0 pb-3 border-b border-[#FED7AA]/60">
          <DialogTitle className="flex items-center justify-between gap-3 text-[#172554] text-lg">
            <span className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#F59E0B]" />
              <span>Career Fit Assessment Answers</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Student metadata header banner */}
        <div className="bg-[#FFF1E5] border border-[#FFCC99] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shrink-0 my-1">
          <div>
            <p className="text-xs text-[#64748B] font-medium">Student Name</p>
            <p className="text-base font-bold text-[#172554]">{studentName}</p>
            <p className="text-xs font-semibold text-[#D97706] tracking-wide mt-0.5">{studentId}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {percentage !== null ? (
              <div className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 ${catStyle.badgeClass}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${catStyle.dotBg}`} />
                <span>Career Fit: {percentage.toFixed(1)}%</span>
              </div>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                Not Assessed
              </span>
            )}

            <span className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#FFCC99] text-[#7C2D12]">
              {totalAwarded} / {assessment?.total_marks ?? rows.length} Marks
            </span>

            <span className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#FFCC99] text-[#7C2D12]">
              {answeredCount}/{rows.length} Answered
            </span>
          </div>
        </div>

        {/* Scrollable Answer List */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-1 py-2">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-[#64748B] text-sm">
              <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              No submitted answers recorded for this student.
            </div>
          ) : (
            rows.map(row => {
              const optionMap: Record<string, string> = {
                A: row.optionA,
                B: row.optionB,
                C: row.optionC,
                D: row.optionD,
              };
              const marksMap: Record<string, number> = {
                A: row.marksA,
                B: row.marksB,
                C: row.marksC,
                D: row.marksD,
              };

              return (
                <div
                  key={row.questionNumber}
                  className="bg-white rounded-xl p-4 border border-[#FED7AA]/80 shadow-xs"
                >
                  {/* Question header */}
                  <div className="flex items-start gap-3 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-[#0B1F3A] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                      Q{row.questionNumber}
                    </span>
                    <p className="text-sm font-semibold text-[#172554] leading-snug flex-1">
                      {row.questionText}
                    </p>
                    {row.selectedAnswer && (
                      <span className="shrink-0 text-xs font-bold text-[#9A3412] bg-[#FFE0B2] border border-[#FFCC99] rounded-lg px-2 py-0.5">
                        +{row.marksAwarded} mk
                      </span>
                    )}
                  </div>

                  {/* Options grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {OPTION_LABELS.map(opt => {
                      const isSelected = row.selectedAnswer === opt;
                      let cls = 'border-slate-200 bg-slate-50/60 text-slate-600';
                      if (isSelected) {
                        cls = 'border-[#F59E0B] bg-[#FFF1E5] text-[#9A3412] font-semibold ring-1 ring-[#F59E0B]';
                      }

                      return (
                        <div
                          key={opt}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}
                        >
                          <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isSelected ? 'bg-[#F59E0B] text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {opt}
                          </span>
                          <span className="flex-1 font-medium leading-snug">{optionMap[opt]}</span>
                          <span className={`text-[10px] font-semibold shrink-0 ${
                            isSelected ? 'text-[#D97706]' : 'text-slate-400'
                          }`}>
                            {marksMap[opt]} mk
                          </span>
                          {isSelected && (
                            <span className="text-[11px] font-bold text-[#F59E0B] ml-1">✓ Selected</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Skipped note */}
                  {!row.selectedAnswer && (
                    <p className="text-[11px] text-[#64748B] italic mt-2">
                      — Question was not answered (skipped)
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 pt-3 border-t border-[#FED7AA]/60 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-[#FFCC99] text-[#7C2D12] hover:bg-[#FFF1E5] hover:text-[#9A3412]"
          >
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
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<ScoreTier>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal state
  const [viewingStudent, setViewingStudent] = useState<{
    name: string;
    studentId: string;
    assessment: Assessment;
  } | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [studentsRes, assessmentsRes, questionsRes] = await Promise.all([
        getAllStudents(0, 1000),
        getAllAssessments(),
        getAllQuestions(),
      ]);

      setStudents(studentsRes.data || []);
      setAssessments(assessmentsRes || []);
      setQuestions(Array.isArray(questionsRes) ? questionsRes : []);
    } catch (err: unknown) {
      console.error('Error fetching student assessment records:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assessment data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map student.id -> latest completed assessment
  const assessmentByStudentId = useMemo(() => {
    const map = new Map<string, Assessment>();
    assessments.forEach(a => {
      if (!map.has(a.student_id) || a.status === 'completed') {
        map.set(a.student_id, a);
      }
    });
    return map;
  }, [assessments]);

  // Compute table rows with scores & categories
  const allRows = useMemo(() => {
    return students.map(student => {
      const assessment = assessmentByStudentId.get(student.id) || null;
      const isCompleted = assessment?.status === 'completed' && assessment.percentage != null;
      const scorePercentage = isCompleted ? Number(assessment!.percentage) : null;
      const category = getScoreCategory(scorePercentage);

      return {
        student,
        assessment,
        scorePercentage,
        category,
      };
    });
  }, [students, assessmentByStudentId]);

  // Statistics for summary badges
  const stats = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    let unassessed = 0;

    allRows.forEach(r => {
      if (r.category === 'high') high++;
      else if (r.category === 'medium') medium++;
      else if (r.category === 'low') low++;
      else unassessed++;
    });

    const totalAssessed = high + medium + low;
    return {
      total: allRows.length,
      totalAssessed,
      high,
      medium,
      low,
      unassessed,
    };
  }, [allRows]);

  // Filtered rows by search and tier
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allRows.filter(row => {
      // Tier filter
      if (tierFilter !== 'all' && row.category !== tierFilter) {
        return false;
      }

      // Search filter (Student name or Student ID)
      if (query) {
        const name = (row.student.full_name || '').toLowerCase();
        const studentId = (row.student.student_id || '').toLowerCase();
        const email = (row.student.email || '').toLowerCase();
        if (!name.includes(query) && !studentId.includes(query) && !email.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [allRows, search, tierFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Reset page when search or tier changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, tierFilter, pageSize]);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#FED7AA]/60 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#172554] tracking-tight">
              Career Fit Assessment – Student Results
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              View student assessment scores and submitted answers.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="text-xs h-9 gap-1.5 border-[#FFCC99] text-[#7C2D12] hover:bg-[#FFF1E5] hover:text-[#9A3412]"
              title="Refresh assessment results"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Metric Summary Bar - Colors & Categories with Zero Range Labels */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-[#FED7AA] rounded-xl p-3 shadow-xs">
            <p className="text-[11px] font-medium text-[#64748B]">Total Students</p>
            <p className="text-xl font-bold text-[#172554] mt-0.5">{stats.total}</p>
          </div>

          <div className="bg-white border border-[#FED7AA] rounded-xl p-3 shadow-xs">
            <p className="text-[11px] font-medium text-[#64748B]">Total Assessed</p>
            <p className="text-xl font-bold text-[#172554] mt-0.5">{stats.totalAssessed}</p>
          </div>

          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                <p className="text-[11px] font-bold text-[#0C4A6E]">High Score</p>
              </div>
              <span className="text-[10px] text-[#0C4A6E]/80 font-medium bg-[#DBEAFE] px-1.5 py-0.5 rounded">Light Blue</span>
            </div>
            <p className="text-xl font-black text-[#1D4ED8] mt-1">{stats.high}</p>
          </div>

          <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded-xl p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
                <p className="text-[11px] font-bold text-[#4C1D95]">Medium Score</p>
              </div>
              <span className="text-[10px] text-[#4C1D95]/80 font-medium bg-[#F3E8FF] px-1.5 py-0.5 rounded">Light Purple</span>
            </div>
            <p className="text-xl font-black text-[#7C3AED] mt-1">{stats.medium}</p>
          </div>

          <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" />
                <p className="text-[11px] font-bold text-[#881337]">Low Score</p>
              </div>
              <span className="text-[10px] text-[#881337]/80 font-medium bg-[#FFE4E6] px-1.5 py-0.5 rounded">Light Red</span>
            </div>
            <p className="text-xl font-black text-[#E11D48] mt-1">{stats.low}</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white border border-[#FED7AA] rounded-2xl p-5 shadow-sm space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by student name or student ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white border border-[#FED7AA] text-sm text-[#172554] placeholder:text-slate-400 focus:border-[#F59E0B] focus:ring-[#F59E0B] rounded-lg h-10 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Score Category Filter Pills - Colors & Labels with Zero Range Text */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setTierFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tierFilter === 'all'
                    ? 'bg-[#0B1F3A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({allRows.length})
              </button>

              <button
                type="button"
                onClick={() => setTierFilter('high')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  tierFilter === 'high'
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] hover:bg-[#DBEAFE]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span>Light Blue ({stats.high})</span>
              </button>

              <button
                type="button"
                onClick={() => setTierFilter('medium')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  tierFilter === 'medium'
                    ? 'bg-[#7C3AED] text-white shadow-xs'
                    : 'bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF] hover:bg-[#F3E8FF]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
                <span>Light Purple ({stats.medium})</span>
              </button>

              <button
                type="button"
                onClick={() => setTierFilter('low')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  tierFilter === 'low'
                    ? 'bg-[#E11D48] text-white shadow-xs'
                    : 'bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3] hover:bg-[#FFE4E6]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                <span>Light Red ({stats.low})</span>
              </button>

              {stats.unassessed > 0 && (
                <button
                  type="button"
                  onClick={() => setTierFilter('unassessed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tierFilter === 'unassessed'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Unassessed ({stats.unassessed})
                </button>
              )}
            </div>
          </div>


          {/* Loading State */}
          {loading && (
            <div className="py-12 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData()}
                className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredRows.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-[#172554]">No Student Records Found</p>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                {search
                  ? `No students matching "${search}" were found in this view.`
                  : 'There are currently no students in this category.'}
              </p>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch('')}
                  className="text-xs border-[#FFCC99] text-[#7C2D12] hover:bg-[#FFF1E5]"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}

          {/* Student Assessment Table */}
          {!loading && !error && filteredRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#0B1F3A] text-white text-xs uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-bold">1. Student Name</th>
                    <th className="px-5 py-3.5 text-left font-bold">2. Student ID</th>
                    <th className="px-5 py-3.5 text-left font-bold">3. Career Fit Score (%)</th>
                    <th className="px-5 py-3.5 text-right font-bold">4. View Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map(({ student, assessment, scorePercentage, category }) => {
                    const style = CATEGORY_STYLES[category];
                    const studentDisplayName = student.full_name || student.email || 'Unnamed Student';
                    const studentDisplayId = student.student_id || student.id.slice(0, 8);
                    const isAssessed = scorePercentage !== null;

                    return (
                      <tr
                        key={student.id}
                        className={`transition-colors duration-150 ${style.rowClass}`}
                      >
                        {/* 1. Student Name */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#172554] text-sm">
                              {studentDisplayName}
                            </span>
                            {student.email && (
                              <span className="text-[11px] text-[#64748B]">
                                {student.email}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Student ID */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`font-mono font-bold text-xs ${style.idColor}`}>
                            {studentDisplayId}
                          </span>
                        </td>

                        {/* 3. Career Fit Score (%) - Actual Score next to color indicator dot */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {isAssessed ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shadow-2xs ${style.badgeClass}`}
                              >
                                <span className={`w-2 h-2 rounded-full ${style.dotBg}`} />
                                <span>{scorePercentage.toFixed(1)}%</span>
                              </span>
                              <span className="text-xs opacity-75 font-medium">
                                ({assessment?.score ?? 0}/{assessment?.total_marks ?? questions.length} marks)
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-500 border border-slate-200">
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>Not Attempted</span>
                            </span>
                          )}
                        </td>

                        {/* 4. View Answer */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          {isAssessed && assessment ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setViewingStudent({
                                  name: studentDisplayName,
                                  studentId: studentDisplayId,
                                  assessment,
                                })
                              }
                              className={`h-8 px-3 text-xs font-semibold gap-1.5 transition-all shadow-xs ${style.btnClass}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Answer</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              className="h-8 px-3 text-xs font-medium gap-1.5 bg-white text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>No Answers</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && !error && filteredRows.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#FED7AA]/60 text-xs text-[#64748B]">
              <div className="flex items-center gap-2">
                <span>
                  Showing{' '}
                  <strong className="text-[#172554]">
                    {Math.min((currentPage - 1) * pageSize + 1, filteredRows.length)}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-[#172554]">
                    {Math.min(currentPage * pageSize, filteredRows.length)}
                  </strong>{' '}
                  of <strong className="text-[#172554]">{filteredRows.length}</strong> students
                </span>

                <span className="text-slate-300">|</span>

                <div className="flex items-center gap-1">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="border border-[#FED7AA] bg-white text-[#172554] rounded-md px-1.5 py-0.5 text-xs focus:ring-[#F59E0B]"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 border-[#FED7AA] text-[#172554] hover:bg-[#FFF1E5] disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <span className="px-2 font-medium">
                  Page <strong className="text-[#172554]">{currentPage}</strong> of{' '}
                  <strong className="text-[#172554]">{totalPages}</strong>
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 border-[#FED7AA] text-[#172554] hover:bg-[#FFF1E5] disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Answer Modal */}
      {viewingStudent && (
        <AnswersModal
          open={!!viewingStudent}
          onClose={() => setViewingStudent(null)}
          studentName={viewingStudent.name}
          studentId={viewingStudent.studentId}
          assessment={viewingStudent.assessment}
          questions={questions}
        />
      )}
    </AdminLayout>
  );
}
