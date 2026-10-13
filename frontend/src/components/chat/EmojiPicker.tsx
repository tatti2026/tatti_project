import React, { useEffect, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Smile } from 'lucide-react';

/* ─── Emoji data ───────────────────────────────────────────── */
const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    icon: '😊',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
      '😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
      '😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔',
      '🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥',
      '😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧',
    ],
  },
  {
    label: 'People',
    icon: '👋',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞',
      '🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
      '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝',
      '🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃',
      '🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄','💋',
    ],
  },
  {
    label: 'Nature',
    icon: '🌿',
    emojis: [
      '🌸','🌺','🌻','🌹','🌷','🌱','🌿','🍀','🍁','🍂',
      '🍃','🌾','🌵','🎋','🎍','🌴','🌳','🌲','🌞','🌝',
      '🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓',
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
      '🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧',
    ],
  },
  {
    label: 'Food',
    icon: '🍕',
    emojis: [
      '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐',
      '🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑',
      '🥦','🥬','🥒','🌶️','🫑','🧄','🧅','🥔','🍠','🥐',
      '🍕','🍔','🍟','🌭','🍿','🧆','🥚','🍳','🧇','🥞',
      '🧈','🍞','🥖','🥨','🧀','🥗','🥙','🌮','🌯','🫔',
    ],
  },
  {
    label: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🏐','🏉','🥏','🎾','🏸',
      '🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣',
      '🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿',
      '⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🏇','🧘',
      '🎮','🕹️','🎲','♟️','🎯','🎳','🎰','🎪','🎭','🎨',
    ],
  },
  {
    label: 'Travel',
    icon: '✈️',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐',
      '🛻','🚚','🚛','🚜','🏍️','🛵','🛺','🚲','🛴','🛹',
      '🚁','🛸','✈️','🚀','🛶','⛵','🚤','🛥️','🛳️','⛴️',
      '🗺️','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️',
      '🏟️','🏛️','🏗️','🧱','🏘️','🏚️','🏠','🏡','🏢','🏣',
    ],
  },
  {
    label: 'Objects',
    icon: '💡',
    emojis: [
      '⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💾','💿',
      '📀','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟',
      '📠','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳',
      '📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💰',
      '💳','💎','⚖️','🧰','🔧','🔨','⚒️','🛠️','⛏️','🪛',
    ],
  },
  {
    label: 'Symbols',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
      '✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐',
      '⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐',
      '✅','❎','🆗','🆕','🆙','🔴','🟠','🟡','🟢','🔵',
    ],
  },
];

/* ─── Types ─────────────────────────────────────────────────── */
interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

/* ─── Component ─────────────────────────────────────────────── */
export const EmojiPickerButton: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  /* Focus search field when picker opens */
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 80);
    } else {
      setSearch('');
    }
  }, [open]);

  /* Keyboard: close on Escape */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  /* Filter emojis by search */
  const filteredCategories = search.trim()
    ? [
        {
          label: 'Results',
          icon: '🔍',
          emojis: EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(e =>
            e.includes(search.trim())
          ),
        },
      ]
    : EMOJI_CATEGORIES;

  const category = filteredCategories[Math.min(activeCategory, filteredCategories.length - 1)];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          title="Emoji"
          aria-label="Open emoji picker"
          className={`p-2 rounded-xl transition-colors disabled:opacity-50 ${
            open
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
          }`}
        >
          <Smile className="w-4 h-4" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          avoidCollisions
          onOpenAutoFocus={e => e.preventDefault()}
          className="z-50 w-[320px] sm:w-[360px] rounded-2xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-md overflow-hidden animate-fade-in"
        >
          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveCategory(0); }}
              placeholder="Search emoji…"
              className="w-full bg-muted/60 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          {/* Category tabs */}
          {!search.trim() && (
            <div className="flex items-center gap-0.5 px-2 pt-2 pb-1 overflow-x-auto scrollbar-thin">
              {EMOJI_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setActiveCategory(idx)}
                  title={cat.label}
                  className={`shrink-0 text-base p-1.5 rounded-lg transition-all ${
                    activeCategory === idx
                      ? 'bg-primary/15 ring-1 ring-primary/30 scale-110'
                      : 'hover:bg-muted/70 opacity-70 hover:opacity-100'
                  }`}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
          )}

          {/* Emoji grid */}
          <div className="h-[200px] overflow-y-auto px-2 py-1.5 scrollbar-thin">
            {category.emojis.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                No emojis found
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-0.5">
                {category.emojis.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    type="button"
                    onClick={() => handleSelect(emoji)}
                    className="text-lg p-1.5 rounded-lg hover:bg-primary/10 hover:scale-110 transition-all duration-75 active:scale-95 leading-none"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-border bg-muted/30 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              {search.trim() ? 'Search results' : category.label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {category.emojis.length} emoji{category.emojis.length !== 1 ? 's' : ''}
            </span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default EmojiPickerButton;
