import { NextRequest, NextResponse } from 'next/server';
import { tmdbApi } from '@/lib/tmdb';
import { SearchResponse, Movie, TVShow } from '@/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const type = searchParams.get('type') || 'multi'; // movie, tv, or multi

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const endpoint = type === 'multi' ? '/search/multi' : `/search/${type}`;
    const response = await tmdbApi.get<SearchResponse<Movie | TVShow>>(endpoint, {
      params: { query },
    });

    // Filter out non-movie/tv results (like people) when using multi search
    const filteredResults = type === 'multi'
      ? response.data.results.filter((item: any) =>
          item.media_type === 'movie' || item.media_type === 'tv'
        )
      : response.data.results;

    // Sort by popularity (descending) so popular titles appear first
    const sortedResults = [...filteredResults].sort((a: any, b: any) =>
      (b.popularity || 0) - (a.popularity || 0)
    );

    return NextResponse.json({
      ...response.data,
      results: sortedResults,
    });
  } catch (error) {
    console.error('TMDb API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from TMDb' },
      { status: 500 }
    );
  }
}
