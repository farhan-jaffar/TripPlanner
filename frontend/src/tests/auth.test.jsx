import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui/Toast';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { TripsPage } from '../pages/TripsPage';
import { Navbar } from '../components/layout/Navbar';
import { setAccessToken } from '../api/client';

function renderWithAuth(ui, { initialEntries = ['/'] } = {}) {
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
          <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Authentication & Profile Flows', () => {
  beforeEach(() => {
    localStorage.clear();
    setAccessToken(null);
  });

  it('renders login page and allows user to login', async () => {
    const user = userEvent.setup();
    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Protected Dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ['/login'] }
    );

    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/username/i), 'demo_user');
    await user.type(screen.getByLabelText(/password/i), 'StrongPass123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Protected Dashboard')).toBeInTheDocument();
    });
  });

  it('displays friendly error message on 401 invalid credentials', async () => {
    const user = userEvent.setup();
    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { initialEntries: ['/login'] }
    );

    await user.type(screen.getByLabelText(/username/i), 'invalid_user');
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/incorrect username or password/i)).toBeInTheDocument();
    });
  });

  it('registers new account and logs in automatically', async () => {
    const user = userEvent.setup();
    renderWithAuth(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Welcome to your Journeys</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ['/register'] }
    );

    expect(screen.getByText(/Start Your Journey/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^username/i), 'newtraveler');
    await user.type(screen.getByLabelText(/email address/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'StrongPassword123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPassword123!');

    await user.click(screen.getByRole('button', { name: /create journey account/i }));

    await waitFor(() => {
      expect(screen.getByText('Welcome to your Journeys')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated users trying to access protected route', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <TripsPage />
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ['/'] }
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    });
  });

  it('allows authenticated user to update their profile', async () => {
    const user = userEvent.setup();
    localStorage.setItem('trip_planner_refresh_token', 'mock-valid-refresh-token');

    renderWithAuth(
      <Routes>
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ['/profile'] }
    );

    await waitFor(() => {
      expect(screen.getByText(/Personal Profile/i)).toBeInTheDocument();
    });

    const displayNameInput = screen.getByLabelText(/display name/i);
    await user.clear(displayNameInput);
    await user.type(displayNameInput, 'Captain Explorer');

    const saveBtn = screen.getByRole('button', { name: /save profile/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/changes saved!/i)).toBeInTheDocument();
    });
  });

  it('renders navbar user menu and supports logout', async () => {
    const user = userEvent.setup();
    localStorage.setItem('trip_planner_refresh_token', 'mock-valid-refresh-token');

    renderWithAuth(
      <div>
        <Navbar />
        <Routes>
          <Route path="/login" element={<div>Login Screen</div>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>,
      { initialEntries: ['/'] }
    );

    await waitFor(() => {
      expect(screen.getByText('My Trips')).toBeInTheDocument();
    });

    const userMenuBtn = screen.getByLabelText(/user menu/i);
    await user.click(userMenuBtn);

    const logoutBtn = screen.getByRole('button', { name: /log out/i });
    await user.click(logoutBtn);

    await waitFor(() => {
      expect(screen.getByText('Login Screen')).toBeInTheDocument();
    });
  });
});
