import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { User, Lock, LogIn, AlertCircle } from 'lucide-react';
import { loginSchema } from '../../schemas/authSchema';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setAuthError(null);
    try {
      await login(data.username, data.password);
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setAuthError('Incorrect username or password. Please check your credentials.');
      } else if (err.response?.data?.detail) {
        setAuthError(err.response.data.detail);
      } else {
        setAuthError('Unable to log in. Please check your network connection and try again.');
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
        placeholder="e.g. wanderer"
        autoComplete="username"
        leftIcon={<User className="w-4 h-4" />}
        error={errors.username?.message}
        {...register('username')}
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        leftIcon={<Lock className="w-4 h-4" />}
        error={errors.password?.message}
        {...register('password')}
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full mt-2"
        isLoading={isSubmitting}
        leftIcon={<LogIn className="w-4 h-4" />}
      >
        Sign In
      </Button>

      <div className="pt-2 text-center text-xs text-sand-600">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="font-semibold text-terracotta-700 hover:text-terracotta-800 hover:underline"
        >
          Create account
        </Link>
      </div>
    </form>
  );
};
