import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, DashboardStats } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Users, ClipboardList, FileText, CreditCard,
  Phone, Award, TrendingUp, UserPlus, RefreshCw, AlertCircle
} from 'lucide-react';
import { format, subDays } from 'date-fns';

const COLORS = ['#5D5FEF', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

const INITIAL_STATS: DashboardStats = {
  totalStudents: 0,
  newStudents7d: 0,
  assessmentCompleted: 0,
  assessmentPending: 0,
  applicationsSubmitted: 0,
  paidApplications: 0,
  unpaidApplications: 0,
  counsellingPending: 0,
  admissionsConfirmed: 0,
};

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regTrend, setRegTrend] = useState<{ date: string; count: number }[]>([]);
  const [performanceData, setPerformanceData] = useState<{ name: string; value: number }[]>([]);
  const [paymentData, setPaymentData] = useState<{ name: string; value: number }[]>([]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboardStats = await getDashboardStats();

      const trend = dashboardStats.registrationTrend && dashboardStats.registrationTrend.length > 0
        ? dashboardStats.registrationTrend
        : Array.from({ length: 7 }, (_, i) => {
            const d = subDays(new Date(), 6 - i);
            return { date: format(d, 'MMM dd'), count: 0 };
          });

      setStats(dashboardStats);
      setRegTrend(trend);
      setPerformanceData([
        { name: 'Completed', value: dashboardStats.assessmentCompleted },
        { name: 'Pending', value: dashboardStats.assessmentPending },
      ]);
      setPaymentData([
        { name: 'Paid', value: dashboardStats.paidApplications },
        { name: 'Unpaid', value: dashboardStats.unpaidApplications },
      ]);
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
      setError(err?.message || 'Failed to load dashboard statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const kpiCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-primary' },
    { label: 'New Students (7d)', value: stats.newStudents7d, icon: UserPlus, color: 'text-success' },
    { label: 'Career Fit Assessment Completed', value: stats.assessmentCompleted, icon: ClipboardList, color: 'text-info' },
    { label: 'Career Fit Assessment Pending', value: stats.assessmentPending, icon: ClipboardList, color: 'text-warning' },
    { label: 'Applications Submitted', value: stats.applicationsSubmitted, icon: FileText, color: 'text-primary' },
    { label: 'Paid Applications', value: stats.paidApplications, icon: CreditCard, color: 'text-success' },
    { label: 'Unpaid Applications', value: stats.unpaidApplications, icon: CreditCard, color: 'text-destructive' },
    { label: 'Counselling Pending', value: stats.counsellingPending, icon: Phone, color: 'text-warning' },
    { label: 'Admissions Confirmed', value: stats.admissionsConfirmed, icon: Award, color: 'text-success' },
  ];

  if (loading) return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="h-12 w-64 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{greeting}, {profile?.full_name || 'Admin'}!</h1>
            <p className="text-muted-foreground text-sm">Manage students, assessments, courses and admissions.</p>
          </div>
          <button
            onClick={loadStats}
            title="Refresh statistics"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadStats}
              className="flex items-center gap-1.5 px-3 py-1 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:bg-destructive/90 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpiCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="kpi-card">
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${color}`} />
                <TrendingUp className="w-3 h-3 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Registration Trend */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Student Registration Trend (7 days)</h3>
            <div className="w-full min-w-0 overflow-hidden h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={regTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assessment Performance */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Career Fit Assessment Performance</h3>
            <div className="w-full min-w-0 overflow-hidden h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={performanceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                    {performanceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Status */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Application Payment Status</h3>
            <div className="w-full min-w-0 overflow-hidden h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Admission Pipeline</h3>
            <div className="space-y-3">
              {[
                { label: 'Registered', value: stats.totalStudents, max: stats.totalStudents, color: 'bg-primary' },
                { label: 'Assessed', value: stats.assessmentCompleted, max: stats.totalStudents, color: 'bg-info' },
                { label: 'Applied', value: stats.applicationsSubmitted, max: stats.totalStudents, color: 'bg-warning' },
                { label: 'Paid', value: stats.paidApplications, max: stats.totalStudents, color: 'bg-success' },
                { label: 'Confirmed', value: stats.admissionsConfirmed, max: stats.totalStudents, color: 'bg-success' },
              ].map(({ label, value, max, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-medium">{value}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: max > 0 ? `${(value / max) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
