import { sql } from '@vercel/postgres';
import { createNotification } from './show-alerts';
import { areFriends } from './collaborators';
import type {
  FriendSuggestion,
  FriendSuggestionWithDetails,
  GroupedSuggestions,
} from '@/types/sharing';

// ============================================================================
// Create Suggestions
// ============================================================================

export async function createSuggestion(
  fromUserId: number,
  toUserId: number,
  mediaData: {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterPath?: string;
    releaseYear?: number;
  },
  note?: string
): Promise<{ success: boolean; suggestionId?: number; error?: string }> {
  // Verify they are friends
  if (!(await areFriends(fromUserId, toUserId))) {
    return { success: false, error: 'You can only suggest to friends' };
  }

  // Ensure media exists in catalog
  const mediaResult = await sql`
    INSERT INTO media (tmdb_id, media_type, title, poster_path, release_year)
    VALUES (${mediaData.tmdbId}, ${mediaData.mediaType}, ${mediaData.title}, ${mediaData.posterPath || null}, ${mediaData.releaseYear || null})
    ON CONFLICT (tmdb_id, media_type) DO UPDATE SET
      title = EXCLUDED.title,
      poster_path = COALESCE(EXCLUDED.poster_path, media.poster_path),
      release_year = COALESCE(EXCLUDED.release_year, media.release_year)
    RETURNING id
  `;

  const mediaId = mediaResult.rows[0].id;

  // Check if target already has this in their library
  const existingInLibrary = await sql`
    SELECT id FROM user_media
    WHERE user_id = ${toUserId} AND media_id = ${mediaId}
  `;

  if (existingInLibrary.rows.length > 0) {
    return { success: false, error: 'Already in their library' };
  }

  // Check for existing pending suggestion
  const existingSuggestion = await sql`
    SELECT id, status FROM friend_suggestions
    WHERE from_user_id = ${fromUserId}
    AND to_user_id = ${toUserId}
    AND media_id = ${mediaId}
  `;

  if (existingSuggestion.rows.length > 0) {
    const existing = existingSuggestion.rows[0];
    if (existing.status === 'pending') {
      return { success: false, error: 'Already suggested' };
    }
    // If previously dismissed, allow re-suggesting by updating
    await sql`
      UPDATE friend_suggestions
      SET status = 'pending', note = ${note || null}, created_at = NOW(), responded_at = NULL
      WHERE id = ${existing.id}
    `;

    await createSuggestionNotification(existing.id, fromUserId, toUserId, mediaId, mediaData.title);
    return { success: true, suggestionId: existing.id };
  }

  // Create new suggestion
  const result = await sql`
    INSERT INTO friend_suggestions (from_user_id, to_user_id, media_id, note)
    VALUES (${fromUserId}, ${toUserId}, ${mediaId}, ${note || null})
    RETURNING id
  `;

  const suggestionId = result.rows[0].id;

  // Create or update notification
  await createSuggestionNotification(suggestionId, fromUserId, toUserId, mediaId, mediaData.title);

  return { success: true, suggestionId };
}

export async function createBulkSuggestions(
  fromUserId: number,
  toUserIds: number[],
  mediaData: {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterPath?: string;
    releaseYear?: number;
  },
  note?: string
): Promise<{ created: number; alreadyExists: number; alreadyOnList: number; notFriends: number }> {
  let created = 0;
  let alreadyExists = 0;
  let alreadyOnList = 0;
  let notFriends = 0;

  for (const toUserId of toUserIds) {
    const result = await createSuggestion(fromUserId, toUserId, mediaData, note);

    if (result.success) {
      created++;
    } else if (result.error === 'Already suggested') {
      alreadyExists++;
    } else if (result.error === 'Already in their library') {
      alreadyOnList++;
    } else if (result.error === 'You can only suggest to friends') {
      notFriends++;
    }
  }

  return { created, alreadyExists, alreadyOnList, notFriends };
}

// ============================================================================
// Notification Grouping
// ============================================================================

