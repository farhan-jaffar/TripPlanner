import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { TripsPage } from './pages/TripsPage';
import { NewTripPage } from './pages/NewTripPage';
import { GenerateTripPage } from './pages/GenerateTripPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { EditTripPage } from './pages/EditTripPage';
import { NewStopPage } from './pages/NewStopPage';
import { EditStopPage } from './pages/EditStopPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      {
        index: true,
        element: (
          <ProtectedRoute>
            <TripsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trips/new',
        element: (
          <ProtectedRoute>
            <NewTripPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trips/generate',
        element: (
          <ProtectedRoute>
            <GenerateTripPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trips/:tripId',
        element: (
          <ProtectedRoute>
            <TripDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trips/:tripId/edit',
        element: (
          <ProtectedRoute>
            <EditTripPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trips/:tripId/stops/new',
        element: (
          <ProtectedRoute>
            <NewStopPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trips/:tripId/stops/:stopId/edit',
        element: (
          <ProtectedRoute>
            <EditStopPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
