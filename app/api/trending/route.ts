import { NextResponse } from 'next/server';
import { tmdbApi } from '@/lib/tmdb';

export async function GET() {
  try {
    const [moviesRes, tvRes, popMoviesRes, popTVRes, topMoviesRes, topTVRes] = await Promise.all([
      tmdbApi.get('/trending/movie/week'),
      tmdbApi.get('/trending/tv/week'),
      tmdbApi.get('/movie/popular'),
      tmdbApi.get('/tv/popular'),
      tmdbApi.get('/movie/top_rated'),
      tmdbApi.get('/tv/top_rated')
    ]);
    
    const movies = moviesRes.data.results.slice(0, 10).map((item: any) => ({
      ...item,
      media_type: 'movie'
    }));
    const tv = tvRes.data.results.slice(0, 10).map((item: any) => ({
      ...item,
      media_type: 'tv'
    }));
    
    const popMovies = popMoviesRes.data.results.slice(0, 10).map((item: any) => ({
      ...item,
      media_type: 'movie'
    }));
    const popTV = popTVRes.data.results.slice(0, 10).map((item: any) => ({
      ...item,
      media_type: 'tv'
    }));
    
    const topMovies = topMoviesRes.data.results.slice(0, 10).map((item: any) => ({
      ...item,
      media_type: 'movie'
    }));
    const topTV = topTVRes.data.results.slice(0, 10).map((item: any) => ({
      ...item,
      media_type: 'tv'
    }));
    
    return NextResponse.json({
      trendingMovies: movies,
      trendingTV: tv,
      popularMovies: popMovies,
      popularTV: popTV,
      topRatedMovies: topMovies,
      topRatedTV: topTV
    });
  } catch (error) {
    console.error('Error fetching trending content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending content' },
      { status: 500 }
    );
  }
}
