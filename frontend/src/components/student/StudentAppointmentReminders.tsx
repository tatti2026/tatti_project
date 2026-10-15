import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { BellRing, CalendarClock, CheckCircle2, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStudentReminders, type StudentReminder } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

function getScheduledAt(reminder: StudentReminder): Date | null {
  if (!reminder.scheduled_date) return null;
  const date = reminder.scheduled_date.slice(0, 10);
  const match = (reminder.scheduled_time || '10:30').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[4]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const scheduledAt = new Date(`${date}T${String(hours).padStart(2, '0')}:${minutes}:00+05:30`);
  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt;
}

function getIndiaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function StudentAppointmentReminders() {
  const { profile, role } = useAuth();
  const [reminders, setReminders] = useState<StudentReminder[]>([]);
  const [clock, setClock] = useState(() => Date.now());
  const [acknowledgedDays, setAcknowledgedDays] = useState<Record<string, string>>({});
  const [acknowledgementsLoaded, setAcknowledgementsLoaded] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const playedKeysRef = useRef(new Set<string>());
  const pendingKeysRef = useRef(new Set<string>());

  const dueReminders = useMemo(() => reminders.flatMap(reminder => {
    const scheduledAt = getScheduledAt(reminder);
    if (!scheduledAt || scheduledAt.getTime() <= clock) return [];
    return [{
      ...reminder,
      key: `${reminder.kind}-${reminder.id}-${scheduledAt.getTime()}-${reminder.updated_at || reminder.reminder_datetime || ''}`,
      scheduledAt,
    }];
  }), [clock, reminders]);
  const todayKey = getIndiaDateKey(new Date(clock));

  const activeReminder = dueReminders.find(reminder =>
    acknowledgementsLoaded &&
    acknowledgedDays[reminder.key] !== todayKey &&
    (!snoozedUntil[reminder.key] || snoozedUntil[reminder.key] <= clock)
  ) || null;
  const activeKeyRef = useRef<string | null>(null);
  activeKeyRef.current = activeReminder?.key || null;
  const activeSoundKeyRef = useRef<string | null>(null);
  activeSoundKeyRef.current = activeReminder ? `${activeReminder.key}:${todayKey}` : null;

  useEffect(() => {
    if (!profile?.id) {
      setAcknowledgedDays({});
      setAcknowledgementsLoaded(false);
      return;
    }

    const storageKey = `psy-care-student-reminder-acks:${profile.id}`;
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed: unknown = stored ? JSON.parse(stored) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Stored student reminder acknowledgements have an invalid format');
      }
      const validEntries = Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      );
      setAcknowledgedDays(Object.fromEntries(validEntries));
    } catch (error) {
      console.error('Could not load student reminder acknowledgements:', error);
      setAcknowledgedDays({});
    } finally {
      setAcknowledgementsLoaded(true);
    }
  }, [profile?.id]);

  const loadReminders = useCallback(async () => {
    try {
      setReminders(await getStudentReminders());
      setClock(Date.now());
    } catch (error) {
      console.error('Failed to refresh student appointment reminders:', error);
    }
  }, []);

  useEffect(() => {
    if (role !== 'student') return;
    void loadReminders();
    const interval = window.setInterval(() => {
      setClock(Date.now());
      void loadReminders();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [loadReminders, role]);

  const playReminderSound = useCallback(async (key: string, soundKey: string) => {
    if (playedKeysRef.current.has(soundKey) || pendingKeysRef.current.has(soundKey)) return;
    pendingKeysRef.current.add(soundKey);

    try {
      if (typeof window.AudioContext === 'undefined') return;
      const context = audioContextRef.current ?? new window.AudioContext();
      audioContextRef.current = context;
      if (context.state === 'suspended') await context.resume();
      if (activeKeyRef.current !== key) return;

      const startAt = context.currentTime;
      [880, 660, 880].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const toneStart = startAt + index * 0.18;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, toneStart);
        gain.gain.exponentialRampToValueAtTime(0.12, toneStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.14);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(toneStart);
        oscillator.stop(toneStart + 0.15);
      });
      playedKeysRef.current.add(soundKey);
    } catch (error) {
      console.warn('Could not play student appointment reminder sound:', error);
    } finally {
      pendingKeysRef.current.delete(soundKey);
    }
  }, []);

  useEffect(() => {
    if (activeReminder && activeSoundKeyRef.current) {
      void playReminderSound(activeReminder.key, activeSoundKeyRef.current);
    }
  }, [activeReminder?.key, todayKey, playReminderSound]);

  useEffect(() => {
    const resumeAndRetry = () => {
      if (activeKeyRef.current && activeSoundKeyRef.current) {
        void playReminderSound(activeKeyRef.current, activeSoundKeyRef.current);
      }
    };
    window.addEventListener('pointerdown', resumeAndRetry);
    window.addEventListener('keydown', resumeAndRetry);
    return () => {
      window.removeEventListener('pointerdown', resumeAndRetry);
      window.removeEventListener('keydown', resumeAndRetry);
      const context = audioContextRef.current;
      audioContextRef.current = null;
      void context?.close();
    };
  }, [playReminderSound]);

  if (!activeReminder) return null;

  const acknowledge = () => {
    if (!profile?.id) return;
    const nextAcknowledgements = { ...acknowledgedDays, [activeReminder.key]: todayKey };
    setAcknowledgedDays(nextAcknowledgements);
    try {
      localStorage.setItem(
        `psy-care-student-reminder-acks:${profile.id}`,
        JSON.stringify(nextAcknowledgements)
      );
    } catch (error) {
      console.error('Could not save student reminder acknowledgement:', error);
    }
  };
  const snooze = () => setSnoozedUntil(previous => ({
    ...previous,
    [activeReminder.key]: Date.now() + 5 * 60_000,
  }));
  const title = activeReminder.kind === 'counselling' ? 'Counselling Session Reminder' : 'Follow-up Reminder';

  return (
    <section
      role="alertdialog"
      aria-labelledby="student-appointment-reminder-title"
      aria-describedby="student-appointment-reminder-description"
      className="pointer-events-auto fixed left-1/2 top-1/2 z-[100] max-h-[calc(100vh-2rem)] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h2 id="student-appointment-reminder-title" className="text-base font-semibold">{title}</h2>
              <p className="mt-0.5 text-xs text-slate-500">PSY CARE · Appointment reminder</p>
            </div>
          </div>
          <span className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-700">
            In {formatDistanceToNowStrict(activeReminder.scheduledAt)}
          </span>
        </div>

        {activeReminder.kind === 'counselling' && activeReminder.counsellor_name && (
          <p className="text-sm text-slate-700">Counsellor: {activeReminder.counsellor_name}</p>
        )}
        <div id="student-appointment-reminder-description" className="space-y-1.5 rounded-lg bg-slate-100 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CalendarClock className="h-4 w-4 text-blue-600" />
            {format(activeReminder.scheduledAt, 'dd MMM yyyy')} · {format(activeReminder.scheduledAt, 'h:mm a')}
          </p>
          {activeReminder.kind === 'counselling' && activeReminder.mode && (
            <p className="text-xs text-slate-600">Type: {activeReminder.mode}</p>
          )}
          {activeReminder.kind === 'counselling' && (
            <p className="text-xs font-medium text-amber-800">
              Alarm set for {activeReminder.reminder_option || '1 day before'}
            </p>
          )}
          {(activeReminder.notes || activeReminder.instructions) && (
            <p className="text-xs text-slate-600">{activeReminder.notes || activeReminder.instructions}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Button onClick={acknowledge} className="h-9 w-full rounded-full bg-slate-950 text-sm text-white hover:bg-slate-800">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Acknowledge
          </Button>
          <Button onClick={snooze} variant="outline" className="h-9 w-full rounded-full border-slate-300 text-sm text-slate-600">
            <Clock3 className="mr-2 h-4 w-4" /> Snooze for 5 minutes
          </Button>
        </div>
      </div>
    </section>
  );
}
