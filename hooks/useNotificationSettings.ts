'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GlobalNotificationSettings,
  ShowAlertSettings,
  EffectiveAlertSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@/types/notifications';

export function useNotificationSettings() {
  const [settings, setSettings] = useState<GlobalNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/notification-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        throw new Error('Failed to fetch settings');
      }
    } catch (err) {
      console.error('Failed to fetch notification settings:', err);
      setError('Failed to load notification settings');
      // Set defaults on error
      setSettings({
        user_id: 0,
        ...DEFAULT_NOTIFICATION_SETTINGS,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (
    updates: Partial<Omit<GlobalNotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch('/api/notification-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        return true;
      }
      throw new Error('Failed to update settings');
    } catch (err) {
      console.error('Failed to update notification settings:', err);
      setError('Failed to save settings');
      return false;
    }
  };

  const refetch = () => {
    setLoading(true);
    fetchSettings();
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch,
  };
}

export function useShowAlertSettings(mediaId: number | null) {
  const [settings, setSettings] = useState<ShowAlertSettings | null>(null);
  const [effectiveSettings, setEffectiveSettings] = useState<EffectiveAlertSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!mediaId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/notification-settings/show/${mediaId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data.showSettings);
        setEffectiveSettings(data.effectiveSettings);
      } else if (response.status === 404) {
        // No custom settings - just use effective defaults
        setSettings(null);
        const defaultResponse = await fetch(`/api/notification-settings/show/${mediaId}/effective`);
        if (defaultResponse.ok) {
          const data = await defaultResponse.json();
          setEffectiveSettings(data);
        }
      } else {
        throw new Error('Failed to fetch show settings');
      }
    } catch (err) {
      console.error('Failed to fetch show alert settings:', err);
      setError('Failed to load show settings');
    } finally {
      setLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (
    updates: Partial<Omit<ShowAlertSettings, 'id' | 'user_id' | 'media_id' | 'created_at'>>
  ): Promise<boolean> => {
    if (!mediaId) return false;

    try {
      setError(null);
      const response = await fetch(`/api/notification-settings/show/${mediaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.showSettings);
        setEffectiveSettings(data.effectiveSettings);
        return true;
      }
      throw new Error('Failed to update show settings');
    } catch (err) {
      console.error('Failed to update show alert settings:', err);
      setError('Failed to save show settings');
      return false;
    }
  };

  const resetToDefaults = async (): Promise<boolean> => {
    if (!mediaId) return false;

    try {
      setError(null);
      const response = await fetch(`/api/notification-settings/show/${mediaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSettings(null);
        // Refetch to get updated effective settings
        await fetchSettings();
        return true;
      }
      throw new Error('Failed to reset show settings');
    } catch (err) {
      console.error('Failed to reset show alert settings:', err);
      setError('Failed to reset settings');
      return false;
    }
  };

  const toggleAlerts = async (enabled: boolean): Promise<boolean> => {
    return updateSettings({ alerts_enabled: enabled });
  };

  const refetch = () => {
    setLoading(true);
    fetchSettings();
  };

  return {
    settings,
    effectiveSettings,
    loading,
    error,
    updateSettings,
    resetToDefaults,
    toggleAlerts,
    refetch,
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: number;
    type: string;
    title: string;
    message: string | null;
    media_id: number | null;
    data: Record<string, unknown> | null;
    is_read: boolean;
    created_at: string;
    media_title?: string;
    media_poster_path?: string | null;
    media_type?: 'movie' | 'tv';
  }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/count');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      return false;
    }
  };

  const markAllAsRead = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      return false;
    }
  };

  const refetch = () => {
    setLoading(true);
    fetchNotifications();
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    fetchUnreadCount,
    refetch,
  };
}
