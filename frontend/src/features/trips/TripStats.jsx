import React from 'react';
import { Compass, MapPin, CalendarClock, CheckCircle } from 'lucide-react';
import { getTripStatus } from '../../utils/dates';

export const TripStats = ({ trips, totalCount }) => {
  const upcomingCount = trips.filter(
    (t) => getTripStatus(t.start_date, t.end_date) === 'upcoming'
  ).length;

  const ongoingCount = trips.filter(
    (t) => getTripStatus(t.start_date, t.end_date) === 'ongoing'
  ).length;

  const totalStops = trips.reduce((sum, t) => sum + (t.stop_count || 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
      {/* Total Trips */}
      <div className="bg-white border border-sand-200/80 rounded-2xl p-4 sm:p-5 shadow-warm-sm flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-terracotta-100/70 border border-terracotta-200/60 flex items-center justify-center text-terracotta-700 shrink-0">
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <span className="text-2xl font-bold font-serif text-sand-900 block leading-tight">
            {totalCount}
          </span>
          <span className="text-xs font-medium text-sand-600">Total Journeys</span>
        </div>
      </div>

      {/* Ongoing / Active */}
      <div className="bg-white border border-sand-200/80 rounded-2xl p-4 sm:p-5 shadow-warm-sm flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-terracotta-500/10 border border-terracotta-300/40 flex items-center justify-center text-terracotta-600 shrink-0">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div>
          <span className="text-2xl font-bold font-serif text-sand-900 block leading-tight">
            {ongoingCount}
          </span>
          <span className="text-xs font-medium text-sand-600">In Progress</span>
        </div>
      </div>

      {/* Upcoming */}
      <div className="bg-white border border-sand-200/80 rounded-2xl p-4 sm:p-5 shadow-warm-sm flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-sand-100 border border-sand-200 flex items-center justify-center text-sand-700 shrink-0">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div>
          <span className="text-2xl font-bold font-serif text-sand-900 block leading-tight">
            {upcomingCount}
          </span>
          <span className="text-xs font-medium text-sand-600">Upcoming Trips</span>
        </div>
      </div>

      {/* Total Stops Planned */}
      <div className="bg-white border border-sand-200/80 rounded-2xl p-4 sm:p-5 shadow-warm-sm flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-sage-100/80 border border-sage-200/60 flex items-center justify-center text-sage-700 shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <span className="text-2xl font-bold font-serif text-sand-900 block leading-tight">
            {totalStops}
          </span>
          <span className="text-xs font-medium text-sand-600">Stops Planned</span>
        </div>
      </div>
    </div>
  );
};
