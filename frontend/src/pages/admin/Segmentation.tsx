import { useEffect, useState } from 'react';
import { getAllStudents } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { Student } from '@/types/index';
import {
  Trophy, Target, AlertCircle, Users, BarChart3,
  TrendingUp, Award, Clock, Sparkles
} from 'lucide-react';

const SEGMENT_COLORS = {
  high: '#10B981',    // Emerald
  medium: '#F59E0B',  // Amber
  low: '#EF4444',     // Rose / Red
};

export default function Segmentation() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllStudents(0, 1000).then(({ data }) => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  // Segment logic:
  // HIGH: Completed assessment and application submitted/paid
  // MEDIUM: Completed assessment but application pending
  // LOW: Assessment in progress or not started
  const high = students.filter(s =>
    s.assessment_status === 'completed' &&
    (s.payment_status === 'paid' || s.application_status === 'submitted')
  );
  const medium = students.filter(s =>
    s.assessment_status === 'completed' &&
    s.payment_status !== 'paid' &&
    s.application_status !== 'submitted'
  );
  const low = students.filter(s => s.assessment_status !== 'completed');

  const total = students.length;
  const highPct = total > 0 ? Math.round((high.length / total) * 100) : 0;
  const medPct = total > 0 ? Math.round((medium.length / total) * 100) : 0;
  const lowPct = total > 0 ? Math.max(0, 100 - highPct - medPct) : 0;

  const pieData = [
    { name: 'HIGH', value: high.length, percentage: highPct, color: SEGMENT_COLORS.high, desc: 'High Intent / Top Performers' },
    { name: 'MEDIUM', value: medium.length, percentage: medPct, color: SEGMENT_COLORS.medium, desc: 'Medium Intent / Action Needed' },
    { name: 'LOW', value: low.length, percentage: lowPct, color: SEGMENT_COLORS.low, desc: 'Low Intent / Follow-up Required' },
  ];

  const cards = [
    {
      tier: 'HIGH',
      title: 'High Intent & Qualified',
      subtitle: 'Career Fit Assessment passed & application submitted/paid',
      count: high.length,
      pct: highPct,
      icon: Trophy,
      color: '#10B981',
      bgGlow: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      barColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    },
    {
      tier: 'MEDIUM',
      title: 'Medium Intent (Qualified)',
      subtitle: 'Career Fit Assessment completed; application or fee pending',
      count: medium.length,
      pct: medPct,
      icon: Target,
      color: '#F59E0B',
      bgGlow: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      barColor: 'bg-amber-500',
      badgeBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    },
    {
      tier: 'LOW',
      title: 'Low Intent / At Risk',
      subtitle: 'Career Fit Assessment incomplete or not yet started',
      count: low.length,
      pct: lowPct,
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
              Automated student grouping based on assessment completion, performance, and admission momentum
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-foreground">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>{total} Total Enrolled Students</span>
            </span>
          </div>
        </div>

        {/* ── SEGMENT CARDS: HIGH, MEDIUM, LOW (EQUAL HEIGHTS, CLEAN GRID) ── */}
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
                      <span className="text-xs text-muted-foreground font-medium">students</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">{card.pct}%</span>
                  </div>

                  {/* Clean Visual Progress Bar */}
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

        {/* ── DISTRIBUTION SECTION: REDESIGNED CLEAN PROFESSIONAL LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Distribution Chart & Intent Metrics Card */}
          <div className="lg:col-span-4 glass-card rounded-xl p-5 border border-border flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Distribution Analysis</h2>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">Active Cohort</span>
              </div>

              {/* Donut Chart with Centered KPI */}
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
                        paddingAngle={4}
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
                            return (
                              <div className="p-2.5 bg-card/95 backdrop-blur-md rounded-lg border border-border shadow-lg text-xs">
                                <p className="font-bold text-foreground flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                                  {data.name} Segment
                                </p>
                                <p className="text-muted-foreground mt-0.5">{data.value} students ({data.percentage}%)</p>
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

                {/* Center KPI Metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-foreground">{total}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</span>
                </div>
              </div>
            </div>

            {/* Clean Segment Indicators & Percentages */}
            <div className="space-y-2.5 pt-3 border-t border-border/60">
              {pieData.map(item => (
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
                    <p className="font-extrabold text-foreground text-xs">{item.value} <span className="font-normal text-[10px] text-muted-foreground">students</span></p>
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
                    HIGH ({high.length})
                  </TabsTrigger>
                  <TabsTrigger value="medium" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
                    MEDIUM ({medium.length})
                  </TabsTrigger>
                  <TabsTrigger value="low" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
                    LOW ({low.length})
                  </TabsTrigger>
                </TabsList>
                <span className="text-xs text-muted-foreground">Sorted by student intent level</span>
              </div>

              {[
                { key: 'high', list: high, label: 'High Intent' },
                { key: 'medium', list: medium, label: 'Medium Intent' },
                { key: 'low', list: low, label: 'Low Intent' },
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
                            <th className="px-3 py-2 text-left font-semibold">Career Fit Assessment</th>
                            <th className="px-3 py-2 text-left font-semibold">Application</th>
                            <th className="px-3 py-2 text-left font-semibold">Payment</th>
                            <th className="px-3 py-2 text-left font-semibold">Selected Course</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.slice(0, 8).map(s => (
                            <tr key={s.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2.5 whitespace-nowrap font-medium text-foreground">
                                {s.full_name || '-'}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                                {s.email || '-'}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <StatusBadge status={s.assessment_status} />
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
                          ))}
                        </tbody>
                      </table>
                      {list.length > 8 && (
                        <p className="text-[11px] text-muted-foreground text-center pt-3 italic">
                          Showing 8 of {list.length} students in this cohort
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
