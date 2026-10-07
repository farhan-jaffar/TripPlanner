import { format, parseISO, differenceInDays, isFuture, isPast, isWithinInterval } from 'date-fns';

export function formatDate(dateString, formatStr = 'MMM d, yyyy') {
  if (!dateString) return '—';
  try {
    const date = parseISO(dateString);
    return format(date, formatStr);
  } catch {
    return dateString;
  }
}

export function formatDateRange(startStr, endStr) {
  if (!startStr || !endStr) return '';
  try {
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    
    if (start.getFullYear() === end.getFullYear()) {
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
      }
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
  } catch {
    return `${startStr} – ${endStr}`;
  }
}

export function getTripDurationInDays(startStr, endStr) {
  try {
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    return Math.max(1, differenceInDays(end, start) + 1);
  } catch {
    return 0;
  }
}

export function getTripStatus(startStr, endStr) {
  try {
    const now = new Date();
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    end.setHours(23, 59, 59, 999);

    if (isFuture(start)) {
      return 'upcoming';
    }
    if (isWithinInterval(now, { start, end })) {
      return 'ongoing';
    }
    if (isPast(end)) {
      return 'completed';
    }
    return 'upcoming';
  } catch {
    return 'upcoming';
  }
}
