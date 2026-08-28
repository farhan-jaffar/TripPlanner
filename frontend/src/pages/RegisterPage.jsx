import React from 'react';
import { Compass } from 'lucide-react';
import { RegisterForm } from '../features/auth/RegisterForm';
import { Card } from '../components/ui/Card';

export const RegisterPage = () => {
  return (
    <div className="min-h-[calc(100vh-14rem)] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-terracotta-600 items-center justify-center text-white shadow-warm-md mb-1">
            <Compass className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-sand-950 tracking-tight">
            Start Your Journey
          </h1>
          <p className="text-sm text-sand-600">
            Create an account to begin planning and curating your travel itineraries.
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-6 sm:p-8 bg-white border border-sand-200/80 shadow-warm-md">
          <RegisterForm />
        </Card>
      </div>
    </div>
  );
};
