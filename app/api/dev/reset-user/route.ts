import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/lib/auth';

// POST /api/dev/reset-user?username=xxx&confirm=yes - Factory reset a specific user's account
// WARNING: This deletes ALL user data except the account itself
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const confirm = searchParams.get('confirm');

    if (!username) {
      return NextResponse.json({ error: 'username parameter is required' }, { status: 400 });
    }

    if (confirm !== 'yes') {
      return NextResponse.json({
        error: 'Add &confirm=yes to actually reset the account',
        wouldReset: username
      }, { status: 400 });
    }

    // Find the user by username
    const userResult = await sql`
      SELECT id, name, username, email FROM users
      WHERE username = ${username} OR email = ${username}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: `User "${username}" not found` }, { status: 404 });
    }

    const targetUser = userResult.rows[0];
    const userId = targetUser.id;
    const results: Record<string, number> = {};

    console.log(`Resetting account for user: ${targetUser.name} (${targetUser.email})`);

    // 1. Clear user_media_tags first (foreign key to user_media)
    const tagsResult = await sql`
      DELETE FROM user_media_tags
      WHERE user_media_id IN (
        SELECT id FROM user_media WHERE user_id = ${userId}
      )
    `;
    results.mediaTags = tagsResult.rowCount || 0;

    // 2. Clear user_media (all lists: watchlist, watching, finished, onhold, dropped)
    const userMediaResult = await sql`
      DELETE FROM user_media WHERE user_id = ${userId}
    `;
    results.userMedia = userMediaResult.rowCount || 0;

    // 3. Clear custom list items (user_id is the column name)
    const customListItemsResult = await sql`
      DELETE FROM custom_list_items
      WHERE custom_list_id IN (
        SELECT id FROM custom_lists WHERE user_id = ${userId}
      )
    `;
    results.customListItems = customListItemsResult.rowCount || 0;

    // 4. Clear custom list collaborators
    const customListCollabsResult = await sql`
      DELETE FROM custom_list_collaborators
      WHERE custom_list_id IN (
        SELECT id FROM custom_lists WHERE user_id = ${userId}
      ) OR user_id = ${userId}
    `;
    results.customListCollaborators = customListCollabsResult.rowCount || 0;

    // 5. Clear custom lists (user_id is the column name)
    const customListsResult = await sql`
      DELETE FROM custom_lists WHERE user_id = ${userId}
    `;
    results.customLists = customListsResult.rowCount || 0;

    // 6. Clear friend suggestions (sent and received)
    const suggestionsResult = await sql`
      DELETE FROM friend_suggestions
      WHERE from_user_id = ${userId} OR to_user_id = ${userId}
    `;
    results.suggestions = suggestionsResult.rowCount || 0;

    // 7. Clear shared lists first (foreign key to collaborators)
    const sharedListsResult = await sql`
      DELETE FROM shared_lists
      WHERE collaborator_id IN (
        SELECT id FROM collaborators
        WHERE owner_id = ${userId} OR collaborator_id = ${userId}
      )
    `;
    results.sharedLists = sharedListsResult.rowCount || 0;

    // 8. Clear collaborators/connections (friends and partners)
    const collaboratorsResult = await sql`
      DELETE FROM collaborators
      WHERE owner_id = ${userId} OR collaborator_id = ${userId} OR target_user_id = ${userId}
    `;
    results.collaborators = collaboratorsResult.rowCount || 0;

    // 9. Clear partner list item statuses
    try {
      const partnerItemStatusResult = await sql`
        DELETE FROM partner_list_item_status WHERE user_id = ${userId}
      `;
      results.partnerListItemStatus = partnerItemStatusResult.rowCount || 0;
    } catch (e) {
      results.partnerListItemStatus = 0; // Table might not exist
    }

    // 10. Clear partner list items
    try {
      const partnerListItemsResult = await sql`
        DELETE FROM partner_list_items
        WHERE partner_list_id IN (
          SELECT pl.id FROM partner_lists pl
          JOIN partner_list_members plm ON plm.partner_list_id = pl.id
          WHERE plm.user_id = ${userId}
        )
      `;
      results.partnerListItems = partnerListItemsResult.rowCount || 0;
    } catch (e) {
      results.partnerListItems = 0;
    }

    // 11. Clear partner list members
    try {
      const partnerListMembersResult = await sql`
        DELETE FROM partner_list_members WHERE user_id = ${userId}
      `;
      results.partnerListMembers = partnerListMembersResult.rowCount || 0;
    } catch (e) {
      results.partnerListMembers = 0;
    }

    // 12. Clear notifications
    const notificationsResult = await sql`
      DELETE FROM notifications WHERE user_id = ${userId}
    `;
    results.notifications = notificationsResult.rowCount || 0;

    // 13. Clear user notification settings
    try {
      const notifSettingsResult = await sql`
        DELETE FROM user_notification_settings WHERE user_id = ${userId}
      `;
      results.notificationSettings = notifSettingsResult.rowCount || 0;
    } catch (e) {
      results.notificationSettings = 0;
    }

    // 14. Clear user show alert settings
    try {
      const showAlertSettingsResult = await sql`
        DELETE FROM user_show_alert_settings WHERE user_id = ${userId}
      `;
      results.showAlertSettings = showAlertSettingsResult.rowCount || 0;
    } catch (e) {
      results.showAlertSettings = 0;
    }

    // 15. Clear user list preferences (custom list names)
    try {
      const listPrefsResult = await sql`
        DELETE FROM user_list_preferences WHERE user_id = ${userId}
      `;
      results.listPreferences = listPrefsResult.rowCount || 0;
    } catch (e) {
      results.listPreferences = 0;
    }

    // 16. Clear episode progress
    try {
      const episodeProgressResult = await sql`
        DELETE FROM episode_progress WHERE user_id = ${userId}
      `;
      results.episodeProgress = episodeProgressResult.rowCount || 0;
    } catch (e) {
      results.episodeProgress = 0;
    }

    // 17. Clear Trakt connections
    try {
      const traktResult = await sql`
        DELETE FROM trakt_connections WHERE user_id = ${userId}
      `;
      results.traktConnections = traktResult.rowCount || 0;
    } catch (e) {
      results.traktConnections = 0;
    }

    // 18. Clear list visibility settings
    try {
      const listVisibilityResult = await sql`
        DELETE FROM list_visibility WHERE user_id = ${userId}
      `;
      results.listVisibility = listVisibilityResult.rowCount || 0;
    } catch (e) {
      results.listVisibility = 0;
    }

    // 19. Clear friend list access (both directions)
    try {
      const friendListAccessResult = await sql`
        DELETE FROM friend_list_access
        WHERE owner_id = ${userId} OR friend_id = ${userId}
      `;
      results.friendListAccess = friendListAccessResult.rowCount || 0;
    } catch (e) {
      results.friendListAccess = 0;
    }

    // 20. Clear friend default sharing preferences
    try {
      const friendDefaultSharingResult = await sql`
        DELETE FROM friend_default_sharing WHERE user_id = ${userId}
      `;
      results.friendDefaultSharing = friendDefaultSharingResult.rowCount || 0;
    } catch (e) {
      results.friendDefaultSharing = 0;
    }

    // Calculate total deleted
    const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      success: true,
      message: `Account "${targetUser.name}" (${targetUser.username || targetUser.email}) has been reset`,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        username: targetUser.username,
        email: targetUser.email,
      },
      deleted: results,
      totalDeleted,
    });
  } catch (error) {
    console.error('Error resetting user account:', error);
    return NextResponse.json(
      { error: 'Failed to reset account', details: String(error) },
      { status: 500 }
    );
  }
}
