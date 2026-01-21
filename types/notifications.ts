// Notification Types

export type NotificationType =
  | 'new_season'
  | 'premiere'
  | 'episode'
  | 'finale'
  | 'show_ended'
  | 'invite'
  | 'collab_invite'
  | 'collab_accepted';

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  media_id: number | null;
  data: NotificationData | null;
  is_read: boolean;
  created_at: string;
  // Joined fields
  media_title?: string;
  media_poster_path?: string | null;
  media_type?: 'movie' | 'tv';
}

export interface NotificationData {
  // For show alerts
  season_number?: number;
  episode_number?: number;
  episode_name?: string;
  air_date?: string;
  // For invites
  invite_id?: number;
  invite_code?: string;
  inviter_name?: string;
  accepter_name?: string;
  accepter_id?: number;
  list_name?: string;
  custom_list_id?: number;
  shared_lists?: string[];
}

export interface GlobalNotificationSettings {
  id?: number;
  user_id: number;
  alert_new_season: boolean;
  alert_season_premiere: boolean;
  alert_episode_airing: boolean;
  alert_season_finale: boolean;
  alert_show_ended: boolean;
  premiere_advance_days: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at?: string;
  updated_at?: string;
}

export interface ShowAlertSettings {
  id?: number;
  user_id: number;
  media_id: number;
  alerts_enabled: boolean;
  alert_new_season: boolean | null;
  alert_season_premiere: boolean | null;
  alert_episode_airing: boolean | null;
  alert_season_finale: boolean | null;
  premiere_advance_days: number | null;
  created_at?: string;
}

export interface EffectiveAlertSettings {
  alerts_enabled: boolean;
  alert_new_season: boolean;
  alert_season_premiere: boolean;
  alert_episode_airing: boolean;
  alert_season_finale: boolean;
  alert_show_ended: boolean;
  premiere_advance_days: number;
}

export interface TVShowMetadata {
  id: number;
  media_id: number;
  tmdb_id: number;
  status: string | null;
  number_of_seasons: number | null;
  next_episode_to_air_date: string | null;
  next_episode_season: number | null;
  next_episode_number: number | null;
  next_episode_name: string | null;
  last_synced_at: string;
}

export interface CreateNotificationInput {
  user_id: number;
  type: NotificationType;
  title: string;
  message?: string;
  media_id?: number;
  data?: NotificationData;
}

export interface GetNotificationsOptions {
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

// Default settings for new users
export const DEFAULT_NOTIFICATION_SETTINGS: Omit<GlobalNotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  alert_new_season: true,
  alert_season_premiere: true,
  alert_episode_airing: false,
  alert_season_finale: true,
  alert_show_ended: true,
  premiere_advance_days: 1,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
};
