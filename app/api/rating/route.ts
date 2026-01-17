import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getMediaIdByTmdb,
  getRating,
  getUserIdByEmail,
  updateRating,
  upsertMedia,
  ensureUserMedia,
} from '@/lib/library';

// Get rating for a specific media item
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
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ rating: null });
    }

    const rating = await getRating(userId, Number(tmdbId), mediaType);
    return NextResponse.json({ rating });
  } catch (error) {
    console.error('Error fetching rating:', error);
    return NextResponse.json({ error: 'Failed to fetch rating' }, { status: 500 });
  }
}

// Update rating for a media item
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tmdb_id, media_type, title, poster_path, rating } = await request.json();

    if (!tmdb_id || !media_type) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Validate rating (0-10, where 0 means no rating)
    if (rating !== null && (rating < 0 || rating > 10)) {
      return NextResponse.json({ error: 'Rating must be between 0 and 10' }, { status: 400 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure media exists
    const mediaId = await upsertMedia({
      media_id: tmdb_id,
      media_type,
      title: title || '',
      poster_path: poster_path || null,
    });

    // Ensure user_media record exists
    await ensureUserMedia(userId, mediaId);

    // Update the rating
    await updateRating(userId, mediaId, rating === 0 ? null : rating);

    return NextResponse.json({ success: true, rating: rating === 0 ? null : rating });
  } catch (error) {
    console.error('Error updating rating:', error);
    return NextResponse.json({ error: 'Failed to update rating' }, { status: 500 });
  }
}
