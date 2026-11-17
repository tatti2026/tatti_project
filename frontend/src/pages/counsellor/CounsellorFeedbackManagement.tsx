import React, { useState, useEffect, useCallback } from 'react';
import CounsellorLayout from '@/components/layouts/CounsellorLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Star,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  AlertTriangle,
  ThumbsUp,
  Lightbulb,
  Clock,
  Sparkles,
  BarChart2,
  CheckCircle2,
  ArrowUpDown
} from 'lucide-react';
import { getCounsellorFeedbackSummary } from '@/lib/api';
import type { SessionFeedback, SessionFeedbackSummary } from '@/types/index';

export default function CounsellorFeedbackManagement() {
  const [feedbacks, setFeedbacks] = useState<SessionFeedback[]>([]);
  const [summary, setSummary] = useState<SessionFeedbackSummary>({
    totalFeedback: 0,
    averageRating: 0,
    pendingFeedback: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCounsellorFeedbackSummary({
        rating: ratingFilter > 0 ? ratingFilter : undefined,
        search: searchQuery.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setFeedbacks(data.feedbacks || []);
      setSummary(data.summary || {
        totalFeedback: 0,
        averageRating: 0,
        pendingFeedback: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
    } catch (err) {
      console.error('Failed to load counselling feedback:', err);
    } finally {
      setLoading(false);
    }
  }, [ratingFilter, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-4 h-4 ${
              s <= rating
                ? 'fill-amber-400 text-amber-500'
                : 'fill-transparent text-[#CBD5E1]'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingBadge = (rating: number) => {
    switch (rating) {
      case 5:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            5★ Excellent
          </span>
        );
      case 4:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
            4★ Good
          </span>
        );
      case 3:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            3★ Average
          </span>
        );
      case 2:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
            2★ Poor
          </span>
        );
      case 1:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            1★ Very Poor
          </span>
        );
      default:
        return null;
    }
  };

  const totalReviews = summary.totalFeedback || 0;

  return (
    <CounsellorLayout>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-600 flex items-center justify-center">
                <Star className="w-4 h-4 fill-amber-500 text-amber-600" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#25364B] tracking-tight">
                Counselling Feedback
              </h1>
            </div>
            <p className="text-xs text-[#667085] mt-1">
              Student ratings, reviews, and feedback for completed counselling sessions.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchFeedback}
            disabled={loading}
            className="h-8 text-xs font-semibold border-[#F0D6C8] text-[#25364B] hover:bg-[#FFF0E8] rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Average Rating */}
          <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
              Average Rating
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#25364B]">
                {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-[#667085]">/ 5.0</span>
            </div>
            <div className="mt-2">
              {renderStars(Math.round(summary.averageRating || 0))}
            </div>
          </div>

          {/* 2. Total Reviews */}
          <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
              Total Feedback
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#25364B]">
                {summary.totalFeedback}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Reviews</span>
            </div>
            <p className="text-[11px] text-[#667085] mt-2">
              Permanent student submissions
            </p>
          </div>

          {/* 3. Pending Feedback */}
          <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
              Pending Feedback
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-amber-600">
                {summary.pendingFeedback}
              </span>
              <span className="text-xs text-[#667085]">Sessions awaiting review</span>
            </div>
            <p className="text-[11px] text-[#667085] mt-2">
              Completed sessions & follow-ups
            </p>
          </div>

          {/* 4. Rating Distribution */}
          <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 shadow-xs space-y-1">
            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">
              Rating Distribution
            </p>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-[11px]">
                  <span className="w-5 text-right font-bold text-[#667085]">{star}★</span>
                  <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        star >= 4
                          ? 'bg-emerald-500'
                          : star === 3
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[#667085] text-[10px] font-semibold">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search student name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-white border-[#F0D6C8] rounded-xl focus:border-[#2878C8]"
              />
            </div>

            {/* Rating Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {[
                { label: 'All Ratings', value: 0 },
                { label: '5★', value: 5 },
                { label: '4★', value: 4 },
                { label: '3★', value: 3 },
                { label: '2★', value: 2 },
                { label: '1★', value: 1 },
              ].map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setRatingFilter(pill.value)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
                    ratingFilter === pill.value
                      ? 'bg-[#2878C8] text-white shadow-xs'
                      : 'bg-[#FFF0E8] text-[#25364B] hover:bg-[#FFE5D8]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Pickers */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#667085] font-medium hidden sm:inline">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 px-2 text-xs border border-[#F0D6C8] rounded-lg bg-white text-[#25364B]"
            />
            <span className="text-[#667085] font-medium hidden sm:inline">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 px-2 text-xs border border-[#F0D6C8] rounded-lg bg-white text-[#25364B]"
            />
            {(startDate || endDate || searchQuery || ratingFilter > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSearchQuery('');
                  setRatingFilter(0);
                }}
                className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Feedback List Section */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white border border-[#F0D6C8] rounded-2xl p-8 text-center text-xs text-[#667085] animate-pulse">
              Loading counselling feedback...
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white border border-[#F0D6C8] rounded-2xl p-10 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#FFF0E8] text-[#2878C8] flex items-center justify-center">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#25364B]">
                No Counselling Feedback Found
              </h3>
              <p className="text-xs text-[#667085] max-w-sm mx-auto">
                {searchQuery || ratingFilter > 0 || startDate
                  ? 'No records match your selected filter criteria. Try clearing filters.'
                  : 'Submitted student ratings and feedback will appear here once counselling sessions are completed and reviewed.'}
              </p>
            </div>
          ) : (
            feedbacks.map((fb) => {
              const isLowRating = fb.rating <= 3;
              return (
                <div
                  key={fb.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-3 ${
                    isLowRating
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-[#F0D6C8]'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0D6C8]/60 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#2878C8] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {(fb.student_name || 'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-[#25364B]">
                            {fb.student_name || 'Student'}
                          </span>
                          {fb.student_code && (
                            <span className="text-[10px] font-mono bg-[#FFF0E8] border border-[#F0D6C8] px-1.5 py-0.2 rounded text-[#2878C8] font-semibold">
                              {fb.student_code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#667085] mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#2878C8]" />
                            Session: {fb.scheduled_date || '—'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#F59E0B]" />
                            Reviewed: {fb.formatted_created_at || fb.created_at?.split('T')[0] || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rating Badges */}
                    <div className="flex items-center gap-2">
                      {isLowRating && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                          <AlertTriangle className="w-3 h-3" />
                          Needs Improvement
                        </span>
                      )}
                      {getRatingBadge(fb.rating)}
                      {renderStars(fb.rating)}
                    </div>
                  </div>

                  {/* Card Content: Breakdown of Questions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    {/* What Student Liked */}
                    {fb.what_liked && (
                      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                          <span>What the Student Liked Most:</span>
                        </div>
                        <p className="text-[#334155] text-xs leading-relaxed">
                          {fb.what_liked}
                        </p>
                      </div>
                    )}

                    {/* Areas Requiring Improvement */}
                    {fb.improvement_suggestions && (
                      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px]">
                          <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                          <span>Suggestions for Improvement:</span>
                        </div>
                        <p className="text-[#334155] text-xs leading-relaxed">
                          {fb.improvement_suggestions}
                        </p>
                      </div>
                    )}

                    {/* Low Rating Reason */}
                    {fb.low_rating_reason && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1 md:col-span-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reason for Unsatisfactory / Average Rating:</span>
                        </div>
                        <p className="text-[#334155] text-xs leading-relaxed">
                          {fb.low_rating_reason}
                        </p>
                      </div>
                    )}

                    {/* General / Additional Comment */}
                    {fb.comment && !fb.what_liked && !fb.improvement_suggestions && !fb.low_rating_reason && (
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 space-y-1 md:col-span-2">
                        <div className="font-bold text-[#475569] text-[11px]">
                          Student Comments:
                        </div>
                        <p className="text-[#334155] text-xs leading-relaxed whitespace-pre-line">
                          {fb.comment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </CounsellorLayout>
  );
}

