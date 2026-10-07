import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  Clock,
  Compass,
  Sparkles,
} from 'lucide-react';
import { useTrip, useDeleteTrip } from '../hooks/useTrips';
import { useStops } from '../hooks/useStops';
import { StopTimeline } from '../features/stops/StopTimeline';
import { AICopilotDrawer } from '../features/copilot/AICopilotDrawer';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { formatDateRange, getTripDurationInDays, getTripStatus } from '../utils/dates';
import { useToast } from '../components/ui/Toast';

export const TripDetailPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);


  const { data: trip, isLoading: isTripLoading, error: tripError, refetch: refetchTrip } = useTrip(tripId);
  const {
    data: stopsData,
    isLoading: isStopsLoading,
    error: stopsError,
    refetch: refetchStops,
  } = useStops(tripId);

  const deleteTripMutation = useDeleteTrip();
  const { showToast } = useToast();

  if (isTripLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="bg-white border border-sand-200 rounded-3xl p-8 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="space-y-4 pt-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (tripError || !trip) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sand-600 hover:text-sand-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to journeys</span>
        </button>
        <ErrorBanner
          title="Trip Not Found"
          message={tripError?.message || 'Could not locate this journey.'}
          onRetry={() => refetchTrip()}
        />
      </div>
    );
  }

  const duration = getTripDurationInDays(trip.start_date, trip.end_date);
  const status = getTripStatus(trip.start_date, trip.end_date);

  const statusBadge = {
    upcoming: <Badge variant="sand">Upcoming</Badge>,
    ongoing: <Badge variant="terracotta">In Progress</Badge>,
    completed: <Badge variant="sage">Completed</Badge>,
  }[status];

  const handleDeleteTrip = async () => {
    try {
      await deleteTripMutation.mutateAsync(trip.id);
      showToast('Trip deleted successfully', 'success');
      navigate('/');
    } catch {
      showToast('Failed to delete trip', 'error');
    }
  };

  const stops = stopsData?.results || [];

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sand-600 hover:text-sand-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Journeys</span>
        </button>

        <div className="flex items-center gap-2">
          <Link to={`/trips/${trip.id}/edit`}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5 text-sand-600" />}
            >
              Edit Journey
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-red-600 hover:bg-red-50"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Main Trip Hero Banner */}
      <div className="bg-white border border-sand-200/90 rounded-3xl p-6 sm:p-8 shadow-warm-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {statusBadge}
            <span className="text-xs text-sand-500 flex items-center gap-1 bg-sand-100 px-2.5 py-1 rounded-full border border-sand-200">
              <Clock className="w-3.5 h-3.5 text-sand-600" />
              {duration} {duration === 1 ? 'Day' : 'Days'} Duration
            </span>
            <span className="text-xs text-sand-500 flex items-center gap-1 bg-sand-100 px-2.5 py-1 rounded-full border border-sand-200">
              <MapPin className="w-3.5 h-3.5 text-terracotta-600" />
              {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'}
            </span>
          </div>

          {/* Quick Date Display */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-sand-800 bg-sand-50 border border-sand-200 px-3.5 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-terracotta-600 shrink-0" />
            <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-bold font-serif text-sand-950 mb-3 tracking-tight">
          {trip.title}
        </h1>

        {/* Description */}
        {trip.description && (
          <p className="text-sm sm:text-base text-sand-700 leading-relaxed max-w-3xl">
            {trip.description}
          </p>
        )}
      </div>

      {/* Itinerary / Stops Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-sand-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-terracotta-100 flex items-center justify-center text-terracotta-700">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-sand-900">
                Itinerary Timeline
              </h2>
              <p className="text-xs text-sand-600">
                Sequential stops, sights, and destinations for this journey.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCopilotOpen(true)}
              leftIcon={<Sparkles className="w-4 h-4 text-terracotta-600" />}
              className="border-terracotta-400 bg-terracotta-50/70 text-terracotta-900 hover:bg-terracotta-100 font-semibold shadow-warm-xs"
            >
              AI Copilot (MCP)
            </Button>
            <Link to={`/trips/${trip.id}/stops/new`}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Itinerary Stop
              </Button>
            </Link>
          </div>
        </div>

        {stopsError && (
          <ErrorBanner
            title="Could not load itinerary stops"
            message={stopsError.message}
            onRetry={() => refetchStops()}
          />
        )}

        <StopTimeline
          stops={stops}
          trip={trip}
          isLoading={isStopsLoading}
        />
      </div>

      {/* AI Copilot MCP Drawer */}
      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        trip={trip}
      />

      {/* Delete Trip Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Journey"
        description={`Are you sure you want to delete "${trip.title}"? This action cannot be undone.`}
        maxWidth="sm"
      >
        <div className="flex items-center justify-end gap-2.5 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={deleteTripMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteTrip}
            isLoading={deleteTripMutation.isPending}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Journey
          </Button>
        </div>
      </Modal>
    </div>
  );
};

