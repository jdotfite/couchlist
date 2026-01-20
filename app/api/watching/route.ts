import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  clearUserMediaStatus,
  getItemsByStatus,
  getMediaIdByTmdb,
  getUserIdByEmail,
  upsertMedia,
  upsertUserMediaStatus,
} from '@/lib/library';

// Add to watching
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { media_id, media_type, title, poster_path, genre_ids, release_year } = await request.json();
    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const mediaId = await upsertMedia({
      media_id,
      media_type,
      title,
      poster_path,
      genre_ids,
      release_year,
    });

    await upsertUserMediaStatus(userId, mediaId, 'watching');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to watching:', error);
    return NextResponse.json({ error: 'Failed to add to watching' }, { status: 500 });
  }
}

// Remove from watching
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
      await clearUserMediaStatus(userId, mediaId, 'watching');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from watching:', error);
    return NextResponse.json({ error: 'Failed to remove from watching' }, { status: 500 });
  }
}

// Get watching
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

    const items = await getItemsByStatus(userId, 'watching');
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching watching:', error);
    return NextResponse.json({ error: 'Failed to fetch watching' }, { status: 500 });
  }
}
