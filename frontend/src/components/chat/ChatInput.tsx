import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, FileText, Send, Keyboard } from 'lucide-react';
import DocumentUploadModal, { UploadedFileData } from './DocumentUploadModal';
import VirtualKeyboard from './VirtualKeyboard';

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
  const [keyboardOpen, setKeyboardOpen] = useState(false);
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

  // Virtual keyboard callbacks
  const handleVirtualKeyPress = (char: string) => {
    setText(prev => prev + char);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleVirtualBackspace = () => {
    setText(prev => prev.slice(0, -1));
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleVirtualSpace = () => {
    setText(prev => prev + ' ');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleVirtualEnter = () => {
    handleSend();
  };

  return (
    <>
      <div className="p-3 border-t border-border bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 📎 Attachment / Document Upload Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDocModalOpen(true)}
              disabled={disabled}
              title="Upload Document"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setDocModalOpen(true)}
              disabled={disabled}
              title="Upload Document (PDF, DOC, XLS, etc.)"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors hidden sm:flex items-center gap-1 text-xs font-medium disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-[11px]">Doc</span>
            </button>
          </div>

          {/* Input Field */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={() => setKeyboardOpen(true)}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full bg-input/70 hover:bg-input border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all pr-9"
            />
            {/* Keyboard toggle icon inside input */}
            <button
              type="button"
              onClick={() => setKeyboardOpen(prev => !prev)}
              title={keyboardOpen ? 'Close Virtual Keyboard' : 'Open Virtual Keyboard'}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                keyboardOpen ? 'text-primary bg-primary/15' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>

          {/* Send Button */}
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

      {/* Virtual Keyboard */}
      <VirtualKeyboard
        open={keyboardOpen}
        onClose={() => setKeyboardOpen(false)}
        onKeyPress={handleVirtualKeyPress}
        onBackspace={handleVirtualBackspace}
        onSpace={handleVirtualSpace}
        onEnter={handleVirtualEnter}
        onUploadDoc={() => setDocModalOpen(true)}
      />
    </>
  );
};

export default ChatInput;
