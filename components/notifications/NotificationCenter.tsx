'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, XCircle, Clock, User, List, Users, Tv, Calendar, Flag, CheckCheck, Trash2, Send } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import NotificationItem from './NotificationItem';
import SuggestionGroup from './SuggestionGroup';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { FriendAcceptanceSheet } from '@/components/sharing';
import type { GroupedSuggestions, FriendSuggestionWithDetails } from '@/types/sharing';

interface CustomListInvite {
  type: 'custom_list';
  id: number;
  listSlug: string;
  listName: string;
  message: string | null;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    username: string | null;
    image: string | null;
  };
}

interface CollaborationInvite {
  type: 'collaboration';
  id: number;
  ownerName: string;
  ownerUsername: string | null;
  ownerImage: string | null;
  ownerId: number;
  message: string | null;
  sharedLists: string[];
  createdAt: string;
  inviteType?: 'friend' | 'partner';
}

interface ShowAlertNotification {
  type: 'show_alert';
  id: number;
  alertType: 'new_season' | 'premiere' | 'episode' | 'finale' | 'show_ended';
  title: string;
  message: string | null;
  mediaId: number | null;
  mediaTitle: string | null;
  mediaPosterPath: string | null;
  tmdbId: number | null;
  data: {
    season_number?: number;
    episode_number?: number;
    episode_name?: string;
    air_date?: string;
  } | null;
  isRead: boolean;
  createdAt: string;
}

interface CollabAcceptedNotification {
  type: 'collab_accepted';
  id: number;
  title: string;
  message: string | null;
  data: {
    accepter_name?: string;
    accepter_id?: number;
    shared_lists?: string[];
  } | null;
  isRead: boolean;
  createdAt: string;
}

interface CollabEndedNotification {
  type: 'collab_ended';
  id: number;
  title: string;
  message: string | null;
  data: {
    ender_name?: string;
    ender_id?: number;
  } | null;
  isRead: boolean;
  createdAt: string;
}

interface SuggestionWatchedNotification {
  type: 'suggestion_watched';
  id: number;
  title: string;
  message: string | null;
  mediaId: number | null;
  mediaTitle: string | null;
  mediaPosterPath: string | null;
  tmdbId: number | null;
  data: {
    watcher_id?: number;
    watcher_name?: string;
    watcher_rating?: number;
  } | null;
  isRead: boolean;
  createdAt: string;
}

type NotificationItem = CustomListInvite | CollaborationInvite | ShowAlertNotification | CollabAcceptedNotification | CollabEndedNotification | SuggestionWatchedNotification;

const LIST_LABELS: Record<string, string> = {
  watchlist: 'Watchlist',
  watching: 'Watching',
  finished: 'Watched',
  onhold: 'On Hold',
  dropped: 'Dropped',
  favorites: 'Favorites',
  rewatch: 'Rewatch',
  nostalgia: 'Classics',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  new_season: 'New Season',
  premiere: 'Premiere',
  episode: 'New Episode',
  finale: 'Season Finale',
  show_ended: 'Series Ended',
};

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onCountChange: (count: number) => void;
}

