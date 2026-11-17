import { useState, useEffect, useCallback } from 'react';
import CounsellorLayout from '@/components/layouts/CounsellorLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Smile, Search, Calendar, Filter, Eye, RefreshCw,
  TrendingUp, BookOpen, Clock, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { getCounsellorStudentsMood } from '@/lib/api';
import type { StudentMoodEntry, MoodValue } from '@/types/index';

const MOOD_EMOJIS: Record<string, string> = {
  Sad: '😢',
  Low: '😔',
  Okay: '😐',
  Good: '😊',
  Great: '😍',
};

export default function CounsellorMoodTracker() {
  const [records, setRecords] = useState<StudentMoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterMood, setFilterMood] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [todayOverview, setTodayOverview] = useState<Record<string, number>>({
    Sad: 0, Low: 0, Okay: 0, Good: 0, Great: 0, total: 0
  });

  // Selected entry for viewing details & journal
  const [selectedEntry, setSelectedEntry] = useState<StudentMoodEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCounsellorStudentsMood({
        filter: filterPeriod,
        mood: filterMood !== 'all' ? filterMood : undefined,
        search: searchQuery.trim() || undefined,
        startDate: filterPeriod === 'custom' ? startDate : undefined,
        endDate: filterPeriod === 'custom' ? endDate : undefined,
      });
      setRecords(data.records);
      setTodayOverview(data.todayOverview);
    } catch (err) {
      console.error('Failed to load students mood records:', err);
    } finally {
      setLoading(false);
    }
  }, [filterPeriod, filterMood, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleViewAction = (entry: StudentMoodEntry) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  };

  return (
    <CounsellorLayout>
      <div className="space-y-4 sm:space-y-5 animate-fade-in">
        {/* Header */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h1 className="text-base sm:text-lg font-bold text-[#25364B] tracking-tight">
                Assigned Students Mood Tracker
              </h1>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Monitor daily check-ins, journals, and low-mood patterns for your assigned students.
            </p>
          </div>
          <button
            onClick={fetchRecords}
            title="Refresh records"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#F0D6C8] bg-[#FFF0E8] text-[#25364B] hover:bg-white text-xs font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#2878C8]" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Today's Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
          <div className="bg-white border border-[#F0D6C8] rounded-2xl p-3 shadow-xs text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] text-[#667085] font-semibold uppercase">Today Checked In</p>
            <p className="text-xl font-bold text-[#25364B] mt-0.5">{todayOverview.total || 0}</p>
          </div>
          {(['Sad', 'Low', 'Okay', 'Good', 'Great'] as const).map(mood => (
            <div key={mood} className="bg-white border border-[#F0D6C8] rounded-2xl p-3 shadow-xs text-center">
              <span className="text-lg">{MOOD_EMOJIS[mood]}</span>
              <p className="text-[10px] text-[#667085] font-medium">{mood}</p>
              <p className={`text-base font-bold mt-0.5 ${mood === 'Sad' || mood === 'Low' ? 'text-amber-700' : 'text-[#25364B]'}`}>
                {todayOverview[mood] || 0}
              </p>
            </div>
          ))}
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
              <Input
                placeholder="Search by student name, ID or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs bg-white border-[#F0D6C8] focus:border-[#F59E0B]"
              />
            </div>

            {/* Mood Dropdown Filter */}
            <div className="flex items-center gap-2">
              <select
                value={filterMood}
                onChange={e => setFilterMood(e.target.value)}
                className="bg-white border border-[#F0D6C8] rounded-xl h-10 text-xs px-3 text-[#25364B] focus:border-[#F59E0B] focus:outline-none"
              >
                <option value="all">All Moods</option>
                <option value="Sad">Sad 😢</option>
                <option value="Low">Low 😔</option>
                <option value="Okay">Okay 😐</option>
                <option value="Good">Good 😊</option>
                <option value="Great">Great 😍</option>
              </select>

              {/* Period Filter Buttons */}
              <select
                value={filterPeriod}
                onChange={e => setFilterPeriod(e.target.value)}
                className="bg-white border border-[#F0D6C8] rounded-xl h-10 text-xs px-3 text-[#25364B] focus:border-[#F59E0B] focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {filterPeriod === 'custom' && (
            <div className="flex items-center gap-3 pt-2 border-t border-[#F0D6C8] text-xs">
              <span className="text-[#667085] font-medium">From:</span>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-40 h-8 text-xs bg-white border-[#F0D6C8]"
              />
              <span className="text-[#667085] font-medium">To:</span>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-40 h-8 text-xs bg-white border-[#F0D6C8]"
              />
            </div>
          )}
        </div>

        {/* Mood Records Table */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F0D6C8] flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[#25364B]">
              Student Check-in Entries ({records.length})
            </h3>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-[#667085] animate-pulse">Loading mood entries...</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#667085]">
              No student mood entries found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF0E8] text-[#25364B] font-semibold border-b border-[#F0D6C8]">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Selected Mood</th>
                    <th className="px-4 py-3">Journal Status</th>
                    <th className="px-4 py-3">Mood Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0D6C8]">
                  {records.map(r => {
                    const isAttention = r.mood === 'Sad' || r.mood === 'Low';
                    return (
                      <tr key={r.id} className="hover:bg-[#FFF7ED]/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#25364B]">
                          {r.student_name || 'Student'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#2878C8]">
                          {r.student_code || '—'}
                        </td>
                        <td className="px-4 py-3 text-[#667085]">
                          {r.entry_date}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#25364B]">
                            <span className="text-base">{MOOD_EMOJIS[r.mood] || '😐'}</span>
                            <span>{r.mood}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.journal_status === 'Has Journal'
                              ? 'bg-[#E8F2FF] text-[#2878C8] border border-[#BFDBFE]'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {r.journal_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isAttention
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {r.mood_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewAction(r)}
                            className="border-[#F0D6C8] text-[#2878C8] hover:bg-[#FFF0E8] h-7 px-2.5 text-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Entry Details & Journal Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-[#F0D6C8] p-5">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base font-bold text-[#25364B] flex items-center justify-between">
              <span>Student Mood Entry</span>
              <span className="text-xl">{selectedEntry ? MOOD_EMOJIS[selectedEntry.mood] : ''}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-3.5 text-xs text-[#25364B] pt-2">
              <div className="grid grid-cols-2 gap-2 bg-[#FFF0E8] p-3 rounded-xl border border-[#F0D6C8]">
                <div>
                  <span className="text-[10px] text-[#667085] block">Student Name</span>
                  <span className="font-bold">{selectedEntry.student_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#667085] block">Student ID</span>
                  <span className="font-mono font-bold text-[#2878C8]">{selectedEntry.student_code || '—'}</span>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] text-[#667085] block">Check-in Date</span>
                  <span className="font-medium">{selectedEntry.entry_date}</span>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] text-[#667085] block">Mood Status</span>
                  <span className={`font-bold ${selectedEntry.mood === 'Sad' || selectedEntry.mood === 'Low' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedEntry.mood} ({selectedEntry.mood_status})
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-[#25364B] flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#2878C8]" />
                  Student Daily Journal
                </span>
                {selectedEntry.journal_text ? (
                  <div className="bg-[#FFF7ED] border border-[#FED7AA] p-3 rounded-xl text-xs leading-relaxed whitespace-pre-wrap">
                    "{selectedEntry.journal_text}"
                  </div>
                ) : (
                  <div className="p-3 text-center text-[11px] text-[#667085] italic bg-slate-50 rounded-xl border border-slate-200">
                    The student did not write a journal note for this check-in.
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setDetailOpen(false)}
                  className="bg-[#2878C8] hover:bg-[#1D6AB8] text-white text-xs h-8 px-4 rounded-xl cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CounsellorLayout>
  );
}

