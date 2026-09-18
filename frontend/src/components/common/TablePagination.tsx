import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TablePaginationProps {
  currentPage: number; // 1-indexed
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemName?: string;
  loading?: boolean;
}

// Session persistence helpers
export function getSessionPageSize(key: string, defaultValue = 10): number {
  try {
    const val = sessionStorage.getItem(`tatti_page_size_${key}`);
    if (val) {
      const parsed = parseInt(val, 10);
      if ([5, 10, 15].includes(parsed)) return parsed;
    }
  } catch {}
  return defaultValue;
}

export function setSessionPageSize(key: string, size: number): void {
  try {
    sessionStorage.setItem(`tatti_page_size_${key}`, size.toString());
  } catch {}
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [5, 10, 15],
  onPageChange,
  onPageSizeChange,
  itemName = 'records',
  loading = false,
}) => {
  // If there are zero items, hide pagination or render nothing according to prompt spec
  if (totalItems <= 0) {
    return null;
  }

  const effectiveTotalPages = Math.max(1, totalPages);
  const startIdx = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const pages: (number | string)[] = [];
  for (let i = 1; i <= effectiveTotalPages; i++) {
    if (
      i === 1 ||
      i === effectiveTotalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card/60 text-xs text-muted-foreground select-none">
      {/* Showing X–Y of Z */}
      <div className="text-xs font-normal">
        Showing <span className="font-semibold text-foreground">{startIdx}</span>–
        <span className="font-semibold text-foreground">{endIdx}</span> of{' '}
        <span className="font-semibold text-foreground">{totalItems}</span> {itemName}
      </div>

      <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4 w-full md:w-auto">
        {/* Rows per page selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs whitespace-nowrap text-muted-foreground">Rows per page:</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
              }}
              disabled={loading}
              className="h-8 rounded-lg bg-background border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50 transition-colors"
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-card text-foreground">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Previous / Page numbers / Next */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="h-8 px-2.5 text-xs font-medium border-border hover:bg-muted/80 disabled:opacity-40"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-1 mx-0.5">
            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-1.5 py-1 text-muted-foreground text-xs">
                    ...
                  </span>
                );
              }
              const isCurrent = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p as number)}
                  disabled={loading}
                  className={`w-7 sm:w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'gradient-bg text-white shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= effectiveTotalPages || loading}
            className="h-8 px-2.5 text-xs font-medium border-border hover:bg-muted/80 disabled:opacity-40"
            title="Next page"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TablePagination;
