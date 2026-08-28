import React from 'react';
import { User } from 'lucide-react';
import { ProfileForm } from '../features/auth/ProfileForm';
import { Card } from '../components/ui/Card';

export const ProfilePage = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-sand-200">
        <div className="w-10 h-10 rounded-2xl bg-sand-200 flex items-center justify-center text-sand-800 shadow-warm-sm">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-sand-950 tracking-tight">
            Personal Profile
          </h1>
          <p className="text-sm text-sand-600">
            Manage your account settings, public name, bio, and avatar.
          </p>
        </div>
      </div>

      {/* Profile Form Card */}
      <Card className="p-6 sm:p-8 bg-white border border-sand-200 shadow-warm-sm">
        <ProfileForm />
      </Card>
    </div>
  );
};
