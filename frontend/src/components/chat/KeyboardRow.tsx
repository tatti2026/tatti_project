import React from 'react';

export interface KeyConfig {
  key: string;
  label?: React.ReactNode;
  width?: string; // flex width or custom class
  variant?: 'default' | 'accent' | 'special' | 'space';
  isPressed?: boolean;
}

interface KeyboardRowProps {
  keys: (string | KeyConfig)[];
  onKeyClick: (key: string) => void;
  className?: string;
}

export const KeyboardRow: React.FC<KeyboardRowProps> = ({ keys, onKeyClick, className = '' }) => {
  return (
    <div className={`flex items-center justify-center gap-1 sm:gap-1.5 w-full ${className}`}>
      {keys.map((item, idx) => {
        const config: KeyConfig = typeof item === 'string' ? { key: item, label: item } : item;
        const keyId = `${config.key}-${idx}`;

        let variantStyle = 'bg-slate-700/80 hover:bg-slate-600 text-white shadow-sm border-b-2 border-slate-900/60';
        if (config.variant === 'accent') {
          variantStyle = 'gradient-bg text-white shadow-md border-b-2 border-primary-foreground/30 hover:opacity-90';
        } else if (config.variant === 'special') {
          variantStyle = 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-b-2 border-slate-950 shadow-sm';
        } else if (config.variant === 'space') {
          variantStyle = 'bg-slate-700/70 hover:bg-slate-600 text-slate-300 border-b-2 border-slate-900/60 shadow-sm';
        }

        return (
          <button
            key={keyId}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onKeyClick(config.key);
            }}
            className={`select-none h-10 sm:h-11 rounded-lg flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-75 active:scale-90 active:bg-slate-500 focus:outline-none ${
              config.width || 'flex-1'
            } ${variantStyle}`}
          >
            {config.label ?? config.key}
          </button>
        );
      })}
    </div>
  );
};

export default KeyboardRow;
