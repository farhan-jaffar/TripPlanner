import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { GenerateTripPage } from '../pages/GenerateTripPage';
import { ItineraryDisplay } from '../features/itinerary/ItineraryDisplay';
import { ToastProvider } from '../components/ui/Toast';
import { AuthProvider } from '../context/AuthContext';
import * as itineraryApi from '../api/itinerary';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>
            {ui}
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('AI Itinerary Generator Feature', () => {
  beforeEach(() => {
    localStorage.setItem('trip_planner_refresh_token', 'mock-valid-refresh-token');
    vi.clearAllMocks();
  });

  it('renders the generator form with all inputs and interest chips', () => {
    renderWithProviders(<GenerateTripPage />);

    expect(screen.getByText(/AI Itinerary Planner/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City or Region/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();

    // Verify interest buttons
    expect(screen.getByRole('button', { name: /Museums/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Food & Dining/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /History & Heritage/i })).toBeInTheDocument();

    // Verify pace buttons
    expect(screen.getByText('Relaxed')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Fast-paced')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Generate Itinerary with AI/i })).toBeInTheDocument();
  });

  it('allows toggling interest chips up to 5 max', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GenerateTripPage />);

    const walkingBtn = screen.getByRole('button', { name: /Walking & Sightseeing/i });
    await user.click(walkingBtn);
    expect(screen.getByText(/3\/5 selected/i)).toBeInTheDocument();

    await user.click(walkingBtn);
    expect(screen.getByText(/2\/5 selected/i)).toBeInTheDocument();
  });

  it('renders ItineraryDisplay with day stops, route summary, and Open-Meteo attribution', async () => {
    const mockItinerary = {
      trip_title: '5 Days in Paris',
      days: [
        {
          date: '2026-10-01',
          weather_summary: 'Partly cloudy, 18°C',
          route_summary: 'Total walking: ~35 mins (2.4 km)',
          stops: [
            {
              name: "Musée d'Orsay",
              geoapify_place_id: 'geo_123',
              latitude: 48.8600,
              longitude: 2.3266,
              category: 'museum',
              suggested_time: '09:30',
              note: 'Book ahead on weekends',
              travel_from_previous: null,
            },
            {
              name: 'Le Comptoir',
              geoapify_place_id: 'geo_456',
              latitude: 48.8519,
              longitude: 2.3387,
              category: 'food',
              suggested_time: '12:30',
              note: 'Classic bistro meal',
              travel_from_previous: '15 min walk (1.2 km)',
            },
          ],
        },
      ],
      grounding_notes: 'All venues verified.',
    };

    const mockAttribution = {
      weather: 'Weather data by Open-Meteo.com (CC BY 4.0)',
      weather_url: 'https://open-meteo.com/',
      places: 'Places provided by Geoapify',
    };

    const requestParams = {
      country: 'FR',
      city: 'Paris',
      start_date: '2026-10-01',
      end_date: '2026-10-05',
    };

    renderWithProviders(
      <ItineraryDisplay
        itinerary={mockItinerary}
        attribution={mockAttribution}
        requestParams={requestParams}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('5 Days in Paris')).toBeInTheDocument();
    expect(screen.getByText("Musée d'Orsay")).toBeInTheDocument();
    expect(screen.getByText('Le Comptoir')).toBeInTheDocument();
    expect(screen.getByText('Partly cloudy, 18°C')).toBeInTheDocument();
    expect(screen.getByText(/Total walking: ~35 mins/i)).toBeInTheDocument();
    expect(screen.getByText(/15 min walk \(1.2 km\)/i)).toBeInTheDocument();

    // Verify mandatory Open-Meteo CC BY 4.0 link
    const openMeteoLink = screen.getByRole('link', { name: /Open-Meteo\.com/i });
    expect(openMeteoLink).toBeInTheDocument();
    expect(openMeteoLink).toHaveAttribute('href', 'https://open-meteo.com/');

    // Verify Accept button
    expect(screen.getByRole('button', { name: /Accept & Save Journey/i })).toBeInTheDocument();
  });
});
