import { useState, useEffect, useCallback } from 'react';
import CounsellorLayout from '@/components/layouts/CounsellorLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  MessageSquare, Search, Send, Clock, CheckCircle2,
  ShieldCheck, RefreshCw, Eye, ArrowRight, CornerDownRight
} from 'lucide-react';
import {
  getCounsellorAnonymousQuestions,
  getAnonymousQuestionThread,
  replyToAnonymousQuestion,
  updateAnonymousQuestionStatus
} from '@/lib/api';
import type { AnonymousQuestion, AnonymousQuestionReply } from '@/types/index';

export default function CounsellorAnonymousQuestions() {
  const [questions, setQuestions] = useState<AnonymousQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected question modal state
  const [selectedQuestion, setSelectedQuestion] = useState<AnonymousQuestion | null>(null);
  const [replies, setReplies] = useState<AnonymousQuestionReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCounsellorAnonymousQuestions({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setQuestions(data);
    } catch (err) {
      console.error('Failed to load counsellor anonymous questions:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchQuestions();
    const interval = setInterval(fetchQuestions, 5000);
    return () => clearInterval(interval);
  }, [fetchQuestions]);

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
      console.error('Failed to load thread:', err);
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
      toast.success('Reply sent to student (student identity protected).');
      setSelectedQuestion(prev => prev ? { ...prev, status: 'Answered' } : null);
      await fetchQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleMarkStatus = async (status: 'Answered' | 'Closed') => {
    if (!selectedQuestion) return;
    try {
      await updateAnonymousQuestionStatus(selectedQuestion.id, status);
      setSelectedQuestion(prev => prev ? { ...prev, status } : null);
      toast.success(`Question marked as ${status}`);
      await fetchQuestions();
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  return (
    <CounsellorLayout>
      <div className="space-y-4 sm:space-y-5 animate-fade-in">
        {/* Header */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">📫</span>
              <h1 className="text-base sm:text-lg font-bold text-[#25364B] tracking-tight">
                Anonymous Student Inquiries
              </h1>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Review and answer anonymous questions from students with guaranteed identity protection.
            </p>
          </div>
          <button
            onClick={fetchQuestions}
            title="Refresh questions"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#F0D6C8] bg-[#FFF0E8] text-[#25364B] hover:bg-white text-xs font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#2878C8]" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Confidentiality Notice */}
        <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
          <p className="text-xs text-[#64748B]">
            <strong className="text-[#172554]">Strict Anonymity Protected:</strong> Student names, student IDs, and emails are never accessible or displayed in this view.
          </p>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
            <Input
              placeholder="Search by Anonymous ID (e.g. AQ-1001) or question text..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs bg-white border-[#F0D6C8] focus:border-[#F59E0B]"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-[#F0D6C8] rounded-xl h-10 text-xs px-3 text-[#25364B] focus:border-[#F59E0B] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Answered">Answered</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Questions Table */}
        <div className="bg-white border border-[#F0D6C8] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F0D6C8] flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[#25364B]">
              Anonymous Questions ({questions.length})
            </h3>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-[#667085] animate-pulse">Loading inquiries...</div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#667085]">
              No anonymous questions found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF0E8] text-[#25364B] font-semibold border-b border-[#F0D6C8]">
                  <tr>
                    <th className="px-4 py-3">Anonymous ID</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Question</th>
                    <th className="px-4 py-3">Submission Date</th>
                    <th className="px-4 py-3">Reply Status</th>
                    <th className="px-4 py-3 text-right">Reply / View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0D6C8]">
                  {questions.map(q => {
                    const isPending = q.status === 'Pending';
                    return (
                      <tr key={q.id} className="hover:bg-[#FFF7ED]/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#2878C8]">
                          {q.reference_id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[10px] font-medium bg-[#FFF0E8] text-[#2878C8] px-2 py-0.5 rounded-full border border-[#F0D6C8]">
                            {q.category || 'General Guidance'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#25364B] font-medium max-w-md truncate">
                          {q.title ? <strong className="font-semibold text-[#172554]">{q.title} — </strong> : null}
                          {q.question}
                        </td>
                        <td className="px-4 py-3 text-[#667085]">
                          {q.submission_date || new Date(q.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {q.status} {Number(q.reply_count || 0) > 0 ? `(${q.reply_count})` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenThread(q)}
                            className="border-[#F0D6C8] text-[#2878C8] hover:bg-[#FFF0E8] h-7 px-3 text-xs cursor-pointer"
                          >
                            <span>Reply</span>
                            <ArrowRight className="w-3 h-3 ml-1" />
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

      {/* Conversation Thread & Reply Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col bg-white border border-[#F0D6C8] p-5">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base font-bold text-[#25364B] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>Anonymous Question</span>
                <span className="font-mono text-xs text-[#2878C8] bg-[#E8F2FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                  {selectedQuestion?.reference_id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  selectedQuestion?.status === 'Pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {selectedQuestion?.status}
                </span>
                {selectedQuestion?.status !== 'Closed' && (
                  <button
                    onClick={() => handleMarkStatus('Closed')}
                    className="text-[10px] text-[#667085] hover:text-[#25364B] underline cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Question Text */}
          <div className="bg-[#FFF0E8] border border-[#F0D6C8] rounded-xl p-3 my-2 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#2878C8] uppercase tracking-wider">Student's Question</span>
              <span className="text-[10px] font-semibold bg-white text-[#2878C8] px-2 py-0.5 rounded-full border border-[#F0D6C8]">
                {selectedQuestion?.category || 'General Guidance'}
              </span>
            </div>
            {selectedQuestion?.title && (
              <h4 className="text-xs font-bold text-[#172554]">{selectedQuestion.title}</h4>
            )}
            <p className="text-[#25364B] leading-relaxed whitespace-pre-wrap">{selectedQuestion?.question}</p>
          </div>

          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2 px-1 max-h-60">
            {replies.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#667085]">
                No replies posted yet. Send a response below to answer this student.
              </div>
            ) : (
              replies.map(r => {
                const isCounsellor = r.sender_type === 'counsellor';
                return (
                  <div
                    key={r.id}
                    className={`flex flex-col ${isCounsellor ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[#667085]">
                      <span className="font-semibold text-[#25364B]">
                        {isCounsellor ? 'You (Counsellor)' : 'Student (Anonymous)'}
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

          {/* Reply Input Form */}
          <form onSubmit={handleSendReply} className="pt-3 border-t border-[#F0D6C8] flex gap-2">
            <Input
              placeholder="Type your counsellor guidance or reply here..."
              value={replyMessage}
              onChange={e => setReplyMessage(e.target.value)}
              className="bg-white border-[#F0D6C8] text-xs h-10 focus:border-[#F59E0B]"
            />
            <Button
              type="submit"
              disabled={sendingReply || !replyMessage.trim()}
              className="h-10 px-4 bg-[#2878C8] hover:bg-[#1D6AB8] text-white text-xs font-semibold rounded-xl shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>Reply</span>
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </CounsellorLayout>
  );
}

