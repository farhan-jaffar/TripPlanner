import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TripDetailPage } from '../pages/TripDetailPage';
import { NewStopPage } from '../pages/NewStopPage';
import { ToastProvider } from '../components/ui/Toast';
import { AuthProvider } from '../context/AuthContext';

function renderWithProviders(ui, { initialEntries = ['/trips/1'] } = {}) {
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
          <MemoryRouter initialEntries={initialEntries}>
            {ui}
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Stops & Timeline Feature', () => {
  beforeEach(() => {
    localStorage.setItem('trip_planner_refresh_token', 'mock-valid-refresh-token');
  });

  it('renders trip detail and its chronological stops', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
      </Routes>,
      { initialEntries: ['/trips/1'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Japan Autumn Discovery')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Fushimi Inari Taisha')).toBeInTheDocument();
      expect(screen.getByText('Kyoto, Japan')).toBeInTheDocument();
      expect(screen.getByText('Tokyo Skytree & Asakusa')).toBeInTheDocument();
      expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument();
    });
  });

  it('validates stop required fields and date boundary against parent trip', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/trips/:tripId/stops/new" element={<NewStopPage />} />
      </Routes>,
      { initialEntries: ['/trips/1/stops/new'] }
    );

    await waitFor(() => {
      expect(screen.getByText(/Add Stop to Japan Autumn Discovery/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /add stop to itinerary/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/stop name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/location is required/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/stop name/i), 'Early Arrival Hotel');
    await user.type(screen.getByLabelText(/location/i), 'Osaka Airport');
    await user.type(screen.getByLabelText(/arrival date/i), '2026-09-25');

    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/arrival date must fall within the trip's date range/i)
      ).toBeInTheDocument();
    });
  });

  it('navigates to new stop page when clicking Add First Stop in empty state', async () => {
    const user = userEvent.setup();
    // mockStops has no stops for a trip with id=999
    renderWithProviders(
      <Routes>
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
        <Route path="/trips/:tripId/stops/new" element={<div>New Stop Form Screen</div>} />
      </Routes>,
      { initialEntries: ['/trips/1'] }
    );

    // Let's test with a trip that has empty stops
    // In our mock handler, mockStops[1] has 2 stops, let's render StopTimeline directly or with empty stops
    const { StopTimeline } = await import('../features/stops/StopTimeline');
    renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <StopTimeline
              stops={[]}
              trip={{ id: 1, title: 'Empty Trip', start_date: '2026-10-01', end_date: '2026-10-15' }}
            />
          }
        />
        <Route path="/trips/:tripId/stops/new" element={<div>New Stop Form Screen</div>} />
      </Routes>,
      { initialEntries: ['/'] }
    );

    expect(screen.getByText('No stops added yet')).toBeInTheDocument();
    const addFirstStopBtn = screen.getByRole('button', { name: /add first stop/i });
    await user.click(addFirstStopBtn);

    await waitFor(() => {
      expect(screen.getByText('New Stop Form Screen')).toBeInTheDocument();
    });
  });
});

