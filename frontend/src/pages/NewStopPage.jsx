import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrip } from '../hooks/useTrips';
import { useCreateStop } from '../hooks/useStops';
import { StopForm } from '../features/stops/StopForm';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { useToast } from '../components/ui/Toast';

export const NewStopPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { data: trip, isLoading, error, refetch } = useTrip(tripId);
  const createStopMutation = useCreateStop(tripId || '');
  const { showToast } = useToast();

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="bg-white border border-sand-200 rounded-3xl p-8 space-y-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-2xl mx-auto">
        <ErrorBanner
          title="Trip Not Found"
          message={error?.message || 'Cannot add a stop to a nonexistent trip.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const handleCreate = async (data) => {
    await createStopMutation.mutateAsync(data);
    showToast(`"${data.name}" added to itinerary!`, 'success');
    navigate(`/trips/${trip.id}`);
  };

  return (
    <StopForm
      trip={trip}
      onSubmit={handleCreate}
      isSubmitting={createStopMutation.isPending}
      submitButtonText="Add Stop to Itinerary"
      title={`Add Stop to ${trip.title}`}
      subtitle="Fill in the location, dates, and activity notes for this destination."
    />
  );
};
