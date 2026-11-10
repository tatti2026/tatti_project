import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentByProfileId, getStudentMonthlyPerformance } from '@/lib/api';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import type { Student, StudentAssessmentPerformance } from '@/types/index';
import { ClipboardList, ArrowRight } from 'lucide-react';
import MonthlyCareerAssessmentGraph from '@/components/student/MonthlyCareerAssessmentGraph';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [perfData, setPerfData] = useState<StudentAssessmentPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    (async () => {
      try {
        const [s, perf] = await Promise.all([
          getStudentByProfileId(profile.id),
          getStudentMonthlyPerformance().catch(() => null),
        ]);
        if (mounted) {
          setStudent(s);
          setPerfData(perf);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading student dashboard:', err);
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [profile]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="space-y-3.5 animate-pulse">
          <div className="h-16 rounded-2xl bg-white/70 border border-[#F0D6C8]" />
          <div className="h-32 rounded-2xl bg-white/70 border border-[#F0D6C8]" />
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-white/70 border border-[#F0D6C8]" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-white/70 border border-[#F0D6C8]" />
        </div>
      </StudentLayout>
    );
  }

  // Real assessment status and stats
  const isCompleted = student?.assessment_status === 'completed';
  const isInProgress = student?.assessment_status === 'in_progress';
  const progressPercent = isCompleted ? 100 : (isInProgress ? 50 : 0);

  const summary = perfData?.summary;
  const latestPct = summary?.latestScore !== null && summary?.latestScore !== undefined
    ? `${summary.latestScore}%`
    : (student?.assessment_percentage ? `${student.assessment_percentage}%` : '—');
  const avgPct = summary?.averageScore !== null && summary?.averageScore !== undefined
    ? `${summary.averageScore}%`
    : '—';
  const completedCount = summary?.totalCompleted ?? (isCompleted ? 1 : 0);

  return (
    <StudentLayout>
      <div className="space-y-3.5 sm:space-y-4">
        {/* A. Welcome section - Compact */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-[#667085] font-medium leading-none">
              Welcome back
            </p>
            <h1 className="text-base sm:text-lg font-bold text-[#25364B] tracking-tight truncate mt-1">
              {profile?.full_name || 'Student'}
            </h1>
          </div>
          {student?.student_id && (
            <div className="bg-[#FFF0E8] border border-[#F0D6C8] rounded-xl px-2.5 py-1 text-[11px] font-semibold text-[#25364B] shrink-0">
              ID: <span className="font-mono text-[#2878C8]">{student.student_id}</span>
            </div>
          )}
        </div>

        {/* B. Career Fit Assessment Card - Compact */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#E8F2FF] text-[#2878C8] flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-[#25364B] truncate">
                  Career Fit Assessment
                </h2>
                <p className="text-[10px] sm:text-[11px] text-[#667085] truncate">
                  {isCompleted
                    ? 'Assessment completed. Review recommendations.'
                    : isInProgress
                    ? 'Assessment in progress'
                    : 'Discover your strengths and career pathway'}
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isInProgress
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Not Started'}
            </span>
          </div>

          {/* Thin blue progress bar on pale peach track (#FFE0CC) */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[#667085] font-medium">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#FFE0CC] overflow-hidden">
              <div
                className="h-full bg-[#2878C8] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Prominent full-width blue "Continue assessment" button */}
          <Button
            onClick={() => navigate('/student/assessment')}
            className="w-full h-10 bg-[#2878C8] hover:bg-[#1D6AB8] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
          >
            <span>{isCompleted ? 'View / Retake Assessment' : isInProgress ? 'Continue assessment' : 'Start Assessment'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* C. Assessment Statistics - Three small cards in a single row */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {/* Card 1: Latest */}
          <div className="bg-white border border-[#F0D6C8] rounded-2xl p-3 shadow-xs text-center">
            <p className="text-[10px] sm:text-[11px] text-[#667085] font-medium uppercase tracking-wider">
              Latest
            </p>
            <p className="text-base sm:text-xl font-bold text-[#25364B] mt-0.5">
              {latestPct}
            </p>
            <p className="text-[9px] text-[#2878C8] font-medium truncate mt-0.5">
              Score
            </p>
          </div>

          {/* Card 2: Average */}
          <div className="bg-white border border-[#F0D6C8] rounded-2xl p-3 shadow-xs text-center">
            <p className="text-[10px] sm:text-[11px] text-[#667085] font-medium uppercase tracking-wider">
              Average
            </p>
            <p className="text-base sm:text-xl font-bold text-[#25364B] mt-0.5">
              {avgPct}
            </p>
            <p className="text-[9px] text-[#2878C8] font-medium truncate mt-0.5">
              Overall
            </p>
          </div>

          {/* Card 3: Completed */}
          <div className="bg-white border border-[#F0D6C8] rounded-2xl p-3 shadow-xs text-center">
            <p className="text-[10px] sm:text-[11px] text-[#667085] font-medium uppercase tracking-wider">
              Completed
            </p>
            <p className="text-base sm:text-xl font-bold text-[#25364B] mt-0.5">
              {completedCount}
            </p>
            <p className="text-[9px] text-[#2878C8] font-medium truncate mt-0.5">
              Attempts
            </p>
          </div>
        </div>

        {/* D. Career Performance Chart */}
        <MonthlyCareerAssessmentGraph
          hideSummaryCards={true}
          onTakeAssessment={() => navigate('/student/assessment')}
        />
      </div>
    </StudentLayout>
  );
}
