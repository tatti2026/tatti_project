import { useState, useEffect } from 'react';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ShieldCheck, Send, MessageSquare, Clock, CheckCircle2,
  HelpCircle, UserX, ArrowRight, CornerDownRight, RefreshCw
} from 'lucide-react';
import {
  submitAnonymousQuestion,
  getStudentAnonymousQuestions,
  getAnonymousQuestionThread,
  replyToAnonymousQuestion
} from '@/lib/api';
import type { AnonymousQuestion, AnonymousQuestionReply } from '@/types/index';

const CATEGORIES = [
  'Career Guidance',
  'Course & College Selection',
  'Exam Stress & Anxiety',
  'Personal & Emotional Wellbeing',
  'Peer & Family Relationships',
  'Other Inquiries',
];

export default function AnonymousQuestionBox() {
  const [category, setCategory] = useState('Career Guidance');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<AnonymousQuestion[]>([]);

  // Thread dialog state
  const [selectedQuestion, setSelectedQuestion] = useState<AnonymousQuestion | null>(null);
  const [replies, setReplies] = useState<AnonymousQuestionReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadQuestions = async () => {
    try {
      const data = await getStudentAnonymousQuestions();
      setQuestions(data);
    } catch (err) {
      console.error('Failed to load anonymous questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
    const interval = setInterval(loadQuestions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Real-time polling for active thread
  useEffect(() => {
    if (!dialogOpen || !selectedQuestion) return;
    const pollThread = async () => {
      try {
        const thread = await getAnonymousQuestionThread(selectedQuestion.id);
        if (thread) {
          setReplies(thread.replies);
        }
      } catch {}
    };
    const interval = setInterval(pollThread, 4000);
    return () => clearInterval(interval);
  }, [dialogOpen, selectedQuestion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDesc = description.trim();
    const cleanTitle = title.trim();

    if (!cleanDesc) {
      toast.error('Please enter your question description or concern.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitAnonymousQuestion({
        category,
        title: cleanTitle || cleanDesc.substring(0, 50),
        description: cleanDesc,
        question: cleanDesc,
      });
      toast.success(`Question submitted anonymously! Reference ID: ${res.question.reference_id}`);
      setTitle('');
      setDescription('');
      await loadQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit anonymous question.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenThread = async (q: AnonymousQuestion) => {
    setSelectedQuestion(q);
    setDialogOpen(true);
    setReplyMessage('');
    try {
      const thread = await getAnonymousQuestionThread(q.id);
      if (thread) {
        setReplies(thread.replies);
      }
    } catch (err) {
      console.error('Failed to load question thread:', err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const res = await replyToAnonymousQuestion(selectedQuestion.id, replyMessage);
      setReplies(prev => [...prev, res.reply]);
      setReplyMessage('');
      toast.success('Reply sent anonymously.');
      await loadQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-5 animate-fade-in">
        {/* Header Section */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <h1 className="text-base sm:text-lg font-bold text-[#25364B] tracking-tight">
                Anonymous Question Box
              </h1>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Ask your questions freely. Your identity will not be displayed to the counsellor.
            </p>
          </div>
          <button
            onClick={loadQuestions}
            title="Refresh questions"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#F0D6C8] bg-[#FFF0E8] text-[#25364B] hover:bg-white text-xs font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#2878C8]" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Privacy Assurance Banner */}
        <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-4 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FFEDD5] border border-[#FED7AA] text-orange-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-[#172554]">
              Share your question or concern. Your identity will remain private.
            </h3>
            <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">
              When counsellors view and reply to this question, your name, student ID, and email address are never displayed. You will receive an Anonymous Reference ID to track responses.
            </p>
          </div>
        </div>

        {/* Question Submission Form */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-6 shadow-xs space-y-3.5">
          <h2 className="text-xs sm:text-sm font-bold text-[#25364B] flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#2878C8]" />
            Ask a New Anonymous Question
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Question Category */}
              <div>
                <label className="text-xs font-semibold text-[#25364B] block mb-1">
                  Question Category <span className="text-destructive">*</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full h-9 bg-white border border-[#F0D6C8] rounded-xl px-3 text-xs text-[#25364B] focus:border-[#F59E0B] focus:outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Question Title */}
              <div>
                <label className="text-xs font-semibold text-[#25364B] block mb-1">
                  Question Title (Summary)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Confused between Engineering and Design"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-9 bg-white border-[#F0D6C8] text-xs text-[#25364B] rounded-xl focus:border-[#F59E0B]"
                />
              </div>
            </div>

            {/* Question Description */}
            <div>
              <label className="text-xs font-semibold text-[#25364B] block mb-1">
                Question Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                rows={4}
                placeholder="Type your question or concern in detail. Please do not include personal identifiers in the text..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="bg-white border-[#F0D6C8] text-[#25364B] text-xs sm:text-sm focus:border-[#F59E0B] focus:ring-[#F59E0B] resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-[#667085] flex items-center gap-1">
                <UserX className="w-3.5 h-3.5 text-orange-500" />
                Submitted anonymously
              </span>
              <Button
                type="submit"
                disabled={submitting || !description.trim()}
                className="h-10 px-6 bg-[#2878C8] hover:bg-[#1D6AB8] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Question'}</span>
              </Button>
            </div>
          </form>
        </div>

        {/* My Anonymous Questions List */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[#25364B] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#2878C8]" />
              My Anonymous Inquiries
            </h3>
            <span className="text-[11px] text-[#667085]">
              {questions.length} {questions.length === 1 ? 'question' : 'questions'}
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-[#667085] animate-pulse">Loading inquiries...</div>
          ) : questions.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#667085]">
              You haven't submitted any anonymous questions yet.
            </div>
          ) : (
            <div className="divide-y divide-[#F0D6C8] overflow-hidden">
              {questions.map(q => {
                const isAnswered = q.status === 'Answered';
                const createdDate = new Date(q.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                });
                return (
                  <div key={q.id} className="py-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#2878C8] bg-[#E8F2FF] px-2 py-0.5 rounded-md border border-[#BFDBFE]">
                          {q.reference_id}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isAnswered
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {q.status}
                        </span>
                        <span className="text-[10px] font-medium bg-[#FFF0E8] text-[#2878C8] px-2 py-0.5 rounded-full border border-[#F0D6C8]">
                          {q.category || 'General Guidance'}
                        </span>
                        <span className="text-[10px] text-[#667085] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {createdDate}
                        </span>
                      </div>
                      {q.title && (
                        <h4 className="text-xs font-bold text-[#25364B] mt-1">
                          {q.title}
                        </h4>
                      )}
                      <p className="text-xs text-[#667085] line-clamp-2 mt-0.5">
                        {q.question}
                      </p>
                      {Number(q.reply_count || 0) > 0 && (
                        <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {q.reply_count} {Number(q.reply_count) === 1 ? 'reply' : 'replies'} from counsellor
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenThread(q)}
                      className="border-[#F0D6C8] text-[#2878C8] hover:bg-[#FFF0E8] text-xs h-8 px-3 shrink-0 cursor-pointer"
                    >
                      <span>View Thread</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Conversation Thread Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col bg-white border border-[#F0D6C8] p-5">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base font-bold text-[#25364B] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>Anonymous Thread</span>
                <span className="font-mono text-xs text-[#2878C8] bg-[#E8F2FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                  {selectedQuestion?.reference_id}
                </span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                selectedQuestion?.status === 'Answered'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {selectedQuestion?.status}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Original Question Card */}
          <div className="bg-[#FFF0E8] border border-[#F0D6C8] rounded-xl p-3 my-2 text-xs">
            <span className="text-[10px] font-bold text-[#2878C8] uppercase tracking-wider block mb-1">Your Question</span>
            <p className="text-[#25364B] leading-relaxed whitespace-pre-wrap">{selectedQuestion?.question}</p>
          </div>

          {/* Conversation Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2 px-1 max-h-60">
            {replies.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#667085]">
                No replies yet. Your assigned counsellor will reply here shortly.
              </div>
            ) : (
              replies.map(r => {
                const isCounsellor = r.sender_type === 'counsellor';
                return (
                  <div
                    key={r.id}
                    className={`flex flex-col ${isCounsellor ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[#667085]">
                      <span className="font-semibold text-[#25364B]">
                        {isCounsellor ? 'PSY CARE Counsellor' : 'You (Anonymous)'}
                      </span>
                      <span>• {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isCounsellor
                          ? 'bg-[#E8F2FF] text-[#172554] border border-[#BFDBFE]'
                          : 'bg-[#FFF7ED] text-[#25364B] border border-[#FED7AA]'
                      }`}
                    >
                      {r.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Send Reply Form */}
          <form onSubmit={handleSendReply} className="pt-3 border-t border-[#F0D6C8] flex gap-2">
            <Input
              placeholder="Send an anonymous follow-up message..."
              value={replyMessage}
              onChange={e => setReplyMessage(e.target.value)}
              className="bg-white border-[#F0D6C8] text-xs h-10 focus:border-[#F59E0B]"
            />
            <Button
              type="submit"
              disabled={sendingReply || !replyMessage.trim()}
              className="h-10 px-4 bg-[#2878C8] hover:bg-[#1D6AB8] text-white text-xs font-semibold rounded-xl shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
}

