import { apiClient } from './client';

export async function generateItinerary(payload) {
  const response = await apiClient.post('/itinerary/generate/', payload, {
    timeout: 120000,
  });
  return response.data;
}

export async function acceptItinerary(payload) {
  const response = await apiClient.post('/itinerary/accept/', payload);
  return response.data;
}
