import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import { db as sql } from '@/lib/db';
import { tmdbGetWithRetry } from '@/lib/tmdb';

export interface RecommendationSource {
  id: number;
  title: string;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
}

export interface NewEpisodeItem {
  media_id: number;
  title: string;
  poster_path: string | null;
  next_episode_to_air_date: string;
  next_episode_season: number;
  next_episode_number: number;
  next_episode_name: string | null;
}

export interface RecommendationItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
}

interface HomeRecommendationsResponse {
  newEpisodes: NewEpisodeItem[];
  recommendationSource: RecommendationSource | null;
  recommendations: RecommendationItem[];
  trending: RecommendationItem[];
}

// GET /api/home/recommendations - Get personalized home page data
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      // New user with no library - return empty data with trending fallback
      const trending = await fetchTrending();
      return NextResponse.json({
        newEpisodes: [],
        recommendationSource: null,
        recommendations: [],
        trending,
      } satisfies HomeRecommendationsResponse);
    }

    // Fetch data in parallel
    const [newEpisodes, watchingShows, trending] = await Promise.all([
      getNewEpisodes(userId),
      getWatchingShows(userId),
      fetchTrending(),
    ]);

    // Pick a high-signal title for recommendations
    const recommendationSource = pickRecommendationSource(watchingShows);

    // Fetch recommendations if we have a source
    let recommendations: RecommendationItem[] = [];
    if (recommendationSource) {
      const userLibraryIds = await getUserLibraryTmdbIds(userId);
      recommendations = await fetchRecommendations(
        recommendationSource.id,
        recommendationSource.media_type,
        userLibraryIds
      );
    }

    return NextResponse.json({
      newEpisodes,
      recommendationSource,
      recommendations,
      trending,
    } satisfies HomeRecommendationsResponse);
  } catch (error) {
    console.error('Error fetching home recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

// Get TV shows with upcoming episodes (airing within the next 14 days)
async function getNewEpisodes(userId: number): Promise<NewEpisodeItem[]> {
  try {
    const result = await sql`
      SELECT
        m.tmdb_id AS media_id,
        m.title,
        m.poster_path,
        tsm.next_episode_to_air_date,
        tsm.next_episode_season,
        tsm.next_episode_number,
        tsm.next_episode_name
      FROM user_media um
      JOIN media m ON um.media_id = m.id
      LEFT JOIN tv_show_metadata tsm ON m.id = tsm.media_id
      WHERE um.user_id = ${userId}
        AND um.status IN ('watching', 'finished')
        AND m.media_type = 'tv'
        AND tsm.next_episode_to_air_date IS NOT NULL
        AND tsm.next_episode_to_air_date >= CURRENT_DATE
        AND tsm.next_episode_to_air_date <= CURRENT_DATE + INTERVAL '14 days'
      ORDER BY tsm.next_episode_to_air_date ASC
      LIMIT 10
    `;
    return result.rows as NewEpisodeItem[];
  } catch (error) {
    console.error('Error fetching new episodes:', error);
    return [];
  }
}

interface WatchingShow {
  tmdb_id: number;
  title: string;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  status_updated_at: Date;
  has_future_episode: boolean;
}

// Get user's watching shows for recommendation source selection
async function getWatchingShows(userId: number): Promise<WatchingShow[]> {
  try {
    const result = await sql`
      SELECT
        m.tmdb_id,
        m.title,
        m.media_type,
        m.poster_path,
        um.status_updated_at,
        (tsm.next_episode_to_air_date IS NOT NULL AND tsm.next_episode_to_air_date > CURRENT_DATE) AS has_future_episode
      FROM user_media um
      JOIN media m ON um.media_id = m.id
      LEFT JOIN tv_show_metadata tsm ON m.id = tsm.media_id
      WHERE um.user_id = ${userId}
        AND um.status = 'watching'
      ORDER BY um.status_updated_at DESC
      LIMIT 20
    `;
    return result.rows as WatchingShow[];
  } catch (error) {
    console.error('Error fetching watching shows:', error);
    return [];
  }
}

// Pick the best title to base recommendations on
function pickRecommendationSource(shows: WatchingShow[]): RecommendationSource | null {
  if (shows.length === 0) return null;

  // Prioritize TV shows that are currently airing (have future episodes)
  const airingShow = shows.find(s => s.media_type === 'tv' && s.has_future_episode);
  if (airingShow) {
    return {
      id: airingShow.tmdb_id,
      title: airingShow.title,
      media_type: airingShow.media_type,
      poster_path: airingShow.poster_path,
    };
  }

  // Fall back to most recently added watching item
  const recent = shows[0];
  return {
    id: recent.tmdb_id,
    title: recent.title,
    media_type: recent.media_type,
    poster_path: recent.poster_path,
  };
}

// Get all TMDB IDs in user's library for filtering
async function getUserLibraryTmdbIds(userId: number): Promise<Set<string>> {
  try {
    const result = await sql`
      SELECT m.tmdb_id, m.media_type
      FROM user_media um
      JOIN media m ON um.media_id = m.id
      WHERE um.user_id = ${userId}
    `;
    return new Set(result.rows.map(r => `${r.media_type}-${r.tmdb_id}`));
  } catch (error) {
    console.error('Error fetching user library IDs:', error);
    return new Set();
  }
}

// Fetch TMDB recommendations for a title
async function fetchRecommendations(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  excludeIds: Set<string>
): Promise<RecommendationItem[]> {
  try {
    const response = await tmdbGetWithRetry(`/${mediaType}/${tmdbId}/recommendations`);
    const results = response.data.results || [];

    // Filter out items already in user's library and add media_type
    const filtered = results
      .map((item: any) => ({
        id: item.id,
        title: item.title,
        name: item.name,
        poster_path: item.poster_path,
        media_type: mediaType,
        release_date: item.release_date,
        first_air_date: item.first_air_date,
      }))
      .filter((item: RecommendationItem) => !excludeIds.has(`${item.media_type}-${item.id}`))
      .slice(0, 10);

    // If we don't have enough recommendations, try similar endpoint
    if (filtered.length < 5) {
      const similarResponse = await tmdbGetWithRetry(`/${mediaType}/${tmdbId}/similar`);
      const similarResults = similarResponse.data.results || [];

      const existing = new Set(filtered.map((i: RecommendationItem) => i.id));
      const additional = similarResults
        .map((item: any) => ({
          id: item.id,
          title: item.title,
          name: item.name,
          poster_path: item.poster_path,
          media_type: mediaType,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
        }))
        .filter((item: RecommendationItem) =>
          !excludeIds.has(`${item.media_type}-${item.id}`) && !existing.has(item.id)
        )
        .slice(0, 10 - filtered.length);

      filtered.push(...additional);
    }

    return filtered;
  } catch (error) {
    console.error('Error fetching TMDB recommendations:', error);
    return [];
  }
}

// Fetch trending content as fallback
async function fetchTrending(): Promise<RecommendationItem[]> {
  try {
    const response = await tmdbGetWithRetry('/trending/all/week');
    const results = response.data.results || [];

    return results.slice(0, 10).map((item: any) => ({
      id: item.id,
      title: item.title,
      name: item.name,
      poster_path: item.poster_path,
      media_type: item.media_type as 'movie' | 'tv',
      release_date: item.release_date,
      first_air_date: item.first_air_date,
    }));
  } catch (error) {
    console.error('Error fetching trending content:', error);
    return [];
  }
}
