import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Star,
  CheckCircle2,
  Calendar,
  User,
  HeartHandshake,
  X,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { getStudentPendingFeedback, submitSessionFeedback } from '@/lib/api';

interface PendingSession {
  session_id: string;
  counsellor_name: string;
  scheduled_date: string;
  scheduled_time?: string;
  mode?: string;
  followup_id?: string;
}

const RATING_CONFIG: Record<
  number,
  {
    label: string;
    sublabel: string;
    emoji: string;
    color: string;
    q1: string;
    q1Placeholder: string;
    q1Required: boolean;
    q2: string;
    q2Placeholder: string;
  }
> = {
  5: {
    label: '5 Stars — Excellent',
    sublabel: 'Exceptional support and guidance!',
    emoji: '😍',
    color: 'text-amber-500',
    q1: 'What did you like most about the counselling session?',
    q1Placeholder: 'e.g., The counsellor was very attentive, understood my concerns, and offered great clarity...',
    q1Required: false,
    q2: 'Was the counsellor helpful? Any optional suggestions?',
    q2Placeholder: 'e.g., Very helpful, would highly recommend to other students!',
  },
  4: {
    label: '4 Stars — Good',
    sublabel: 'Helpful and positive experience.',
    emoji: '😊',
    color: 'text-emerald-600',
    q1: 'What did you like about the session?',
    q1Placeholder: 'e.g., Useful career insights, good discussion on course options...',
    q1Required: false,
    q2: 'What could be improved?',
    q2Placeholder: 'e.g., More time for questions would be great...',
  },
  3: {
    label: '3 Stars — Average',
    sublabel: 'Satisfactory, but could be better.',
    emoji: '😐',
    color: 'text-amber-600',
    q1: 'What was missing from the counselling session? (Required)',
    q1Placeholder: 'Please explain what did not meet your expectations...',
    q1Required: true,
    q2: 'What could the counsellor improve?',
    q2Placeholder: 'e.g., Clearer explanations, better follow-up plan...',
  },
  2: {
    label: '2 Stars — Poor',
    sublabel: 'Unsatisfactory experience.',
    emoji: '😔',
    color: 'text-orange-600',
    q1: 'What made your experience unsatisfactory? (Required)',
    q1Placeholder: 'Please describe the difficulties or issues you faced...',
    q1Required: true,
    q2: 'What specific problem did you face?',
    q2Placeholder: 'e.g., Did not address core questions, rushed session...',
  },
  1: {
    label: '1 Star — Very Poor',
    sublabel: 'Very disappointing experience.',
    emoji: '😢',
    color: 'text-rose-600',
    q1: 'What went wrong / what did you dislike about the session? (Required)',
    q1Placeholder: 'Please tell us what went wrong so we can take corrective action...',
    q1Required: true,
    q2: 'What should be improved?',
    q2Placeholder: 'e.g., Session quality, counsellor communication...',
  },
};

