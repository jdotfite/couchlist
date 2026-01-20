import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  addTagToUserMedia,
  ensureUserMedia,
  getItemsByTag,
  getMediaIdByTmdb,
  getSystemTagId,
  getUserMediaId,
  getUserIdByEmail,
  removeTagFromUserMedia,
  upsertMedia,
} from '@/lib/library';

// Add to nostalgia
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

    const userMediaId = await ensureUserMedia(userId, mediaId);
    const tagId = await getSystemTagId('nostalgia', 'Classics');
    if (tagId) {
      await addTagToUserMedia(userMediaId, tagId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to nostalgia:', error);
    return NextResponse.json({ error: 'Failed to add to nostalgia' }, { status: 500 });
  }
}

// Remove from nostalgia
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
    const tagId = await getSystemTagId('nostalgia', 'Classics');
    if (mediaId && tagId) {
      const userMediaId = await getUserMediaId(userId, mediaId);
      if (userMediaId) {
        await removeTagFromUserMedia(userMediaId, tagId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from nostalgia:', error);
    return NextResponse.json({ error: 'Failed to remove from nostalgia' }, { status: 500 });
  }
}

// Get nostalgia
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

    const items = await getItemsByTag(userId, 'nostalgia');
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching nostalgia:', error);
    return NextResponse.json({ error: 'Failed to fetch nostalgia' }, { status: 500 });
  }
}
