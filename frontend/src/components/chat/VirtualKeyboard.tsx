import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Smile,
  Mic,
  Send,
  Delete,
  ArrowBigUp,
  X,
  ChevronDown,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { KeyboardRow, KeyConfig } from './KeyboardRow';

export interface VirtualKeyboardProps {
  open: boolean;
  onClose: () => void;
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  onSpace: () => void;
}

const COMMON_EMOJIS = [
  '😊', '😂', '👍', '❤️', '🎉', '📚', '🎓', '✍️',
  '💻', '🚀', '👏', '🔥', '✨', '💡', '📌', '🎯',
  '🤝', '💯', '📖', '🏆', '🙌', '🙏', '⚡', '🌟'
];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  open,
  onClose,
  onKeyPress,
  onBackspace,
  onEnter,
  onSpace,
}) => {
  const [mode, setMode] = useState<'alpha' | 'symbols'>('alpha');
  const [shift, setShift] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subtle tap sound generator
  const playTapSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      if (audioCtxRef.current) {
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtxRef.current.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.04);
      }
    } catch {
      // Audio not supported or blocked, ignore
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Only close if clicked outside keyboard and not inside input
        const target = e.target as HTMLElement;
        if (!target.closest('input') && !target.closest('textarea') && !target.closest('button')) {
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  const handleKey = (key: string) => {
    playTapSound();

    if (key === 'SHIFT') {
      if (shift && !capsLock) {
        setCapsLock(true);
      } else if (capsLock) {
        setCapsLock(false);
        setShift(false);
      } else {
        setShift(true);
      }
      return;
    }

    if (key === 'BACKSPACE') {
      onBackspace();
      return;
    }

    if (key === 'ENTER') {
      onEnter();
      return;
    }

    if (key === 'SPACE') {
      onSpace();
      return;
    }

    if (key === 'MODE_SYMBOLS') {
      setMode('symbols');
      setShowEmojis(false);
      return;
    }

    if (key === 'MODE_ALPHA') {
      setMode('alpha');
      setShowEmojis(false);
      return;
    }

    if (key === 'TOGGLE_EMOJI') {
      setShowEmojis(prev => !prev);
      return;
    }

    // Normal character
    let char = key;
    if (mode === 'alpha') {
      const isUpper = capsLock || shift;
      char = isUpper ? key.toUpperCase() : key.toLowerCase();
      // If single shift was active, revert back after one press
      if (shift && !capsLock) {
        setShift(false);
      }
    }
    onKeyPress(char);
  };

  // Layouts
  const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  const alphaRow1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map(k =>
    shift || capsLock ? k.toUpperCase() : k
  );
  const alphaRow2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map(k =>
    shift || capsLock ? k.toUpperCase() : k
  );
  const alphaRow3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(k =>
    shift || capsLock ? k.toUpperCase() : k
  );

  const symbolRow1 = ['@', '#', '$', '%', '&', '*', '-', '+', '(', ')'];
  const symbolRow2 = ['!', '"', "'", ':', ';', '/', '\\', '?', '=', '<'];
  const symbolRow3 = ['>', '[', ']', '{', '}', '_', '~', '^', '`', '|'];

  const bottomRow: (string | KeyConfig)[] = [
    {
      key: mode === 'alpha' ? 'MODE_SYMBOLS' : 'MODE_ALPHA',
      label: mode === 'alpha' ? '?123' : 'ABC',
      width: 'w-12 sm:w-16 shrink-0',
      variant: 'special',
    },
    {
      key: 'GLOBE',
      label: <Globe className="w-4 h-4 text-slate-300" />,
      width: 'w-10 sm:w-12 shrink-0',
      variant: 'special',
    },
    {
      key: 'SPACE',
      label: <span className="text-slate-400 text-xs">English</span>,
      width: 'flex-1',
      variant: 'space',
    },
    {
      key: 'TOGGLE_EMOJI',
      label: <Smile className={`w-4 h-4 ${showEmojis ? 'text-amber-400' : 'text-slate-300'}`} />,
      width: 'w-10 sm:w-12 shrink-0',
      variant: 'special',
    },
    {
      key: 'MIC',
      label: <Mic className="w-4 h-4 text-slate-400" />,
      width: 'w-10 sm:w-12 shrink-0',
      variant: 'special',
    },
    {
      key: 'ENTER',
      label: <Send className="w-4 h-4 text-white" />,
      width: 'w-14 sm:w-20 shrink-0',
      variant: 'accent',
    },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/80 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out transform translate-y-0"
    >
      {/* Top Bar with minimize & sound toggle */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
            Virtual Keyboard
          </span>
          {capsLock && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              CAPS LOCK
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title={soundEnabled ? 'Mute tap sound' : 'Enable tap sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Minimize Keyboard"
          >
            <ChevronDown className="w-4 h-4" />
            <span className="text-[11px]">Hide</span>
          </button>
        </div>
      </div>

      {/* Emoji Row if opened */}
      {showEmojis && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/60 overflow-x-auto border-b border-slate-800 scrollbar-thin">
          {COMMON_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                playTapSound();
                onKeyPress(emoji);
              }}
              className="text-lg p-1.5 hover:scale-125 transition-transform rounded hover:bg-slate-800 shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main Keys Container */}
      <div className="max-w-3xl mx-auto p-2 sm:p-3 space-y-1.5 sm:space-y-2 select-none">
        {/* Number Row */}
        <KeyboardRow keys={numberRow} onKeyClick={handleKey} />

        {mode === 'alpha' ? (
          <>
            {/* Alpha Row 1 */}
            <KeyboardRow keys={alphaRow1} onKeyClick={handleKey} />

            {/* Alpha Row 2 */}
            <div className="px-2 sm:px-4">
              <KeyboardRow keys={alphaRow2} onKeyClick={handleKey} />
            </div>

            {/* Alpha Row 3 with Shift and Backspace */}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full">
              <button
                type="button"
                onClick={() => handleKey('SHIFT')}
                className={`select-none h-10 sm:h-11 rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-75 active:scale-95 w-12 sm:w-16 shrink-0 border-b-2 shadow-sm ${
                  capsLock
                    ? 'bg-amber-500 text-slate-950 border-amber-600'
                    : shift
                    ? 'bg-primary text-white border-primary-foreground/30'
                    : 'bg-slate-800/90 text-slate-300 border-slate-950 hover:bg-slate-700'
                }`}
              >
                <ArrowBigUp className={`w-4 h-4 ${capsLock || shift ? 'fill-current' : ''}`} />
              </button>

              <div className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5">
                {alphaRow3.map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleKey(k)}
                    className="select-none h-10 sm:h-11 rounded-lg flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-75 active:scale-90 bg-slate-700/80 hover:bg-slate-600 text-white shadow-sm border-b-2 border-slate-900/60 flex-1"
                  >
                    {k}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleKey('BACKSPACE')}
                className="select-none h-10 sm:h-11 rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-75 active:scale-95 w-12 sm:w-16 shrink-0 bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-b-2 border-slate-950 shadow-sm"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Symbol Row 1 */}
            <KeyboardRow keys={symbolRow1} onKeyClick={handleKey} />

            {/* Symbol Row 2 */}
            <KeyboardRow keys={symbolRow2} onKeyClick={handleKey} />

            {/* Symbol Row 3 with Backspace */}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full">
              <div className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5">
                {symbolRow3.map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleKey(k)}
                    className="select-none h-10 sm:h-11 rounded-lg flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-75 active:scale-90 bg-slate-700/80 hover:bg-slate-600 text-white shadow-sm border-b-2 border-slate-900/60 flex-1"
                  >
                    {k}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleKey('BACKSPACE')}
                className="select-none h-10 sm:h-11 rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-75 active:scale-95 w-12 sm:w-16 shrink-0 bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-b-2 border-slate-950 shadow-sm"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Bottom Row */}
        <KeyboardRow keys={bottomRow} onKeyClick={handleKey} />
      </div>
    </div>
  );
};

export default VirtualKeyboard;
