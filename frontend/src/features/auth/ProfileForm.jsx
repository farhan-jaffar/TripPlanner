import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Image, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { profileSchema } from '../../schemas/authSchema';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

export const ProfileForm = () => {
  const { user, profile, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      avatar_url: profile?.avatar_url || '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile, reset]);

  const watchedAvatarUrl = watch('avatar_url');
  const watchedDisplayName = watch('display_name');

  const onSubmit = async (data) => {
    setServerError(null);
    setSaveSuccess(false);
    try {
      await updateProfile(data);
      setSaveSuccess(true);
      showToast('Profile updated successfully!', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Failed to update profile. Please check your inputs.';
      setServerError(msg);
      showToast(msg, 'error');
    }
  };

  const initials = (watchedDisplayName || user?.username || 'U')
    .slice(0, 2)
    .toUpperCase();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-800 text-sm animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="leading-snug">{serverError}</p>
        </div>
      )}

      {/* Profile Header & Avatar Preview */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-sand-100/60 border border-sand-200/80">
        <div className="relative group shrink-0">
          {watchedAvatarUrl ? (
            <img
              src={watchedAvatarUrl}
              alt={watchedDisplayName || user?.username || 'Avatar'}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
              }}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-warm-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-terracotta-600 flex items-center justify-center text-white font-serif font-bold text-2xl shadow-warm-md border-2 border-white">
              {initials}
            </div>
          )}
        </div>

        <div className="text-center sm:text-left space-y-1">
          <h2 className="text-lg font-serif font-bold text-sand-900">
            {watchedDisplayName || user?.username}
          </h2>
          <p className="text-xs text-sand-600 font-mono">@{user?.username}</p>
          <p className="text-xs text-sand-500">{user?.email}</p>
        </div>
      </div>

      {/* Account Info (Read Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-sand-600 uppercase tracking-wider mb-1.5">
            Username (Read-Only)
          </label>
          <div className="px-3.5 py-2.5 rounded-xl bg-sand-100/80 border border-sand-200 text-sand-700 text-sm font-mono">
            {user?.username}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-sand-600 uppercase tracking-wider mb-1.5">
            Email Address (Read-Only)
          </label>
          <div className="px-3.5 py-2.5 rounded-xl bg-sand-100/80 border border-sand-200 text-sand-700 text-sm">
            {user?.email}
          </div>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="space-y-4">
        <Input
          label="Display Name"
          placeholder="How you want to be known"
          leftIcon={<User className="w-4 h-4" />}
          helperText="Leave empty to display your username by default."
          error={errors.display_name?.message}
          {...register('display_name')}
        />

        <Input
          label="Avatar Image URL"
          placeholder="https://example.com/avatar.jpg"
          leftIcon={<Image className="w-4 h-4" />}
          helperText="Direct link to a JPEG, PNG, or WebP profile image."
          error={errors.avatar_url?.message}
          {...register('avatar_url')}
        />

        <Textarea
          label="Bio / Travel Motto"
          placeholder="Tell other travelers about your wanderlust dreams, favorite spots, and journey styles..."
          rows={3}
          error={errors.bio?.message}
          {...register('bio')}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {saveSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Changes saved!
            </span>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={!isDirty && !saveSuccess}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Profile
        </Button>
      </div>
    </form>
  );
};
