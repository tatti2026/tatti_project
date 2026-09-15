import React from 'react';
import { Search, RotateCcw, Download, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ReportFilterValues {
  search: string;
  assessmentStatus: string;
  applicationStatus: string;
  paymentStatus: string;
  fromDate: string;
  toDate: string;
}

interface ReportFiltersProps {
  filters: ReportFilterValues;
  onChange: (filters: ReportFilterValues) => void;
  onReset: () => void;
  onExport: () => void;
  exporting?: boolean;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onChange,
  onReset,
  onExport,
  exporting = false,
}) => {
  const updateField = (field: keyof ReportFilterValues, val: string) => {
    onChange({ ...filters, [field]: val });
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-border space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={e => updateField('search', e.target.value)}
            placeholder="Search by student name, email, roll number..."
            className="w-full bg-input/70 border border-border rounded-xl pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Action Buttons: Reset & Export CSV */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="text-xs h-9"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onExport}
            disabled={exporting}
            className="gradient-bg border-0 text-white font-semibold text-xs h-9 px-4 shadow-sm hover:opacity-95"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Select Filters Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1 text-xs">
        {/* Assessment Status */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
            Assessment
          </label>
          <select
            value={filters.assessmentStatus}
            onChange={e => updateField('assessmentStatus', e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="all">All Assessments</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="not_started">Not Started</option>
          </select>
        </div>

        {/* Application Status */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
            Application
          </label>
          <select
            value={filters.applicationStatus}
            onChange={e => updateField('applicationStatus', e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="all">All Applications</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In Progress</option>
            <option value="not_started">Not Started</option>
          </select>
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
            Payment
          </label>
          <select
            value={filters.paymentStatus}
            onChange={e => updateField('paymentStatus', e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* From Date */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> From Date
          </label>
          <input
            type="date"
            value={filters.fromDate}
            onChange={e => updateField('fromDate', e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> To Date
          </label>
          <input
            type="date"
            value={filters.toDate}
            onChange={e => updateField('toDate', e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
};

export default ReportFilters;
