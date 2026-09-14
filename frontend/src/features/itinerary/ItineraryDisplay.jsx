import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Compass,
  CloudSun,
  MapPin,
  Check,
  RotateCcw,
  Footprints,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Car,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { acceptItinerary } from '../../api/itinerary';

/**
 * Groups itinerary days by city, producing sections like:
 * [{ city: "Paris", days: [...] }, { city: "Lyon", days: [...] }]
 */
function groupDaysByCity(days) {
  if (!days || days.length === 0) return [];

  const groups = [];
  let current = null;

  for (const day of days) {
    const city = day.city || '';
    if (!current || current.city !== city) {
      current = { city, days: [] };
      groups.push(current);
    }
    current.days.push(day);
  }

  return groups;
}

const TransferStopCard = ({ stop }) => (
  <div className="relative group">
    {/* Timeline dot — distinct style for transfers */}
    <div className="absolute -left-[30px] sm:-left-[39px] top-4 w-4 h-4 rounded-full bg-white border-2 border-sage-500 flex items-center justify-center shadow-warm-sm">
      <Car className="w-2 h-2 text-sage-600" />
    </div>

    <div className="p-4 sm:p-5 rounded-2xl bg-sage-50/70 border border-sage-200 border-dashed">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-sage-100 border border-sage-200 flex items-center justify-center">
          <ArrowRight className="w-4 h-4 text-sage-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-sage-800">{stop.name}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-sage-600">
            {stop.duration_minutes != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {stop.duration_minutes < 60
                  ? `${stop.duration_minutes} min`
                  : `${Math.round(stop.duration_minutes / 60 * 10) / 10} hr`}
              </span>
            )}
            {stop.note && <span>{stop.note}</span>}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase font-bold text-sage-600 border-sage-300">
          Transfer
        </Badge>
      </div>
    </div>
  </div>
);

const VisitStopCard = ({ stop }) => (
  <div className="relative group">
    {/* Timeline dot */}
    <div className="absolute -left-[30px] sm:-left-[39px] top-4 w-4 h-4 rounded-full bg-white border-2 border-terracotta-600 flex items-center justify-center shadow-warm-sm group-hover:scale-110 transition-transform">
      <div className="w-1.5 h-1.5 rounded-full bg-terracotta-600" />
    </div>

    {/* Transition indicator from previous stop if available */}
    {stop.travel_from_previous && (
      <div className="mb-3 -mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-sand-500 bg-sand-50 px-2.5 py-1 rounded-md border border-sand-200">
        <Footprints className="w-3 h-3 text-terracotta-500" />
        <span>{stop.travel_from_previous}</span>
      </div>
    )}

    {/* Stop Card */}
    <div className="p-4 sm:p-5 rounded-2xl bg-sand-50/70 border border-sand-200 hover:bg-white hover:border-sand-300 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {stop.suggested_time && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-terracotta-700">
                <Clock className="w-3 h-3" />
                <span>{stop.suggested_time}</span>
              </span>
            )}
            {stop.category && (
              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                {stop.category}
              </Badge>
            )}
          </div>
          <h3 className="text-base font-bold text-sand-900">{stop.name}</h3>
        </div>

        {stop.latitude != null && stop.longitude != null && (
          <span className="text-[11px] text-sand-600 font-mono flex items-center gap-1 shrink-0">
            <MapPin className="w-3 h-3 text-sand-400" />
            <span>
              {stop.latitude.toFixed(2)}, {stop.longitude.toFixed(2)}
            </span>
          </span>
        )}
      </div>

      {stop.note && (
        <p className="text-xs sm:text-sm text-sand-600 mt-2 leading-relaxed">
          {stop.note}
        </p>
      )}
    </div>
  </div>
);

