import { NextRequest, NextResponse } from 'next/server';
import { tmdbApi } from '@/lib/tmdb';
import { MovieDetails } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const response = await tmdbApi.get<MovieDetails>(`/movie/${id}`, {
      params: { append_to_response: 'credits' },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching movie details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie details' },
      { status: 500 }
    );
  }
}
