import { db } from './db';
import {
  GlobalNotificationSettings,
  ShowAlertSettings,
  EffectiveAlertSettings,
  Notification,
  CreateNotificationInput,
  GetNotificationsOptions,
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationType,
} from '@/types/notifications';

// ============================================================================
// Global Notification Settings
// ============================================================================

export async function getGlobalNotificationSettings(
  userId: number
): Promise<GlobalNotificationSettings> {
  const result = await db`
    SELECT * FROM user_notification_settings
    WHERE user_id = ${userId}
  `;

  if (result.rows.length === 0) {
    // Return defaults if no settings exist
    return {
      user_id: userId,
      ...DEFAULT_NOTIFICATION_SETTINGS,
    };
  }

  return result.rows[0] as GlobalNotificationSettings;
}

export async function setGlobalNotificationSettings(
  userId: number,
  settings: Partial<Omit<GlobalNotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<GlobalNotificationSettings> {
  const result = await db`
    INSERT INTO user_notification_settings (
      user_id,
      alert_new_season,
      alert_season_premiere,
      alert_episode_airing,
      alert_season_finale,
      alert_show_ended,
      premiere_advance_days,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end
    ) VALUES (
      ${userId},
      ${settings.alert_new_season ?? DEFAULT_NOTIFICATION_SETTINGS.alert_new_season},
      ${settings.alert_season_premiere ?? DEFAULT_NOTIFICATION_SETTINGS.alert_season_premiere},
      ${settings.alert_episode_airing ?? DEFAULT_NOTIFICATION_SETTINGS.alert_episode_airing},
      ${settings.alert_season_finale ?? DEFAULT_NOTIFICATION_SETTINGS.alert_season_finale},
      ${settings.alert_show_ended ?? DEFAULT_NOTIFICATION_SETTINGS.alert_show_ended},
      ${settings.premiere_advance_days ?? DEFAULT_NOTIFICATION_SETTINGS.premiere_advance_days},
      ${settings.quiet_hours_enabled ?? DEFAULT_NOTIFICATION_SETTINGS.quiet_hours_enabled},
      ${settings.quiet_hours_start ?? DEFAULT_NOTIFICATION_SETTINGS.quiet_hours_start},
      ${settings.quiet_hours_end ?? DEFAULT_NOTIFICATION_SETTINGS.quiet_hours_end}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      alert_new_season = COALESCE(EXCLUDED.alert_new_season, user_notification_settings.alert_new_season),
      alert_season_premiere = COALESCE(EXCLUDED.alert_season_premiere, user_notification_settings.alert_season_premiere),
      alert_episode_airing = COALESCE(EXCLUDED.alert_episode_airing, user_notification_settings.alert_episode_airing),
      alert_season_finale = COALESCE(EXCLUDED.alert_season_finale, user_notification_settings.alert_season_finale),
      alert_show_ended = COALESCE(EXCLUDED.alert_show_ended, user_notification_settings.alert_show_ended),
      premiere_advance_days = COALESCE(EXCLUDED.premiere_advance_days, user_notification_settings.premiere_advance_days),
      quiet_hours_enabled = COALESCE(EXCLUDED.quiet_hours_enabled, user_notification_settings.quiet_hours_enabled),
      quiet_hours_start = COALESCE(EXCLUDED.quiet_hours_start, user_notification_settings.quiet_hours_start),
      quiet_hours_end = COALESCE(EXCLUDED.quiet_hours_end, user_notification_settings.quiet_hours_end),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  return result.rows[0] as GlobalNotificationSettings;
}

// ============================================================================
// Per-Show Alert Settings
// ============================================================================

export async function getShowAlertSettings(
  userId: number,
  mediaId: number
): Promise<ShowAlertSettings | null> {
  const result = await db`
    SELECT * FROM user_show_alert_settings
    WHERE user_id = ${userId} AND media_id = ${mediaId}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as ShowAlertSettings;
}

export async function setShowAlertSettings(
  userId: number,
  mediaId: number,
  settings: Partial<Omit<ShowAlertSettings, 'id' | 'user_id' | 'media_id' | 'created_at'>>
): Promise<ShowAlertSettings> {
  const result = await db`
    INSERT INTO user_show_alert_settings (
      user_id,
      media_id,
      alerts_enabled,
      alert_new_season,
      alert_season_premiere,
      alert_episode_airing,
      alert_season_finale,
      premiere_advance_days
    ) VALUES (
      ${userId},
      ${mediaId},
      ${settings.alerts_enabled ?? true},
      ${settings.alert_new_season ?? null},
      ${settings.alert_season_premiere ?? null},
      ${settings.alert_episode_airing ?? null},
      ${settings.alert_season_finale ?? null},
      ${settings.premiere_advance_days ?? null}
    )
    ON CONFLICT (user_id, media_id) DO UPDATE SET
      alerts_enabled = EXCLUDED.alerts_enabled,
      alert_new_season = EXCLUDED.alert_new_season,
      alert_season_premiere = EXCLUDED.alert_season_premiere,
      alert_episode_airing = EXCLUDED.alert_episode_airing,
      alert_season_finale = EXCLUDED.alert_season_finale,
      premiere_advance_days = EXCLUDED.premiere_advance_days
    RETURNING *
  `;

  return result.rows[0] as ShowAlertSettings;
}

export async function deleteShowAlertSettings(
  userId: number,
  mediaId: number
): Promise<boolean> {
  const result = await db`
    DELETE FROM user_show_alert_settings
    WHERE user_id = ${userId} AND media_id = ${mediaId}
    RETURNING id
  `;

  return result.rows.length > 0;
}

// ============================================================================
// Effective Settings (Global + Overrides)
// ============================================================================

export async function getEffectiveSettings(
  userId: number,
  mediaId: number
): Promise<EffectiveAlertSettings> {
  const [global, showSettings] = await Promise.all([
    getGlobalNotificationSettings(userId),
    getShowAlertSettings(userId, mediaId),
  ]);

  // If no show-specific settings or alerts disabled for this show
  if (!showSettings) {
    return {
      alerts_enabled: true, // Default to enabled for new shows
      alert_new_season: global.alert_new_season,
      alert_season_premiere: global.alert_season_premiere,
      alert_episode_airing: global.alert_episode_airing,
      alert_season_finale: global.alert_season_finale,
      alert_show_ended: global.alert_show_ended,
      premiere_advance_days: global.premiere_advance_days,
    };
  }

  return {
    alerts_enabled: showSettings.alerts_enabled,
    alert_new_season: showSettings.alert_new_season ?? global.alert_new_season,
    alert_season_premiere: showSettings.alert_season_premiere ?? global.alert_season_premiere,
    alert_episode_airing: showSettings.alert_episode_airing ?? global.alert_episode_airing,
    alert_season_finale: showSettings.alert_season_finale ?? global.alert_season_finale,
    alert_show_ended: global.alert_show_ended, // No per-show override for this
    premiere_advance_days: showSettings.premiere_advance_days ?? global.premiere_advance_days,
  };
}

// ============================================================================
// Notifications CRUD
// ============================================================================

export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  const result = await db`
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      media_id,
      data
    ) VALUES (
      ${input.user_id},
      ${input.type},
      ${input.title},
      ${input.message ?? null},
      ${input.media_id ?? null},
      ${input.data ? JSON.stringify(input.data) : null}
    )
    RETURNING *
  `;

  return result.rows[0] as Notification;
}

