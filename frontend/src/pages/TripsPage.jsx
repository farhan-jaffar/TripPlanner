import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTrips } from '../hooks/useTrips';
import { TripList } from '../features/trips/TripList';
import { TripFiltersBar } from '../features/trips/TripFiltersBar';
import { TripStats } from '../features/trips/TripStats';
import { ErrorBanner } from '../components/ui/ErrorBanner';

export const TripsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    search: searchParams.get('search') || undefined,
    start_date_after: searchParams.get('start_date_after') || undefined,
    end_date_before: searchParams.get('end_date_before') || undefined,
    ordering: searchParams.get('ordering') || '-created_at',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
  };

  const { data, isLoading, error, refetch } = useTrips(filters);

  const handleFilterChange = (newFilters) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.start_date_after) params.set('start_date_after', newFilters.start_date_after);
    if (newFilters.end_date_before) params.set('end_date_before', newFilters.end_date_before);
    if (newFilters.ordering && newFilters.ordering !== '-created_at') {
      params.set('ordering', newFilters.ordering);
    }
    if (newFilters.page && newFilters.page > 1) {
      params.set('page', newFilters.page.toString());
    }
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (page) => {
    handleFilterChange({ ...filters, page });
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-sand-950 tracking-tight">
            My Travel Itineraries
          </h1>
          <p className="text-sm text-sand-600 mt-1">
            Organize personal destinations, plan schedules, and track every stop along the way.
          </p>
        </div>
      </div>


      {/* Summary Statistics */}
      {data && data.results.length > 0 && (
        <TripStats trips={data.results} totalCount={data.count} />
      )}

      {/* Error state if request fails */}
      {error && (
        <ErrorBanner
          title="Could not load your trips"
          message={error.message || 'Unable to connect to the backend server.'}
          onRetry={() => refetch()}
        />
      )}

      {/* Filter and Search Bar */}
      <TripFiltersBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Trip Grid or Skeleton/Empty State */}
      <TripList
        data={data}
        isLoading={isLoading}
        filters={filters}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
