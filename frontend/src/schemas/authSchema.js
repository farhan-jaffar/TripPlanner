import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(150, 'Username cannot exceed 150 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  display_name: z
    .string()
    .max(100, 'Display name cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(500, 'Bio cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  avatar_url: z
    .string()
    .url('Please enter a valid image URL')
    .optional()
    .or(z.literal('')),
});
