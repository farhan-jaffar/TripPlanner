import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-terracotta-600 flex items-center justify-center text-white shadow-warm-md">
            <Compass className="w-6 h-6 animate-spin duration-1000" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-sand-900">TripPlanner</h2>
            <p className="text-xs text-sand-600 font-medium mt-0.5">Authenticating session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};
