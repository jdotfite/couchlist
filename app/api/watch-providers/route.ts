import { NextRequest, NextResponse } from 'next/server';
import { tmdbApi } from '@/lib/tmdb';

interface ProviderRequest {
  id: number;
  media_type: 'movie' | 'tv';
}

interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface ProviderResult {
  id: number;
  media_type: 'movie' | 'tv';
  providers: WatchProvider[];
}

// GET /api/watch-providers?items=movie:123,tv:456,movie:789
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const itemsParam = searchParams.get('items');

  if (!itemsParam) {
    return NextResponse.json({ error: 'Missing items parameter' }, { status: 400 });
  }

  // Parse items: "movie:123,tv:456" -> [{media_type: 'movie', id: 123}, ...]
  const items: ProviderRequest[] = itemsParam.split(',').map(item => {
    const [type, id] = item.split(':');
    return {
      media_type: type as 'movie' | 'tv',
      id: parseInt(id, 10),
    };
  }).filter(item => item.id && (item.media_type === 'movie' || item.media_type === 'tv'));

  if (items.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Limit to 12 items to avoid too many API calls
  const limitedItems = items.slice(0, 12);

  try {
    // Fetch providers for all items in parallel
    const results = await Promise.all(
      limitedItems.map(async (item): Promise<ProviderResult> => {
        try {
          const response = await tmdbApi.get(`/${item.media_type}/${item.id}/watch/providers`);
          const data = response.data;

          // Get US flatrate (subscription) providers
          const usProviders = data.results?.US?.flatrate || [];

          // Return only the top streaming providers (limit to 4)
          const providers: WatchProvider[] = usProviders.slice(0, 4).map((p: any) => ({
            provider_id: p.provider_id,
            provider_name: p.provider_name,
            logo_path: p.logo_path,
          }));

          return {
            id: item.id,
            media_type: item.media_type,
            providers,
          };
        } catch (error) {
          // Return empty providers on error for this item
          return {
            id: item.id,
            media_type: item.media_type,
            providers: [],
          };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error fetching watch providers:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}