export default function NotificationCenter({ isOpen, onClose, onCountChange }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [suggestions, setSuggestions] = useState<GroupedSuggestions[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Friend acceptance flow state
  const [pendingFriendAccept, setPendingFriendAccept] = useState<{
    inviteId: number;
    friend: {
      id: number;
      name: string;
      username: string | null;
      image: string | null;
    };
  } | null>(null);

  // Library store for real-time updates
  const { addToWatchlist, invalidate, fetchLibrary } = useLibraryStore();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Fetch invites, unified notifications, and suggestions in parallel
      const [customListRes, collaborationRes, notificationsRes, suggestionsRes] = await Promise.all([
        fetch('/api/invites/pending'),
        fetch('/api/collaborators/direct-invites'),
        fetch('/api/notifications'),
        fetch('/api/suggestions?grouped=true'),
      ]);

      const allNotifications: NotificationItem[] = [];

      if (customListRes.ok) {
        const data = await customListRes.json();
        const customInvites = (data.invites || []).map((inv: Record<string, unknown>) => ({
          ...inv,
          type: 'custom_list' as const,
        }));
        allNotifications.push(...customInvites);
      }

      if (collaborationRes.ok) {
        const data = await collaborationRes.json();
        const collabInvites = (data.invites || []).map((inv: Record<string, unknown>) => ({
          ...inv,
          type: 'collaboration' as const,
          inviteType: inv.inviteType as 'friend' | 'partner' | undefined,
        }));
        allNotifications.push(...collabInvites);
      }

      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        const notifications = data.notifications || [];

        // Handle collab_accepted notifications
        const collabAccepted = notifications
          .filter((n: Record<string, unknown>) => n.type === 'collab_accepted')
          .map((n: Record<string, unknown>) => ({
            type: 'collab_accepted' as const,
            id: n.id,
            title: n.title,
            message: n.message,
            data: n.data,
            isRead: n.is_read,
            createdAt: n.created_at,
          }));
        allNotifications.push(...collabAccepted);

        // Handle collab_ended notifications
        const collabEnded = notifications
          .filter((n: Record<string, unknown>) => n.type === 'collab_ended')
          .map((n: Record<string, unknown>) => ({
            type: 'collab_ended' as const,
            id: n.id,
            title: n.title,
            message: n.message,
            data: n.data,
            isRead: n.is_read,
            createdAt: n.created_at,
          }));
        allNotifications.push(...collabEnded);

        // Handle suggestion_watched notifications
        const suggestionWatched = notifications
          .filter((n: Record<string, unknown>) => n.type === 'suggestion_watched')
          .map((n: Record<string, unknown>) => ({
            type: 'suggestion_watched' as const,
            id: n.id,
            title: n.title,
            message: n.message,
            mediaId: n.media_id,
            mediaTitle: n.media_title,
            mediaPosterPath: n.media_poster_path,
            tmdbId: (n.data as Record<string, unknown> | null)?.tmdb_id || null,
            data: n.data,
            isRead: n.is_read,
            createdAt: n.created_at,
          }));
        allNotifications.push(...suggestionWatched);

        // Handle show alerts (exclude suggestion-related notification types)
        const showAlerts = notifications
          .filter((n: Record<string, unknown>) => !['invite', 'collab_invite', 'collab_accepted', 'collab_ended', 'friend_suggestion', 'friend_suggestion_group', 'suggestion_watched'].includes(n.type as string))
          .map((n: Record<string, unknown>) => ({
            type: 'show_alert' as const,
            id: n.id,
            alertType: n.type as ShowAlertNotification['alertType'],
            title: n.title,
            message: n.message,
            mediaId: n.media_id,
            mediaTitle: n.media_title,
            mediaPosterPath: n.media_poster_path,
            tmdbId: (n.data as Record<string, unknown> | null)?.tmdb_id || null,
            data: n.data,
            isRead: n.is_read,
            createdAt: n.created_at,
          }));
        allNotifications.push(...showAlerts);
      }

      // Sort by createdAt descending
      allNotifications.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(allNotifications);

      // Handle grouped suggestions
      let suggestionCount = 0;
      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        const groupedSuggestions = data.grouped || [];
        setSuggestions(groupedSuggestions);
        suggestionCount = groupedSuggestions.reduce((acc: number, g: GroupedSuggestions) => acc + g.total_count, 0);
      }

      // Count unread items
      const unreadNotificationCount = allNotifications.filter(n => {
        if (n.type === 'show_alert' || n.type === 'collab_accepted' || n.type === 'collab_ended' || n.type === 'suggestion_watched') return !n.isRead;
        return true; // Invites are always "unread"
      }).length;

      onCountChange(unreadNotificationCount + suggestionCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Re-calculate count when suggestions change
  useEffect(() => {
    const unreadNotificationCount = notifications.filter(n => {
      if (n.type === 'show_alert' || n.type === 'collab_accepted' || n.type === 'collab_ended' || n.type === 'suggestion_watched') return !n.isRead;
      return true;
    }).length;
    const suggestionCount = suggestions.reduce((acc, g) => acc + g.total_count, 0);
    onCountChange(unreadNotificationCount + suggestionCount);
  }, [suggestions, notifications, onCountChange]);

  // Helper to check if empty and auto-close after a delay
  const checkAndAutoClose = (
    remainingNotifications: NotificationItem[],
    remainingSuggestions: GroupedSuggestions[]
  ) => {
    const isEmpty = remainingNotifications.length === 0 && remainingSuggestions.length === 0;
    if (isEmpty) {
      // Show "all caught up" message briefly, then close
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  const handleAccept = async (notification: CustomListInvite | CollaborationInvite) => {
    // For friend invites, show the acceptance sheet to choose lists to share
    if (notification.type === 'collaboration' && notification.inviteType === 'friend') {
      setPendingFriendAccept({
        inviteId: notification.id,
        friend: {
          id: notification.ownerId,
          name: notification.ownerName,
          username: notification.ownerUsername,
          image: notification.ownerImage,
        },
      });
      return;
    }

    const key = `${notification.type}-${notification.id}`;
    setProcessingId(key);
    try {
      const endpoint = notification.type === 'custom_list'
        ? `/api/invites/${notification.id}/accept`
        : `/api/collaborators/direct-invites/${notification.id}/accept`;

      const response = await fetch(endpoint, {
        method: 'POST',
      });
      if (response.ok) {
        const remainingNotifications = notifications.filter(n => !(n.type === notification.type && n.id === notification.id));
        setNotifications(remainingNotifications);
        // Dispatch event to notify other components (e.g., Profile page)
        window.dispatchEvent(new CustomEvent('connection-accepted'));
        // Check if we should auto-close
        checkAndAutoClose(remainingNotifications, suggestions);
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleFriendAccepted = () => {
    if (!pendingFriendAccept) return;

    // Remove the accepted invite from notifications
    const remainingNotifications = notifications.filter(
      n => !(n.type === 'collaboration' && n.id === pendingFriendAccept.inviteId)
    );
    setNotifications(remainingNotifications);
    setPendingFriendAccept(null);

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('connection-accepted'));

    // Check if we should auto-close
    checkAndAutoClose(remainingNotifications, suggestions);
  };

  const handleDecline = async (notification: CustomListInvite | CollaborationInvite) => {
    const key = `${notification.type}-${notification.id}`;
    setProcessingId(key);
    try {
      const endpoint = notification.type === 'custom_list'
        ? `/api/invites/${notification.id}/decline`
        : `/api/collaborators/direct-invites/${notification.id}/decline`;

      const response = await fetch(endpoint, {
        method: 'POST',
      });
      if (response.ok) {
        const remainingNotifications = notifications.filter(n => !(n.type === notification.type && n.id === notification.id));
        setNotifications(remainingNotifications);
        // Check if we should auto-close
        checkAndAutoClose(remainingNotifications, suggestions);
      }
    } catch (error) {
      console.error('Failed to decline invite:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismissNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        const remainingNotifications = notifications.filter(n => {
          if (n.type === 'show_alert' || n.type === 'collab_accepted' || n.type === 'collab_ended' || n.type === 'suggestion_watched') {
            return n.id !== notificationId;
          }
          return true;
        });
        setNotifications(remainingNotifications);
        checkAndAutoClose(remainingNotifications, suggestions);
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const handleMarkAsRead = async (notification: ShowAlertNotification | CollabAcceptedNotification | CollabEndedNotification | SuggestionWatchedNotification) => {
    if (notification.isRead) return;

    try {
      const response = await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => {
            if ((n.type === 'show_alert' || n.type === 'collab_accepted' || n.type === 'collab_ended' || n.type === 'suggestion_watched') && n.id === notification.id) {
              return { ...n, isRead: true };
            }
            return n;
          })
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const hasUnread = notifications.some(n => (n.type === 'show_alert' || n.type === 'collab_accepted' || n.type === 'collab_ended' || n.type === 'suggestion_watched') && !n.isRead);
    if (!hasUnread) return;

    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            (n.type === 'show_alert' || n.type === 'collab_accepted' || n.type === 'collab_ended' || n.type === 'suggestion_watched') ? { ...n, isRead: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await fetch('/api/notifications/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readOnly: false }),
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n =>
          n.type === 'custom_list' || n.type === 'collaboration'
        ));
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  // Suggestion handlers
  const handleAcceptAllSuggestions = async (suggestionIds: number[]) => {
    try {
      // Find the suggestions being accepted for optimistic update
      const acceptedSuggestions = suggestions.flatMap(g =>
        g.suggestions.filter(s => suggestionIds.includes(s.id))
      );

      // Optimistically add to watchlist
      acceptedSuggestions.forEach(s => {
        addToWatchlist({
          id: 0, // Will be set by server
          media_id: s.media_tmdb_id,
          media_type: s.media_type,
          title: s.media_title,
          poster_path: s.media_poster_path,
        });
      });

      const response = await fetch('/api/suggestions/batch-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionIds, action: 'accept' }),
      });
      if (response.ok) {
        // Remove the accepted suggestions
        const remainingSuggestions = suggestions.map(group => ({
          ...group,
          suggestions: group.suggestions.filter(s => !suggestionIds.includes(s.id)),
          total_count: group.suggestions.filter(s => !suggestionIds.includes(s.id)).length,
        })).filter(group => group.total_count > 0);
        setSuggestions(remainingSuggestions);
        checkAndAutoClose(notifications, remainingSuggestions);

        // Refresh library to get accurate data
        invalidate();
        fetchLibrary();
      }
    } catch (error) {
      console.error('Failed to accept suggestions:', error);
      // Refresh library on error to revert optimistic update
      invalidate();
      fetchLibrary();
    }
  };

  const handleDismissAllSuggestions = async (suggestionIds: number[]) => {
    try {
      const response = await fetch('/api/suggestions/batch-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionIds, action: 'dismiss' }),
      });
      if (response.ok) {
        const remainingSuggestions = suggestions.map(group => ({
          ...group,
          suggestions: group.suggestions.filter(s => !suggestionIds.includes(s.id)),
          total_count: group.suggestions.filter(s => !suggestionIds.includes(s.id)).length,
        })).filter(group => group.total_count > 0);
        setSuggestions(remainingSuggestions);
        checkAndAutoClose(notifications, remainingSuggestions);
      }
    } catch (error) {
      console.error('Failed to dismiss suggestions:', error);
    }
  };

  const handleAcceptSingleSuggestion = async (suggestion: FriendSuggestionWithDetails) => {
    try {
      // Optimistically add to watchlist
      addToWatchlist({
        id: 0, // Will be set by server
        media_id: suggestion.media_tmdb_id,
        media_type: suggestion.media_type,
        title: suggestion.media_title,
        poster_path: suggestion.media_poster_path,
      });

      const response = await fetch(`/api/suggestions/${suggestion.id}/accept`, {
        method: 'POST',
      });
      if (response.ok) {
        const remainingSuggestions = suggestions.map(group => ({
          ...group,
          suggestions: group.suggestions.filter(s => s.id !== suggestion.id),
          total_count: group.suggestions.filter(s => s.id !== suggestion.id).length,
        })).filter(group => group.total_count > 0);
        setSuggestions(remainingSuggestions);
        checkAndAutoClose(notifications, remainingSuggestions);

        // Refresh library to get accurate data
        invalidate();
        fetchLibrary();
      }
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      // Refresh library on error to revert optimistic update
      invalidate();
      fetchLibrary();
    }
  };

  const handleDismissSingleSuggestion = async (suggestionId: number) => {
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/dismiss`, {
        method: 'POST',
      });
      if (response.ok) {
        const remainingSuggestions = suggestions.map(group => ({
          ...group,
          suggestions: group.suggestions.filter(s => s.id !== suggestionId),
          total_count: group.suggestions.filter(s => s.id !== suggestionId).length,
        })).filter(group => group.total_count > 0);
        setSuggestions(remainingSuggestions);
        checkAndAutoClose(notifications, remainingSuggestions);
      }
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatAirDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'new_season':
        return <Calendar className="w-5 h-5 text-[#8b5ef4]" />;
      case 'premiere':
      case 'episode':
        return <Tv className="w-5 h-5 text-green-500" />;
      case 'finale':
      case 'show_ended':
        return <Flag className="w-5 h-5 text-amber-500" />;
      default:
        return <Tv className="w-5 h-5 text-gray-400" />;
    }
  };

  const hasUnreadAlerts = notifications.some(n => (n.type === 'show_alert' || n.type === 'collab_accepted' || n.type === 'collab_ended' || n.type === 'suggestion_watched') && !n.isRead);
  const hasNotificationsToClear = notifications.some(n =>
    n.type === 'show_alert' || n.type === 'collab_accepted' || n.type === 'collab_ended' || n.type === 'suggestion_watched'
  );

  // Separate invites from other notifications
  const invites = notifications.filter(n => n.type === 'custom_list' || n.type === 'collaboration');
  const otherNotifications = notifications.filter(n => n.type !== 'custom_list' && n.type !== 'collaboration');

  const isEmpty = notifications.length === 0 && suggestions.length === 0;

  if (!isOpen) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Friend Acceptance Sheet */}
      {pendingFriendAccept && (
        <FriendAcceptanceSheet
          isOpen={true}
          onClose={() => setPendingFriendAccept(null)}
          friend={pendingFriendAccept.friend}
          inviteId={pendingFriendAccept.inviteId}
          onAccepted={handleFriendAccepted}
        />
      )}

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-[100]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-900 z-[110] shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
          <div className="flex items-center gap-1">
            {hasUnreadAlerts && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
            {hasNotificationsToClear && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
                title="Clear all notifications"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin-fast rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400"></div>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400">You're all caught up!</p>
              <p className="text-gray-500 text-sm mt-1">New alerts will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {/* Friend Suggestions Section */}
              {suggestions.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Send className="w-4 h-4 text-[#8b5ef4]" />
                    <h3 className="text-sm font-medium text-gray-300">Friend Suggestions</h3>
                    <span className="px-1.5 py-0.5 bg-[#8b5ef4]/20 text-[#8b5ef4] text-xs font-medium rounded">
                      {suggestions.reduce((acc, g) => acc + g.total_count, 0)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {suggestions.map((group) => (
                      <SuggestionGroup
                        key={group.from_user_id}
                        group={group}
                        onAcceptAll={handleAcceptAllSuggestions}
                        onDismissAll={handleDismissAllSuggestions}
                        onAcceptSingle={handleAcceptSingleSuggestion}
                        onDismissSingle={handleDismissSingleSuggestion}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Invites Section */}
              {invites.length > 0 && (
                <div className={suggestions.length > 0 ? '' : ''}>
                  {invites.map((notification) => {
                    const isCustomList = notification.type === 'custom_list';
                    const senderName = isCustomList
                      ? notification.sender.name
                      : notification.ownerName;
                    const senderUsername = isCustomList
                      ? notification.sender.username
                      : notification.ownerUsername;
                    const senderImage = isCustomList
                      ? notification.sender.image
                      : notification.ownerImage;
                    const key = `${notification.type}-${notification.id}`;

                    return (
                      <div
                        key={key}
                        className="p-4 hover:bg-zinc-800/50 transition"
                      >
                        <div className="flex items-start gap-3">
                          {/* Sender Avatar */}
                          <div className="flex-shrink-0">
                            {senderImage ? (
                              <Image
                                src={senderImage}
                                alt={senderName}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">
                              <span className="font-medium">{senderName}</span>
                              {senderUsername && (
                                <span className="text-gray-500 ml-1">@{senderUsername}</span>
                              )}
                            </p>

                            {isCustomList ? (
                              <>
                                <p className="text-sm text-gray-400 mt-0.5">
                                  invited you to collaborate on
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <List className="w-4 h-4 text-[#8b5ef4]" />
                                  <span className="text-sm font-medium text-white">
                                    {notification.listName}
                                  </span>
                                </div>
                              </>
                            ) : notification.inviteType === 'friend' ? (
                              <p className="text-sm text-gray-400 mt-0.5">
                                wants to be your friend
                              </p>
                            ) : notification.inviteType === 'partner' ? (
                              <p className="text-sm text-gray-400 mt-0.5">
                                wants to be your partner
                              </p>
                            ) : notification.sharedLists.length > 0 ? (
                              <>
                                <p className="text-sm text-gray-400 mt-0.5">
                                  wants to share lists with you
                                </p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <Users className="w-4 h-4 text-[#8b5ef4]" />
                                  <span className="text-sm text-white">
                                    {notification.sharedLists
                                      .map(list => LIST_LABELS[list] || list)
                                      .join(', ')}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-gray-400 mt-0.5">
                                wants to connect with you
                              </p>
                            )}

                            {notification.message && (
                              <p className="text-sm text-gray-400 mt-2 italic">
                                &ldquo;{notification.message}&rdquo;
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(notification.createdAt)}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={() => handleAccept(notification)}
                                disabled={processingId === key}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8b5ef4] text-white text-sm font-medium rounded-lg hover:bg-[#7a4ed3] transition disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleDecline(notification)}
                                disabled={processingId === key}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-zinc-600 transition disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" />
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Other Notifications Section */}
              {otherNotifications.length > 0 && (
                <div className={(suggestions.length > 0 || invites.length > 0) ? 'pt-2' : ''}>
                  {(suggestions.length > 0 || invites.length > 0) && (
                    <div className="px-4 py-2 flex items-center gap-2">
                      <Tv className="w-4 h-4 text-gray-500" />
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Other Notifications</h3>
                    </div>
                  )}
                  {otherNotifications.map((notification) => {
                    // Collab accepted notifications
                    if (notification.type === 'collab_accepted') {
                      const key = `collab_accepted-${notification.id}`;
                      const sharedLists = notification.data?.shared_lists || [];

                      return (
                        <NotificationItem
                          key={key}
                          onDismiss={() => handleDismissNotification(notification.id)}
                          swipeable={true}
                        >
                          <div
                            className={`p-4 hover:bg-zinc-800/50 transition bg-zinc-900 ${
                              notification.isRead ? 'opacity-60' : ''
                            }`}
                            onClick={() => handleMarkAsRead(notification)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                  <Check className="w-5 h-5 text-green-500" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-green-500" />
                                  <span className="text-xs font-medium text-gray-400 uppercase">
                                    New Collaborator
                                  </span>
                                  {!notification.isRead && (
                                    <span className="w-2 h-2 bg-[#8b5ef4] rounded-full" />
                                  )}
                                </div>
                                <p className="text-sm font-medium text-white mt-1">
                                  {notification.title}
                                </p>
                                {notification.message && (
                                  <p className="text-sm text-gray-400 mt-0.5">
                                    {notification.message}
                                  </p>
                                )}
                                {sharedLists.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {sharedLists.map(list => (
                                      <span
                                        key={list}
                                        className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-gray-300"
                                      >
                                        {LIST_LABELS[list] || list}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  {formatTimeAgo(notification.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </NotificationItem>
                      );
                    }

                    // Collab ended notifications
                    if (notification.type === 'collab_ended') {
                      const key = `collab_ended-${notification.id}`;

                      return (
                        <NotificationItem
                          key={key}
                          onDismiss={() => handleDismissNotification(notification.id)}
                          swipeable={true}
                        >
                          <div
                            className={`p-4 hover:bg-zinc-800/50 transition bg-zinc-900 ${
                              notification.isRead ? 'opacity-60' : ''
                            }`}
                            onClick={() => handleMarkAsRead(notification)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                                  <XCircle className="w-5 h-5 text-red-400" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-red-400" />
                                  <span className="text-xs font-medium text-gray-400 uppercase">
                                    Connection Ended
                                  </span>
                                  {!notification.isRead && (
                                    <span className="w-2 h-2 bg-[#8b5ef4] rounded-full" />
                                  )}
                                </div>
                                <p className="text-sm font-medium text-white mt-1">
                                  {notification.title}
                                </p>
                                {notification.message && (
                                  <p className="text-sm text-gray-400 mt-0.5">
                                    {notification.message}
                                  </p>
                                )}
                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  {formatTimeAgo(notification.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </NotificationItem>
                      );
                    }

                    // Suggestion watched notifications
                    if (notification.type === 'suggestion_watched') {
                      const key = `suggestion_watched-${notification.id}`;

                      return (
                        <NotificationItem
                          key={key}
                          onDismiss={() => handleDismissNotification(notification.id)}
                          swipeable={true}
                        >
                          <div
                            className={`p-4 hover:bg-zinc-800/50 transition bg-zinc-900 ${
                              notification.isRead ? 'opacity-60' : ''
                            }`}
                            onClick={() => handleMarkAsRead(notification)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-[#8b5ef4]/20 rounded-full flex items-center justify-center">
                                  <Check className="w-5 h-5 text-[#8b5ef4]" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Send className="w-4 h-4 text-[#8b5ef4]" />
                                  <span className="text-xs font-medium text-gray-400 uppercase">
                                    Suggestion Watched
                                  </span>
                                  {!notification.isRead && (
                                    <span className="w-2 h-2 bg-[#8b5ef4] rounded-full" />
                                  )}
                                </div>
                                <p className="text-sm font-medium text-white mt-1">
                                  {notification.title}
                                </p>
                                {notification.message && (
                                  <p className="text-sm text-gray-400 mt-0.5">
                                    {notification.message}
                                  </p>
                                )}
                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  {formatTimeAgo(notification.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </NotificationItem>
                      );
                    }

                    // Show alert notifications
                    if (notification.type === 'show_alert') {
                      const key = `show_alert-${notification.id}`;
                      const tmdbId = notification.tmdbId || (notification.data as Record<string, unknown> | null)?.tmdb_id;

                      return (
                        <NotificationItem
                          key={key}
                          onDismiss={() => handleDismissNotification(notification.id)}
                          swipeable={true}
                        >
                          <Link
                            href={tmdbId ? `/tv/${tmdbId}` : '#'}
                            onClick={() => handleMarkAsRead(notification)}
                            className={`block p-4 hover:bg-zinc-800/50 transition bg-zinc-900 ${
                              notification.isRead ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                {notification.mediaPosterPath ? (
                                  <Image
                                    src={`https://image.tmdb.org/t/p/w92${notification.mediaPosterPath}`}
                                    alt={notification.mediaTitle || 'Show poster'}
                                    width={40}
                                    height={60}
                                    className="rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-[60px] bg-zinc-700 rounded flex items-center justify-center">
                                    <Tv className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {getAlertIcon(notification.alertType)}
                                  <span className="text-xs font-medium text-gray-400 uppercase">
                                    {ALERT_TYPE_LABELS[notification.alertType] || notification.alertType}
                                  </span>
                                  {!notification.isRead && (
                                    <span className="w-2 h-2 bg-[#8b5ef4] rounded-full" />
                                  )}
                                </div>
                                <p className="text-sm font-medium text-white mt-1">
                                  {notification.mediaTitle || notification.title}
                                </p>
                                {notification.message && (
                                  <p className="text-sm text-gray-400 mt-0.5">
                                    {notification.message}
                                  </p>
                                )}
                                {notification.data?.air_date && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatAirDate(notification.data.air_date)}
                                  </p>
                                )}
                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  {formatTimeAgo(notification.createdAt)}
                                </div>
                              </div>
                            </div>
                          </Link>
                        </NotificationItem>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
