import { NextRequest, NextResponse } from 'next/server';
import { tmdbApi } from '@/lib/tmdb';

const categoryEndpoints: Record<string, string> = {
  'trending_movies': '/trending/movie/week',
  'trending_tv': '/trending/tv/week',
  'popular_movies': '/movie/popular',
  'popular_tv': '/tv/popular',
  'top_rated_movies': '/movie/top_rated',
  'top_rated_tv': '/tv/top_rated',
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');

  if (!category || !categoryEndpoints[category]) {
    return NextResponse.json(
      { error: 'Invalid category parameter' },
      { status: 400 }
    );
  }

  try {
    const endpoint = categoryEndpoints[category];
    const response = await tmdbApi.get(endpoint);

    const mediaType = category.includes('movie') ? 'movie' : 'tv';
    const results = response.data.results.map((item: any) => ({
      ...item,
      media_type: mediaType,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('TMDb API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category data' },
      { status: 500 }
    );
  }
}
