import { NextRequest, NextResponse } from 'next/server';
import { tmdbApi } from '@/lib/tmdb';
import { MovieDetails } from '@/types';
import { updateWatchProviders } from '@/lib/library';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const response = await tmdbApi.get<MovieDetails>(`/movie/${id}`, {
      params: { append_to_response: 'credits,watch/providers' },
    });

    // Cache watch providers in database (fire and forget)
    const usProviders = response.data['watch/providers']?.results?.US?.flatrate;
    if (usProviders && usProviders.length > 0) {
      updateWatchProviders(parseInt(id, 10), 'movie', usProviders).catch(() => {
        // Ignore errors - this is best-effort caching
      });
    }

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching movie details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie details' },
      { status: 500 }
    );
  }
}
