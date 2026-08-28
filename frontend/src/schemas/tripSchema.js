import { z } from 'zod';

export const tripSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(200, 'Title cannot exceed 200 characters'),
    description: z.string().optional().default(''),
    start_date: z
      .string()
      .min(1, 'Start date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please use YYYY-MM-DD format'),
    end_date: z
      .string()
      .min(1, 'End date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please use YYYY-MM-DD format'),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      return data.end_date >= data.start_date;
    },
    {
      message: 'End date cannot be before the start date.',
      path: ['end_date'],
    }
  );