export default function AutomaticCounsellingFeedbackModal({
  onFeedbackCompleted,
}: {
  onFeedbackCompleted?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(null);

  // Form states
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [q1Answer, setQ1Answer] = useState('');
  const [q2Answer, setQ2Answer] = useState('');
  const [generalComment, setGeneralComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Check pending feedback on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getStudentPendingFeedback();
        if (mounted && res.hasPendingFeedback && res.pendingSession) {
          const sessId = res.pendingSession.session_id;
          // Check if temporarily dismissed in this browser tab session
          const isDismissed = sessionStorage.getItem(`psycare_fb_dismissed_${sessId}`);
          if (!isDismissed) {
            setPendingSession(res.pendingSession);
            setIsOpen(true);
          }
        }
      } catch (err) {
        // Silently fail if unable to check
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDismissMaybeLater = () => {
    if (pendingSession) {
      sessionStorage.setItem(`psycare_fb_dismissed_${pendingSession.session_id}`, 'true');
    }
    setIsOpen(false);
  };

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSession) return;

    if (rating === 0) {
      setValidationError('Please select a rating between 1 and 5 stars.');
      return;
    }

    const currentConfig = RATING_CONFIG[rating];
    if (currentConfig.q1Required && !q1Answer.trim()) {
      setValidationError(`Please answer: "${currentConfig.q1}"`);
      return;
    }

    setSubmitting(true);
    setValidationError('');

    try {
      const whatLiked = rating >= 4 ? q1Answer.trim() : undefined;
      const lowRatingReason = rating <= 3 ? q1Answer.trim() : undefined;
      const improvementSuggestions = q2Answer.trim() || undefined;

      await submitSessionFeedback({
        sessionId: pendingSession.session_id,
        followupId: pendingSession.followup_id,
        rating,
        whatLiked,
        lowRatingReason,
        improvementSuggestions,
        comment: generalComment.trim() || undefined,
      });

      setSubmittedSuccessfully(true);
      toast.success('Thank you for sharing your feedback!');

      // Close modal after short delay
      setTimeout(() => {
        setIsOpen(false);
        if (onFeedbackCompleted) onFeedbackCompleted();
      }, 2200);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !pendingSession) return null;

  const currentConfig = rating > 0 ? RATING_CONFIG[rating] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#F0D6C8] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Accent Band */}
        <div className="h-2 bg-gradient-to-r from-[#2878C8] via-[#F59E0B] to-[#2878C8]" />

        {/* Modal Header */}
        <div className="px-5 pt-4 pb-3 sm:px-6 sm:pt-5 border-b border-[#F0D6C8] bg-gradient-to-b from-[#FFF0E8] to-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 text-amber-600 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Star className="w-5 h-5 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="feedback-modal-title"
                  className="text-base sm:text-lg font-bold text-[#25364B] tracking-tight leading-tight"
                >
                  How Was Your Counselling Experience?
                </h2>
              </div>
              <p className="text-xs text-[#667085] mt-0.5">
                Your feedback helps us improve our counselling services.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismissMaybeLater}
            className="p-1 text-[#667085] hover:text-[#25364B] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto space-y-4">
          {submittedSuccessfully ? (
            <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-emerald-800">
                Thank You for Your Feedback!
              </h3>
              <p className="text-xs sm:text-sm text-[#667085] max-w-sm mx-auto">
                Your ratings and insights have been securely recorded. They directly help our counselling team provide better guidance.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Session Context Banner */}
              <div className="bg-[#FFF0E8]/70 border border-[#F0D6C8] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-[#25364B] font-semibold">
                  <User className="w-4 h-4 text-[#2878C8]" />
                  <span>Counsellor: {pendingSession.counsellor_name}</span>
                </div>
                <div className="flex items-center gap-2 text-[#667085]">
                  <Calendar className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>{pendingSession.scheduled_date}</span>
                  {pendingSession.mode && (
                    <span className="bg-white border border-[#F0D6C8] text-[#25364B] px-1.5 py-0.5 rounded text-[10px] font-medium">
                      {pendingSession.mode}
                    </span>
                  )}
                </div>
              </div>

              {/* 5-Star Interactive Rating Control */}
              <div className="text-center py-2 space-y-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Select Your Overall Rating
                </p>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRatingChange(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 sm:p-1.5 transition-transform transform hover:scale-120 active:scale-95 cursor-pointer focus:outline-none"
                        aria-label={`${star} Star`}
                      >
                        <Star
                          className={`w-7 h-7 sm:w-9 sm:h-9 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                              : 'fill-transparent text-[#CBD5E1]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Rating Label Indicator */}
                {currentConfig ? (
                  <div className="pt-1 flex items-center justify-center gap-1.5 animate-in fade-in">
                    <span className="text-base">{currentConfig.emoji}</span>
                    <span className={`text-xs sm:text-sm font-bold ${currentConfig.color}`}>
                      {currentConfig.label}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      — {currentConfig.sublabel}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#94A3B8]">
                    Tap a star to rate your session
                  </p>
                )}
              </div>

              {/* Validation Warning */}
              {validationError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center gap-2 text-xs text-rose-700 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Dynamic Questions Based on Rating */}
              {currentConfig && (
                <div className="space-y-3.5 pt-1 animate-in fade-in duration-200">
                  {/* Question 1 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#25364B] flex items-center gap-1.5">
                      <span>{currentConfig.q1}</span>
                      {currentConfig.q1Required && (
                        <span className="text-rose-500 font-bold">*</span>
                      )}
                    </label>
                    <Textarea
                      rows={2}
                      value={q1Answer}
                      onChange={(e) => {
                        setQ1Answer(e.target.value);
                        if (validationError) setValidationError('');
                      }}
                      placeholder={currentConfig.q1Placeholder}
                      className="bg-white border-[#F0D6C8] text-xs focus:border-[#2878C8] resize-none rounded-xl"
                    />
                  </div>

                  {/* Question 2 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#25364B]">
                      {currentConfig.q2}
                    </label>
                    <Textarea
                      rows={2}
                      value={q2Answer}
                      onChange={(e) => setQ2Answer(e.target.value)}
                      placeholder={currentConfig.q2Placeholder}
                      className="bg-white border-[#F0D6C8] text-xs focus:border-[#2878C8] resize-none rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#F0D6C8]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDismissMaybeLater}
                  className="h-9 px-4 text-xs font-semibold text-[#667085] hover:text-[#25364B] hover:bg-[#FFF0E8] rounded-xl cursor-pointer"
                >
                  Maybe Later
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || rating === 0}
                  className="h-9 px-5 bg-[#2878C8] hover:bg-[#1D6AB8] text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

