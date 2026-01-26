'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Settings, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ShowAlertToggleProps {
  mediaId: number;
  showTitle: string;
  isLoggedIn: boolean;
}

interface ShowSettings {
  alerts_enabled: boolean;
  alert_new_season: boolean | null;
  alert_season_premiere: boolean | null;
  alert_episode_airing: boolean | null;
  alert_season_finale: boolean | null;
  premiere_advance_days: number | null;
}

interface EffectiveSettings {
  alerts_enabled: boolean;
  alert_new_season: boolean;
  alert_season_premiere: boolean;
  alert_episode_airing: boolean;
  alert_season_finale: boolean;
  premiere_advance_days: number;
}

export default function ShowAlertToggle({ mediaId, showTitle, isLoggedIn }: ShowAlertToggleProps) {
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showSettings, setShowSettings] = useState<ShowSettings | null>(null);
  const [effectiveSettings, setEffectiveSettings] = useState<EffectiveSettings | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    fetchSettings();
  }, [isLoggedIn, mediaId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/notification-settings/show/${mediaId}`);
      if (response.ok) {
        const data = await response.json();
        setShowSettings(data.showSettings);
        setEffectiveSettings(data.effectiveSettings);
      }
    } catch (error) {
      console.error('Failed to fetch show alert settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!isLoggedIn || toggling) return;

    const newEnabled = !effectiveSettings?.alerts_enabled;
    setToggling(true);

    try {
      const response = await fetch(`/api/notification-settings/show/${mediaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts_enabled: newEnabled }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowSettings(data.showSettings);
        setEffectiveSettings(data.effectiveSettings);
      }
    } catch (error) {
      console.error('Failed to toggle alerts:', error);
    } finally {
      setToggling(false);
    }
  };

  const handleSheetToggle = async (field: string, value: boolean | null) => {
    if (!isLoggedIn) return;

    setSavingSheet(true);
    try {
      const response = await fetch(`/api/notification-settings/show/${mediaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowSettings(data.showSettings);
        setEffectiveSettings(data.effectiveSettings);
      }
    } catch (error) {
      console.error('Failed to update show setting:', error);
    } finally {
      setSavingSheet(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!isLoggedIn) return;

    setSavingSheet(true);
    try {
      const response = await fetch(`/api/notification-settings/show/${mediaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        setShowSettings(null);
        setEffectiveSettings(data.effectiveSettings);
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
    } finally {
      setSavingSheet(false);
    }
  };

  if (!isLoggedIn) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  const alertsEnabled = effectiveSettings?.alerts_enabled ?? true;
  const hasCustomSettings = showSettings !== null;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition
            ${alertsEnabled
              ? 'bg-[#8b5ef4]/20 text-white border border-[#8b5ef4]/40 hover:bg-[#8b5ef4]/30'
              : 'bg-zinc-800 text-gray-400 border border-zinc-700 hover:bg-zinc-700'
            }
            disabled:opacity-50
          `}
          title={alertsEnabled ? 'Alerts enabled - click to disable' : 'Alerts disabled - click to enable'}
        >
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : alertsEnabled ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
          <span>{alertsEnabled ? 'Alerts On' : 'Alerts Off'}</span>
        </button>

        <button
          onClick={() => setIsSheetOpen(true)}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-zinc-800 rounded-full transition"
          title="Customize alerts for this show"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Sheet */}
      {isSheetOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/70 z-[100]"
            onClick={() => setIsSheetOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl z-[110] max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="p-4 border-b border-zinc-800">
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white">Alert Settings</h2>
              <p className="text-sm text-gray-400 mt-1">{showTitle}</p>
            </div>

            <div className="p-4 space-y-4">
              {/* Master Toggle */}
              <SheetToggle
                label="Get alerts for this show"
                checked={alertsEnabled}
                onChange={(v) => handleSheetToggle('alerts_enabled', v)}
                disabled={savingSheet}
                isCustomized={false}
              />

              {alertsEnabled && (
                <>
                  <div className="pt-2">
                    <p className="text-sm text-gray-500 mb-3">
                      Override your global defaults for this show. Unchecked options use your default settings.
                    </p>
                  </div>

                  <SheetToggle
                    label="New season announced"
                    checked={showSettings?.alert_new_season ?? effectiveSettings?.alert_new_season ?? true}
                    onChange={(v) => handleSheetToggle('alert_new_season', showSettings?.alert_new_season === null ? v : (v === effectiveSettings?.alert_new_season ? null : v))}
                    disabled={savingSheet}
                    isCustomized={showSettings?.alert_new_season !== null && showSettings?.alert_new_season !== undefined}
                  />

                  <SheetToggle
                    label="Season premiere"
                    checked={showSettings?.alert_season_premiere ?? effectiveSettings?.alert_season_premiere ?? true}
                    onChange={(v) => handleSheetToggle('alert_season_premiere', showSettings?.alert_season_premiere === null ? v : (v === effectiveSettings?.alert_season_premiere ? null : v))}
                    disabled={savingSheet}
                    isCustomized={showSettings?.alert_season_premiere !== null && showSettings?.alert_season_premiere !== undefined}
                  />

                  <SheetToggle
                    label="Every episode"
                    checked={showSettings?.alert_episode_airing ?? effectiveSettings?.alert_episode_airing ?? false}
                    onChange={(v) => handleSheetToggle('alert_episode_airing', showSettings?.alert_episode_airing === null ? v : (v === effectiveSettings?.alert_episode_airing ? null : v))}
                    disabled={savingSheet}
                    isCustomized={showSettings?.alert_episode_airing !== null && showSettings?.alert_episode_airing !== undefined}
                  />

                  <SheetToggle
                    label="Season finale"
                    checked={showSettings?.alert_season_finale ?? effectiveSettings?.alert_season_finale ?? true}
                    onChange={(v) => handleSheetToggle('alert_season_finale', showSettings?.alert_season_finale === null ? v : (v === effectiveSettings?.alert_season_finale ? null : v))}
                    disabled={savingSheet}
                    isCustomized={showSettings?.alert_season_finale !== null && showSettings?.alert_season_finale !== undefined}
                  />
                </>
              )}

              {hasCustomSettings && (
                <button
                  onClick={handleResetToDefaults}
                  disabled={savingSheet}
                  className="w-full py-3 text-sm text-gray-400 hover:text-white transition disabled:opacity-50"
                >
                  Reset to default settings
                </button>
              )}

              <button
                onClick={() => setIsSheetOpen(false)}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

interface SheetToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  isCustomized: boolean;
}

function SheetToggle({ label, checked, onChange, disabled, isCustomized }: SheetToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-white">{label}</span>
        {isCustomized && (
          <span className="text-xs text-[#8b5ef4]">Custom</span>
        )}
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
