import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Flag, Navigation } from 'lucide-react';
import { StopCard } from './StopCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export const StopTimeline = ({
  stops,
  trip,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-sand-200/70 h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (stops.length === 0) {
    return (
      <EmptyState
        title="No stops added yet"
        description="Build your itinerary by adding destinations, activities, and checkpoints along the way."
        actionLabel="Add First Stop"
        onAction={() => navigate(`/trips/${trip.id}/stops/new`)}
        actionIcon={<Plus className="w-4 h-4" />}
      />
    );
  }


  const sortedStops = [...stops].sort((a, b) => a.order - b.order || a.id - b.id);

  return (
    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-terracotta-500 before:via-sand-300 before:to-sage-500">
      {/* Starting point badge */}
      <div className="relative flex items-center gap-2 -ml-6 sm:-ml-8 mb-2">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-terracotta-600 border-2 border-white flex items-center justify-center text-white shadow-warm-sm shrink-0">
          <Navigation className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-terracotta-800">
          Journey Begins • {trip.start_date}
        </span>
      </div>

      {/* Stop nodes list */}
      {sortedStops.map((stop) => (
        <div key={stop.id} className="relative group">
          <div className="absolute -left-[30px] sm:-left-[39px] top-6 w-5 h-5 rounded-full bg-white border-2 border-terracotta-600 flex items-center justify-center text-terracotta-700 shadow-warm-sm group-hover:scale-110 group-hover:bg-terracotta-50 transition-transform">
            <div className="w-2 h-2 rounded-full bg-terracotta-600" />
          </div>

          <StopCard stop={stop} trip={trip} />
        </div>
      ))}

      {/* Journey End badge */}
      <div className="relative flex items-center justify-between gap-2 -ml-6 sm:-ml-8 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-sage-600 border-2 border-white flex items-center justify-center text-white shadow-warm-sm shrink-0">
            <Flag className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-sand-700">
            Journey Concludes • {trip.end_date}
          </span>
        </div>

        <Link to={`/trips/${trip.id}/stops/new`}>
          <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Add Another Stop
          </Button>
        </Link>
      </div>
    </div>
  );
};
