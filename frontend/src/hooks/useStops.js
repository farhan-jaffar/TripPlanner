import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStops, getStop, createStop, updateStop, deleteStop } from '../api/stops';
import { tripKeys } from './useTrips';

export const stopKeys = {
  all: (tripId) => ['trips', tripId ? tripId.toString() : '', 'stops'],
  lists: (tripId) => [...stopKeys.all(tripId), 'list'],
  list: (tripId, filters) => [...stopKeys.lists(tripId), filters],
  details: (tripId) => [...stopKeys.all(tripId), 'detail'],
  detail: (tripId, stopId) => [...stopKeys.details(tripId), stopId ? stopId.toString() : ''],
};

export function useStops(tripId, filters) {
  return useQuery({
    queryKey: stopKeys.list(tripId || '', filters),
    queryFn: () => getStops(tripId, filters),
    enabled: Boolean(tripId),
  });
}

export function useStop(tripId, stopId) {
  return useQuery({
    queryKey: stopKeys.detail(tripId || '', stopId || ''),
    queryFn: () => getStop(tripId, stopId),
    enabled: Boolean(tripId && stopId),
  });
}

export function useCreateStop(tripId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createStop(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stopKeys.all(tripId) });
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    },
  });
}

export function useUpdateStop(tripId, stopId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateStop(tripId, stopId, data),
    onSuccess: (updatedStop) => {
      queryClient.invalidateQueries({ queryKey: stopKeys.all(tripId) });
      queryClient.setQueryData(stopKeys.detail(tripId, stopId), updatedStop);
    },
  });
}

export function useDeleteStop(tripId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stopId) => deleteStop(tripId, stopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stopKeys.all(tripId) });
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    },
  });
}

