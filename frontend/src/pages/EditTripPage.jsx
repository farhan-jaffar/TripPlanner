import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TripForm } from '../features/trips/TripForm';
import { useTrip, useUpdateTrip } from '../hooks/useTrips';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';

export const EditTripPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { data: trip, isLoading, error, refetch } = useTrip(tripId);
  const updateMutation = useUpdateTrip(tripId || '');
  const { showToast } = useToast();

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="bg-white border border-sand-200 rounded-3xl p-8 space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-2xl mx-auto">
        <ErrorBanner
          title="Could not load trip details"
          message={error?.message || 'Trip not found.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const handleUpdate = async (data) => {
    await updateMutation.mutateAsync(data);
    showToast('Journey details updated!', 'success');
    navigate(`/trips/${trip.id}`);
  };

  return (
    <TripForm
      initialData={trip}
      onSubmit={handleUpdate}
      isSubmitting={updateMutation.isPending}
      submitButtonText="Save Changes"
      title="Edit Journey"
      subtitle="Modify your trip title, description, or dates."
    />
  );
};
