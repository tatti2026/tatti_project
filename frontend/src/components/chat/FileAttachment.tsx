import React from 'react';
import { Download, FileText, FileSpreadsheet, Presentation, FileCode, File } from 'lucide-react';

export interface FileAttachmentProps {
  fileName: string;
  fileSize: number | string; // bytes or preformatted string
  fileType?: string;
  fileUrl?: string;
  isSender?: boolean;
}

export function formatBytes(bytes: number | string): string {
  if (typeof bytes === 'string') return bytes;
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileTypeInfo(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') {
    return {
      ext: 'PDF',
      icon: FileText,
      badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      iconBg: 'bg-rose-500/20 text-rose-400',
    };
  }
  if (['doc', 'docx'].includes(ext)) {
    return {
      ext: 'DOC',
      icon: FileText,
      badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      iconBg: 'bg-blue-500/20 text-blue-400',
    };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return {
      ext: 'XLS',
      icon: FileSpreadsheet,
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
    };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return {
      ext: 'PPT',
      icon: Presentation,
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      iconBg: 'bg-amber-500/20 text-amber-400',
    };
  }
  if (['txt', 'rtf'].includes(ext)) {
    return {
      ext: 'TXT',
      icon: FileCode,
      badgeColor: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      iconBg: 'bg-slate-500/20 text-slate-300',
    };
  }
  return {
    ext: ext.toUpperCase() || 'FILE',
    icon: File,
    badgeColor: 'bg-primary/15 text-primary border-primary/30',
    iconBg: 'bg-primary/20 text-primary',
  };
}

export const FileAttachment: React.FC<FileAttachmentProps> = ({
  fileName,
  fileSize,
  fileUrl,
  isSender = false,
}) => {
  const fileInfo = getFileTypeInfo(fileName);
  const Icon = fileInfo.icon;
  const displaySize = typeof fileSize === 'number' ? formatBytes(fileSize) : fileSize;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileUrl) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Fallback data simulation
      const blob = new Blob([`Document Content for: ${fileName}\nTATTI College Connect ERP`], {
        type: 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
        isSender
          ? 'bg-black/15 border-white/15 hover:bg-black/25 text-white'
          : 'bg-background/70 border-border/80 hover:bg-muted/60 text-foreground'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${fileInfo.badgeColor}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate leading-tight">{fileName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-[9px] font-bold px-1 rounded uppercase tracking-wider ${fileInfo.badgeColor}`}
            >
              {fileInfo.ext}
            </span>
            <span className="text-[10px] opacity-75 font-mono">{displaySize}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        title={`Download ${fileName}`}
        className={`p-2 rounded-lg transition-all shrink-0 flex items-center gap-1 text-xs font-medium ${
          isSender
            ? 'bg-white/15 hover:bg-white/25 text-white'
            : 'bg-primary/10 hover:bg-primary/20 text-primary'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-[11px]">Download</span>
      </button>
    </div>
  );
};

export default FileAttachment;
