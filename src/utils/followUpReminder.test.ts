import { describe, expect, it } from 'vitest';
import type { FollowUp } from '@/types/index';
import { getFollowUpScheduledAt, isFollowUpReminderDue } from './followUpReminder';

const followUp: FollowUp = {
  id: 'follow-up-1',
  student_id: 'student-1',
  intent_level: 'high',
  last_interaction: null,
  followup_date: '2026-10-16',
  followup_time: '10:30:00',
  followup_status: 'pending',
  notes: null,
  created_at: '',
  updated_at: '',
};

describe('follow-up reminders', () => {
  it('parses the scheduled local date and time', () => {
    expect(getFollowUpScheduledAt(followUp)?.getTime()).toBe(new Date('2026-10-16T10:30:00+05:30').getTime());
  });

  it('is due during the hour before a pending follow-up', () => {
    const scheduledAt = getFollowUpScheduledAt(followUp)!;
    expect(isFollowUpReminderDue(followUp, new Date(scheduledAt.getTime() - 60 * 60 * 1000))).toBe(true);
    expect(isFollowUpReminderDue(followUp, new Date(scheduledAt.getTime() - 30 * 60 * 1000))).toBe(true);
  });

  it('does not remind before the one-hour window, after the appointment, or for completed follow-ups', () => {
    const scheduledAt = getFollowUpScheduledAt(followUp)!;
    expect(isFollowUpReminderDue(followUp, new Date(scheduledAt.getTime() - 60 * 60 * 1000 - 1))).toBe(false);
    expect(isFollowUpReminderDue(followUp, new Date(scheduledAt.getTime()))).toBe(false);
    expect(isFollowUpReminderDue({ ...followUp, followup_status: 'completed' }, new Date(scheduledAt.getTime() - 10 * 60 * 1000))).toBe(false);
  });
});
