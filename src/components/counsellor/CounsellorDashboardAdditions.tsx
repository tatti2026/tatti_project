import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertTriangle, Smile, ShieldCheck, Star, MessageSquare,
  ArrowRight, CheckCircle2, Clock, Eye, RefreshCw
} from 'lucide-react';
import {
  getNeedsAttentionAlerts,
  updateAlertStatus,
  getCounsellorStudentsMood,
  getCounsellorAnonymousQuestions,
  getCounsellorFeedbackSummary
} from '@/lib/api';
import type { MoodAttentionAlert, SessionFeedbackSummary } from '@/types/index';

const MOOD_EMOJIS: Record<string, string> = {
  Sad: '😢',
  Low: '😔',
  Okay: '😐',
  Good: '😊',
  Great: '😍',
};

export default function CounsellorDashboardAdditions() {
  const navigate = useNavigate();

  // Alerts
  const [alerts, setAlerts] = useState<MoodAttentionAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  // Today's Mood Overview
  const [todayMood, setTodayMood] = useState<Record<string, number>>({
    Sad: 0, Low: 0, Okay: 0, Good: 0, Great: 0, total: 0
  });

  // Anonymous Questions
  const [pendingAnonCount, setPendingAnonCount] = useState<number>(0);

  // Feedback Summary
  const [feedbackSummary, setFeedbackSummary] = useState<SessionFeedbackSummary>({
    totalFeedback: 0,
    averageRating: 0,
    pendingFeedback: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  const loadData = async () => {
    try {
      const [alertsData, moodData, anonData, fbData] = await Promise.all([
        getNeedsAttentionAlerts().catch(() => []),
        getCounsellorStudentsMood({ filter: 'today' }).catch(() => ({ records: [], todayOverview: { Sad: 0, Low: 0, Okay: 0, Good: 0, Great: 0, total: 0 }, totalCount: 0 })),
        getCounsellorAnonymousQuestions({ status: 'Pending' }).catch(() => []),
        getCounsellorFeedbackSummary().catch(() => ({ summary: { totalFeedback: 0, averageRating: 0, pendingFeedback: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }, feedbacks: [] }))
      ]);

      setAlerts(alertsData);
      setTodayMood(moodData.todayOverview);
      setPendingAnonCount(anonData.length);
      setFeedbackSummary(fbData.summary);
    } catch (err) {
      console.error('Failed to load additions data:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateAlert = async (id: string, status: 'Reviewed' | 'Resolved') => {
    try {
      const ok = await updateAlertStatus(id, status);
      if (ok) {
        toast.success(`Alert marked as ${status}`);
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      }
    } catch (err) {
      toast.error('Failed to update alert');
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'Active' || a.status === 'Reviewed');

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. NEEDS ATTENTION ALERTS SECTION */}
      <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#25364B]">
                Needs Attention Alerts ({activeAlerts.length})
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#667085]">
                Students with 3 or more consecutive days of low or sad mood.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/counsellor/mood-tracker')}
            className="text-[11px] font-semibold text-[#2878C8] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {loadingAlerts ? (
          <div className="py-6 text-center text-xs text-[#667085] animate-pulse">Checking alerts...</div>
        ) : activeAlerts.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>No active alerts at this time. All assigned students are maintaining stable mood check-ins.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF0E8] text-[#25364B] font-semibold border-b border-[#F0D6C8]">
                <tr>
                  <th className="px-3 py-2.5">Student</th>
                  <th className="px-3 py-2.5">Consecutive Low Days</th>
                  <th className="px-3 py-2.5">Recent Mood History</th>
                  <th className="px-3 py-2.5">Last Check-in</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0D6C8]">
                {activeAlerts.map(a => (
                  <tr key={a.id} className="hover:bg-[#FFF7ED]/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-[#25364B]">{a.student_name}</div>
                      <div className="font-mono text-[10px] text-[#2878C8]">{a.student_code || '—'}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px]">
                        <Clock className="w-3 h-3" />
                        {a.consecutive_days} days
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {Array.isArray(a.recent_moods) && a.recent_moods.slice(0, 5).map((m, idx) => (
                          <span key={idx} title={`${m.date}: ${m.mood}`} className="text-base">
                            {MOOD_EMOJIS[m.mood] || '😐'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[#667085]">
                      {a.last_checkin_date}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        a.status === 'Active'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                      {a.status === 'Active' && (
                        <button
                          onClick={() => handleUpdateAlert(a.id, 'Reviewed')}
                          className="px-2 py-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateAlert(a.id, 'Resolved')}
                        className="px-2 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => navigate('/counsellor/students')}
                        className="px-2 py-1 text-[10px] font-semibold text-[#2878C8] bg-[#E8F2FF] border border-[#BFDBFE] rounded-lg hover:bg-[#D4E6FC] transition-colors cursor-pointer"
                      >
                        View Student
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. TODAY'S MOOD OVERVIEW & ANONYMOUS QUESTIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Student Mood Overview */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FFF0E8] text-orange-600 flex items-center justify-center shrink-0">
                <Smile className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#25364B]">Today's Student Moods</h4>
                <p className="text-[10px] text-[#667085]">Daily emotional pulse of assigned students</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/counsellor/mood-tracker')}
              className="text-[11px] font-semibold text-[#2878C8] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Tracker</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center pt-1">
            {(['Sad', 'Low', 'Okay', 'Good', 'Great'] as const).map(m => (
              <div key={m} className="p-2 rounded-xl bg-[#FFF0E8] border border-[#F0D6C8]">
                <span className="text-base">{MOOD_EMOJIS[m]}</span>
                <p className="text-[9px] text-[#667085] font-medium">{m}</p>
                <p className={`text-xs font-bold mt-0.5 ${m === 'Sad' || m === 'Low' ? 'text-amber-700' : 'text-[#25364B]'}`}>
                  {todayMood[m] || 0}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Anonymous Questions & Pending Feedback Summary */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FFEDD5] text-orange-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#25364B]">Anonymous Inquiries</h4>
                <p className="text-[10px] text-[#667085]">Private student concerns awaiting guidance</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/counsellor/anonymous-questions')}
              className="border-[#F0D6C8] text-[#2878C8] hover:bg-[#FFF0E8] text-xs h-7 px-2.5 cursor-pointer"
            >
              <span>View Inquiries</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFF7ED] border border-[#FED7AA]">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-[#172554]">Pending Questions:</span>
            </div>
            <span className="text-sm font-bold font-mono text-orange-700 bg-white px-2.5 py-0.5 rounded-lg border border-[#FED7AA]">
              {pendingAnonCount}
            </span>
          </div>

          {/* Session Feedback Summary snippet */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F0D6C8]">
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span className="text-[#667085]">Avg Rating:</span>
              <span className="font-bold text-[#25364B]">{feedbackSummary.averageRating > 0 ? `${feedbackSummary.averageRating} / 5` : 'N/A'}</span>
            </div>
            <span className="text-[10px] text-[#667085]">
              {feedbackSummary.totalFeedback} reviews ({feedbackSummary.pendingFeedback} pending)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

