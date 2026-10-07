import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Calendar, Compass, ArrowLeft, Save } from 'lucide-react';
import { tripSchema } from '../../schemas/tripSchema';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { parseApiError, applyApiFieldErrors } from '../../utils/errors';
import { getTripDurationInDays } from '../../utils/dates';

export const TripForm = ({
  initialData,
  onSubmit,
  isSubmitting = false,
  submitButtonText = 'Save Journey',
  title = 'Plan a New Journey',
  subtitle = 'Set the dates and details for your upcoming travel adventure.',
}) => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      start_date: initialData?.start_date || '',
      end_date: initialData?.end_date || '',
    },
  });

  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const duration =
    startDate && endDate && endDate >= startDate
      ? getTripDurationInDays(startDate, endDate)
      : null;

  const handleFormSubmit = async (data) => {
    setServerError(null);
    try {
      await onSubmit(data);
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
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sand-600 hover:text-sand-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to journeys</span>
      </button>

      {/* Header */}
      <div className="bg-white border border-sand-200 rounded-3xl p-6 sm:p-8 shadow-warm-sm mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-terracotta-100 border border-terracotta-200 flex items-center justify-center text-terracotta-600">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-sand-950">{title}</h1>
            <p className="text-xs sm:text-sm text-sand-600 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {serverError && (
          <div className="mt-4">
            <ErrorBanner message={serverError} />
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-6 mt-6">
          {/* Title */}
          <Input
            label="Trip Title"
            placeholder="e.g. Kyoto Autumn Exploration, Swiss Alps Trek"
            required
            error={errors.title?.message}
            {...register('title')}
          />

          {/* Description */}
          <Textarea
            label="Description & Notes"
            placeholder="What is the purpose or theme of this trip? Any special goals or companions?"
            rows={4}
            error={errors.description?.message}
            {...register('description')}
          />

          {/* Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <Input
                label="Start Date"
                type="date"
                required
                error={errors.start_date?.message}
                leftIcon={<Calendar className="w-4 h-4 text-terracotta-600" />}
                {...register('start_date')}
              />
            </div>

            <div>
              <Input
                label="End Date"
                type="date"
                required
                error={errors.end_date?.message}
                leftIcon={<Calendar className="w-4 h-4 text-terracotta-600" />}
                {...register('end_date')}
              />
            </div>
          </div>

          {/* Dynamic duration preview */}
          {duration !== null && (
            <div className="bg-sand-100/70 border border-sand-200 rounded-2xl p-4 flex items-center justify-between text-xs sm:text-sm">
              <span className="font-medium text-sand-700">Calculated Trip Duration</span>
              <span className="font-bold text-terracotta-700 bg-white px-3 py-1 rounded-full border border-sand-200 shadow-warm-sm">
                {duration} {duration === 1 ? 'day' : 'days'}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-sand-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
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