async function createSuggestionNotification(
  suggestionId: number,
  fromUserId: number,
  toUserId: number,
  mediaId: number,
  mediaTitle: string
) {
  // Get suggester info
  const suggesterResult = await sql`
    SELECT name, username, profile_image FROM users WHERE id = ${fromUserId}
  `;
  const suggester = suggesterResult.rows[0];
  const suggesterName = suggester?.name || 'Someone';

  // Check for existing unread suggestion notification from same user within 24h
  const existingNotif = await sql`
    SELECT id, type, data FROM notifications
    WHERE user_id = ${toUserId}
    AND type IN ('friend_suggestion', 'friend_suggestion_group')
    AND (data->>'suggester_id')::int = ${fromUserId}
    AND is_read = false
    AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (existingNotif.rows.length > 0) {
    // Update to grouped notification
    const current = existingNotif.rows[0];
    const currentData = current.data || {};
    const currentIds: number[] = currentData.suggestion_ids ||
      (currentData.suggestion_id ? [currentData.suggestion_id] : []);

    // Don't add if already in the list
    if (currentIds.includes(suggestionId)) {
      return;
    }

    const newIds = [...currentIds, suggestionId];
    const count = newIds.length;

    await sql`
      UPDATE notifications
      SET type = 'friend_suggestion_group',
          title = ${`${suggesterName} suggested ${count} titles`},
          media_id = NULL,
          data = ${JSON.stringify({
            suggester_id: fromUserId,
            suggester_name: suggesterName,
            suggester_image: suggester?.profile_image,
            suggestion_ids: newIds,
            suggestion_count: count,
          })},
          created_at = NOW()
      WHERE id = ${current.id}
    `;
  } else {
    // Create single notification
    await createNotification({
      user_id: toUserId,
      type: 'friend_suggestion',
      title: `${suggesterName} suggested ${mediaTitle}`,
      media_id: mediaId,
      data: {
        suggestion_id: suggestionId,
        suggester_id: fromUserId,
        suggester_name: suggesterName,
        suggester_image: suggester?.profile_image,
      },
    });
  }
}

// ============================================================================
// Get Suggestions
// ============================================================================

export async function getPendingSuggestions(
  userId: number
): Promise<FriendSuggestionWithDetails[]> {
  const result = await sql`
    SELECT
      fs.*,
      u.name as from_user_name,
      u.username as from_user_username,
      u.profile_image as from_user_image,
      m.title as media_title,
      m.poster_path as media_poster_path,
      m.media_type,
      m.tmdb_id as media_tmdb_id,
      m.release_year as media_release_year
    FROM friend_suggestions fs
    JOIN users u ON u.id = fs.from_user_id
    JOIN media m ON m.id = fs.media_id
    WHERE fs.to_user_id = ${userId}
    AND fs.status = 'pending'
    ORDER BY fs.created_at DESC
  `;

  return result.rows as FriendSuggestionWithDetails[];
}

export async function getSuggestionCount(userId: number): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count
    FROM friend_suggestions
    WHERE to_user_id = ${userId}
    AND status = 'pending'
  `;

  return parseInt(result.rows[0].count, 10);
}

export async function getPendingSuggestionsGrouped(
  userId: number
): Promise<GroupedSuggestions[]> {
  const suggestions = await getPendingSuggestions(userId);

  // Group by from_user_id
  const grouped = new Map<number, GroupedSuggestions>();

  for (const suggestion of suggestions) {
    const existing = grouped.get(suggestion.from_user_id);

    if (existing) {
      existing.suggestions.push(suggestion);
      existing.total_count++;
      if (suggestion.created_at > existing.latest_at) {
        existing.latest_at = suggestion.created_at;
      }
    } else {
      grouped.set(suggestion.from_user_id, {
        from_user_id: suggestion.from_user_id,
        from_user_name: suggestion.from_user_name,
        from_user_username: suggestion.from_user_username,
        from_user_image: suggestion.from_user_image,
        suggestions: [suggestion],
        total_count: 1,
        latest_at: suggestion.created_at,
      });
    }
  }

  // Sort by latest_at descending
  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime()
  );
}

export async function getSentSuggestions(
  userId: number,
  status?: 'pending' | 'accepted' | 'dismissed'
): Promise<FriendSuggestionWithDetails[]> {
  let query = `
    SELECT
      fs.*,
      u.name as from_user_name,
      u.username as from_user_username,
      u.profile_image as from_user_image,
      m.title as media_title,
      m.poster_path as media_poster_path,
      m.media_type,
      m.tmdb_id as media_tmdb_id,
      m.release_year as media_release_year,
      target.name as to_user_name,
      target.username as to_user_username
    FROM friend_suggestions fs
    JOIN users u ON u.id = fs.from_user_id
    JOIN users target ON target.id = fs.to_user_id
    JOIN media m ON m.id = fs.media_id
    WHERE fs.from_user_id = $1
  `;

  const params: (number | string)[] = [userId];

  if (status) {
    query += ` AND fs.status = $2`;
    params.push(status);
  }

  query += ` ORDER BY fs.created_at DESC`;

  const result = await sql.query(query, params);
  return result.rows as FriendSuggestionWithDetails[];
}

export async function getSuggestion(
  suggestionId: number,
  userId: number
): Promise<FriendSuggestionWithDetails | null> {
  const result = await sql`
    SELECT
      fs.*,
      u.name as from_user_name,
      u.username as from_user_username,
      u.profile_image as from_user_image,
      m.title as media_title,
      m.poster_path as media_poster_path,
      m.media_type,
      m.tmdb_id as media_tmdb_id,
      m.release_year as media_release_year
    FROM friend_suggestions fs
    JOIN users u ON u.id = fs.from_user_id
    JOIN media m ON m.id = fs.media_id
    WHERE fs.id = ${suggestionId}
    AND (fs.to_user_id = ${userId} OR fs.from_user_id = ${userId})
  `;

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as FriendSuggestionWithDetails;
}

// ============================================================================
// Accept / Dismiss Suggestions
// ============================================================================

