import { useState, useEffect } from 'react';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Smile, Frown, Meh, Heart, Award, Calendar,
  TrendingUp, Clock, BookOpen, CheckCircle2, AlertCircle
} from 'lucide-react';
import { recordMoodCheckin, getStudentMoodHistory } from '@/lib/api';
import type { MoodValue, StudentMoodEntry } from '@/types/index';

interface MoodOption {
  value: MoodValue;
  label: string;
  emoji: string;
  color: string;
  activeBg: string;
  border: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { value: 'Sad', label: 'Awful – 1', emoji: '😢', color: 'text-indigo-600', activeBg: 'bg-indigo-50', border: 'border-indigo-300' },
  { value: 'Low', label: 'Low – 2', emoji: '😔', color: 'text-sky-600', activeBg: 'bg-sky-50', border: 'border-sky-300' },
  { value: 'Okay', label: 'Okay – 3', emoji: '😐', color: 'text-amber-600', activeBg: 'bg-amber-50', border: 'border-amber-300' },
  { value: 'Good', label: 'Good – 4', emoji: '😊', color: 'text-emerald-600', activeBg: 'bg-emerald-50', border: 'border-emerald-300' },
  { value: 'Great', label: 'Great – 5', emoji: '😍', color: 'text-rose-600', activeBg: 'bg-rose-50', border: 'border-rose-300' },
];

export default function MoodTracker() {
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [journalText, setJournalText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayEntry, setTodayEntry] = useState<StudentMoodEntry | null>(null);
  const [entries, setEntries] = useState<StudentMoodEntry[]>([]);
  const [trends, setTrends] = useState<{
    weekly: Record<string, number>;
    monthly: Record<string, number>;
    totalEntries: number;
  }>({
    weekly: { Sad: 0, Low: 0, Okay: 0, Good: 0, Great: 0 },
    monthly: { Sad: 0, Low: 0, Okay: 0, Good: 0, Great: 0 },
    totalEntries: 0
  });

  const loadMoodData = async () => {
    try {
      const data = await getStudentMoodHistory();
      setEntries(data.entries);
      setTrends(data.trends);
      if (data.todayEntry) {
        setTodayEntry(data.todayEntry);
        setSelectedMood(data.todayEntry.mood);
        setJournalText(data.todayEntry.journal_text || '');
      }
    } catch (err) {
      console.error('Failed to load mood history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMoodData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMood) {
      toast.error('Please select how you are feeling today.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await recordMoodCheckin(selectedMood, journalText);
      setTodayEntry(res.entry);
      toast.success(todayEntry ? 'Mood entry updated for today!' : 'Today\'s mood recorded successfully!');
      await loadMoodData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save mood check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-5 animate-fade-in">
        {/* Header Section */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌟</span>
              <h1 className="text-base sm:text-lg font-bold text-[#25364B] tracking-tight">
                My Mood Tracker
              </h1>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Check in daily. Only you and your counsellor can see this.
            </p>
          </div>
          <div className="bg-[#FFF0E8] border border-[#F0D6C8] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#25364B] shrink-0 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#2878C8]" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Today's Check-in Card */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#25364B]">
                How are you feeling today?
              </h2>
              <p className="text-xs text-[#667085]">
                {todayEntry ? 'You already checked in today. You can update your entry below.' : 'Select an emoji and add an optional journal entry.'}
              </p>
            </div>
            {todayEntry && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Checked in
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 5 Mood Buttons */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {MOOD_OPTIONS.map(opt => {
                const isSelected = selectedMood === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedMood(opt.value)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? `${opt.activeBg} ${opt.border} border-2 shadow-xs scale-102`
                        : 'border-[#F0D6C8] bg-white hover:bg-[#FFF0E8]/40'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl filter drop-shadow-xs transition-transform transform hover:scale-110">
                      {opt.emoji}
                    </span>
                    <span className={`text-xs font-semibold mt-1.5 ${isSelected ? opt.color : 'text-[#25364B]'}`}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional Journal */}
            <div className="space-y-1.5">
              <label htmlFor="daily-journal" className="text-xs font-semibold text-[#25364B] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#2878C8]" />
                Daily Journal (Optional)
              </label>
              <Textarea
                id="daily-journal"
                rows={3}
                placeholder="Write what happened today, what helped, what felt hard..."
                value={journalText}
                onChange={e => setJournalText(e.target.value)}
                maxLength={400}
                className="bg-white border-[#F0D6C8] text-[#25364B] text-xs sm:text-sm focus:border-[#F59E0B] focus:ring-[#F59E0B] resize-none"
              />
              <div className="flex justify-between text-[10px] text-[#667085]">
                <span>Only you and your assigned counsellor can view your journal entries.</span>
                <span>{journalText.length}/400</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || !selectedMood}
              className="w-full sm:w-auto h-10 px-6 bg-[#2878C8] hover:bg-[#1D6AB8] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Entry'}
            </Button>
          </form>
        </div>

        {/* Weekly & Monthly Trend Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weekly Trend (7 Days) */}
          <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-[#25364B] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#2878C8]" />
                Past 7 Days Overview
              </h3>
              <span className="text-[11px] text-[#667085] font-medium">Weekly</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {MOOD_OPTIONS.map(opt => (
                <div key={opt.value} className="p-2 rounded-xl bg-[#FFF0E8] border border-[#F0D6C8]">
                  <span className="text-lg">{opt.emoji}</span>
                  <p className="text-[10px] text-[#667085] font-medium mt-0.5">{opt.label}</p>
                  <p className="text-xs font-bold text-[#25364B] mt-0.5">{trends.weekly[opt.value] || 0}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Trend (30 Days) */}
          <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-[#25364B] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#F59E0B]" />
                Past 30 Days Overview
              </h3>
              <span className="text-[11px] text-[#667085] font-medium">Monthly</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {MOOD_OPTIONS.map(opt => (
                <div key={opt.value} className="p-2 rounded-xl bg-[#FFF0E8] border border-[#F0D6C8]">
                  <span className="text-lg">{opt.emoji}</span>
                  <p className="text-[10px] text-[#667085] font-medium mt-0.5">{opt.label}</p>
                  <p className="text-xs font-bold text-[#25364B] mt-0.5">{trends.monthly[opt.value] || 0}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Personal Mood History Table */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[#25364B] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#2878C8]" />
              My Mood History
            </h3>
            <span className="text-[11px] text-[#667085]">
              {entries.length} total {entries.length === 1 ? 'check-in' : 'check-ins'}
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-[#667085] animate-pulse">Loading history...</div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#667085]">
              No mood check-ins recorded yet. Select how you feel above to start your journey!
            </div>
          ) : (
            <div className="divide-y divide-[#F0D6C8] overflow-hidden">
              {entries.map(entry => {
                const opt = MOOD_OPTIONS.find(m => m.value === entry.mood);
                const dateFormatted = new Date(entry.entry_date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
                return (
                  <div key={entry.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="text-2xl shrink-0 p-1 bg-[#FFF0E8] rounded-xl border border-[#F0D6C8]">
                        {opt?.emoji || '😐'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${opt?.color || 'text-[#25364B]'}`}>
                            {entry.mood}
                          </span>
                          <span className="text-[10px] text-[#667085]">• {dateFormatted}</span>
                        </div>
                        {entry.journal_text ? (
                          <p className="text-xs text-[#25364B] mt-1 leading-relaxed bg-[#FFF7ED] p-2 rounded-lg border border-[#FED7AA]/50">
                            "{entry.journal_text}"
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#94A3B8] italic mt-0.5">No journal notes written.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}

