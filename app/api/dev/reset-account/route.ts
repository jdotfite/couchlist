import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/lib/auth';

// POST /api/dev/reset-account - Factory reset the authenticated user's account
// WARNING: This deletes ALL user data except the account itself
export async function POST(request: NextRequest) {
  // Only allow in development or with explicit confirmation
  const { searchParams } = new URL(request.url);
  const confirm = searchParams.get('confirm');

  if (process.env.NODE_ENV === 'production' && confirm !== 'yes-delete-everything') {
    return NextResponse.json(
      { error: 'This endpoint requires ?confirm=yes-delete-everything in production' },
      { status: 400 }
    );
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const results: Record<string, number> = {};

    // 1. Clear user_media (all lists: watchlist, watching, finished, onhold, dropped)
    const userMediaResult = await sql`
      DELETE FROM user_media WHERE user_id = ${userId}
      RETURNING id
    `;
    results.userMedia = userMediaResult.rowCount || 0;

    // 2. Clear user_media_tags (favorites, rewatch, nostalgia associations)
    // These are linked via user_media, so they should cascade, but let's be explicit
    const tagsResult = await sql`
      DELETE FROM user_media_tags
      WHERE user_media_id IN (
        SELECT id FROM user_media WHERE user_id = ${userId}
      )
      RETURNING user_media_id
    `;
    results.mediaTags = tagsResult.rowCount || 0;

    // 3. Clear custom list items
    const customListItemsResult = await sql`
      DELETE FROM custom_list_items
      WHERE custom_list_id IN (
        SELECT id FROM custom_lists WHERE owner_id = ${userId}
      )
      RETURNING id
    `;
    results.customListItems = customListItemsResult.rowCount || 0;

    // 4. Clear custom list collaborators
    const customListCollabsResult = await sql`
      DELETE FROM custom_list_collaborators
      WHERE custom_list_id IN (
        SELECT id FROM custom_lists WHERE owner_id = ${userId}
      ) OR user_id = ${userId}
      RETURNING id
    `;
    results.customListCollaborators = customListCollabsResult.rowCount || 0;

    // 5. Clear custom lists
    const customListsResult = await sql`
      DELETE FROM custom_lists WHERE owner_id = ${userId}
      RETURNING id
    `;
    results.customLists = customListsResult.rowCount || 0;

    // 6. Clear friend suggestions (sent and received)
    const suggestionsResult = await sql`
      DELETE FROM friend_suggestions
      WHERE from_user_id = ${userId} OR to_user_id = ${userId}
      RETURNING id
    `;
    results.suggestions = suggestionsResult.rowCount || 0;

    // 7. Clear collaborators/connections (friends and partners)
    const collaboratorsResult = await sql`
      DELETE FROM collaborators
      WHERE owner_id = ${userId} OR collaborator_id = ${userId}
      RETURNING id
    `;
    results.collaborators = collaboratorsResult.rowCount || 0;

    // 8. Clear shared lists
    const sharedListsResult = await sql`
      DELETE FROM shared_lists
      WHERE collaborator_id IN (
        SELECT id FROM collaborators
        WHERE owner_id = ${userId} OR collaborator_id = ${userId}
      )
      RETURNING id
    `;
    results.sharedLists = sharedListsResult.rowCount || 0;

    // 9. Clear partner lists and items
    const partnerListItemsResult = await sql`
      DELETE FROM partner_list_items
      WHERE partner_list_id IN (
        SELECT pl.id FROM partner_lists pl
        JOIN partner_list_members plm ON plm.partner_list_id = pl.id
        WHERE plm.user_id = ${userId}
      )
      RETURNING id
    `;
    results.partnerListItems = partnerListItemsResult.rowCount || 0;

    const partnerListMembersResult = await sql`
      DELETE FROM partner_list_members WHERE user_id = ${userId}
      RETURNING id
    `;
    results.partnerListMembers = partnerListMembersResult.rowCount || 0;

    // 10. Clear notifications
    const notificationsResult = await sql`
      DELETE FROM notifications WHERE user_id = ${userId}
      RETURNING id
    `;
    results.notifications = notificationsResult.rowCount || 0;

    // 11. Clear user notification settings
    const notifSettingsResult = await sql`
      DELETE FROM user_notification_settings WHERE user_id = ${userId}
      RETURNING id
    `;
    results.notificationSettings = notifSettingsResult.rowCount || 0;

    // 12. Clear user show alert settings
    const showAlertSettingsResult = await sql`
      DELETE FROM user_show_alert_settings WHERE user_id = ${userId}
      RETURNING id
    `;
    results.showAlertSettings = showAlertSettingsResult.rowCount || 0;

    // 13. Clear user list preferences (custom list names)
    const listPrefsResult = await sql`
      DELETE FROM user_list_preferences WHERE user_id = ${userId}
      RETURNING id
    `;
    results.listPreferences = listPrefsResult.rowCount || 0;

    // 14. Clear episode progress
    const episodeProgressResult = await sql`
      DELETE FROM episode_progress WHERE user_id = ${userId}
      RETURNING id
    `;
    results.episodeProgress = episodeProgressResult.rowCount || 0;

    // 15. Clear Trakt connections
    const traktResult = await sql`
      DELETE FROM trakt_connections WHERE user_id = ${userId}
      RETURNING id
    `;
    results.traktConnections = traktResult.rowCount || 0;

    // Calculate total deleted
    const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      success: true,
      message: 'Account has been reset',
      deleted: results,
      totalDeleted,
    });
  } catch (error) {
    console.error('Error resetting account:', error);
    return NextResponse.json(
      { error: 'Failed to reset account', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/dev/reset-account - Show what would be deleted (dry run)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const counts: Record<string, number> = {};

    // Count what would be deleted
    const userMediaCount = await sql`SELECT COUNT(*)::int as count FROM user_media WHERE user_id = ${userId}`;
    counts.userMedia = userMediaCount.rows[0].count;

    const customListsCount = await sql`SELECT COUNT(*)::int as count FROM custom_lists WHERE owner_id = ${userId}`;
    counts.customLists = customListsCount.rows[0].count;

    const suggestionsCount = await sql`
      SELECT COUNT(*)::int as count FROM friend_suggestions
      WHERE from_user_id = ${userId} OR to_user_id = ${userId}
    `;
    counts.suggestions = suggestionsCount.rows[0].count;

    const collaboratorsCount = await sql`
      SELECT COUNT(*)::int as count FROM collaborators
      WHERE owner_id = ${userId} OR collaborator_id = ${userId}
    `;
    counts.collaborators = collaboratorsCount.rows[0].count;

    const notificationsCount = await sql`SELECT COUNT(*)::int as count FROM notifications WHERE user_id = ${userId}`;
    counts.notifications = notificationsCount.rows[0].count;

    const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      message: 'Dry run - nothing deleted',
      wouldDelete: counts,
      totalItems: totalCount,
      instructions: 'To reset, send a POST request to this endpoint. In production, add ?confirm=yes-delete-everything',
    });
  } catch (error) {
    console.error('Error counting items:', error);
    return NextResponse.json(
      { error: 'Failed to count items', details: String(error) },
      { status: 500 }
    );
  }
}
