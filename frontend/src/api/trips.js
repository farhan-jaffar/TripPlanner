import { apiClient } from './client';

export async function getTrips(filters) {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.start_date_after) params.append('start_date_after', filters.start_date_after);
    if (filters.start_date_before) params.append('start_date_before', filters.start_date_before);
    if (filters.end_date_after) params.append('end_date_after', filters.end_date_after);
    if (filters.end_date_before) params.append('end_date_before', filters.end_date_before);
    if (filters.ordering) params.append('ordering', filters.ordering);
  }

  const response = await apiClient.get('/trips/', { params });
  return response.data;
}

export async function getTrip(id) {
  const response = await apiClient.get(`/trips/${id}/`);
  return response.data;
}

export async function createTrip(data) {
  const response = await apiClient.post('/trips/', data);
  return response.data;
}

export async function updateTrip(id, data) {
  const response = await apiClient.patch(`/trips/${id}/`, data);
  return response.data;
}

export async function deleteTrip(id) {
  await apiClient.delete(`/trips/${id}/`);
}
