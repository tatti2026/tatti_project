import { cn } from '@/lib/utils';

type StatusConfig = { label: string; className: string };

const statusMap: Record<string, StatusConfig> = {
  // Assessment
  not_started: { label: 'Not Started', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  
  // Payment
  unpaid: { label: 'Unpaid', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Payment Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  refunded: { label: 'Refunded', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  pending: { label: 'Pending Verification', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Pending: { label: 'Pending Verification', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Pending Verification': { label: 'Pending Verification', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_verification: { label: 'Pending Verification', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Rejected: { label: 'Payment Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  
  // Application
  submitted: { label: 'Submitted', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  under_review: { label: 'Under Review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  confirmed: { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Confirmed: { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  locked: { label: '🔒 Locked', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  unlocked: { label: '🔓 Unlocked', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  
  // Counselling
  not_scheduled: { label: 'Not Scheduled', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  selected: { label: 'Selected', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  follow_up_required: { label: 'Follow-up Required', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  
  // Admission
  not_applied: { label: 'Not Applied', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  application_submitted: { label: 'App. Submitted', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  counselling_pending: { label: 'Counselling Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  counselling_completed: { label: 'Counselling Done', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  admission_confirmed: { label: 'Admission Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  not_selected: { label: 'Not Selected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  
  // Course
  available: { label: 'Available', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  not_available: { label: 'Not Available', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  
  // Intent
  high: { label: 'High Intent', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'Medium Intent', className: 'bg-amber-50 text-amber-700 border-amber-200' },
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
