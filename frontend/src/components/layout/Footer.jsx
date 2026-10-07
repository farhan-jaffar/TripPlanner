import React from 'react';
import { Compass, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-sand-200 bg-sand-100/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-sand-600">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-terracotta-600" />
            <span className="font-serif font-semibold text-sand-800">TripPlanner</span>
            <span>Plan it — Track it — Enjoy the journey</span>
          </div>

          <div className="flex items-center gap-1">
            <span>&copy; Trip Planner. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
