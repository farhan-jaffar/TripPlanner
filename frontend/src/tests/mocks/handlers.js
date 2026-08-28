import { http, HttpResponse } from 'msw';

export let mockCurrentUser = {
  id: 1,
  username: 'demo_user',
  email: 'demo@example.com',
  profile: {
    display_name: 'Demo Traveler',
    bio: 'Exploring the globe one itinerary at a time.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  },
};

export let mockTrips = [
  {
    id: 1,
    owner: 1,
    owner_username: 'demo_user',
    title: 'Japan Autumn Discovery',
    description: 'Exploring traditional temples and gardens across Kyoto and Tokyo.',
    start_date: '2026-10-01',
    end_date: '2026-10-15',
    stop_count: 2,
    created_at: '2026-08-18T10:00:00Z',
    updated_at: '2026-08-18T10:00:00Z',
  },
  {
    id: 2,
    owner: 1,
    owner_username: 'demo_user',
    title: 'Swiss Alps Trail',
    description: 'High altitude hiking and mountain villages.',
    start_date: '2026-07-10',
    end_date: '2026-07-20',
    stop_count: 1,
    created_at: '2026-08-17T09:30:00Z',
    updated_at: '2026-08-17T09:30:00Z',
  },
];

export let mockStops = {
  1: [
    {
      id: 101,
      trip: 1,
      name: 'Fushimi Inari Taisha',
      description: 'Iconic thousand vermilion torii gates mountain trail.',
      location: 'Kyoto, Japan',
      order: 0,
      arrival_date: '2026-10-02',
      departure_date: '2026-10-04',
      created_at: '2026-08-18T11:00:00Z',
      updated_at: '2026-08-18T11:00:00Z',
    },
    {
      id: 102,
      trip: 1,
      name: 'Tokyo Skytree & Asakusa',
      description: 'Historic temple district and skyline observatory.',
      location: 'Tokyo, Japan',
      order: 1,
      arrival_date: '2026-10-06',
      departure_date: '2026-10-10',
      created_at: '2026-08-18T11:30:00Z',
      updated_at: '2026-08-18T11:30:00Z',
    },
  ],
  2: [
    {
      id: 201,
      trip: 2,
      name: 'Zermatt & Matterhorn View',
      description: 'Glacier paradise cable car and village stroll.',
      location: 'Zermatt, Switzerland',
      order: 0,
      arrival_date: '2026-07-12',
      departure_date: '2026-07-16',
      created_at: '2026-08-17T10:00:00Z',
      updated_at: '2026-08-17T10:00:00Z',
    },
  ],
};

export const handlers = [
  // Auth: Login
  http.post('*/api/v1/auth/token/', async ({ request }) => {
    const body = await request.json();
    if (body.username === 'invalid_user' || body.password === 'WrongPassword!') {
      return HttpResponse.json(
        { detail: 'No active account found with the given credentials' },
        { status: 401 }
      );
    }
    return HttpResponse.json({
      access: 'mock-valid-access-token',
      refresh: 'mock-valid-refresh-token',
      user: {
        id: mockCurrentUser.id,
        username: body.username || mockCurrentUser.username,
        email: mockCurrentUser.email,
        profile: mockCurrentUser.profile,
      },
    });
  }),

  // Auth: Token Refresh
  http.post('*/api/v1/auth/token/refresh/', async ({ request }) => {
    const body = await request.json();
    if (body.refresh === 'invalid-refresh-token') {
      return HttpResponse.json({ detail: 'Token is invalid or expired' }, { status: 401 });
    }
    return HttpResponse.json({
      access: 'mock-refreshed-access-token',
      refresh: 'mock-rotated-refresh-token',
    });
  }),

  // Auth: Register
  http.post('*/api/v1/auth/register/', async ({ request }) => {
    const body = await request.json();
    if (body.username === 'existing_user') {
      return HttpResponse.json(
        { username: ['A user with that username already exists.'] },
        { status: 400 }
      );
    }
    const newUser = {
      id: 99,
      username: body.username,
      email: body.email,
      profile: {
        display_name: '',
        bio: '',
        avatar_url: '',
      },
    };
    return HttpResponse.json(
      {
        user: newUser,
        tokens: {
          access: 'mock-new-user-access-token',
          refresh: 'mock-new-user-refresh-token',
        },
      },
      { status: 201 }
    );
  }),

  // Auth: Logout
  http.post('*/api/v1/auth/logout/', () => {
    return new HttpResponse(null, { status: 205 });
  }),

  // Auth: Profile Me
  http.get('*/api/v1/auth/profile/me/', () => {
    return HttpResponse.json({
      id: mockCurrentUser.id,
      username: mockCurrentUser.username,
      email: mockCurrentUser.email,
      display_name: mockCurrentUser.profile.display_name,
      bio: mockCurrentUser.profile.bio,
      avatar_url: mockCurrentUser.profile.avatar_url,
    });
  }),

  http.patch('*/api/v1/auth/profile/me/', async ({ request }) => {
    const body = await request.json();
    mockCurrentUser.profile = {
      ...mockCurrentUser.profile,
      ...body,
    };
    return HttpResponse.json({
      id: mockCurrentUser.id,
      username: mockCurrentUser.username,
      email: mockCurrentUser.email,
      display_name: mockCurrentUser.profile.display_name,
      bio: mockCurrentUser.profile.bio,
      avatar_url: mockCurrentUser.profile.avatar_url,
    });
  }),

  // List trips
  http.get('*/api/v1/trips/', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();

    let results = [...mockTrips];
    if (search) {
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search)
      );
    }

    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: null,
      results,
    });
  }),

  // Get trip detail
  http.get('*/api/v1/trips/:tripId/', ({ params }) => {
    const tripId = Number(params.tripId);
    const trip = mockTrips.find((t) => t.id === tripId);
    if (!trip) {
      return new HttpResponse(JSON.stringify({ detail: 'Not found.' }), { status: 404 });
    }
    return HttpResponse.json(trip);
  }),

  // Create trip
  http.post('*/api/v1/trips/', async ({ request }) => {
    const body = await request.json();
    if (body.start_date && body.end_date && body.end_date < body.start_date) {
      return HttpResponse.json(
        { end_date: ['End date cannot be before the start date.'] },
        { status: 400 }
      );
    }
    const newTrip = {
      id: mockTrips.length + 1,
      owner: mockCurrentUser.id,
      owner_username: mockCurrentUser.username,
      title: body.title,
      description: body.description || '',
      start_date: body.start_date,
      end_date: body.end_date,
      stop_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockTrips.push(newTrip);
    return HttpResponse.json(newTrip, { status: 201 });
  }),

  // Update trip
  http.patch('*/api/v1/trips/:tripId/', async ({ params, request }) => {
    const tripId = Number(params.tripId);
    const tripIndex = mockTrips.findIndex((t) => t.id === tripId);
    if (tripIndex === -1) {
      return new HttpResponse(JSON.stringify({ detail: 'Not found.' }), { status: 404 });
    }
    const body = await request.json();
    const updated = { ...mockTrips[tripIndex], ...body, updated_at: new Date().toISOString() };
    mockTrips[tripIndex] = updated;
    return HttpResponse.json(updated);
  }),

  // Delete trip
  http.delete('*/api/v1/trips/:tripId/', ({ params }) => {
    const tripId = Number(params.tripId);
    mockTrips = mockTrips.filter((t) => t.id !== tripId);
    delete mockStops[tripId];
    return new HttpResponse(null, { status: 204 });
  }),

  // List stops
  http.get('*/api/v1/trips/:tripId/stops/', ({ params }) => {
    const tripId = Number(params.tripId);
    const stops = mockStops[tripId] || [];
    return HttpResponse.json({
      count: stops.length,
      next: null,
      previous: null,
      results: stops,
    });
  }),

  // Get stop detail
  http.get('*/api/v1/trips/:tripId/stops/:stopId/', ({ params }) => {
    const tripId = Number(params.tripId);
    const stopId = Number(params.stopId);
    const stop = (mockStops[tripId] || []).find((s) => s.id === stopId);
    if (!stop) {
      return new HttpResponse(JSON.stringify({ detail: 'Not found.' }), { status: 404 });
    }
    return HttpResponse.json(stop);
  }),

  // Create stop
  http.post('*/api/v1/trips/:tripId/stops/', async ({ params, request }) => {
    const tripId = Number(params.tripId);
    const parentTrip = mockTrips.find((t) => t.id === tripId);
    if (!parentTrip) {
      return new HttpResponse(JSON.stringify({ detail: 'Not found.' }), { status: 404 });
    }

    const body = await request.json();

    if (body.arrival_date && body.arrival_date < parentTrip.start_date) {
      return HttpResponse.json(
        { arrival_date: ["Must fall within the trip's date range."] },
        { status: 400 }
      );
    }
    if (body.departure_date && body.departure_date > parentTrip.end_date) {
      return HttpResponse.json(
        { departure_date: ["Must fall within the trip's date range."] },
        { status: 400 }
      );
    }

    if (!mockStops[tripId]) {
      mockStops[tripId] = [];
    }

    const nextOrder =
      body.order !== undefined && body.order !== ''
        ? Number(body.order)
        : mockStops[tripId].length > 0
        ? Math.max(...mockStops[tripId].map((s) => s.order)) + 1
        : 0;

    const newStop = {
      id: Math.floor(Math.random() * 10000) + 500,
      trip: tripId,
      name: body.name,
      location: body.location,
      description: body.description || '',
      order: nextOrder,
      arrival_date: body.arrival_date || null,
      departure_date: body.departure_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockStops[tripId].push(newStop);
    parentTrip.stop_count += 1;
    return HttpResponse.json(newStop, { status: 201 });
  }),

  // Delete stop
  http.delete('*/api/v1/trips/:tripId/stops/:stopId/', ({ params }) => {
    const tripId = Number(params.tripId);
    const stopId = Number(params.stopId);
    if (mockStops[tripId]) {
      mockStops[tripId] = mockStops[tripId].filter((s) => s.id !== stopId);
      const parentTrip = mockTrips.find((t) => t.id === tripId);
      if (parentTrip && parentTrip.stop_count > 0) {
        parentTrip.stop_count -= 1;
      }
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
