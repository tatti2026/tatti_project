import { cn } from '@/lib/utils';

type StatusConfig = { label: string; className: string };

const statusMap: Record<string, StatusConfig> = {
  // Assessment
  not_started: { label: 'Not Started', className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', className: 'bg-warning/20 text-warning' },
  completed: { label: 'Completed', className: 'bg-success/20 text-success' },
  // Payment
  unpaid: { label: 'Unpaid', className: 'bg-destructive/20 text-destructive' },
  paid: { label: 'Paid', className: 'bg-success/20 text-success' },
  failed: { label: 'Failed', className: 'bg-destructive/20 text-destructive' },
  refunded: { label: 'Refunded', className: 'bg-muted text-muted-foreground' },
  // Application
  submitted: { label: 'Submitted', className: 'bg-info/20 text-info' },
  under_review: { label: 'Under Review', className: 'bg-warning/20 text-warning' },
  approved: { label: 'Approved', className: 'bg-success/20 text-success' },
  rejected: { label: 'Rejected', className: 'bg-destructive/20 text-destructive' },
  locked: { label: '🔒 Locked', className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  unlocked: { label: '🔓 Unlocked', className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  // Counselling
  not_scheduled: { label: 'Not Scheduled', className: 'bg-muted text-muted-foreground' },
  pending: { label: 'Pending', className: 'bg-warning/20 text-warning' },
  scheduled: { label: 'Scheduled', className: 'bg-info/20 text-info' },
  selected: { label: 'Selected', className: 'bg-success/20 text-success' },
  follow_up_required: { label: 'Follow-up Required', className: 'bg-warning/20 text-warning' },
  // Admission
  not_applied: { label: 'Not Applied', className: 'bg-muted text-muted-foreground' },
  application_submitted: { label: 'App. Submitted', className: 'bg-info/20 text-info' },
  counselling_pending: { label: 'Counselling Pending', className: 'bg-warning/20 text-warning' },
  counselling_completed: { label: 'Counselling Done', className: 'bg-info/20 text-info' },
  admission_confirmed: { label: 'Admission Confirmed', className: 'bg-success/20 text-success' },
  not_selected: { label: 'Not Selected', className: 'bg-destructive/20 text-destructive' },
  // Course
  available: { label: 'Available', className: 'bg-success/20 text-success' },
  not_available: { label: 'Not Available', className: 'bg-destructive/20 text-destructive' },
  // Intent
  high: { label: 'High Intent', className: 'bg-success/20 text-success' },
  medium: { label: 'Medium Intent', className: 'bg-warning/20 text-warning' },
  low: { label: 'Low Intent', className: 'bg-destructive/20 text-destructive' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn('status-badge', config.className, className)}>
      {config.label}
    </span>
  );
}
