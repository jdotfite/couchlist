import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import { bulkDeleteFromLibrary, bulkUpdateStatus, getLibraryWithDetails } from '@/lib/stats';

// GET - Fetch library with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters: Parameters<typeof getLibraryWithDetails>[1] = {};

    const mediaType = searchParams.get('mediaType');
    if (mediaType === 'movie' || mediaType === 'tv') {
      filters.mediaType = mediaType;
    }

    const status = searchParams.get('status');
    if (status) {
      filters.status = status;
    }

    const minRating = searchParams.get('minRating');
    if (minRating) {
      filters.minRating = parseInt(minRating);
    }

    const maxRating = searchParams.get('maxRating');
    if (maxRating) {
      filters.maxRating = parseInt(maxRating);
    }

    const genres = searchParams.get('genres');
    if (genres) {
      filters.genres = genres.split(',').map(Number);
    }

    const minYear = searchParams.get('minYear');
    if (minYear) {
      filters.minYear = parseInt(minYear);
    }

    const maxYear = searchParams.get('maxYear');
    if (maxYear) {
      filters.maxYear = parseInt(maxYear);
    }

    const isKids = searchParams.get('isKids');
    if (isKids !== null) {
      filters.isKids = isKids === 'true';
    }

    const items = await getLibraryWithDetails(userId, Object.keys(filters).length > 0 ? filters : undefined);

    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    console.error('Error fetching library:', error);
    return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 });
  }
}

// POST - Bulk update status
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { mediaIds, newStatus } = body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: 'mediaIds is required and must be a non-empty array' }, { status: 400 });
    }

    if (!newStatus || typeof newStatus !== 'string') {
      return NextResponse.json({ error: 'newStatus is required' }, { status: 400 });
    }

    const validStatuses = ['watchlist', 'watching', 'finished', 'onhold', 'dropped'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const result = await bulkUpdateStatus(userId, mediaIds, newStatus);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error bulk updating:', error);
    return NextResponse.json({ error: 'Failed to bulk update' }, { status: 500 });
  }
}

// DELETE - Bulk delete from library
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { mediaIds } = body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: 'mediaIds is required and must be a non-empty array' }, { status: 400 });
    }

    const result = await bulkDeleteFromLibrary(userId, mediaIds);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error bulk deleting:', error);
    return NextResponse.json({ error: 'Failed to bulk delete' }, { status: 500 });
  }
}
