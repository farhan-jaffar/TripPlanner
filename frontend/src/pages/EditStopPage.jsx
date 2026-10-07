import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrip } from '../hooks/useTrips';
import { useStop, useUpdateStop } from '../hooks/useStops';
import { StopForm } from '../features/stops/StopForm';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { useToast } from '../components/ui/Toast';

export const EditStopPage = () => {
  const { tripId, stopId } = useParams();
  const navigate = useNavigate();

  const { data: trip, isLoading: isTripLoading, error: tripError, refetch: refetchTrip } = useTrip(tripId);
  const { data: stop, isLoading: isStopLoading, error: stopError, refetch: refetchStop } = useStop(
    tripId,
    stopId
  );
  const updateStopMutation = useUpdateStop(tripId || '', stopId || '');
  const { showToast } = useToast();

  if (isTripLoading || isStopLoading) {
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

  if (tripError || !trip || stopError || !stop) {
    return (
      <div className="max-w-2xl mx-auto">
        <ErrorBanner
          title="Stop Not Found"
          message={stopError?.message || tripError?.message || 'Could not locate this itinerary stop.'}
          onRetry={() => {
            refetchTrip();
            refetchStop();
          }}
        />
      </div>
    );
  }

  const handleUpdate = async (data) => {
    await updateStopMutation.mutateAsync(data);
    showToast('Itinerary stop updated!', 'success');
    navigate(`/trips/${trip.id}`);
  };

  return (
    <StopForm
      trip={trip}
      initialData={stop}
      onSubmit={handleUpdate}
      isSubmitting={updateStopMutation.isPending}
      submitButtonText="Save Changes"
      title="Edit Itinerary Stop"
      subtitle={`Updating ${stop.name} in ${trip.title}`}
    />
  );
};
