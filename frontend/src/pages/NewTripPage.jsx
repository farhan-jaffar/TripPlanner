import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TripForm } from '../features/trips/TripForm';
import { useCreateTrip } from '../hooks/useTrips';
import { useToast } from '../components/ui/Toast';

export const NewTripPage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateTrip();
  const { showToast } = useToast();

  const handleCreate = async (data) => {
    const newTrip = await createMutation.mutateAsync(data);
    showToast(`"${newTrip.title}" planned successfully!`, 'success');
    navigate(`/trips/${newTrip.id}`);
  };

  return (
    <TripForm
      onSubmit={handleCreate}
      isSubmitting={createMutation.isPending}
      submitButtonText="Create Journey"
      title="Plan a New Journey"
      subtitle="Define your travel dates and theme to begin mapping out stops."
    />
  );
};
