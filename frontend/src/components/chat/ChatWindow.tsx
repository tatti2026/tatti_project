import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, User, ShieldCheck } from 'lucide-react';
import type { ChatMessage } from '@/services/messagingService';
import FileAttachment from './FileAttachment';
import ChatInput from './ChatInput';
import type { UploadedFileData } from './DocumentUploadModal';

export interface ChatWindowProps {
  messages: ChatMessage[];
  currentUserType: 'admin' | 'student';
  recipientName: string;
  recipientSubtitle?: string;
  recipientAvatar?: string;
  onSendMessage: (text: string) => void;
  onSendDocument: (file: UploadedFileData) => void;
  emptyPlaceholder?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  currentUserType,
  recipientName,
  recipientSubtitle = 'Active in College Connect',
  onSendMessage,
  onSendDocument,
  emptyPlaceholder = 'Start a conversation...',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on message list update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-card/40 relative">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card/70 backdrop-blur-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {currentUserType === 'admin' ? (
              recipientName.slice(0, 2).toUpperCase()
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground leading-tight">
              {recipientName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] text-muted-foreground">{recipientSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 select-text"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-foreground">{emptyPlaceholder}</p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              Send a message or upload documents directly to communicate with{' '}
              {currentUserType === 'admin' ? 'the student' : 'TATTI College Connect team'}.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSender = msg.senderType === currentUserType;
            let timeStr = '';
            try {
              timeStr = format(new Date(msg.timestamp), 'hh:mm a');
            } catch {
              timeStr = '';
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 shadow-sm transition-all ${
                    isSender
                      ? 'gradient-bg text-white rounded-tr-none'
                      : 'bg-muted/70 text-foreground border border-border/80 rounded-tl-none'
                  }`}
                >
                  {/* Sender Name for incoming */}
                  {!isSender && (
                    <p className="text-[10px] font-bold text-primary mb-1">
                      {msg.senderName}
                    </p>
                  )}

                  {/* Attachment if present */}
                  {msg.attachment && (
                    <div className="mb-2">
                      <FileAttachment
                        fileName={msg.attachment.name}
                        fileSize={msg.attachment.size}
                        fileType={msg.attachment.type}
                        fileUrl={msg.attachment.url}
                        isSender={isSender}
                      />
                    </div>
                  )}

                  {/* Text message */}
                  {msg.text && (
                    <p className="text-xs whitespace-pre-wrap leading-relaxed break-words">
                      {msg.text}
                    </p>
                  )}

                  {/* Timestamp & Status */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isSender ? 'text-white/70' : 'text-muted-foreground'
                    }`}
                  >
                    <span>{timeStr}</span>
                    {isSender && (
                      <span>
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-200 inline" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="w-3.5 h-3.5 opacity-80 inline" />
                        ) : (
                          <Check className="w-3 h-3 opacity-60 inline" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Composer */}
      <ChatInput
        onSendMessage={onSendMessage}
        onSendDocument={onSendDocument}
        placeholder={`Message ${recipientName}...`}
      />
    </div>
  );
};

export default ChatWindow;
