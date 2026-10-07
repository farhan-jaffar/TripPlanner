import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-16 h-16 rounded-3xl bg-terracotta-100 border border-terracotta-200 flex items-center justify-center text-terracotta-600 mb-6 shadow-warm-md">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold font-serif text-sand-950 mb-2">404</h1>
      <h2 className="text-xl sm:text-2xl font-bold font-serif text-sand-900 mb-3">
        Off the Beaten Path
      </h2>
      <p className="text-sm text-sand-600 max-w-md mb-8">
        The destination you are looking for does not exist or may have been moved. Let's get you back on track.
      </p>
      <Button
        onClick={() => navigate('/')}
        leftIcon={<Home className="w-4 h-4" />}
      >
        Return to All Journeys
      </Button>
    </div>
  );
};
