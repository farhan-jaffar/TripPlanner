import { z } from 'zod';

export const createStopSchema = (tripStartDate, tripEndDate) =>
  z
    .object({
      name: z
        .string()
        .trim()
        .min(1, 'Stop name is required')
        .max(200, 'Name cannot exceed 200 characters'),
      location: z
        .string()
        .trim()
        .min(1, 'Location is required')
        .max(255, 'Location cannot exceed 255 characters'),
      description: z.string().optional().default(''),
      order: z.coerce.number().int().min(0, 'Order must be 0 or greater').optional(),
      arrival_date: z
        .string()
        .optional()
        .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
          message: 'Please use YYYY-MM-DD format',
        }),
      departure_date: z
        .string()
        .optional()
        .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
          message: 'Please use YYYY-MM-DD format',
        }),
    })
    .refine(
      (data) => {
        if (data.arrival_date && data.departure_date) {
          return data.departure_date >= data.arrival_date;
        }
        return true;
      },
      {
        message: 'Departure date cannot be before the arrival date.',
        path: ['departure_date'],
      }
    )
    .refine(
      (data) => {
        if (tripStartDate && data.arrival_date) {
          return data.arrival_date >= tripStartDate;
        }
        return true;
      },
      {
        message: `Arrival date must fall within the trip's date range (after ${tripStartDate}).`,
        path: ['arrival_date'],
      }
    )
    .refine(
      (data) => {
        if (tripEndDate && data.departure_date) {
          return data.departure_date <= tripEndDate;
        }
        return true;
      },
      {
        message: `Departure date must fall within the trip's date range (before ${tripEndDate}).`,
        path: ['departure_date'],
      }
    );

export const stopSchema = createStopSchema();
