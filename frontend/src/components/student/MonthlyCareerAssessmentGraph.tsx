import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Trophy, Target, CheckCircle2, AlertCircle,
  RotateCw, ClipboardList, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStudentMonthlyPerformance } from '@/lib/api';
import type { StudentAssessmentPerformance, AssessmentAttemptPoint } from '@/types/index';

interface MonthlyCareerAssessmentGraphProps {
  onTakeAssessment?: () => void;
  hideSummaryCards?: boolean;
}

interface ChartDataPoint {
  id: string;
  label: string;
  monthYear: string;
  score: number | null;
  awardedMarks?: number;
  totalMarks?: number;
  date?: string;
  assessmentCount?: number;
}

export default function MonthlyCareerAssessmentGraph({ onTakeAssessment, hideSummaryCards = false }: MonthlyCareerAssessmentGraphProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<StudentAssessmentPerformance | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (year?: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentMonthlyPerformance(year);
      if (!res) {
        setError('Unable to load assessment performance data. Please try again.');
        setData(null);
      } else {
        setData(res);
        if (selectedYear === undefined && res.selectedYear) {
          setSelectedYear(res.selectedYear);
        }
      }
    } catch (err) {
      console.error('Error fetching monthly assessment performance:', err);
      setError('An unexpected error occurred while loading your performance.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedYear);
  }, [selectedYear]);

  const handleTakeAssessment = () => {
    if (onTakeAssessment) {
      onTakeAssessment();
    } else {
      navigate('/student/assessment');
    }
  };

  // Build chart points:
  // If the student has assessment attempts, display all individual attempts in chronological order.
  // Each attempt preserves actual awarded marks and maximum possible marks.
  // If only 12-month data is available, fall back to monthly points.
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!data) return [];

    if (data.attempts && data.attempts.length > 0) {
      // Group by month to label multi-attempts within the same month clearly
      const monthCounts: Record<string, number> = {};
      data.attempts.forEach((a) => {
        const key = `${a.shortMonth} ${a.year}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
      });

      const monthIndexTracker: Record<string, number> = {};
      return data.attempts.map((att: AssessmentAttemptPoint) => {
        const key = `${att.shortMonth} ${att.year}`;
        monthIndexTracker[key] = (monthIndexTracker[key] || 0) + 1;
        const attemptNum = monthIndexTracker[key];
        const isMulti = (monthCounts[key] || 0) > 1;

        return {
          id: att.id,
          label: isMulti ? `${att.shortMonth} #${attemptNum}` : `${att.shortMonth} ${att.year}`,
          monthYear: `${att.month} ${att.year}`,
          score: att.percentage,
          awardedMarks: att.score,
          totalMarks: att.totalMarks,
          date: att.date,
          assessmentCount: 1,
        };
      });
    }

    // Default: 12-month series
    return (data.monthly || []).map((m) => ({
      id: `month-${m.monthIndex}`,
      label: m.shortMonth,
      monthYear: `${m.month} ${m.year}`,
      score: m.score,
      assessmentCount: m.assessmentCount,
    }));
  }, [data]);

  // Custom Tooltip component displaying chronological attempt details
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ChartDataPoint;
      if (item.score === null) {
        return (
          <div className="bg-white border border-[#F0D6C8] p-3 rounded-xl shadow-lg text-xs min-w-[150px]">
            <p className="font-bold text-[#25364B] mb-1">{item.monthYear}</p>
            <p className="text-[#667085] italic">No assessment yet</p>
          </div>
        );
      }
      return (
        <div className="bg-white border border-[#F0D6C8] p-3.5 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[190px]">
          <div className="flex items-center justify-between border-b border-[#F0D6C8]/60 pb-1.5 mb-1.5 gap-2">
            <span className="font-bold text-[#25364B] truncate">{item.monthYear}</span>
            {item.totalMarks !== undefined && item.totalMarks > 0 ? (
              <span className="text-[10px] bg-[#E8F1FB] text-[#2878C8] px-2 py-0.5 rounded-full font-semibold shrink-0">
                {item.awardedMarks} / {item.totalMarks} marks
              </span>
            ) : item.assessmentCount ? (
              <span className="text-[10px] bg-[#E8F1FB] text-[#2878C8] px-2 py-0.5 rounded-full font-semibold shrink-0">
                {item.assessmentCount} {item.assessmentCount === 1 ? 'assessment' : 'assessments'}
              </span>
            ) : null}
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-[#667085] font-medium">Score:</span>
            <span className="text-base font-extrabold text-[#1D6AB8]">{item.score}%</span>
          </div>
          {item.date && (
            <p className="text-[10px] text-[#667085] pt-0.5">
              Completed on {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[#25364B] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#2878C8]" />
            My Career Assessment Performance
          </h2>
          <p className="text-xs sm:text-sm text-[#667085]">
            Track your Career Fit Assessment scores and progress month by month.
          </p>
        </div>

        {/* Year Selector & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {data && data.availableYears && data.availableYears.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#667085] font-medium">Year:</span>
              <select
                value={selectedYear || data.selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-[#F0D6C8] text-xs font-semibold text-[#25364B] rounded-lg px-2.5 py-1.5 outline-none hover:border-[#2878C8] focus:border-[#2878C8] transition-colors shadow-sm cursor-pointer"
              >
                {data.availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}
          {data && (
            <button
              onClick={() => fetchData(selectedYear)}
              disabled={loading}
              title="Refresh Assessment Performance"
              className="p-1.5 text-[#667085] hover:text-[#1D6AB8] hover:bg-[#FFF0E8] rounded-lg transition-colors border border-transparent hover:border-[#F0D6C8]"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#1D6AB8]' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton State */}
      {loading && !data && (
        <div className="bg-white border border-[#F0D6C8] rounded-xl p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[#FFF0E8] rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-[#FFF0E8] rounded-xl animate-pulse" />
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-white border border-rose-200 rounded-xl p-6 text-center space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#25364B]">Failed to load assessment graph</p>
            <p className="text-xs text-[#667085] mt-1">{error}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchData(selectedYear)}
            className="border-[#F0D6C8] text-[#25364B] hover:bg-[#FFF0E8] text-xs"
          >
            <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {/* Empty State: Student has not completed any assessments */}
      {!loading && !error && data && data.summary.totalCompleted === 0 && (
        <div className="bg-white border border-[#F0D6C8] rounded-xl p-8 sm:p-10 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#E8F1FB] text-[#1D6AB8] mx-auto flex items-center justify-center shadow-inner">
            <ClipboardList className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-[#25364B]">No assessment performance data available yet.</h3>
            <p className="text-xs sm:text-sm text-[#667085]">
              Take your Career Fit Assessment to see your scores and track your monthly progress.
            </p>
          </div>
          <div>
            <Button
              onClick={handleTakeAssessment}
              size="sm"
              className="bg-[#2878C8] hover:bg-[#1D6AB8] text-white border-0 shadow-sm text-xs font-semibold px-4 py-2"
            >
              <ClipboardList className="w-4 h-4 mr-2" /> Take Career Fit Assessment
            </Button>
          </div>
        </div>
      )}

      {/* Content State: Student has completed assessments */}
      {!loading && !error && data && data.summary.totalCompleted > 0 && (
        <div className="space-y-4">
          {/* Summary Cards */}
          {!hideSummaryCards && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Card 1: Latest Score */}
              <div className="bg-white border border-[#F0D6C8] rounded-xl p-4 shadow-sm hover:border-[#2878C8] transition-all flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#E8F1FB]/60 text-[#2878C8] flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-[#1D6AB8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#667085] font-medium">Latest Score</p>
                  <p className="text-xl font-bold text-[#25364B] tracking-tight">
                    {data.summary.latestScore !== null ? `${data.summary.latestScore}%` : '—'}
                  </p>
                  <p className="text-[11px] text-[#2878C8] font-medium truncate">Most recent assessment</p>
                </div>
              </div>

              {/* Card 2: Average Score */}
              <div className="bg-white border border-[#F0D6C8] rounded-xl p-4 shadow-sm hover:border-[#2878C8] transition-all flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#E8F1FB]/60 text-[#2878C8] flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-[#2878C8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#667085] font-medium">Average Score</p>
                  <p className="text-xl font-bold text-[#25364B] tracking-tight">
                    {data.summary.averageScore !== null ? `${data.summary.averageScore}%` : '—'}
                  </p>
                  <p className="text-[11px] text-[#2878C8] font-medium truncate">Across all assessments</p>
                </div>
              </div>

              {/* Card 3: Assessments Completed */}
              <div className="bg-white border border-[#F0D6C8] rounded-xl p-4 shadow-sm hover:border-[#2878C8] transition-all flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#E8F1FB]/60 text-[#2878C8] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-[#2878C8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#667085] font-medium">Assessments Completed</p>
                  <p className="text-xl font-bold text-[#25364B] tracking-tight">
                    {data.summary.totalCompleted}
                  </p>
                  <p className="text-[11px] text-[#2878C8] font-medium truncate">Total completed tests</p>
                </div>
              </div>
            </div>
          )}

          {/* Line Graph Card */}
          <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#F0D6C8]/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1D6AB8]" />
                <h3 className="text-sm font-semibold text-[#25364B]">
                  Monthly Performance ({data.selectedYear})
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#667085]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#2878C8]" />
                  <span className="w-2 h-2 rounded-full bg-[#1D6AB8]" />
                  <span>Score Trend</span>
                </div>
                {(!data.attempts || data.attempts.length === 0) && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full border border-dashed border-[#667085]" />
                    <span>No test taken</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recharts Container */}
            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E2E8F0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#667085', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#F0D6C8' }}
                    tickLine={{ stroke: '#F0D6C8' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    tick={{ fill: '#667085', fontSize: 11 }}
                    axisLine={{ stroke: '#F0D6C8' }}
                    tickLine={{ stroke: '#F0D6C8' }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Assessment Score"
                    stroke="#2878C8"
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={{
                      r: 5,
                      fill: '#1D6AB8',
                      stroke: '#FFFFFF',
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 7,
                      fill: '#1D6AB8',
                      stroke: '#FFFFFF',
                      strokeWidth: 2.5,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 pt-3 border-t border-[#F0D6C8]/30 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#667085] gap-2">
              <p>
                * Values represent completed career assessment percentages calculated from awarded marks vs maximum marks in chronological order.
              </p>
              {data.recordsCount === 0 && (
                <p className="text-[#2878C8] font-medium">
                  No assessments completed in {data.selectedYear}.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


