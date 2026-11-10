import { cn } from '@/lib/utils';

type StatusConfig = { label: string; className: string };

const statusMap: Record<string, StatusConfig> = {
  // Assessment
  not_started: { label: 'Not Started', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'In Progress', className: 'bg-[#FFF0E8] text-[#25364B] border-[#F0D6C8]' },
  completed: { label: 'Completed', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  
  // Payment
  unpaid: { label: 'Unpaid', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  paid: { label: 'Paid', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  failed: { label: 'Payment Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  refunded: { label: 'Refunded', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  pending: { label: 'Pending Verification', className: 'bg-[#FFF0E8] text-[#25364B] border-[#F0D6C8]' },
  Pending: { label: 'Pending Verification', className: 'bg-[#FFF0E8] text-[#25364B] border-[#F0D6C8]' },
  'Pending Verification': { label: 'Pending Verification', className: 'bg-[#FFF0E8] text-[#25364B] border-[#F0D6C8]' },
  pending_verification: { label: 'Pending Verification', className: 'bg-[#FFF0E8] text-[#25364B] border-[#F0D6C8]' },
  Approved: { label: 'Approved', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  Rejected: { label: 'Payment Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  
  // Application
  submitted: { label: 'Submitted', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  under_review: { label: 'Under Review', className: 'bg-[#FFF0E8] text-[#25364B] border-[#F0D6C8]' },
  approved: { label: 'Approved', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  confirmed: { label: 'Confirmed', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  Confirmed: { label: 'Confirmed', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  locked: { label: '🔒 Locked', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  unlocked: { label: '🔓 Unlocked', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  
  // Counselling
  not_scheduled: { label: 'Not Scheduled', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  scheduled: { label: 'Scheduled', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  selected: { label: 'Selected', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  follow_up_required: { label: 'Follow-up Required', className: 'bg-[#FFF0E8] text-[#25364B] border-[#F0D6C8]' },
  
  // Admission
  not_applied: { label: 'Not Applied', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  application_submitted: { label: 'App. Submitted', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  counselling_pending: { label: 'Counselling Pending', className: 'bg-[#FFF0E8] text-[#25364B] border-[#F0D6C8]' },
  counselling_completed: { label: 'Counselling Done', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  admission_confirmed: { label: 'Admission Confirmed', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  not_selected: { label: 'Not Selected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  
  // Course
  available: { label: 'Available', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  not_available: { label: 'Not Available', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  
  // Intent
  high: { label: 'High Intent', className: 'bg-[#E8F1FB] text-[#2878C8] border-[#BFDBFE]' },
  medium: { label: 'Medium Intent', className: 'bg-[#FFF0E8] text-[#25364B] border-[#F0D6C8]' },
  low: { label: 'Low Intent', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, className: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={cn('status-badge', config.className, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {config.label}
    </span>
  );
}
