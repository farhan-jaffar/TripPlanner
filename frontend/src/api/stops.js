import { apiClient } from './client';

export async function getStops(tripId, filters) {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.search) params.append('search', filters.search);
    if (filters.arrival_date_after) params.append('arrival_date_after', filters.arrival_date_after);
    if (filters.arrival_date_before) params.append('arrival_date_before', filters.arrival_date_before);
    if (filters.departure_date_after) params.append('departure_date_after', filters.departure_date_after);
    if (filters.departure_date_before) params.append('departure_date_before', filters.departure_date_before);
    if (filters.ordering) params.append('ordering', filters.ordering);
  }

  const response = await apiClient.get(`/trips/${tripId}/stops/`, { params });
  return response.data;
}

export async function getStop(tripId, stopId) {
  const response = await apiClient.get(`/trips/${tripId}/stops/${stopId}/`);
  return response.data;
}

export async function createStop(tripId, data) {
  const response = await apiClient.post(`/trips/${tripId}/stops/`, data);
  return response.data;
}

export async function updateStop(tripId, stopId, data) {
  const response = await apiClient.patch(`/trips/${tripId}/stops/${stopId}/`, data);
  return response.data;
}

export async function deleteStop(tripId, stopId) {
  await apiClient.delete(`/trips/${tripId}/stops/${stopId}/`);
}

