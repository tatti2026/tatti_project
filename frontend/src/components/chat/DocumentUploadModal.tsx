import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UploadCloud, X, AlertCircle, CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { getFileTypeInfo, formatBytes } from './FileAttachment';

export interface UploadedFileData {
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (fileData: UploadedFileData) => void;
}

const SUPPORTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  open,
  onClose,
  onUpload,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setError(null);
    setUploading(false);
    setProgress(0);
    setDragOver(false);
  };

  const handleClose = () => {
    if (!uploading) {
      resetState();
      onClose();
    }
  };

  const validateFile = (file: File): boolean => {
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported format ".${ext}". Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT`);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size (${formatBytes(file.size)}) exceeds the 10 MB limit.`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!uploading) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const startUpload = () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(10);

    const stepInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(stepInterval);
          return 95;
        }
        return prev + Math.floor(Math.random() * 15) + 10;
      });
    }, 120);

    setTimeout(() => {
      clearInterval(stepInterval);
      setProgress(100);

      // Create an object URL or simulated storage URL
      const fileUrl = URL.createObjectURL(selectedFile);

      setTimeout(() => {
        onUpload({
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type || selectedFile.name.split('.').pop() || 'document',
          url: fileUrl,
        });
        resetState();
        onClose();
      }, 400);
    }, 900);
  };

  const fileInfo = selectedFile ? getFileTypeInfo(selectedFile.name) : null;
  const FileIcon = fileInfo?.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl rounded-2xl p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <FileUp className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">Upload Document</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Share study material, assignments, or documents with instant preview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = '';
            }}
          />

          {/* Drag & Drop Area */}
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                dragOver
                  ? 'border-primary bg-primary/10 scale-[0.99]'
                  : 'border-border/80 hover:border-primary/50 hover:bg-muted/30 bg-muted/10'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-bounce-subtle">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Click to choose file or drag & drop here
                </p>
                <p className="text-[11px] text-muted-foreground">
                  PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (Max: 10 MB)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-medium mt-1 pointer-events-none"
              >
                Choose File
              </Button>
            </div>
          ) : (
            /* Selected File Preview */
            <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {FileIcon && (
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${fileInfo?.badgeColor}`}
                    >
                      <FileIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate text-foreground">
                      {selectedFile.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatBytes(selectedFile.size)}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-primary/10 text-primary">
                        {fileInfo?.ext}
                      </span>
                    </div>
                  </div>
                </div>

                {!uploading && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="w-7 h-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      {progress < 100 ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Ready!
                        </>
                      )}
                    </span>
                    <span className="font-mono font-medium">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-200 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-2.5 rounded-lg text-xs border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={uploading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={startUpload}
              disabled={!selectedFile || uploading}
              className="gradient-bg text-white text-xs font-semibold shadow-md px-5 hover:opacity-95"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Document'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUploadModal;
