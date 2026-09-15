import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ReportSummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: string; // 'primary' | 'emerald' | 'amber' | 'blue' | 'purple'
  badge?: string;
}

export const ReportSummaryCard: React.FC<ReportSummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  badge,
}) => {
  let colorStyles = {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20',
  };

  if (color === 'emerald') {
    colorStyles = {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
    };
  } else if (color === 'amber') {
    colorStyles = {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
    };
  } else if (color === 'blue') {
    colorStyles = {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
    };
  } else if (color === 'purple') {
    colorStyles = {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
    };
  }

  return (
    <div className="glass-card rounded-2xl p-4 border border-border flex flex-col justify-between shadow-sm hover:border-primary/40 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="space-y-0.5 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </p>
          <h3 className="text-2xl font-black text-foreground tracking-tight">{value}</h3>
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${colorStyles.bg} ${colorStyles.text} ${colorStyles.border}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/50 text-muted-foreground">
        <span>{subtitle || 'Updated live'}</span>
        {badge && (
          <span
            className={`font-semibold px-1.5 py-0.2 rounded-full border text-[10px] ${colorStyles.bg} ${colorStyles.text} ${colorStyles.border}`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
};

export default ReportSummaryCard;
