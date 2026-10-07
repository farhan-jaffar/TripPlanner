import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTrips, getTrip, createTrip, updateTrip, deleteTrip } from '../api/trips';

export const tripKeys = {
  all: ['trips'],
  lists: () => [...tripKeys.all, 'list'],
  list: (filters) => [...tripKeys.lists(), filters],
  details: () => [...tripKeys.all, 'detail'],
  detail: (id) => [...tripKeys.details(), id ? id.toString() : ''],
};

export function useTrips(filters) {
  return useQuery({
    queryKey: tripKeys.list(filters),
    queryFn: () => getTrips(filters),
  });
}

export function useTrip(id) {
  return useQuery({
    queryKey: tripKeys.detail(id || ''),
    queryFn: () => getTrip(id),
    enabled: Boolean(id),
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createTrip(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    },
  });
}

export function useUpdateTrip(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateTrip(id, data),
    onSuccess: (updatedTrip) => {
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(id) });
      queryClient.setQueryData(tripKeys.detail(id), updatedTrip);
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    },
  });
}
