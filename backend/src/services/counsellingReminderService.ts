import { query } from '../database/pgPool.js';

export interface ReminderCalculationResult {
  reminderDatetime: Date | null;
  isPast: boolean;
}

/**
 * Calculates reminder datetime given scheduled date (YYYY-MM-DD),
 * scheduled time (e.g. "10:30 AM" or "14:00"), and reminder option string.
 * Uses IST (UTC+05:30) consistently.
 */
export function calculateReminderDatetime(
  dateStr: string,
  timeStr: string,
  option: string
): ReminderCalculationResult {
  try {
    if (!dateStr) return { reminderDatetime: null, isPast: false };

    // Parse time
    let hours = 10;
    let minutes = 30;
    if (timeStr) {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const meridiem = match[3]?.toUpperCase();
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
      }
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    // ISO string with IST timezone offset (+05:30)
    const isoString = `${dateStr}T${pad(hours)}:${pad(minutes)}:00+05:30`;
    const sessionTime = new Date(isoString);

    if (isNaN(sessionTime.getTime())) {
      return { reminderDatetime: null, isPast: false };
    }

    const normOption = option?.toLowerCase().trim() || '1 day before';
    let offsetMs = 24 * 3600 * 1000; // default 1 day

    if (normOption.includes('3 hour') || normOption === '3_hours_before') {
      offsetMs = 3 * 3600 * 1000;
    } else if (normOption.includes('1 hour') || normOption === '1_hour_before') {
      offsetMs = 1 * 3600 * 1000;
    } else if (normOption.includes('1 day') || normOption === '1_day_before') {
      offsetMs = 24 * 3600 * 1000;
    } else if (normOption.includes('3 day') || normOption === '3_days_before') {
      offsetMs = 3 * 24 * 3600 * 1000;
    } else if (normOption.includes('1 week') || normOption === '1_week_before') {
      offsetMs = 7 * 24 * 3600 * 1000;
    }

    const reminderTime = new Date(sessionTime.getTime() - offsetMs);
    const isPast = reminderTime.getTime() <= Date.now();

    return { reminderDatetime: reminderTime, isPast };
  } catch (err) {
    console.error('[CounsellingReminder] Error calculating reminder datetime:', err);
    return { reminderDatetime: null, isPast: false };
  }
}

let workerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

/**
 * Checks and dispatches pending counselling reminders whose reminder_datetime is due.
 */
export async function checkAndDispatchDueReminders(): Promise<number> {
  if (isProcessing) return 0;
  isProcessing = true;

  try {
    const result = await query(`
      SELECT c.id, c.student_id, c.counsellor_name, c.scheduled_date, c.scheduled_time,
             c.reminder_option, c.reminder_datetime, s.profile_id, s.full_name, s.email
      FROM counselling c
      JOIN students s ON c.student_id = s.id
      WHERE (c.reminder_sent = false OR c.reminder_sent IS NULL)
        AND c.reminder_datetime IS NOT NULL
        AND c.reminder_datetime <= now()
        AND c.notification_status = 'pending'
      ORDER BY c.reminder_datetime ASC
      LIMIT 50;
    `);

    let dispatchedCount = 0;

    for (const row of result.rows) {
      try {
        // Atomic update to mark as sent immediately to prevent concurrent duplicate delivery
        const updateRes = await query(`
          UPDATE counselling
          SET reminder_sent = true, notification_status = 'sent', updated_at = now()
          WHERE id = $1 AND (reminder_sent = false OR reminder_sent IS NULL)
          RETURNING id;
        `, [row.id]);

        if (updateRes.rows.length === 0) {
          // Already claimed/sent by another tick
          continue;
        }

        const counsellor = row.counsellor_name || 'TATTI Counsellor';
        let dateStr = row.scheduled_date;
        if (dateStr instanceof Date) {
          const y = dateStr.getFullYear();
          const m = (dateStr.getMonth() + 1).toString().padStart(2, '0');
          const d = dateStr.getDate().toString().padStart(2, '0');
          dateStr = `${y}-${m}-${d}`;
        }
        let timeStr = row.scheduled_time || '10:30 AM';
        if (typeof timeStr === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
          const [hh, mm] = timeStr.split(':');
          let h = parseInt(hh, 10);
          const ampm = h >= 12 ? 'PM' : 'AM';
          if (h > 12) h -= 12;
          if (h === 0) h = 12;
          timeStr = `${h}:${mm} ${ampm}`;
        }
        const opt = (row.reminder_option || '').toLowerCase();

        const reminderMsg = opt.includes('1 day')
          ? `Reminder: Your TATTI counselling session is tomorrow, ${dateStr} at ${timeStr} with ${counsellor}.`
          : `Reminder: Your TATTI counselling session is on ${dateStr} at ${timeStr} with ${counsellor}.`;

        if (row.profile_id) {
          await query(`
            INSERT INTO notifications (profile_id, title, message, type, is_read)
            VALUES ($1, $2, $3, 'counselling', false);
          `, [row.profile_id, '📅 Counselling Reminder', reminderMsg]);
        }

        dispatchedCount++;
        console.log(`[CounsellingReminder] Dispatched reminder for student ${row.full_name || row.email} (Counselling ID: ${row.id})`);
      } catch (rowErr) {
        console.error(`[CounsellingReminder] Error dispatching reminder for row ${row.id}:`, rowErr);
      }
    }

    return dispatchedCount;
  } catch (err) {
    console.error('[CounsellingReminder] Error querying due reminders:', err);
    return 0;
  } finally {
    isProcessing = false;
  }
}

/**
 * Starts the background worker that runs periodically (every 30 seconds)
 * and immediately on startup.
 */
export function startCounsellingReminderWorker(intervalMs = 30000): void {
  if (workerInterval) return;

  console.log('[CounsellingReminder] Starting counselling reminder background worker...');

  // Run immediately on boot
  checkAndDispatchDueReminders().catch(err => {
    console.error('[CounsellingReminder] Initial reminder check failed:', err);
  });

  // Schedule periodic tick
  workerInterval = setInterval(() => {
    checkAndDispatchDueReminders().catch(err => {
      console.error('[CounsellingReminder] Periodic reminder check failed:', err);
    });
  }, intervalMs);
}

export function stopCounsellingReminderWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[CounsellingReminder] Stopped counselling reminder background worker.');
  }
}
