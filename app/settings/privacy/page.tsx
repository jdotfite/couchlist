'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2, Check, AlertCircle, User, Eye, Users, Shield, X, Link as LinkIcon } from 'lucide-react';

interface PrivacySettings {
  discoverability: 'everyone' | 'connections_only' | 'nobody';
  show_in_search: boolean;
  allow_invites_from: 'everyone' | 'connections_only' | 'nobody';
}

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function PrivacySettingsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>('idle');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [settings, setSettings] = useState<PrivacySettings>({
    discoverability: 'everyone',
    show_in_search: true,
    allow_invites_from: 'everyone',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usernameRes, privacyRes] = await Promise.all([
        fetch('/api/users/username'),
        fetch('/api/users/privacy'),
      ]);

      if (usernameRes.ok) {
        const data = await usernameRes.json();
        setUsername(data.username || '');
        setOriginalUsername(data.username || '');
      }

      if (privacyRes.ok) {
        const data = await privacyRes.json();
        setSettings({
          discoverability: data.discoverability || 'everyone',
          show_in_search: data.show_in_search !== false,
          allow_invites_from: data.allow_invites_from || 'everyone',
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateUsername = (value: string): string | null => {
    if (!value) return null; // Empty is allowed (removes username)
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 30) return 'Username must be 30 characters or less';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Only letters, numbers, and underscores allowed';
    return null;
  };

  const checkAvailability = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setAvailabilityStatus('idle');
      return;
    }

    // Don't check if it's the same as the original
    if (value.toLowerCase() === originalUsername?.toLowerCase()) {
      setAvailabilityStatus('idle');
      return;
    }

    setAvailabilityStatus('checking');

    try {
      const response = await fetch('/api/users/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: value }),
      });

      const data = await response.json();

      if (data.error && !data.available) {
        // Validation error (not taken, but invalid format)
        if (data.error !== 'This username is already taken') {
          setAvailabilityStatus('invalid');
          setUsernameError(data.error);
        } else {
          setAvailabilityStatus('taken');
          setUsernameError(data.error);
        }
      } else if (data.available) {
        setAvailabilityStatus('available');
        setUsernameError(null);
      } else {
        setAvailabilityStatus('taken');
        setUsernameError('This username is already taken');
      }
    } catch {
      setAvailabilityStatus('idle');
    }
  }, [originalUsername]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    setUsernameSuccess(false);

    const validationError = validateUsername(value);
    if (validationError) {
      setUsernameError(validationError);
      setAvailabilityStatus('invalid');
      return;
    }

    setUsernameError(null);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the availability check
    debounceTimerRef.current = setTimeout(() => {
      checkAvailability(value);
    }, 500);
  };

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const saveUsername = async () => {
    const error = validateUsername(username);
    if (error) {
      setUsernameError(error);
      return;
    }

    setSavingUsername(true);
    setUsernameError(null);
    setUsernameSuccess(false);

    try {
      const response = await fetch('/api/users/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        setUsernameError(data.error || 'Failed to save username');
        return;
      }

      // Use the verified username from the server
      const savedUsername = data.username || '';
      setUsername(savedUsername);
      setOriginalUsername(savedUsername);
      setUsernameSuccess(true);
      setAvailabilityStatus('idle');
      setTimeout(() => setUsernameSuccess(false), 3000);
    } catch {
      setUsernameError('Failed to save username');
    } finally {
      setSavingUsername(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsSuccess(false);

    try {
      const response = await fetch('/api/users/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSavingSettings(false);
    }
  };

  const getAvailabilityIcon = () => {
    switch (availabilityStatus) {
      case 'checking':
        return <Loader2 className="w-5 h-5 animate-spin-fast text-gray-400" />;
      case 'available':
        return <Check className="w-5 h-5 text-green-400" />;
      case 'taken':
      case 'invalid':
        return <X className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  const isSaveDisabled = () => {
    if (savingUsername) return true;
    if (username === originalUsername) return true;
    if (usernameError) return true;
    if (availabilityStatus === 'taken' || availabilityStatus === 'invalid') return true;
    if (availabilityStatus === 'checking') return true;
    return false;
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin-fast text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">Privacy & Profile</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-8">
        {/* Username Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-brand-primary" />
              <h2 className="text-lg font-semibold">Username</h2>
            </div>
            {originalUsername && (
              <span className="flex items-center gap-1 text-sm text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                <Check className="w-3 h-3" />
                Saved
              </span>
            )}
            {!originalUsername && (
              <span className="text-sm text-gray-500 bg-zinc-800 px-2 py-1 rounded-full">
                Not set
              </span>
            )}
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
            <p className="text-sm text-gray-400">
              Your username allows other users to find and invite you to collaborate on lists.
              It must be unique and can only contain letters, numbers, and underscores.
            </p>
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="username"
                  maxLength={30}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {getAvailabilityIcon()}
                </div>
              </div>

              {/* Availability/Error Messages */}
              {usernameError && (
                <p className="text-sm text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {usernameError}
                </p>
              )}
              {availabilityStatus === 'available' && !usernameError && (
                <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Username is available
                </p>
              )}
              {usernameSuccess && (
                <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Username saved successfully
                </p>
              )}

              {/* Profile URL Preview */}
              {username && !usernameError && availabilityStatus !== 'taken' && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                  <LinkIcon className="w-4 h-4" />
                  <span>
                    Your profile: <span className="text-white">flicklog.com/@{username}</span>
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={saveUsername}
              disabled={isSaveDisabled()}
              className="w-full py-3 bg-brand-primary hover:bg-brand-primary-light disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              {savingUsername ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin-fast text-gray-400" />
                  Saving...
                </>
              ) : (
                'Save Username'
              )}
            </button>
          </div>
        </section>

        {/* Privacy Settings Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-brand-primary" />
            <h2 className="text-lg font-semibold">Privacy Settings</h2>
          </div>
          <div className="bg-zinc-900 rounded-xl divide-y divide-zinc-800">
            {/* Discoverability */}
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <Eye className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <h3 className="font-medium">Profile Discoverability</h3>
                  <p className="text-sm text-gray-400">Who can see your profile</p>
                </div>
              </div>
              <select
                value={settings.discoverability}
                onChange={(e) => setSettings({ ...settings, discoverability: e.target.value as PrivacySettings['discoverability'] })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
              >
                <option value="everyone">Everyone</option>
                <option value="connections_only">Connections Only</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            {/* Show in Search */}
            <div className="p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Appear in Search Results</h3>
                    <p className="text-sm text-gray-400">Allow others to find you by searching your username</p>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.show_in_search}
                    onChange={(e) => setSettings({ ...settings, show_in_search: e.target.checked })}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition ${
                      settings.show_in_search ? 'bg-brand-primary' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                        settings.show_in_search ? 'translate-x-5' : 'translate-x-0.5'
                      } mt-0.5`}
                    />
                  </div>
                </div>
              </label>
            </div>

            {/* Allow Invites From */}
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <h3 className="font-medium">Accept Invites From</h3>
                  <p className="text-sm text-gray-400">Who can send you collaboration invites</p>
                </div>
              </div>
              <select
                value={settings.allow_invites_from}
                onChange={(e) => setSettings({ ...settings, allow_invites_from: e.target.value as PrivacySettings['allow_invites_from'] })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
              >
                <option value="everyone">Everyone</option>
                <option value="connections_only">Connections Only</option>
                <option value="nobody">Nobody (Block all invites)</option>
              </select>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="w-full mt-4 py-3 bg-brand-primary hover:bg-brand-primary-light disabled:opacity-50 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            {savingSettings ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin-fast text-gray-400" />
                Saving...
              </>
            ) : settingsSuccess ? (
              <>
                <Check className="w-5 h-5" />
                Saved!
              </>
            ) : (
              'Save Privacy Settings'
            )}
          </button>
        </section>

        {/* Info Box */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">
            <strong className="text-white">Note:</strong> Even if you disable appearing in search results,
            users who know your exact email address can still find you. To fully prevent invites,
            set "Accept Invites From" to "Nobody".
          </p>
        </div>
      </main>
    </div>
  );
}
