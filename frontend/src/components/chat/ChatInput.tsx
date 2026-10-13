import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Send } from 'lucide-react';
import DocumentUploadModal, { UploadedFileData } from './DocumentUploadModal';
import { EmojiPickerButton } from './EmojiPicker';

export interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendDocument: (file: UploadedFileData) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendDocument,
  placeholder = 'Type a message...',
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [docModalOpen, setDocModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim());
    setText('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** Insert emoji at the current cursor position inside the text input */
  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setText(prev => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    // Restore cursor position after the inserted emoji
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + emoji.length;
      input.setSelectionRange(pos, pos);
    });
  };

  return (
    <>
      <div className="p-3 border-t border-border bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Attachment button */}
          <button
            type="button"
            onClick={() => setDocModalOpen(true)}
            disabled={disabled}
            title="Upload Document"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50 shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Emoji picker button */}
          <EmojiPickerButton
            onEmojiSelect={handleEmojiSelect}
            disabled={disabled}
          />

          {/* Message input */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full bg-input/70 hover:bg-input border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Send button */}
          <Button
            type="button"
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="gradient-bg border-0 text-white rounded-xl h-9 px-3.5 sm:px-4 shadow-sm hover:opacity-95 shrink-0 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs font-semibold">Send</span>
          </Button>
        </div>
      </div>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        onUpload={(file) => {
          onSendDocument(file);
        }}
      />
    </>
  );
};

export default ChatInput;
