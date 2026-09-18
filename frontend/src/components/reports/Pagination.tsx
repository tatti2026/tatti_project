import React from 'react';
import TablePagination, { TablePaginationProps } from '@/components/common/TablePagination';

export interface PaginationProps extends Partial<TablePaginationProps> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  loading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange = () => {},
  pageSizeOptions = [5, 10, 15],
  itemName = 'students',
  loading = false,
}) => {
  return (
    <TablePagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      pageSize={pageSize}
      pageSizeOptions={pageSizeOptions}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      itemName={itemName}
      loading={loading}
    />
  );
};

export default Pagination;
