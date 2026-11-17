import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Smile, ShieldCheck, Star, MessageSquare, ArrowRight,
  CheckCircle2, TrendingUp, Sparkles, Send
} from 'lucide-react';
import {
  recordMoodCheckin,
  getStudentMoodHistory,
  getStudentPendingFeedback,
  submitSessionFeedback
} from '@/lib/api';
import type { MoodValue, StudentMoodEntry } from '@/types/index';

const MOODS: Array<{ value: MoodValue; label: string; emoji: string }> = [
  { value: 'Sad', label: 'Sad', emoji: '😢' },
  { value: 'Low', label: 'Low', emoji: '😔' },
  { value: 'Okay', label: 'Okay', emoji: '😐' },
  { value: 'Good', label: 'Good', emoji: '😊' },
  { value: 'Great', label: 'Great', emoji: '😍' },
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: '1 Star — Not Helpful',
  2: '2 Stars — Slightly Helpful',
  3: '3 Stars — Neutral',
  4: '4 Stars — Helpful',
  5: '5 Stars — Very Helpful'
};

export default function StudentDashboardAdditions() {
  const navigate = useNavigate();

  // Mood state
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [journal, setJournal] = useState('');
  const [todayEntry, setTodayEntry] = useState<StudentMoodEntry | null>(null);
  const [weeklyTrends, setWeeklyTrends] = useState<Record<string, number>>({});
  const [sevenDayAverage, setSevenDayAverage] = useState<string>('5.0');
  const [checkinStreak, setCheckinStreak] = useState<number>(1);
  const [submittingMood, setSubmittingMood] = useState(false);

  // Session Feedback state
  const [pendingSession, setPendingSession] = useState<{
    session_id: string;
    counsellor_name: string;
    scheduled_date: string;
  } | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    // Load mood history
    getStudentMoodHistory().then(data => {
      if (data.todayEntry) {
        setTodayEntry(data.todayEntry);
        setSelectedMood(data.todayEntry.mood);
        setJournal(data.todayEntry.journal_text || '');
      }
      setWeeklyTrends(data.trends.weekly || {});

      // Calculate 7-Day Average
      const scoreMap: Record<string, number> = { Sad: 1, Low: 2, Okay: 3, Good: 4, Great: 5 };
      const list = data.entries || [];
      const recent = list.slice(0, 7);
      if (recent.length > 0) {
        const sum = recent.reduce((acc, curr) => acc + (scoreMap[curr.mood] || 3), 0);
        setSevenDayAverage((sum / recent.length).toFixed(1));
      } else {
        setSevenDayAverage('5.0');
      }

      // Calculate Check-in Streak
      if (list.length > 0) {
        let streak = 0;
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yestStr = yesterdayDate.toISOString().split('T')[0];

        const hasToday = list.some(e => e.entry_date === todayStr);
        const hasYest = list.some(e => e.entry_date === yestStr);

        if (hasToday || hasYest) {
          streak = 1;
          let checkDate = new Date(hasToday ? todayStr : yestStr);
          for (let i = 1; i < list.length; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            const expectedStr = checkDate.toISOString().split('T')[0];
            if (list.some(e => e.entry_date === expectedStr)) {
              streak++;
            } else {
              break;
            }
          }
        }
        setCheckinStreak(Math.max(1, streak));
      } else {
        setCheckinStreak(0);
      }
    }).catch(() => {});

    // Check pending session feedback
    getStudentPendingFeedback().then(data => {
      if (data.hasPendingFeedback && data.pendingSession) {
        setPendingSession(data.pendingSession);
      }
    }).catch(() => {});
  }, []);

  const handleSaveMood = async () => {
    if (!selectedMood) {
      toast.error('Please choose a mood emoji.');
      return;
    }
    setSubmittingMood(true);
    try {
      const res = await recordMoodCheckin(selectedMood, journal);
      setTodayEntry(res.entry);
      toast.success(todayEntry ? 'Today\'s mood updated!' : 'Today\'s mood recorded!');
      const updated = await getStudentMoodHistory();
      setWeeklyTrends(updated.trends.weekly || {});
    } catch (err: any) {
      toast.error(err.message || 'Failed to save mood.');
    } finally {
      setSubmittingMood(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSession || rating === 0) {
      toast.error('Please select a star rating.');
      return;
    }
    if (rating <= 3 && !comment.trim()) {
      toast.error('Please provide a reason or comment for ratings of 3 stars or below.');
      return;
    }
    setSubmittingFeedback(true);
    try {
      await submitSessionFeedback(pendingSession.session_id, rating, comment);
      setFeedbackSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. SESSION FEEDBACK POPUP/CARD (If session completed and feedback pending) */}
      {pendingSession && !feedbackSubmitted && (
        <div className="bg-gradient-to-r from-[#FFF7ED] to-white border-2 border-[#FED7AA] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <h3 className="text-xs sm:text-sm font-bold text-[#172554]">
                Was your counselling session helpful?
              </h3>
            </div>
            <span className="text-[10px] font-semibold bg-orange-100 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-full">
              Session Feedback
            </span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Your recent session with <strong>{pendingSession.counsellor_name}</strong> on {pendingSession.scheduled_date} has concluded. Please take a moment to rate your experience:
          </p>

          <form onSubmit={handleFeedbackSubmit} className="space-y-3 pt-1">
            {/* 5 Star Rating */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5].map(star => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-2xl sm:text-3xl transition-transform transform hover:scale-115 cursor-pointer focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 sm:w-7 sm:h-7 ${
                        isFilled
                          ? 'fill-amber-400 text-amber-500'
                          : 'fill-transparent text-[#FED7AA]'
                      }`}
                    />
                  </button>
                );
              })}
              {rating > 0 && (
                <span className="text-xs font-semibold text-orange-700 ml-2">
                  {RATING_DESCRIPTIONS[rating]}
                </span>
              )}
            </div>

            <Textarea
              rows={2}
              placeholder="Optional comment about your session..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="bg-white border-[#F0D6C8] text-xs focus:border-[#F59E0B] resize-none"
            />

            <Button
              type="submit"
              disabled={submittingFeedback || rating === 0}
              className="h-9 px-5 bg-[#2878C8] hover:bg-[#1D6AB8] text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              {submittingFeedback ? 'Submitting...' : 'Submit Session Feedback'}
            </Button>
          </form>
        </div>
      )}

      {/* Confirmation when feedback was submitted in this session */}
      {feedbackSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong>Thank You!</strong> Your feedback has been submitted successfully and helps us improve our counselling service.
          </div>
        </div>
      )}

      {/* 2. DAILY MOOD TRACKER CARD */}
      <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8F2FF] text-[#2878C8] flex items-center justify-center shrink-0">
              <Smile className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#25364B]">
                Daily Mood Tracker
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#667085]">
                {todayEntry ? 'You recorded your mood today. You can adjust your check-in below.' : 'Check in with yourself today. How are you feeling?'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/student/mood-tracker')}
            className="text-[11px] font-semibold text-[#2878C8] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Full History</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Three Statistic Cards: Today's Mood, 7-Day Average, Check-in Streak */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1">
          {/* Card 1: Today's Mood */}
          <div className="bg-[#FFF0E8]/60 border border-[#F0D6C8] rounded-xl p-2.5 sm:p-3 shadow-2xs">
            <span className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider block">Today's Mood</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl">{todayEntry ? (MOODS.find(m => m.value === todayEntry.mood)?.emoji || '😊') : '⏳'}</span>
              <span className="text-xs sm:text-sm font-bold text-[#25364B] truncate">
                {todayEntry ? todayEntry.mood : 'Pending'}
              </span>
            </div>
          </div>

          {/* Card 2: 7-Day Average */}
          <div className="bg-[#FFF0E8]/60 border border-[#F0D6C8] rounded-xl p-2.5 sm:p-3 shadow-2xs">
            <span className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider block">7-Day Average</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm sm:text-base font-bold text-[#2878C8]">{sevenDayAverage}</span>
              <span className="text-[10px] text-[#667085]">/ 5.0</span>
            </div>
          </div>

          {/* Card 3: Check-in Streak */}
          <div className="bg-[#FFF0E8]/60 border border-[#F0D6C8] rounded-xl p-2.5 sm:p-3 shadow-2xs">
            <span className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider block">Check-in Streak</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm sm:text-base font-bold text-amber-600">🔥 {checkinStreak}</span>
              <span className="text-[10px] text-[#667085]">{checkinStreak === 1 ? 'day' : 'days'}</span>
            </div>
          </div>
        </div>

        {/* 5 Emojis Selector */}
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map(m => {
            const isSelected = selectedMood === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setSelectedMood(m.value)}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FFF0E8] border-[#2878C8] border-2 shadow-2xs scale-102'
                    : 'bg-white border-[#F0D6C8] hover:bg-[#FFF0E8]/50'
                }`}
              >
                <span className="text-xl sm:text-2xl">{m.emoji}</span>
                <span className={`text-[10px] font-semibold mt-1 ${isSelected ? 'text-[#2878C8]' : 'text-[#667085]'}`}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mini Journal Input & Submit */}
        <div className="space-y-2 pt-1">
          <input
            type="text"
            placeholder="Optional 1-2 line journal note (e.g. studied hard, feeling calm)..."
            value={journal}
            onChange={e => setJournal(e.target.value)}
            className="w-full h-8 px-3 text-xs bg-white border border-[#F0D6C8] rounded-xl focus:border-[#F59E0B] focus:outline-none text-[#25364B]"
          />
          <div className="flex items-center justify-between">
            {/* Weekly mood indicator badges */}
            <div className="flex items-center gap-1.5 text-[10px] text-[#667085]">
              <TrendingUp className="w-3 h-3 text-[#2878C8]" />
              <span>7d check-ins:</span>
              <span className="font-semibold text-[#25364B]">
                {Object.values(weeklyTrends).reduce((a, b) => a + b, 0)} days
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleSaveMood}
              disabled={submittingMood || !selectedMood}
              className="h-8 px-3.5 bg-[#2878C8] hover:bg-[#1D6AB8] text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              {submittingMood ? 'Saving...' : todayEntry ? 'Update Mood' : 'Check In'}
            </Button>
          </div>
        </div>
      </div>

      {/* 3. ANONYMOUS QUESTION BOX SHORTCUT */}
      <div className="bg-gradient-to-r from-white to-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#FFEDD5] border border-[#FED7AA] text-orange-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-[#172554] truncate">
              Anonymous Question Box
            </h4>
            <p className="text-[10px] sm:text-[11px] text-[#64748B] truncate">
              Share your question or concern privately. Your identity is never shown to counsellors.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/student/anonymous-questions')}
          className="border-[#FED7AA] text-orange-700 hover:bg-[#FFEDD5] text-xs h-8 px-3 shrink-0 cursor-pointer"
        >
          <span>Ask Anonymously</span>
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

