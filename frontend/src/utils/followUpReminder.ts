import type { FollowUp } from '@/types/index';

const REMINDER_LEAD_TIME_MS = 60 * 60 * 1000;

export function getFollowUpScheduledAt(followUp: Pick<FollowUp, 'followup_date' | 'followup_time'>): Date | null {
  if (!followUp.followup_date || !followUp.followup_time) return null;

  const date = followUp.followup_date.slice(0, 10);
  const time = followUp.followup_time.slice(0, 5);
  const scheduledAt = new Date(`${date}T${time}:00+05:30`);

  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt;
}

export function isFollowUpReminderDue(followUp: FollowUp, now: Date): boolean {
  if (!['pending', 'in_progress'].includes(followUp.followup_status || 'pending')) return false;

  const scheduledAt = getFollowUpScheduledAt(followUp);
  if (!scheduledAt) return false;

  const timeUntilFollowUp = scheduledAt.getTime() - now.getTime();
  return timeUntilFollowUp > 0 && timeUntilFollowUp <= REMINDER_LEAD_TIME_MS;
}
