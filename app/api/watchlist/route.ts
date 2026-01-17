import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail, getItemsByStatus, upsertMedia, upsertUserMediaStatus, clearUserMediaStatus, getMediaIdByTmdb } from '@/lib/library';

// Add to watchlist
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { media_id, media_type, title, poster_path } = await request.json();

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const mediaId = await upsertMedia({
      media_id,
      media_type,
      title,
      poster_path,
    });

    await upsertUserMediaStatus(userId, mediaId, 'watchlist');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }
}

// Remove from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const media_id = searchParams.get('media_id');
    const media_type = searchParams.get('media_type');

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!media_id || !media_type) {
      return NextResponse.json({ success: true });
    }

    const mediaId = await getMediaIdByTmdb(Number(media_id), media_type);
    if (mediaId) {
      await clearUserMediaStatus(userId, mediaId, 'watchlist');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
  }
}

// Get watchlist
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ items: [] });
    }

    const items = await getItemsByStatus(userId, 'watchlist');
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}
