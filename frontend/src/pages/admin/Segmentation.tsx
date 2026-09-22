import { useEffect, useState, useMemo, useCallback } from 'react';
import { getAllStudents, getAllAssessments } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { Student, Assessment } from '@/types/index';
import {
  calculateSegmentation,
  SEGMENTATION_THRESHOLDS,
  type SegmentedStudent,
} from '@/utils/segmentation';
import {
  Trophy, Target, AlertCircle, Users, BarChart3,
  RotateCcw, CheckCircle2, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SEGMENT_COLORS = {
  high: '#10B981',    // Emerald
  medium: '#F59E0B',  // Amber
  low: '#EF4444',     // Rose / Red
  unassessed: '#94A3B8' // Slate
};

export default function Segmentation() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [studentsRes, assessmentsRes] = await Promise.all([
        getAllStudents(0, 1000),
        getAllAssessments(),
      ]);

      setStudents(studentsRes.data || []);
      setAssessments(assessmentsRes || []);
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

  // ── SINGLE SOURCE OF TRUTH: Calculated dynamically from actual assessment scores ──
  const summary = useMemo(() => {
    return calculateSegmentation(students, assessments);
  }, [students, assessments]);

  // Donut chart segments directly match the calculated High / Medium / Low counts
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
      color: '#10B981',
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
      color: '#F59E0B',
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
      color: '#EF4444',
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

        {/* ── SEGMENT CARDS: HIGH, MEDIUM, LOW (CALCULATED FROM SCORES) ── */}
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

                  {/* Clean Visual Progress Bar based on calculated percentage */}
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

        {/* ── DISTRIBUTION SECTION: DONUT CHART & STUDENT DETAILS TABLE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Distribution Chart & Intent Metrics Card */}
          <div className="lg:col-span-4 glass-card rounded-xl p-5 border border-border flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Distribution Analysis</h2>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">Assessed Cohort</span>
              </div>

              {/* Donut Chart with Centered KPI equal to Total Assessed Students */}
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

                {/* Center KPI Metric equals Total Assessed Students */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-foreground">{summary.totalAssessed}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Assessed
                  </span>
                </div>
              </div>
            </div>

            {/* Clean Segment Indicators & Percentages */}
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

          {/* Segment Student Details Table */}
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
                            <th className="px-3 py-2 text-left font-semibold">Career Fit Assessment Score</th>
                            <th className="px-3 py-2 text-left font-semibold">Application</th>
                            <th className="px-3 py-2 text-left font-semibold">Payment</th>
                            <th className="px-3 py-2 text-left font-semibold">Selected Course</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.slice(0, 10).map(({ student: s, assessment }) => {
                            const isAssessed = assessment.isCompleted && assessment.percentage != null;
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
                                        ({assessment.score ?? '-'}/{assessment.totalMarks ?? 4} marks)
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
                                  <StatusBadge status={s.application_status} />
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                  <StatusBadge status={s.payment_status} />
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                                  <span className="px-2 py-0.5 rounded bg-muted text-[11px] font-medium text-foreground">
                                    {s.selected_course || 'Not Selected'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {list.length > 10 && (
                        <p className="text-[11px] text-muted-foreground text-center pt-3 italic">
                          Showing 10 of {list.length} students in this cohort
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
    </AdminLayout>
  );
}
