import React, { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const TripFiltersBar = ({
  filters,
  onChange,
  onReset,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortOptions = [
    { value: '-created_at', label: 'Recently Created' },
    { value: 'created_at', label: 'Oldest Created' },
    { value: 'start_date', label: 'Start Date (Earliest)' },
    { value: '-start_date', label: 'Start Date (Latest)' },
    { value: 'title', label: 'Title (A–Z)' },
    { value: '-title', label: 'Title (Z–A)' },
  ];

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.start_date_after ||
      filters.end_date_before ||
      (filters.ordering && filters.ordering !== '-created_at')
  );

  return (
    <div className="bg-white border border-sand-200/90 rounded-2xl p-4 mb-6 shadow-warm-sm space-y-4">
      {/* Primary search & sort row */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="w-full sm:flex-1">
          <Input
            placeholder="Search journeys by title or description..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
            leftIcon={<Search className="w-4 h-4 text-sand-500" />}
            rightIcon={
              filters.search ? (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, search: '', page: 1 })}
                  className="text-sand-400 hover:text-sand-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Sort Select */}
        <div className="w-full sm:w-56 shrink-0">
          <Select
            options={sortOptions}
            value={filters.ordering || '-created_at'}
            onChange={(e) => onChange({ ...filters, ordering: e.target.value, page: 1 })}
          />
        </div>

        {/* Toggle Filters Button */}
        <Button
          type="button"
          variant={isExpanded ? 'secondary' : 'outline'}
          onClick={() => setIsExpanded(!isExpanded)}
          leftIcon={<SlidersHorizontal className="w-4 h-4 text-terracotta-600" />}
          className="w-full sm:w-auto shrink-0"
        >
          <span>Date Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-terracotta-500 ml-1" />
          )}
        </Button>
      </div>

      {/* Collapsible Date Filter Range */}
      {isExpanded && (
        <div className="pt-3 border-t border-sand-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end animate-in fade-in duration-150">
          <div>
            <label className="block text-xs font-medium text-sand-700 mb-1">
              Departing On or After
            </label>
            <Input
              type="date"
              value={filters.start_date_after || ''}
              onChange={(e) =>
                onChange({ ...filters, start_date_after: e.target.value, page: 1 })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-sand-700 mb-1">
              Returning On or Before
            </label>
            <Input
              type="date"
              value={filters.end_date_before || ''}
              onChange={(e) =>
                onChange({ ...filters, end_date_before: e.target.value, page: 1 })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onReset}
                leftIcon={<X className="w-3.5 h-3.5" />}
                className="text-xs text-sand-600 hover:text-sand-900"
              >
                Reset All Filters
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
