import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';
import { registerSchema } from '../../schemas/authSchema';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const RegisterForm = () => {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    setAuthError(null);
    try {
      await registerAuth({
        username: data.username,
        email: data.email,
        password: data.password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      if (err.response?.data) {
        const fieldErrors = err.response.data;
        let hasSetField = false;

        if (fieldErrors.username) {
          const msg = Array.isArray(fieldErrors.username) ? fieldErrors.username[0] : fieldErrors.username;
          setError('username', { message: msg });
          hasSetField = true;
        }
        if (fieldErrors.email) {
          const msg = Array.isArray(fieldErrors.email) ? fieldErrors.email[0] : fieldErrors.email;
          setError('email', { message: msg });
          hasSetField = true;
        }
        if (fieldErrors.password) {
          const msg = Array.isArray(fieldErrors.password) ? fieldErrors.password[0] : fieldErrors.password;
          setError('password', { message: msg });
          hasSetField = true;
        }
        if (!hasSetField && fieldErrors.detail) {
          setAuthError(fieldErrors.detail);
        }
      } else {
        setAuthError('Unable to create account. Please check your network connection and try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {authError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-800 text-sm animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="leading-snug">{authError}</p>
        </div>
      )}

      <Input
        label="Username"
        placeholder="Choose a username"
        autoComplete="username"
        leftIcon={<User className="w-4 h-4" />}
        error={errors.username?.message}
        {...register('username')}
      />

      <Input
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        leftIcon={<Mail className="w-4 h-4" />}
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        leftIcon={<Lock className="w-4 h-4" />}
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label="Confirm Password"
        type="password"
        placeholder="Repeat your password"
        autoComplete="new-password"
        leftIcon={<Lock className="w-4 h-4" />}
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full mt-2"
        isLoading={isSubmitting}
        leftIcon={<UserPlus className="w-4 h-4" />}
      >
        Create Journey Account
      </Button>

      <div className="pt-2 text-center text-xs text-sand-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-terracotta-700 hover:text-terracotta-800 hover:underline"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
};
