'use client';

import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if in standalone mode (iOS)
    if (('standalone' in window.navigator) && (window.navigator as any).standalone) {
      return;
    }

    // Check if dismissed recently (within 7 days)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Check for iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, show banner after a delay
    if (isIOSDevice) {
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // For Android/Chrome, listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
            {isIOS ? <Share className="w-6 h-6 text-white" /> : <Download className="w-6 h-6 text-white" />}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">Add FlickLog to Home Screen</h3>
            {isIOS ? (
              <div className="text-sm text-gray-400">
                <p className="mb-2">Tap the share button in Safari:</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-zinc-800 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3 3h-2v6h-2V5H9l3-3zm-7 9v10h14V11h-2v8H7v-8H5z"/>
                    </svg>
                  </span>
                  <span>Then &quot;Add to Home Screen&quot;</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-3">
                Install our app for a better experience with offline access
              </p>
            )}

            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstall}
                className="bg-brand-primary hover:bg-brand-primary-dark text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Install App
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
