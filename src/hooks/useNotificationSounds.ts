import { useCallback, useEffect, useRef, useState } from 'react';

// Key for storing sound mute preference
const MUTE_STORAGE_KEY = 'psycare_sound_muted';

export function useNotificationSounds() {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const playedMessageIdsRef = useRef<Set<string>>(new Set());
  const loopTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get or initialize AudioContext
  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Unlock AudioContext on first touch/click
  useEffect(() => {
    const unlock = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Toggle mute state
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, String(next));
      } catch (e) {
        console.warn('Failed to save sound preference', e);
      }
      return next;
    });
  }, []);

  // 1. Play Outgoing Sound: WhatsApp-style soft pop (two ascending blips)
  const playOutgoing = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // First blip: 520Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(520, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.07);

      // Second blip: 740Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(740, now + 0.06);
      gain2.gain.setValueAtTime(0.001, now + 0.06);
      gain2.gain.linearRampToValueAtTime(0.25, now + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.15);
    } catch (err) {
      console.warn('Could not play outgoing sound:', err);
    }
  }, [getAudioContext, isMuted]);

  // 2. Play Incoming Sound: WhatsApp/iOS-style gentle 3-tone chime with deduplication
  const playIncoming = useCallback((messageId?: string) => {
    if (isMuted) return;
    if (messageId) {
      if (playedMessageIdsRef.current.has(messageId)) return;
      playedMessageIdsRef.current.add(messageId);
    }

    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 3 ascending bell notes: D5 (587Hz), F#5 (740Hz), A5 (880Hz)
      const notes = [
        { freq: 587, start: 0, dur: 0.12 },
        { freq: 740, start: 0.08, dur: 0.14 },
        { freq: 880, start: 0.16, dur: 0.28 },
      ];

      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.linearRampToValueAtTime(0.28, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    } catch (err) {
      console.warn('Could not play incoming sound:', err);
    }
  }, [getAudioContext, isMuted]);

  // 3. Play Single Reminder Alarm Chime
  const playReminderChime = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Distinct alert pattern: 660Hz -> 880Hz -> 660Hz -> 880Hz
      const tones = [
        { freq: 660, time: 0 },
        { freq: 880, time: 0.15 },
        { freq: 660, time: 0.35 },
        { freq: 880, time: 0.5 },
      ];

      tones.forEach(({ freq, time }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(0.25, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + 0.15);
      });
    } catch (err) {
      console.warn('Could not play reminder chime:', err);
    }
  }, [getAudioContext, isMuted]);

  // 4. Start Repeating Reminder Loop (repeats every 20s, max 15 times = 5 mins)
  const startReminderLoop = useCallback(() => {
    if (loopTimerRef.current) return;
    playReminderChime();

    let count = 1;
    loopTimerRef.current = setInterval(() => {
      count += 1;
      if (count > 15) {
        if (loopTimerRef.current) {
          clearInterval(loopTimerRef.current);
          loopTimerRef.current = null;
        }
        return;
      }
      playReminderChime();
    }, 20_000);
  }, [playReminderChime]);

  // 5. Stop Repeating Reminder Loop
  const stopReminderLoop = useCallback(() => {
    if (loopTimerRef.current) {
      clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopTimerRef.current) {
        clearInterval(loopTimerRef.current);
        loopTimerRef.current = null;
      }
    };
  }, []);

  return {
    isMuted,
    toggleMute,
    playOutgoing,
    playIncoming,
    playReminderChime,
    startReminderLoop,
    stopReminderLoop,
  };
}
