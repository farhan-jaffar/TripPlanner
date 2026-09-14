import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Sparkles,
  MapPin,
  Calendar,
  Compass,
  ArrowRight,
  Landmark,
  Utensils,
  Footprints,
  Castle,
  Trees,
  ShoppingBag,
  Theater,
  Wine,
  Heart,
  Palette,
  Loader2,
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { CountrySelect } from '../components/ui/CountrySelect';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { ItineraryDisplay } from '../features/itinerary/ItineraryDisplay';
import { generateItinerary } from '../api/itinerary';

const INTEREST_OPTIONS = [
  { id: 'museums', label: 'Museums', icon: Landmark },
  { id: 'food', label: 'Food & Dining', icon: Utensils },
  { id: 'walking', label: 'Walking & Sightseeing', icon: Footprints },
  { id: 'history', label: 'History & Heritage', icon: Castle },
  { id: 'nature', label: 'Nature & Parks', icon: Trees },
  { id: 'shopping', label: 'Shopping & Markets', icon: ShoppingBag },
  { id: 'culture', label: 'Culture & Arts', icon: Theater },
  { id: 'nightlife', label: 'Nightlife & Bars', icon: Wine },
  { id: 'relaxation', label: 'Relaxation & Spas', icon: Heart },
  { id: 'art', label: 'Art Galleries', icon: Palette },
];

const PACE_OPTIONS = [
  { id: 'relaxed', label: 'Relaxed', desc: '2–3 stops/day, ample free time' },
  { id: 'moderate', label: 'Moderate', desc: '3–4 stops/day, balanced rhythm' },
  { id: 'fast', label: 'Fast-paced', desc: '4–5 stops/day, see everything' },
];

export const GenerateTripPage = () => {
  const [selectedInterests, setSelectedInterests] = useState(['museums', 'food']);
  const [selectedPace, setSelectedPace] = useState('moderate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generatedData, setGeneratedData] = useState(null);
  const [submittedParams, setSubmittedParams] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      country: 'France',
      city: '',
      start_date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000 * 18).toISOString().split('T')[0],
    },
  });

  const toggleInterest = (id) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(selectedInterests.filter((item) => item !== id));
    } else {
      if (selectedInterests.length >= 5) return; // Max 5 interests
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const onSubmit = async (formData) => {
    setGenerationError(null);

    // Validate 14-day limit on frontend
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const durationDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (end < start) {
      setGenerationError('End date cannot be earlier than start date.');
      return;
    }

    if (durationDays > 14) {
      setGenerationError(
        `Itinerary duration is ${durationDays} days. Free-tier AI planning is capped at 14 days per request.`
      );
      return;
    }

    const payload = {
      country: formData.country,
      city: formData.city,
      start_date: formData.start_date,
      end_date: formData.end_date,
      interests: selectedInterests,
      pace: selectedPace,
    };

    setIsGenerating(true);
    setSubmittedParams(payload);

    try {
      const data = await generateItinerary(payload);
      setGeneratedData(data);
    } catch (err) {
      const errDetail =
        err.response?.data?.detail ||
        err.response?.data?.country?.[0] ||
        err.response?.data?.end_date?.[0] ||
        'Failed to generate itinerary. Please try again.';
      setGenerationError(errDetail);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setGeneratedData(null);
    setGenerationError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* If itinerary is generated, display result */}
      {generatedData ? (
        <ItineraryDisplay
          itinerary={generatedData.itinerary}
          attribution={generatedData.attribution}
          requestParams={submittedParams}
          onReset={handleReset}
        />
      ) : (
        /* Form View */
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-white border border-sand-200 rounded-3xl p-6 sm:p-10 shadow-warm-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-terracotta-500 to-terracotta-700 text-white flex items-center justify-center shadow-warm-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-serif text-sand-950">
                  AI Itinerary Planner
                </h1>
                <p className="text-xs sm:text-sm text-sand-600 mt-1">
                  Craft a grounded day-by-day travel plan powered by real attractions and live weather.
                </p>
              </div>
            </div>

            {generationError && (
              <div className="mt-6">
                <ErrorBanner message={generationError} />
              </div>
            )}

            {isGenerating ? (
              /* Loading Spinner Card */
              <div className="my-12 p-8 sm:p-12 rounded-3xl bg-sand-50/80 border border-sand-200 flex flex-col items-center text-center space-y-4 animate-pulse">
                <div className="w-16 h-16 rounded-3xl bg-terracotta-100 border border-terracotta-200 text-terracotta-600 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-sand-950 font-serif">
                    Assembling your journey...
                  </h3>
                  <p className="text-xs sm:text-sm text-sand-600 mt-1 max-w-md">
                    {submittedParams?.city
                      ? `Looking up real attractions in ${submittedParams.city}, checking weather forecasts, and structuring your daily timeline.`
                      : `Discovering the best cities in ${submittedParams?.country || 'your destination'}, checking weather forecasts, and building a multi-city itinerary.`
                    }
                  </p>
                </div>
                <div className="text-[11px] font-mono text-sand-500 pt-2">
                  Grounding places via Geoapify • Forecasts via Open-Meteo
                </div>
              </div>
            ) : (
              /* Generator Form */
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 mt-8">
                {/* Destination & Dates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <CountrySelect
                    label="Destination Country"
                    placeholder="Type country name or code (e.g. France, Japan, Italy)..."
                    required
                    error={errors.country?.message}
                    {...register('country', { required: 'Please enter a country' })}
                  />

                  <Input
                    label="City or Region (Optional)"
                    placeholder="e.g. Paris, Kyoto, or leave blank for whole country"
                    helperText="Leave empty to explore the country as a whole"
                    leftIcon={<MapPin className="w-4 h-4 text-sand-400" />}
                    error={errors.city?.message}
                    {...register('city')}
                  />

                  <Input
                    label="Start Date"
                    type="date"
                    required
                    leftIcon={<Calendar className="w-4 h-4 text-sand-400" />}
                    error={errors.start_date?.message}
                    {...register('start_date', { required: 'Start date is required' })}
                  />

                  <Input
                    label="End Date"
                    type="date"
                    required
                    helperText="Maximum 14 days"
                    leftIcon={<Calendar className="w-4 h-4 text-sand-400" />}
                    error={errors.end_date?.message}
                    {...register('end_date', { required: 'End date is required' })}
                  />
                </div>

                {/* Interests Chips */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-sand-800">
                      Travel Interests{' '}
                      <span className="text-xs text-sand-500 font-normal">
                        (Choose up to 5 • {selectedInterests.length}/5 selected)
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {INTEREST_OPTIONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = selectedInterests.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleInterest(item.id)}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-terracotta-600 text-white shadow-warm-sm border border-terracotta-600'
                              : 'bg-sand-50 hover:bg-sand-100 text-sand-800 border border-sand-200'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Desired Pace */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-sand-800">
                    Travel Pace
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PACE_OPTIONS.map((opt) => {
                      const isSelected = selectedPace === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedPace(opt.id)}
                          className={`text-left p-4 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-terracotta-50/70 border-terracotta-500 ring-2 ring-terracotta-500/30'
                              : 'bg-white border-sand-200 hover:border-sand-300'
                          }`}
                        >
                          <span className="block text-sm font-bold text-sand-900">
                            {opt.label}
                          </span>
                          <span className="block text-xs text-sand-600 mt-1">
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-sand-200 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    leftIcon={<Sparkles className="w-4 h-4" />}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Generate Itinerary with AI
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
