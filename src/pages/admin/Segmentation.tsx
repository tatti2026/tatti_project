import { useEffect, useState } from 'react';
import { getAllStudents } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import StatusBadge from '@/components/common/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Student } from '@/types/index';
import { Trophy, Target, TrendingDown, Loader2 } from 'lucide-react';

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

export default function Segmentation() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllStudents(0, 1000).then(({ data }) => { setStudents(data); setLoading(false); });
  }, []);

  // Segment by assessment_status and application completeness
  const high = students.filter(s => s.assessment_status === 'completed' && (s.payment_status === 'paid' || s.application_status === 'submitted'));
  const medium = students.filter(s => s.assessment_status === 'completed' && s.payment_status !== 'paid' && s.application_status === 'not_started');
  const low = students.filter(s => s.assessment_status !== 'completed');

  const pieData = [
    { name: 'High Intent / High Performance', value: high.length },
    { name: 'Medium Intent / Medium Performance', value: medium.length },
    { name: 'Low Intent / Low Performance', value: low.length },
  ];

  const segments = [
    { key: 'high', label: 'High Intent / High Performance', students: high, icon: Trophy, color: 'text-success', badgeColor: 'bg-success/20 text-success' },
    { key: 'medium', label: 'Medium Intent / Medium Performance', students: medium, icon: Target, color: 'text-warning', badgeColor: 'bg-warning/20 text-warning' },
    { key: 'low', label: 'Low Intent / Low Performance', students: low, icon: TrendingDown, color: 'text-destructive', badgeColor: 'bg-destructive/20 text-destructive' },
  ];

  if (loading) return (
    <AdminLayout>
      <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground">Assessment & Segmentation</h1>
          <p className="text-muted-foreground text-sm">Automatic student segmentation based on performance and intent</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {segments.map(({ key, label, students: seg, icon: Icon, color, badgeColor }) => (
            <div key={key} className="glass-card rounded-xl p-4 text-center">
              <Icon className={`w-8 h-8 ${color} mx-auto mb-2`} />
              <p className="text-2xl font-bold text-foreground">{seg.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${badgeColor}`}>
                {students.length > 0 ? `${Math.round((seg.length / students.length) * 100)}%` : '0%'}
              </span>
            </div>
          ))}
        </div>

        {/* Chart + Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Distribution</h3>
            <div className="w-full min-w-0 overflow-hidden h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="md:col-span-2 glass-card rounded-xl p-5">
            <Tabs defaultValue="high">
              <TabsList className="mb-4 bg-muted">
                <TabsTrigger value="high" className="text-xs">High Intent ({high.length})</TabsTrigger>
                <TabsTrigger value="medium" className="text-xs">Medium Intent ({medium.length})</TabsTrigger>
                <TabsTrigger value="low" className="text-xs">Low Intent ({low.length})</TabsTrigger>
              </TabsList>
              {segments.map(({ key, students: seg }) => (
                <TabsContent key={key} value={key}>
                  {seg.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No students in this segment</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            {['Name', 'Email', 'Assessment', 'Application', 'Payment', 'Counselling'].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {seg.slice(0, 10).map(s => (
                            <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="px-3 py-2 whitespace-nowrap font-medium text-foreground">{s.full_name || '-'}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{s.email || '-'}</td>
                              <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={s.assessment_status} /></td>
                              <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={s.application_status} /></td>
                              <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={s.payment_status} /></td>
                              <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={s.counselling_status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
