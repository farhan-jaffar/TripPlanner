import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TripDetailPage } from '../pages/TripDetailPage';
import { AICopilotDrawer } from '../features/copilot/AICopilotDrawer';
import { ToastProvider } from '../components/ui/Toast';
import { AuthProvider } from '../context/AuthContext';
import { mcpClientService } from '../services/mcpClient';

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

describe('AI Copilot MCP Feature', () => {
  const mockTrip = {
    id: 1,
    title: 'Japan Autumn Discovery',
    start_date: '2026-10-01',
    end_date: '2026-10-15',
    description: 'A grand tour across Tokyo and Kyoto.',
  };

  beforeEach(() => {
    localStorage.setItem('trip_planner_refresh_token', 'mock-valid-refresh-token');
    vi.spyOn(mcpClientService, 'connect').mockResolvedValue({});
    vi.spyOn(mcpClientService, 'listTools').mockResolvedValue([
      {
        name: 'add_stop',
        description: 'Add a stop to one of the user trips.',
        inputSchema: { type: 'object', properties: {} },
      },
    ]);
  });

  it('renders AI Copilot (MCP) button on TripDetailPage and opens drawer on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
      </Routes>,
      { initialEntries: ['/trips/1'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Japan Autumn Discovery')).toBeInTheDocument();
    });

    const copilotBtn = screen.getByRole('button', { name: /AI Copilot \(MCP\)/i });
    expect(copilotBtn).toBeInTheDocument();

    await user.click(copilotBtn);

    expect(screen.getByRole('heading', { name: 'Travel Copilot' })).toBeInTheDocument();
    expect(screen.getByText(/How can I help with your journey\?/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask or say: 'Add Eiffel Tower for 2 hours'/i)).toBeInTheDocument();
  });

  it('displays starter suggestions and allows sending user prompt', async () => {
    const user = userEvent.setup();
    vi.spyOn(mcpClientService, 'callTool').mockResolvedValue({
      status: 'success',
      message: 'Added Senso-ji Temple',
      stop: {
        id: 99,
        name: 'Senso-ji Temple',
        location: 'Asakusa, Tokyo',
        arrival_date: '2026-10-02',
        duration_minutes: 120,
      },
    });

    renderWithProviders(
      <AICopilotDrawer isOpen={true} onClose={() => {}} trip={mockTrip} />
    );

    expect(screen.getByText(/What are the top attractions I should not miss\?/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Ask or say: 'Add Eiffel Tower for 2 hours'/i);
    await user.type(input, 'Add Senso-ji Temple on day 2');

    const sendBtn = screen.getByRole('button', { name: /Send message/i });
    await user.click(sendBtn);

    // User message should appear
    expect(screen.getByText('Add Senso-ji Temple on day 2')).toBeInTheDocument();

    // Tool execution card or reply should appear
    await waitFor(() => {
      expect(screen.getByText(/Stop Added via MCP/i)).toBeInTheDocument();
      expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument();
    });
  });

  it('toggles settings pane to enter Gemini API key', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AICopilotDrawer isOpen={true} onClose={() => {}} trip={mockTrip} />
    );

    const settingsBtn = screen.getByTitle(/Configure Gemini API Key/i);
    await user.click(settingsBtn);

    expect(screen.getByText(/Gemini API Key Settings/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('AIzaSy...')).toBeInTheDocument();
  });
});
