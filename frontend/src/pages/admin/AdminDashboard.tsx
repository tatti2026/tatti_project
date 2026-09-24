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

const COLORS = ['#1D4ED8', '#0EA5E9', '#10B981', '#F59E0B', '#64748B'];

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

  // Auto-refresh when the admin tabs back from Student Details, Confirmations, Counselling etc.
  useEffect(() => {
    const handleFocus = () => loadStats();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadStats]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const kpiCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-[#1D4ED8]', bg: 'bg-blue-50' },
    { label: 'New Students (7d)', value: stats.newStudents7d, icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Career Assessments Done', value: stats.assessmentCompleted, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Assessments Pending', value: stats.assessmentPending, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Applications Filed', value: stats.applicationsSubmitted, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Paid Applications', value: stats.paidApplications, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Unpaid Applications', value: stats.unpaidApplications, icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Counselling Pending', value: stats.counsellingPending, icon: Phone, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Confirmed Admissions', value: stats.admissionsConfirmed, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  if (loading) return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="h-12 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-28 bg-white border border-[#E4E7EC] rounded-xl animate-pulse" />)}
        </div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">{greeting}, {profile?.full_name || 'Admin'}!</h1>
            <p className="text-[#667085] text-sm">Institutional analytics, student records, courses, and admissions pipeline.</p>
          </div>
          <button
            onClick={loadStats}
            title="Refresh statistics"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4E7EC] bg-white text-[#344054] hover:bg-[#F8FAFC] text-xs font-medium transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadStats}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white rounded-md text-xs font-medium hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white border border-[#E4E7EC] rounded-xl p-5 shadow-sm hover:border-[#D0D5DD] transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-[#172033]">{value}</p>
              <p className="text-xs text-[#667085] mt-1 leading-tight font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Registration Trend */}
          <div className="bg-white border border-[#E4E7EC] rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#172033] mb-4">Student Registration Trend (7 days)</h3>
            <div className="w-full min-w-0 overflow-hidden h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={regTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#667085' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#667085' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E7EC', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)' }} />
                  <Line type="monotone" dataKey="count" stroke="#1D4ED8" strokeWidth={2.5} dot={{ fill: '#1D4ED8', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assessment Performance */}
          <div className="bg-white border border-[#E4E7EC] rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#172033] mb-4">Career Fit Assessment Status</h3>
            <div className="w-full min-w-0 overflow-hidden h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={performanceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                    {performanceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E7EC', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)' }} />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: '12px' }} iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-white border border-[#E4E7EC] rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#172033] mb-4">Application Payment Overview</h3>
            <div className="w-full min-w-0 overflow-hidden h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#667085' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#667085' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E4E7EC', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)' }} />
                  <Bar dataKey="value" fill="#1D4ED8" radius={[4, 4, 0, 0]}>
                    {paymentData.map((_, i) => <Cell key={i} fill={i === 0 ? '#10B981' : '#F59E0B'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white border border-[#E4E7EC] rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#172033] mb-4">Admission Pipeline Funnel</h3>
            <div className="space-y-3.5">
              {[
                { label: 'Registered', value: stats.totalStudents, max: stats.totalStudents, color: 'bg-[#1D4ED8]' },
                { label: 'Assessed', value: stats.assessmentCompleted, max: stats.totalStudents, color: 'bg-sky-500' },
                { label: 'Applied', value: stats.applicationsSubmitted, max: stats.totalStudents, color: 'bg-amber-500' },
                { label: 'Paid', value: stats.paidApplications, max: stats.totalStudents, color: 'bg-emerald-600' },
                { label: 'Confirmed', value: stats.admissionsConfirmed, max: stats.totalStudents, color: 'bg-emerald-700' },
              ].map(({ label, value, max, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#667085] font-medium">{label}</span>
                    <span className="text-[#172033] font-semibold">{value}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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
