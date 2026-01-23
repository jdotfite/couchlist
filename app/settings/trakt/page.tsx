'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Loader2,
  Check,
  ExternalLink,
  RefreshCw,
  Unlink,
  Tv,
  Film,
  Wrench,
} from 'lucide-react';

interface TraktConnection {
  connected: boolean;
  trakt_username?: string;
  last_synced_at?: string;
  sync_enabled?: boolean;
  created_at?: string;
}

interface SyncResult {
  success: boolean;
  result?: {
    movies: { added: number; skipped: number; failed: number };
    shows: { added: number; skipped: number; failed: number; episodesSynced?: number };
  };
  total?: {
    added: number;
    skipped: number;
    failed: number;
  };
  error?: string;
}

interface RepairResult {
  success: boolean;
  result?: {
    movies: { updated: number; notFound: number; failed: number };
    shows: { updated: number; notFound: number; failed: number; statusChanges: { toWatching: number; toFinished: number }; episodesSynced?: number };
  };
  total?: {
    updated: number;
    notFound: number;
    failed: number;
  };
  error?: string;
}

interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

export default function TraktSettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [connection, setConnection] = useState<TraktConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null);
  const [polling, setPolling] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const pollCount = useRef(0);

  // Check current connection status
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetch('/api/trakt/status')
        .then((res) => res.json())
        .then((data) => {
          setConnection(data.connected ? data : { connected: false });
          setLoading(false);
        })
        .catch(() => {
          setConnection({ connected: false });
          setLoading(false);
        });
    }
  }, [status, router]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  // Start device auth flow
  const startConnect = async () => {
    setError(null);
    setSyncResult(null);

    try {
      const res = await fetch('/api/trakt/device-code', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get device code');
      }

      setDeviceCode(data);
      setPolling(true);
      pollCount.current = 0;

      // Poll for token every {interval} seconds
      const interval = (data.interval || 5) * 1000;
      const maxPolls = Math.floor(data.expires_in / (data.interval || 5));

      pollInterval.current = setInterval(async () => {
        pollCount.current++;

        // Stop if exceeded max polls
        if (pollCount.current > maxPolls) {
          clearInterval(pollInterval.current!);
          setPolling(false);
          setDeviceCode(null);
          setError('Code expired. Please try again.');
          return;
        }

        try {
          const pollRes = await fetch('/api/trakt/poll-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_code: data.device_code }),
          });
          const pollData = await pollRes.json();

          if (pollData.status === 'connected') {
            clearInterval(pollInterval.current!);
            setPolling(false);
            setDeviceCode(null);
            setConnection({
              connected: true,
              trakt_username: pollData.username,
            });
          } else if (pollData.error) {
            clearInterval(pollInterval.current!);
            setPolling(false);
            setDeviceCode(null);
            setError(pollData.error);
          }
        } catch {
          // Continue polling on network errors
        }
      }, interval);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  };

  // Cancel auth flow
  const cancelConnect = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }
    setPolling(false);
    setDeviceCode(null);
  }, []);

  // Manual sync
  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setRepairResult(null);
    setError(null);

    try {
      const res = await fetch('/api/trakt/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncResult(data);

      // Refresh connection status to get updated last_synced_at
      const statusRes = await fetch('/api/trakt/status');
      const statusData = await statusRes.json();
      if (statusData.connected) {
        setConnection(statusData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Repair existing synced data (fix timestamps and TV show statuses)
  const handleRepair = async () => {
    setRepairing(true);
    setRepairResult(null);
    setSyncResult(null);
    setError(null);

    try {
      const res = await fetch('/api/trakt/repair', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Repair failed');
      }

      setRepairResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repair failed');
    } finally {
      setRepairing(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    try {
      await fetch('/api/trakt/status', { method: 'DELETE' });
      setConnection({ connected: false });
      setSyncResult(null);
    } catch {
      setError('Failed to disconnect');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">Trakt Sync</h1>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-6">
        <p className="text-gray-400">
          Connect your Trakt account to automatically sync your watch history
          from Kodi, Plex, Jellyfin, and other apps.
        </p>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-800 rounded-xl">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Not connected - show connect button */}
        {!connection?.connected && !deviceCode && (
          <button
            onClick={startConnect}
            className="w-full py-3 px-4 bg-[#ED1C24] hover:bg-[#ED1C24]/90 text-white font-medium rounded-xl transition flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            Connect Trakt Account
          </button>
        )}

        {/* Device code flow */}
        {deviceCode && polling && (
          <div className="bg-zinc-900 rounded-xl p-6 text-center space-y-4">
            <p className="text-gray-400">Go to:</p>
            <a
              href="https://trakt.tv/activate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ED1C24] text-lg font-medium flex items-center justify-center gap-2 hover:underline"
            >
              trakt.tv/activate
              <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-gray-400">and enter this code:</p>
            <div className="text-3xl font-mono font-bold tracking-[0.3em] bg-zinc-800 py-3 px-6 rounded-lg inline-block">
              {deviceCode.user_code}
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-500 pt-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for authorization...
            </div>
            <button
              onClick={cancelConnect}
              className="text-gray-400 hover:text-white text-sm underline"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Connected state */}
        {connection?.connected && (
          <div className="space-y-4">
            {/* Connection info */}
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#ED1C24] rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    Connected as @{connection.trakt_username}
                  </p>
                  {connection.last_synced_at && (
                    <p className="text-sm text-gray-400">
                      Last synced:{' '}
                      {new Date(connection.last_synced_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sync result */}
            {syncResult?.success && syncResult.result && (
              <div className="card space-y-3">
                <h3 className="font-medium text-green-400">Sync Complete</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Movies:</span>
                    <span className="text-white">
                      {syncResult.result.movies.added} added
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Shows:</span>
                    <span className="text-white">
                      {syncResult.result.shows.added} added
                    </span>
                  </div>
                </div>
                {syncResult.result.shows.episodesSynced !== undefined && syncResult.result.shows.episodesSynced > 0 && (
                  <p className="text-sm text-green-400">
                    {syncResult.result.shows.episodesSynced} episodes marked as watched
                  </p>
                )}
                {syncResult.total && syncResult.total.skipped > 0 && (
                  <p className="text-sm text-gray-500">
                    {syncResult.total.skipped} already in library
                  </p>
                )}
              </div>
            )}

            {/* Repair result */}
            {repairResult?.success && repairResult.result && (
              <div className="card space-y-3">
                <h3 className="font-medium text-green-400">Repair Complete</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Movies:</span>
                    <span className="text-white">
                      {repairResult.result.movies.updated} timestamps fixed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Shows:</span>
                    <span className="text-white">
                      {repairResult.result.shows.updated} updated
                    </span>
                  </div>
                  {repairResult.result.shows.episodesSynced !== undefined && repairResult.result.shows.episodesSynced > 0 && (
                    <p className="text-green-400">
                      {repairResult.result.shows.episodesSynced} episodes marked as watched
                    </p>
                  )}
                  {(repairResult.result.shows.statusChanges.toWatching > 0 ||
                    repairResult.result.shows.statusChanges.toFinished > 0) && (
                    <div className="pt-2 border-t border-zinc-700">
                      <p className="text-gray-400 mb-1">Status changes:</p>
                      {repairResult.result.shows.statusChanges.toWatching > 0 && (
                        <p className="text-yellow-400">
                          {repairResult.result.shows.statusChanges.toWatching} shows moved to &quot;Watching&quot;
                        </p>
                      )}
                      {repairResult.result.shows.statusChanges.toFinished > 0 && (
                        <p className="text-green-400">
                          {repairResult.result.shows.statusChanges.toFinished} shows kept as &quot;Finished&quot;
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sync button */}
            <button
              onClick={handleSync}
              disabled={syncing || repairing}
              className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:opacity-50 text-white font-medium rounded-xl transition flex items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Sync Now
                </>
              )}
            </button>

            {/* Info text */}
            <p className="text-sm text-gray-500 text-center">
              Syncing will import any movies and TV shows you&apos;ve watched in
              Trakt that aren&apos;t already in your library.
            </p>

            {/* Repair button - temporary for fixing previously synced data */}
            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={handleRepair}
                disabled={syncing || repairing}
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-xl transition flex items-center justify-center gap-2"
              >
                {repairing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Repairing...
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5" />
                    Repair Synced Data
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 text-center mt-2">
                Fixes timestamps (for correct sorting) and updates TV show statuses
                (moves in-progress shows from &quot;Finished&quot; to &quot;Watching&quot;).
              </p>
            </div>

            {/* Disconnect button */}
            <button
              onClick={handleDisconnect}
              className="w-full py-3 px-4 text-red-400 hover:bg-zinc-900 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Unlink className="w-5 h-5" />
              Disconnect Trakt
            </button>
          </div>
        )}

        {/* How it works */}
        <div className="pt-4 border-t border-zinc-800">
          <h2 className="font-medium mb-3">How it works</h2>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex gap-2">
              <span className="text-gray-500">1.</span>
              Connect your Trakt account using the button above
            </li>
            <li className="flex gap-2">
              <span className="text-gray-500">2.</span>
              Watch movies & shows using Kodi, Plex, or any Trakt-connected app
            </li>
            <li className="flex gap-2">
              <span className="text-gray-500">3.</span>
              Your watches are automatically tracked in Trakt
            </li>
            <li className="flex gap-2">
              <span className="text-gray-500">4.</span>
              Sync to import your watched content here
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
