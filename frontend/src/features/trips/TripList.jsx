import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { TripCard } from './TripCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';

export const TripList = ({
  data,
  isLoading,
  filters,
  onPageChange,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            className="bg-white border border-sand-200 rounded-2xl p-6 shadow-warm-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="pt-4 border-t border-sand-100 flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.results.length === 0) {
    const isFiltered = Boolean(
      filters.search || filters.start_date_after || filters.end_date_before
    );

    return (
      <EmptyState
        title={isFiltered ? 'No matching journeys found' : 'No journeys planned yet'}
        description={
          isFiltered
            ? 'Try adjusting your search criteria or date filters to find what you are looking for.'
            : 'Start planning your upcoming travels, adventures, and milestones today.'
        }
        actionLabel={isFiltered ? undefined : 'Plan Your First Journey'}
        onAction={() => navigate('/trips/new')}
        actionIcon={<Plus className="w-4 h-4" />}
      />
    );
  }

  const currentPage = filters.page || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.results.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalCount={data.count}
        pageSize={20}
        hasNext={Boolean(data.next)}
        hasPrevious={Boolean(data.previous)}
        onPageChange={onPageChange}
      />
    </div>
  );
};
