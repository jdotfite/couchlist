'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Bell, Clock, Moon, Loader2 } from 'lucide-react';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';

export default function NotificationSettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { settings, loading, error, updateSettings } = useNotificationSettings();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleToggle = async (field: string, value: boolean) => {
    setSaving(true);
    setSaveSuccess(false);
    const success = await updateSettings({ [field]: value });
    setSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleTimingChange = async (days: number) => {
    setSaving(true);
    setSaveSuccess(false);
    const success = await updateSettings({ premiere_advance_days: days });
    setSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">Notification Settings</h1>
          {(saving || saveSuccess) && (
            <span className={`ml-auto text-sm ${saveSuccess ? 'text-green-400' : 'text-gray-400'}`}>
              {saving ? 'Saving...' : 'Saved'}
            </span>
          )}
        </div>
      </header>

      <main className="px-4 space-y-6">
        {/* Show Alerts Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-[#8b5ef4]" />
            <h2 className="text-lg font-semibold">Show Alerts</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Choose which types of alerts you want to receive for TV shows you&apos;re tracking.
          </p>

          <div className="space-y-3">
            <ToggleRow
              label="New season announced"
              description="When a new season is officially announced"
              checked={settings?.alert_new_season ?? true}
              onChange={(v) => handleToggle('alert_new_season', v)}
              disabled={saving}
            />
            <ToggleRow
              label="Season premiere"
              description="When a new season is about to premiere"
              checked={settings?.alert_season_premiere ?? true}
              onChange={(v) => handleToggle('alert_season_premiere', v)}
              disabled={saving}
            />
            <ToggleRow
              label="Every episode"
              description="Get notified for every new episode"
              checked={settings?.alert_episode_airing ?? false}
              onChange={(v) => handleToggle('alert_episode_airing', v)}
              disabled={saving}
            />
            <ToggleRow
              label="Season finale"
              description="When the season finale is airing"
              checked={settings?.alert_season_finale ?? true}
              onChange={(v) => handleToggle('alert_season_finale', v)}
              disabled={saving}
            />
            <ToggleRow
              label="Show ended/canceled"
              description="When a show is officially ended or canceled"
              checked={settings?.alert_show_ended ?? true}
              onChange={(v) => handleToggle('alert_show_ended', v)}
              disabled={saving}
            />
          </div>
        </section>

        {/* Timing Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#8b5ef4]" />
            <h2 className="text-lg font-semibold">Timing</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            When should we notify you about premieres and new episodes?
          </p>

          <div className="card">
            <label className="text-sm text-gray-400 mb-3 block">Notify me</label>
            <div className="flex flex-wrap gap-2">
              <TimingButton
                label="Day of"
                value={0}
                selected={settings?.premiere_advance_days === 0}
                onClick={() => handleTimingChange(0)}
                disabled={saving}
              />
              <TimingButton
                label="Day before"
                value={1}
                selected={settings?.premiere_advance_days === 1}
                onClick={() => handleTimingChange(1)}
                disabled={saving}
              />
              <TimingButton
                label="Week before"
                value={7}
                selected={settings?.premiere_advance_days === 7}
                onClick={() => handleTimingChange(7)}
                disabled={saving}
              />
            </div>
          </div>
        </section>

        {/* Quiet Hours Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-[#8b5ef4]" />
            <h2 className="text-lg font-semibold">Quiet Hours</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Pause notifications during specific hours.
          </p>

          <div className="space-y-4">
            <ToggleRow
              label="Enable quiet hours"
              description="Notifications will be held until quiet hours end"
              checked={settings?.quiet_hours_enabled ?? false}
              onChange={(v) => handleToggle('quiet_hours_enabled', v)}
              disabled={saving}
            />

            {settings?.quiet_hours_enabled && (
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm text-gray-400 mb-1 block">From</label>
                    <input
                      type="time"
                      value={settings?.quiet_hours_start || '22:00'}
                      onChange={async (e) => {
                        setSaving(true);
                        await updateSettings({ quiet_hours_start: e.target.value });
                        setSaving(false);
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#8b5ef4]"
                      disabled={saving}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-gray-400 mb-1 block">To</label>
                    <input
                      type="time"
                      value={settings?.quiet_hours_end || '08:00'}
                      onChange={async (e) => {
                        setSaving(true);
                        await updateSettings({ quiet_hours_end: e.target.value });
                        setSaving(false);
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#8b5ef4]"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Info Note */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">
            These are your default settings for all shows. You can customize alerts for individual shows
            from their detail pages.
          </p>
        </div>
      </main>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="card flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white">{label}</p>
        <p className="text-sm text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-[#8b5ef4] focus:ring-offset-2 focus:ring-offset-zinc-900
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-[#8b5ef4]' : 'bg-zinc-700'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

interface TimingButtonProps {
  label: string;
  value: number;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function TimingButton({ label, selected, onClick, disabled }: TimingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-medium text-sm transition
        disabled:opacity-50 disabled:cursor-not-allowed
        ${selected
          ? 'bg-[#8b5ef4] text-white'
          : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
        }
      `}
    >
      {label}
    </button>
  );
}