export async function getNotifications(
  userId: number,
  options: GetNotificationsOptions = {}
): Promise<Notification[]> {
  const { unreadOnly = false, type, limit = 50, offset = 0 } = options;

  let query;

  if (unreadOnly && type) {
    query = db`
      SELECT
        n.*,
        m.title as media_title,
        m.poster_path as media_poster_path,
        m.media_type
      FROM notifications n
      LEFT JOIN media m ON n.media_id = m.id
      WHERE n.user_id = ${userId}
        AND n.is_read = false
        AND n.type = ${type}
      ORDER BY n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (unreadOnly) {
    query = db`
      SELECT
        n.*,
        m.title as media_title,
        m.poster_path as media_poster_path,
        m.media_type
      FROM notifications n
      LEFT JOIN media m ON n.media_id = m.id
      WHERE n.user_id = ${userId}
        AND n.is_read = false
      ORDER BY n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (type) {
    query = db`
      SELECT
        n.*,
        m.title as media_title,
        m.poster_path as media_poster_path,
        m.media_type
      FROM notifications n
      LEFT JOIN media m ON n.media_id = m.id
      WHERE n.user_id = ${userId}
        AND n.type = ${type}
      ORDER BY n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    query = db`
      SELECT
        n.*,
        m.title as media_title,
        m.poster_path as media_poster_path,
        m.media_type
      FROM notifications n
      LEFT JOIN media m ON n.media_id = m.id
      WHERE n.user_id = ${userId}
      ORDER BY n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  const result = await query;
  return result.rows as Notification[];
}

export async function getUnreadCount(userId: number): Promise<number> {
  const result = await db`
    SELECT COUNT(*) as count
    FROM notifications
    WHERE user_id = ${userId} AND is_read = false
  `;

  return parseInt(result.rows[0].count, 10);
}

export async function markAsRead(notificationId: number, userId: number): Promise<boolean> {
  const result = await db`
    UPDATE notifications
    SET is_read = true
    WHERE id = ${notificationId} AND user_id = ${userId}
    RETURNING id
  `;

  return result.rows.length > 0;
}

export async function markAllAsRead(userId: number): Promise<number> {
  const result = await db`
    UPDATE notifications
    SET is_read = true
    WHERE user_id = ${userId} AND is_read = false
    RETURNING id
  `;

  return result.rows.length;
}

export async function deleteNotification(notificationId: number, userId: number): Promise<boolean> {
  const result = await db`
    DELETE FROM notifications
    WHERE id = ${notificationId} AND user_id = ${userId}
    RETURNING id
  `;

  return result.rows.length > 0;
}

// ============================================================================
// Helper Functions
// ============================================================================

export async function hasNotificationBeenSent(
  userId: number,
  type: NotificationType,
  mediaId: number,
  seasonNumber?: number,
  episodeNumber?: number
): Promise<boolean> {
  // Check if a similar notification already exists to prevent duplicates
  let result;

  if (episodeNumber !== undefined) {
    result = await db`
      SELECT id FROM notifications
      WHERE user_id = ${userId}
        AND type = ${type}
        AND media_id = ${mediaId}
        AND (data->>'season_number')::int = ${seasonNumber}
        AND (data->>'episode_number')::int = ${episodeNumber}
      LIMIT 1
    `;
  } else if (seasonNumber !== undefined) {
    result = await db`
      SELECT id FROM notifications
      WHERE user_id = ${userId}
        AND type = ${type}
        AND media_id = ${mediaId}
        AND (data->>'season_number')::int = ${seasonNumber}
      LIMIT 1
    `;
  } else {
    result = await db`
      SELECT id FROM notifications
      WHERE user_id = ${userId}
        AND type = ${type}
        AND media_id = ${mediaId}
      LIMIT 1
    `;
  }

  return result.rows.length > 0;
}

export async function getUsersTrackingShow(mediaId: number): Promise<number[]> {
  const result = await db`
    SELECT DISTINCT um.user_id
    FROM user_media um
    WHERE um.media_id = ${mediaId}
      AND um.status IN ('watching', 'watchlist', 'onhold')
  `;

  return result.rows.map((row: { user_id: number }) => row.user_id);
}

export async function getShowsWithAlertsEnabled(userId: number): Promise<number[]> {
  // Get shows where user has them in library and hasn't explicitly disabled alerts
  const result = await db`
    SELECT um.media_id
    FROM user_media um
    JOIN media m ON um.media_id = m.id
    LEFT JOIN user_show_alert_settings sas ON um.user_id = sas.user_id AND um.media_id = sas.media_id
    WHERE um.user_id = ${userId}
      AND m.media_type = 'tv'
      AND (sas.alerts_enabled IS NULL OR sas.alerts_enabled = true)
  `;

  return result.rows.map((row: { media_id: number }) => row.media_id);
}
