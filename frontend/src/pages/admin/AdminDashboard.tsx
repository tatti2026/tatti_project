import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats, DashboardStats } from '@/lib/api';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Users, ClipboardList,
  TrendingUp, UserPlus, RefreshCw, AlertCircle
} from 'lucide-react';
import { format, subDays } from 'date-fns';

const COLORS = ['#2878C8', '#0EA5E9', '#10B981', '#2878C8', '#667085'];

const INITIAL_STATS: DashboardStats = {
  totalStudents: 0,
  newStudents7d: 0,
  assessmentCompleted: 0,
  assessmentPending: 0,
  applicationsSubmitted: 0,
  paidApplications: 0,
  unpaidApplications: 0,
  admissionsConfirmed: 0,
};

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regTrend, setRegTrend] = useState<{ date: string; count: number }[]>([]);
  const [performanceData, setPerformanceData] = useState<{ name: string; value: number }[]>([]);

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

  // Auto-refresh when the admin tabs back from Student Details, Confirmations, Counselling etc.
  useEffect(() => {
    const handleFocus = () => loadStats();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadStats]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const kpiCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-[#2878C8]', bg: 'bg-[#E8F1FB]' },
    { label: 'New Students (7d)', value: stats.newStudents7d, icon: UserPlus, color: 'text-[#2878C8]', bg: 'bg-[#E8F1FB]' },
    { label: 'Career Assessments Done', value: stats.assessmentCompleted, icon: ClipboardList, color: 'text-[#2878C8]', bg: 'bg-[#E8F1FB]' },
    { label: 'Assessments Pending', value: stats.assessmentPending, icon: ClipboardList, color: 'text-[#2878C8]', bg: 'bg-[#E8F1FB]' },
  ];

  if (loading) return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="h-12 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-white border border-[#F0D6C8] rounded-xl animate-pulse" />)}
        </div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-3.5 sm:space-y-4 animate-fade-in">
        {/* Counsellor Portal Header Section - Compact */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-[#667085] font-medium leading-none">
              Welcome back
            </p>
            <h1 className="text-base sm:text-lg font-bold text-[#25364B] tracking-tight truncate mt-1">
              {profile?.full_name || 'Counsellor'}
            </h1>
          </div>
          <button
            onClick={loadStats}
            title="Refresh statistics"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#F0D6C8] bg-[#FFF0E8] text-[#25364B] hover:bg-white text-xs font-semibold transition-colors shadow-2xs shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#2878C8]" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadStats}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* KPI Grid - 2 columns on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white border border-[#F0D6C8] rounded-2xl p-3.5 sm:p-4 shadow-xs hover:border-[#2878C8] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${color}`} />
                </div>
                <TrendingUp className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-[#25364B] tracking-tight">{value}</p>
              <p className="text-[11px] sm:text-xs text-[#667085] truncate font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Registration Trend */}
          <div className="bg-white border border-[#F0D6C8] rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#25364B] mb-4">Student Registration Trend (7 days)</h3>
            <div className="w-full min-w-0 overflow-hidden h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={regTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#667085' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#667085' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #F0D6C8', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)' }} />
                  <Line type="monotone" dataKey="count" stroke="#2878C8" strokeWidth={2.5} dot={{ fill: '#2878C8', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assessment Performance */}
          <div className="bg-white border border-[#F0D6C8] rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#25364B] mb-4">Career Fit Assessment Status</h3>
            <div className="w-full min-w-0 overflow-hidden h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={performanceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                    {performanceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #F0D6C8', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)' }} />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: '12px' }} iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