export const ItineraryDisplay = ({
  itinerary,
  attribution,
  requestParams,
  onReset,
}) => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const isMultiCity = itinerary.cities && itinerary.cities.length > 1;
  const cityGroups = useMemo(() => groupDaysByCity(itinerary.days), [itinerary.days]);

  // Build subtitle
  const subtitle = isMultiCity
    ? `${requestParams.start_date} to ${requestParams.end_date} • ${itinerary.cities.join(', ')}`
    : `${requestParams.start_date} to ${requestParams.end_date} • ${requestParams.city || itinerary.cities?.[0] || requestParams.country}`;

  const handleAccept = async () => {
    setIsSaving(true);
    setSaveError(null);

    // Prepare atomic payload
    const flatStops = [];
    let globalOrder = 0;

    itinerary.days.forEach((day) => {
      day.stops.forEach((stop) => {
        const isTransfer = stop.stop_type === 'transfer';
        flatStops.push({
          name: stop.name,
          description: stop.note
            ? `${stop.suggested_time ? `${stop.suggested_time} — ` : ''}${stop.note}`
            : stop.suggested_time || '',
          location:
            stop.latitude != null && stop.longitude != null
              ? `${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}`
              : '',
          order: globalOrder++,
          arrival_date: day.date,
          departure_date: day.date,
          stop_type: isTransfer ? 'transfer' : 'visit',
          duration_minutes: isTransfer ? stop.duration_minutes : null,
        });
      });
    });

    const tripCity = isMultiCity ? '' : (requestParams.city || itinerary.cities?.[0] || '');
    const tripDesc = isMultiCity
      ? `Curated AI journey across ${itinerary.cities.join(', ')} (${requestParams.country}).`
      : `Curated AI journey to ${tripCity} (${requestParams.country}).`;

    const payload = {
      trip: {
        title: itinerary.trip_title,
        description: tripDesc,
        start_date: requestParams.start_date,
        end_date: requestParams.end_date,
      },
      stops: flatStops,
    };

    try {
      const result = await acceptItinerary(payload);
      navigate(`/trips/${result.trip.id}`);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to save itinerary. Please try again.';
      setSaveError(msg);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner Card */}
      <div className="bg-white border border-sand-200 rounded-3xl p-6 sm:p-8 shadow-warm-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-sand-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-terracotta-50 text-terracotta-700 text-xs font-semibold mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>{isMultiCity ? 'Multi-City AI Itinerary' : 'AI Generated Itinerary'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-sand-950">
              {itinerary.trip_title}
            </h1>
            <p className="text-sm text-sand-600 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sand-400" />
              <span>{subtitle}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={onReset}
              disabled={isSaving}
            >
              Adjust Preferences
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Check className="w-4 h-4" />}
              onClick={handleAccept}
              isLoading={isSaving}
            >
              Accept & Save Journey
            </Button>
          </div>
        </div>

        {saveError && (
          <div className="mt-4">
            <ErrorBanner message={saveError} />
          </div>
        )}

        {itinerary.grounding_notes && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3 text-amber-800 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Grounding Notice:</span>
              <p>{itinerary.grounding_notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Days — grouped by city for multi-city, flat for single-city */}
      <div className="space-y-8">
        {cityGroups.map((group, groupIdx) => (
          <div key={group.city || groupIdx}>
            {/* City section header (only for multi-city) */}
            {isMultiCity && group.city && (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-terracotta-100 border border-terracotta-200 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-terracotta-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-serif text-sand-950">
                    {group.city}
                  </h2>
                  <p className="text-xs text-sand-600">
                    {group.days.length} {group.days.length === 1 ? 'day' : 'days'}
                  </p>
                </div>
                <div className="flex-1 h-px bg-sand-200 ml-2" />
              </div>
            )}

            {/* Days within this city group */}
            <div className="space-y-6">
              {group.days.map((day, dayIdx) => {
                // Compute the overall day index for display
                const overallIdx = itinerary.days.indexOf(day);
                return (
                  <div
                    key={day.date}
                    className="bg-white border border-sand-200 rounded-3xl p-6 sm:p-8 shadow-warm-sm"
                  >
                    {/* Day Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 mb-6 border-b border-sand-150">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sand-100 border border-sand-200 flex items-center justify-center font-serif font-bold text-sand-800 text-sm">
                          {overallIdx + 1}
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-sand-950 font-serif">
                            Day {overallIdx + 1} — {day.date}
                          </h2>
                          {day.route_summary && (
                            <p className="text-xs text-sand-600 flex items-center gap-1.5 mt-0.5">
                              <Footprints className="w-3.5 h-3.5 text-sage-600" />
                              <span>{day.route_summary}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Weather forecast badge */}
                      {day.weather_summary && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sage-50 text-sage-700 text-xs font-medium border border-sage-200 self-start sm:self-auto">
                          <CloudSun className="w-4 h-4 text-sage-600" />
                          <span>{day.weather_summary}</span>
                        </div>
                      )}
                    </div>

                    {/* Stops Timeline */}
                    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-sand-200">
                      {day.stops.map((stop, stopIdx) =>
                        stop.stop_type === 'transfer' ? (
                          <TransferStopCard key={`transfer-${stopIdx}`} stop={stop} />
                        ) : (
                          <VisitStopCard
                            key={stop.geoapify_place_id || `visit-${stopIdx}`}
                            stop={stop}
                          />
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Sticky Action Bar & Legal Attribution */}
      <div className="bg-white border border-sand-200 rounded-3xl p-6 shadow-warm-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Mandatory Open-Meteo CC BY 4.0 Attribution */}
        <div className="text-xs text-sand-500 space-y-0.5 text-center sm:text-left">
          <p>
            Weather data by{' '}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-terracotta-600 underline hover:text-terracotta-700 inline-flex items-center gap-0.5"
            >
              Open-Meteo.com
              <ExternalLink className="w-2.5 h-2.5" />
            </a>{' '}
            (CC BY 4.0)
          </p>
          <p>Places & routing provided by Geoapify{isMultiCity ? ' • City data by GeoNames' : ''}</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={onReset}
            disabled={isSaving}
          >
            Start Over
          </Button>
          <Button
            variant="primary"
            className="flex-1 sm:flex-none"
            leftIcon={<Check className="w-4 h-4" />}
            onClick={handleAccept}
            isLoading={isSaving}
          >
            Accept Itinerary
          </Button>
        </div>
      </div>
    </div>
  );
};