export async function acceptSuggestion(
  suggestionId: number,
  userId: number,
  status: string = 'watchlist'
): Promise<{ success: boolean; userMediaId?: number; error?: string }> {
  // Get the suggestion
  const suggestion = await getSuggestion(suggestionId, userId);

  if (!suggestion) {
    return { success: false, error: 'Suggestion not found' };
  }

  if (suggestion.to_user_id !== userId) {
    return { success: false, error: 'This suggestion is not for you' };
  }

  if (suggestion.status !== 'pending') {
    return { success: false, error: 'Suggestion already processed' };
  }

  // Check if already in library
  const existingResult = await sql`
    SELECT id FROM user_media
    WHERE user_id = ${userId} AND media_id = ${suggestion.media_id}
  `;

  if (existingResult.rows.length > 0) {
    // Mark as accepted but don't add again
    await sql`
      UPDATE friend_suggestions
      SET status = 'accepted', responded_at = NOW()
      WHERE id = ${suggestionId}
    `;
    return { success: false, error: 'Already in your library' };
  }

  // Add to user's library with attribution
  const userMediaResult = await sql`
    INSERT INTO user_media (user_id, media_id, status, suggested_by_user_id, added_by)
    VALUES (${userId}, ${suggestion.media_id}, ${status}, ${suggestion.from_user_id}, ${userId})
    RETURNING id
  `;

  const userMediaId = userMediaResult.rows[0].id;

  // Mark suggestion as accepted
  await sql`
    UPDATE friend_suggestions
    SET status = 'accepted', responded_at = NOW()
    WHERE id = ${suggestionId}
  `;

  return { success: true, userMediaId };
}

export async function acceptMultipleSuggestions(
  suggestionIds: number[],
  userId: number,
  status: string = 'watchlist'
): Promise<{ accepted: number; failed: number }> {
  let accepted = 0;
  let failed = 0;

  for (const id of suggestionIds) {
    const result = await acceptSuggestion(id, userId, status);
    if (result.success) {
      accepted++;
    } else {
      failed++;
    }
  }

  return { accepted, failed };
}

export async function dismissSuggestion(
  suggestionId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  const result = await sql`
    UPDATE friend_suggestions
    SET status = 'dismissed', responded_at = NOW()
    WHERE id = ${suggestionId}
    AND to_user_id = ${userId}
    AND status = 'pending'
    RETURNING id
  `;

  if (result.rows.length === 0) {
    return { success: false, error: 'Suggestion not found or already processed' };
  }

  return { success: true };
}

export async function dismissMultipleSuggestions(
  suggestionIds: number[],
  userId: number
): Promise<{ dismissed: number; failed: number }> {
  let dismissed = 0;
  let failed = 0;

  for (const id of suggestionIds) {
    const result = await dismissSuggestion(id, userId);
    if (result.success) {
      dismissed++;
    } else {
      failed++;
    }
  }

  return { dismissed, failed };
}

// ============================================================================
// Suggestion Stats
// ============================================================================

export async function getSuggestionStats(userId: number): Promise<{
  pendingReceived: number;
  pendingSent: number;
  acceptedSent: number;
}> {
  const pendingReceivedResult = await sql`
    SELECT COUNT(*)::int as count FROM friend_suggestions
    WHERE to_user_id = ${userId} AND status = 'pending'
  `;

  const pendingSentResult = await sql`
    SELECT COUNT(*)::int as count FROM friend_suggestions
    WHERE from_user_id = ${userId} AND status = 'pending'
  `;

  const acceptedSentResult = await sql`
    SELECT COUNT(*)::int as count FROM friend_suggestions
    WHERE from_user_id = ${userId} AND status = 'accepted'
  `;

  return {
    pendingReceived: pendingReceivedResult.rows[0].count,
    pendingSent: pendingSentResult.rows[0].count,
    acceptedSent: acceptedSentResult.rows[0].count,
  };
}

// ============================================================================
// Watched Feedback (Optional)
// ============================================================================

export async function notifySuggesterOfWatch(
  userMediaId: number,
  userId: number,
  rating?: number
): Promise<void> {
  // Find if this was from a suggestion
  const result = await sql`
    SELECT
      um.suggested_by_user_id,
      m.title as media_title,
      m.id as media_id,
      u.name as watcher_name
    FROM user_media um
    JOIN media m ON m.id = um.media_id
    JOIN users u ON u.id = um.user_id
    WHERE um.id = ${userMediaId}
    AND um.user_id = ${userId}
    AND um.suggested_by_user_id IS NOT NULL
  `;

  if (result.rows.length === 0) {
    return; // Not from a suggestion
  }

  const { suggested_by_user_id, media_title, media_id, watcher_name } = result.rows[0];

  await createNotification({
    user_id: suggested_by_user_id,
    type: 'suggestion_watched',
    title: `${watcher_name} watched ${media_title}`,
    message: rating ? `They rated it ${rating}/5` : undefined,
    media_id: media_id,
    data: {
      watcher_id: userId,
      watcher_name: watcher_name,
      watcher_rating: rating,
    },
  });
}
