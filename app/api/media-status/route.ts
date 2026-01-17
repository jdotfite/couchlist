import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail, getMediaStatus } from '@/lib/library';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdb_id');
    const mediaType = searchParams.get('media_type');

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: 'Missing tmdb_id or media_type' }, { status: 400 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({
        status: null,
        tags: { favorites: false, rewatch: false, nostalgia: false },
        rating: null,
      });
    }

    const status = await getMediaStatus(userId, Number(tmdbId), mediaType);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching media status:', error);
    return NextResponse.json({ error: 'Failed to fetch media status' }, { status: 500 });
  }
}
