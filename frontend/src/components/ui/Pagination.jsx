import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export const Pagination = ({
  currentPage,
  totalCount,
  pageSize = 20,
  onPageChange,
  hasNext,
  hasPrevious,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-sand-200">
      <p className="text-xs sm:text-sm text-sand-600">
        Showing <span className="font-semibold text-sand-800">{startItem}</span> to{' '}
        <span className="font-semibold text-sand-800">{endItem}</span> of{' '}
        <span className="font-semibold text-sand-800">{totalCount}</span> results
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={!hasPrevious || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Previous
        </Button>

        <div className="flex items-center px-3 py-1 text-xs font-semibold text-sand-700 bg-sand-100 rounded-lg border border-sand-200">
          Page {currentPage} of {totalPages}
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={!hasNext || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
