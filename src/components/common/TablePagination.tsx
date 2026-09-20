import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemName?: string;
  loading?: boolean;
}

export function getSessionPageSize(key: string, defaultValue = 10): number {
  try {
    const raw = sessionStorage.getItem(`tatti_page_size_${key}`);
    if (raw) {
      const parsed = Number.parseInt(raw, 10);
      if ([5, 10, 15].includes(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage access issues in non-browser/test environments.
  }

  return defaultValue;
}

export function setSessionPageSize(key: string, size: number): void {
  try {
    sessionStorage.setItem(`tatti_page_size_${key}`, String(size));
  } catch {
    // Ignore storage access issues in non-browser/test environments.
  }
}

export function getDisplayRange(currentPage: number, pageSize: number, totalItems: number) {
  const safePage = Math.max(1, currentPage);
  const safePageSize = Math.max(1, pageSize);
  const total = Math.max(0, totalItems);

  if (total === 0) {
    return { start: 0, end: 0, total };
  }

  const start = (safePage - 1) * safePageSize + 1;
  const end = Math.min(safePage * safePageSize, total);

  return { start, end, total };
}

export function generatePageNumbers(currentPage: number, totalPages: number): number[] {
  const safeTotalPages = Math.max(1, totalPages);
  if (safeTotalPages <= 3) {
    return Array.from({ length: safeTotalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 1) {
    return [1, 2, 3];
  }

  return Array.from({ length: safeTotalPages }, (_, index) => index + 1);
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
  if (totalItems <= 0) {
    return null;
  }

  const effectiveTotalPages = Math.max(1, totalPages);
  const { start, end } = getDisplayRange(currentPage, pageSize, totalItems);
  let pages: Array<number | string> = generatePageNumbers(currentPage, effectiveTotalPages).map(Number);

  if (pages.length > 0 && effectiveTotalPages > pages.length) {
    pages = Array.from({ length: effectiveTotalPages }, (_, index) => index + 1);
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card/60 text-xs text-muted-foreground select-none">
      <div className="text-xs font-normal">
        Showing <span className="font-semibold text-foreground">{start}</span>–
        <span className="font-semibold text-foreground">{end}</span> of{' '}
        <span className="font-semibold text-foreground">{totalItems}</span> {itemName}
      </div>

      <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-4 w-full md:w-auto">
        <div className="flex items-center gap-2">
          <span className="text-xs whitespace-nowrap text-muted-foreground">Rows per page:</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={event => {
                const nextSize = Number(event.target.value);
                onPageSizeChange(nextSize);
              }}
              disabled={loading}
              className="h-8 rounded-lg bg-background border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50 transition-colors"
              aria-label="Rows per page"
            >
              {pageSizeOptions.map(option => (
                <option key={option} value={option} className="bg-card text-foreground">
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

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
            {pages.map((page, index) => {
              const isCurrent = Number(page) === currentPage;
              return (
                <button
                  key={`${page}-${index}`}
                  type="button"
                  onClick={() => onPageChange(Number(page))}
                  disabled={loading}
                  className={`w-7 sm:w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'gradient-bg text-white shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {page}
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
