import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db as sql } from '@/lib/db';

// GET /api/custom-lists/media?tmdbId=123&mediaType=movie
// Returns which custom lists contain this media
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdbId');
    const mediaType = searchParams.get('mediaType');

    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { error: 'tmdbId and mediaType are required' },
        { status: 400 }
      );
    }

    const userId = Number(session.user.id);

    // Find the media record
    const mediaResult = await sql`
      SELECT id FROM media
      WHERE tmdb_id = ${Number(tmdbId)} AND media_type = ${mediaType}
    `;

    if (mediaResult.rows.length === 0) {
      // Media not in database yet, so not in any lists
      return NextResponse.json({ slugs: [], mediaId: null });
    }

    const mediaId = mediaResult.rows[0].id;

    // Find which of user's custom lists contain this media
    const result = await sql`
      SELECT cl.slug
      FROM custom_lists cl
      JOIN custom_list_items cli ON cl.id = cli.custom_list_id
      WHERE cl.user_id = ${userId} AND cli.media_id = ${mediaId}
    `;

    const slugs = result.rows.map(row => row.slug);

    return NextResponse.json({ slugs, mediaId });
  } catch (error) {
    console.error('Error fetching media custom lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom lists' },
      { status: 500 }
    );
  }
}
