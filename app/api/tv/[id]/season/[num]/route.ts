import { NextRequest, NextResponse } from 'next/server';
import { tmdbApi } from '@/lib/tmdb';
import type { TMDbSeasonDetails } from '@/types/episodes';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  const { id, num } = await params;

  try {
    const response = await tmdbApi.get<TMDbSeasonDetails>(`/tv/${id}/season/${num}`);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching season details:', error);

    // Handle 404 for non-existent seasons
    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch season details' },
      { status: 500 }
    );
  }
}
