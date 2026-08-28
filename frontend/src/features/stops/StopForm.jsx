import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, ArrowLeft, Save, Info } from 'lucide-react';
import { createStopSchema } from '../../schemas/stopSchema';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { parseApiError, applyApiFieldErrors } from '../../utils/errors';
import { formatDateRange } from '../../utils/dates';

export const StopForm = ({
  trip,
  initialData,
  onSubmit,
  isSubmitting = false,
  submitButtonText = 'Save Stop',
  title = 'Add Itinerary Stop',
  subtitle = 'Add a city, landmark, hotel, or activity to your journey.',
}) => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const schema = createStopSchema(trip.start_date, trip.end_date);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name || '',
      location: initialData?.location || '',
      description: initialData?.description || '',
      order: initialData?.order !== undefined ? initialData.order : '',
      arrival_date: initialData?.arrival_date || '',
      departure_date: initialData?.departure_date || '',
    },
  });

  const handleFormSubmit = async (data) => {
    setServerError(null);
    try {
      const payload = {
        name: data.name,
        location: data.location,
        description: data.description,
        order: data.order !== '' && data.order !== undefined ? Number(data.order) : undefined,
        arrival_date: data.arrival_date ? data.arrival_date : null,
        departure_date: data.departure_date ? data.departure_date : null,
      };
      await onSubmit(payload);
    } catch (err) {
      const parsed = parseApiError(err);
      setServerError(parsed.message);
      if (Object.keys(parsed.fieldErrors).length > 0) {
        applyApiFieldErrors(parsed.fieldErrors, setError);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(`/trips/${trip.id}`)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sand-600 hover:text-sand-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to {trip.title}</span>
      </button>

      {/* Header */}
      <div className="bg-white border border-sand-200 rounded-3xl p-6 sm:p-8 shadow-warm-sm mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-terracotta-100 border border-terracotta-200 flex items-center justify-center text-terracotta-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-sand-950">{title}</h1>
            <p className="text-xs sm:text-sm text-sand-600 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Parent trip date boundary hint */}
        <div className="bg-sand-100/70 border border-sand-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-sand-700 mt-4">
          <Info className="w-4 h-4 text-terracotta-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-sand-900">Trip Date Window: </span>
            <span>{formatDateRange(trip.start_date, trip.end_date)} ({trip.start_date} to {trip.end_date})</span>
            <p className="text-sand-500 mt-0.5">
              Stop arrival and departure dates must fall within this window.
            </p>
          </div>
        </div>

        {serverError && (
          <div className="mt-4">
            <ErrorBanner message={serverError} />
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-6 mt-6">
          {/* Name */}
          <Input
            label="Stop Name"
            placeholder="e.g. Fushimi Inari Shrine, Hotel Granvia, Central Park"
            required
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Location */}
          <Input
            label="Location / Address"
            placeholder="e.g. Kyoto, Japan or 123 Alpine Way, Zermatt"
            required
            error={errors.location?.message}
            leftIcon={<MapPin className="w-4 h-4 text-terracotta-600" />}
            {...register('location')}
          />

          {/* Description */}
          <Textarea
            label="Notes & Activities"
            placeholder="Key highlights, reservations, confirmation codes, or travel tips..."
            rows={3}
            error={errors.description?.message}
            {...register('description')}
          />

          {/* Dates & Order Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <Input
                label="Arrival Date (Optional)"
                type="date"
                error={errors.arrival_date?.message}
                leftIcon={<Calendar className="w-4 h-4 text-terracotta-600" />}
                {...register('arrival_date')}
              />
            </div>

            <div>
              <Input
                label="Departure Date (Optional)"
                type="date"
                error={errors.departure_date?.message}
                leftIcon={<Calendar className="w-4 h-4 text-terracotta-600" />}
                {...register('departure_date')}
              />
            </div>
          </div>

          {/* Optional Order Override */}
          <div className="pt-1">
            <Input
              label="Itinerary Order (Optional)"
              type="number"
              min="0"
              placeholder="Leave blank to automatically append to end of list"
              helperText="Stops are ordered chronologically starting from 0."
              error={errors.order?.message}
              {...register('order')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-sand-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/trips/${trip.id}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {submitButtonText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
