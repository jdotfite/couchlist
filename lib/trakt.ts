const TRAKT_API_URL = 'https://api.trakt.tv';
const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET;

if (!TRAKT_CLIENT_ID || !TRAKT_CLIENT_SECRET) {
  console.warn('Trakt API credentials not found. Set TRAKT_CLIENT_ID and TRAKT_CLIENT_SECRET in .env.local');
}

export interface TraktDeviceCode {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

export interface TraktTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
}

export interface TraktUser {
  username: string;
  private: boolean;
  name: string;
  vip: boolean;
  ids: {
    slug: string;
  };
}

export interface TraktMovie {
  title: string;
  year: number;
  ids: {
    trakt: number;
    slug: string;
    imdb: string;
    tmdb: number;
  };
}

export interface TraktShow {
  title: string;
  year: number;
  ids: {
    trakt: number;
    slug: string;
    tvdb: number;
    imdb: string;
    tmdb: number;
  };
}

export interface TraktWatchedMovie {
  plays: number;
  last_watched_at: string;
  last_updated_at: string;
  movie: TraktMovie;
}

export interface TraktWatchedShow {
  plays: number;
  last_watched_at: string;
  last_updated_at: string;
  show: TraktShow;
}

export interface TraktLastActivities {
  all: string;
  movies: {
    watched_at: string;
    collected_at: string;
    rated_at: string;
    watchlisted_at: string;
    favorited_at: string;
    recommendations_at: string;
    commented_at: string;
    paused_at: string;
    hidden_at: string;
  };
  episodes: {
    watched_at: string;
    collected_at: string;
    rated_at: string;
    watchlisted_at: string;
    commented_at: string;
    paused_at: string;
  };
  shows: {
    rated_at: string;
    watchlisted_at: string;
    favorited_at: string;
    recommendations_at: string;
    commented_at: string;
    hidden_at: string;
  };
}

// Get device code for authentication
export async function getDeviceCode(): Promise<TraktDeviceCode> {
  const res = await fetch(`${TRAKT_API_URL}/oauth/device/code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: TRAKT_CLIENT_ID,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get device code: ${res.status}`);
  }

  return res.json();
}

// Poll for token after user enters code
export async function pollForToken(deviceCode: string): Promise<TraktTokenResponse | { pending: true }> {
  const res = await fetch(`${TRAKT_API_URL}/oauth/device/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: deviceCode,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
    }),
  });

  // 400 = authorization pending, user hasn't entered code yet
  if (res.status === 400) {
    return { pending: true };
  }

  // 404 = invalid device code
  if (res.status === 404) {
    throw new Error('Invalid device code');
  }

  // 409 = code already approved
  if (res.status === 409) {
    throw new Error('Code already approved');
  }

  // 410 = tokens expired, need to restart
  if (res.status === 410) {
    throw new Error('Code expired, please restart');
  }

  // 418 = user denied
  if (res.status === 418) {
    throw new Error('Authorization denied by user');
  }

  // 429 = polling too fast
  if (res.status === 429) {
    return { pending: true };
  }

  if (!res.ok) {
    throw new Error(`Token polling failed: ${res.status}`);
  }

  return res.json();
}

// Refresh expired token
export async function refreshToken(refreshTokenValue: string): Promise<TraktTokenResponse> {
  const res = await fetch(`${TRAKT_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh_token: refreshTokenValue,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  return res.json();
}

// Make authenticated API request
export async function traktFetch<T>(endpoint: string, accessToken: string): Promise<T> {
  const res = await fetch(`${TRAKT_API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'trakt-api-version': '2',
      'trakt-api-key': TRAKT_CLIENT_ID!,
    },
  });

  if (!res.ok) {
    throw new Error(`Trakt API error: ${res.status}`);
  }

  return res.json();
}

// Get user's last activity timestamps (for efficient sync)
export async function getLastActivities(accessToken: string): Promise<TraktLastActivities> {
  return traktFetch<TraktLastActivities>('/sync/last_activities', accessToken);
}

// Get all watched movies
export async function getWatchedMovies(accessToken: string): Promise<TraktWatchedMovie[]> {
  return traktFetch<TraktWatchedMovie[]>('/sync/watched/movies', accessToken);
}

// Get all watched shows
export async function getWatchedShows(accessToken: string): Promise<TraktWatchedShow[]> {
  return traktFetch<TraktWatchedShow[]>('/sync/watched/shows', accessToken);
}

// Get user profile
export async function getUserProfile(accessToken: string): Promise<TraktUser> {
  return traktFetch<TraktUser>('/users/me', accessToken);
}

// Get connection with auto-refresh
export async function getValidAccessToken(connection: {
  access_token: string;
  refresh_token: string;
  expires_at: Date | string;
}): Promise<{ accessToken: string; refreshed: boolean; newTokens?: TraktTokenResponse }> {
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();

  // Add 5 minute buffer before expiry
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    // Token still valid
    return { accessToken: connection.access_token, refreshed: false };
  }

  // Token expired or expiring soon, refresh it
  const newTokens = await refreshToken(connection.refresh_token);
  return {
    accessToken: newTokens.access_token,
    refreshed: true,
    newTokens,
  };
}
