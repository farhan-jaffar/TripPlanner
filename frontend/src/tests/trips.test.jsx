import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TripsPage } from '../pages/TripsPage';
import { NewTripPage } from '../pages/NewTripPage';
import { ToastProvider } from '../components/ui/Toast';
import { AuthProvider } from '../context/AuthContext';

function renderWithProviders(ui, { initialEntries = ['/'] } = {}) {
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

describe('Trips Feature', () => {
  beforeEach(() => {
    localStorage.setItem('trip_planner_refresh_token', 'mock-valid-refresh-token');
  });

  it('renders list of trips from the API', async () => {
    renderWithProviders(<TripsPage />);

    expect(screen.getByText(/My Travel Itineraries/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Japan Autumn Discovery')).toBeInTheDocument();
      expect(screen.getByText('Swiss Alps Trail')).toBeInTheDocument();
    });

    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  it('validates required fields on trip creation', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/trips/new" element={<NewTripPage />} />
      </Routes>,
      { initialEntries: ['/trips/new'] }
    );

    const submitBtn = screen.getByRole('button', { name: /create journey/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/start date is required/i)).toBeInTheDocument();
      expect(screen.getByText(/end date is required/i)).toBeInTheDocument();
    });
  });

  it('prevents submitting end_date before start_date', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/trips/new" element={<NewTripPage />} />
      </Routes>,
      { initialEntries: ['/trips/new'] }
    );

    await user.type(screen.getByLabelText(/trip title/i), 'Invalid Dates Trip');
    await user.type(screen.getByLabelText(/start date/i), '2026-09-20');
    await user.type(screen.getByLabelText(/end date/i), '2026-09-10');

    const submitBtn = screen.getByRole('button', { name: /create journey/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/end date cannot be before the start date/i)).toBeInTheDocument();
    });
  });
});
