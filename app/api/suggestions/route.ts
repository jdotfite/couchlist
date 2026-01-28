import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createBulkSuggestions,
  createBulkMultiItemSuggestions,
  getPendingSuggestions,
  getPendingSuggestionsGrouped,
  getSentSuggestions,
  getSuggestionStats,
} from '@/lib/suggestions';

// GET /api/suggestions - Get suggestions (pending received, or sent with ?sent=true)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const sent = searchParams.get('sent') === 'true';
    const grouped = searchParams.get('grouped') === 'true';
    const status = searchParams.get('status') as 'pending' | 'accepted' | 'dismissed' | undefined;

    if (sent) {
      const suggestions = await getSentSuggestions(userId, status);
      return NextResponse.json({ suggestions });
    }

    if (grouped) {
      const groupedSuggestions = await getPendingSuggestionsGrouped(userId);
      const stats = await getSuggestionStats(userId);
      return NextResponse.json({
        grouped: groupedSuggestions,
        stats,
      });
    }

    const suggestions = await getPendingSuggestions(userId);
    const stats = await getSuggestionStats(userId);

    return NextResponse.json({ suggestions, stats });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return NextResponse.json({ error: 'Failed to get suggestions' }, { status: 500 });
  }
}

// POST /api/suggestions - Create new suggestion(s)
// Supports single item: { toUserIds, tmdbId, mediaType, title, posterPath, releaseYear, note }
// Supports multiple items: { toUserIds, items: [{ tmdbId, mediaType, title, posterPath, releaseYear }], note }
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { toUserIds, items, tmdbId, mediaType, title, posterPath, releaseYear, note } = body;

    // Validate required fields
    if (!toUserIds || !Array.isArray(toUserIds) || toUserIds.length === 0) {
      return NextResponse.json({ error: 'toUserIds is required and must be a non-empty array' }, { status: 400 });
    }

    const parsedUserIds = toUserIds.map((id: number | string) => parseInt(String(id)));

    // Multi-item format
    if (items && Array.isArray(items) && items.length > 0) {
      // Validate each item
      for (const item of items) {
        if (!item.tmdbId || !item.mediaType || !item.title) {
          return NextResponse.json({ error: 'Each item must have tmdbId, mediaType, and title' }, { status: 400 });
        }
        if (!['movie', 'tv'].includes(item.mediaType)) {
          return NextResponse.json({ error: 'mediaType must be movie or tv' }, { status: 400 });
        }
      }

      const result = await createBulkMultiItemSuggestions(
        userId,
        parsedUserIds,
        items,
        note
      );

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Single item format (backwards compatible)
    if (!tmdbId || !mediaType || !title) {
      return NextResponse.json({ error: 'tmdbId, mediaType, and title are required' }, { status: 400 });
    }

    if (!['movie', 'tv'].includes(mediaType)) {
      return NextResponse.json({ error: 'mediaType must be movie or tv' }, { status: 400 });
    }

    // Create suggestions
    const result = await createBulkSuggestions(
      userId,
      parsedUserIds,
      { tmdbId, mediaType, title, posterPath, releaseYear },
      note
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error creating suggestion:', error);
    return NextResponse.json({ error: 'Failed to create suggestion' }, { status: 500 });
  }
}
