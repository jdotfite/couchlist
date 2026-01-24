'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';
import { useStreamingServices } from '@/hooks/useStreamingServices';
import StreamingServiceIcon, { STREAMING_COLORS } from '@/components/icons/StreamingServiceIcons';

export default function ServicesSettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const {
    userProviderIds,
    allProviders,
    isLoading,
    toggleProvider,
    isSelected,
    save,
    hasChanges,
  } = useStreamingServices();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await save();
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save services:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading' || isLoading) {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">My Services</h1>
          </div>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : showSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                'Save'
              )}
            </button>
          )}
        </div>
      </header>

      <main className="px-4">
        {/* Description */}
        <p className="text-gray-400 mb-6">
          Select the streaming services you subscribe to. Your services will appear first when
          browsing and filtering content on the search page.
        </p>

        {/* Selected count */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">
            {userProviderIds.length} service{userProviderIds.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Provider Grid */}
        <div className="grid grid-cols-2 gap-3">
          {allProviders.map(provider => {
            const selected = isSelected(provider.provider_id);
            const bgColor = STREAMING_COLORS[provider.provider_id] || '#374151';
            return (
              <button
                key={provider.provider_id}
                onClick={() => toggleProvider(provider.provider_id)}
                className={`relative flex items-center gap-3 p-3 rounded-xl transition ${
                  selected
                    ? 'bg-brand-primary/20 ring-2 ring-brand-primary'
                    : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                {/* Provider Logo */}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: bgColor }}
                >
                  <StreamingServiceIcon
                    providerId={provider.provider_id}
                    size={28}
                    className="text-white"
                  />
                </div>

                {/* Provider Name */}
                <span className="font-medium text-sm text-left flex-1">
                  {provider.provider_name}
                </span>

                {/* Checkmark */}
                {selected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Help text */}
        <p className="text-sm text-gray-500 mt-6 text-center">
          These are the most popular streaming services in the US. More services can be filtered
          directly on the search page.
        </p>
      </main>
    </div>
  );
}
