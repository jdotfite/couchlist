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

// Add to watched (finished)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { media_id, media_type, title, poster_path, rating } = await request.json();
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

    await upsertUserMediaStatus(userId, mediaId, 'finished', rating);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to watched:', error);
    return NextResponse.json({ error: 'Failed to add to watched' }, { status: 500 });
  }
}

// Remove from watched
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
      await clearUserMediaStatus(userId, mediaId, 'finished');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from watched:', error);
    return NextResponse.json({ error: 'Failed to remove from watched' }, { status: 500 });
  }
}

// Get watched
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

    const items = await getItemsByStatus(userId, 'finished');
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching watched:', error);
    return NextResponse.json({ error: 'Failed to fetch watched' }, { status: 500 });
  }
}
