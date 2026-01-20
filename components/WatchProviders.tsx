'use client';

import Image from 'next/image';
import { Tv, ShoppingCart, PlayCircle } from 'lucide-react';
import { WatchProviderRegion, WatchProvider } from '@/types';

interface WatchProvidersProps {
  providers: WatchProviderRegion | undefined;
  tmdbLink?: string;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';

function ProviderLogo({ provider }: { provider: WatchProvider }) {
  return (
    <div
      className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0"
      title={provider.provider_name}
    >
      <Image
        src={`${TMDB_IMAGE_BASE}${provider.logo_path}`}
        alt={provider.provider_name}
        fill
        className="object-cover"
        sizes="40px"
      />
    </div>
  );
}

function ProviderSection({
  title,
  icon,
  providers,
}: {
  title: string;
  icon: React.ReactNode;
  providers: WatchProvider[];
}) {
  if (!providers || providers.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {icon}
        <span>{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {providers.slice(0, 6).map((provider) => (
          <ProviderLogo key={provider.provider_id} provider={provider} />
        ))}
        {providers.length > 6 && (
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-gray-400">
            +{providers.length - 6}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WatchProviders({ providers, tmdbLink }: WatchProvidersProps) {
  if (!providers) {
    return null;
  }

  const hasStreaming = providers.flatrate && providers.flatrate.length > 0;
  const hasFree = (providers.free && providers.free.length > 0) || (providers.ads && providers.ads.length > 0);
  const hasRent = providers.rent && providers.rent.length > 0;
  const hasBuy = providers.buy && providers.buy.length > 0;

  // Combine free and ads-supported
  const freeProviders = [...(providers.free || []), ...(providers.ads || [])];

  if (!hasStreaming && !hasFree && !hasRent && !hasBuy) {
    return null;
  }

  return (
    <div className="pt-4 space-y-4">
      <h2 className="text-lg font-semibold">Where to Watch</h2>

      <div className="space-y-4">
        {hasStreaming && (
          <ProviderSection
            title="Stream"
            icon={<Tv className="w-4 h-4" />}
            providers={providers.flatrate!}
          />
        )}

        {hasFree && (
          <ProviderSection
            title="Free"
            icon={<PlayCircle className="w-4 h-4" />}
            providers={freeProviders}
          />
        )}

        {hasRent && (
          <ProviderSection
            title="Rent"
            icon={<ShoppingCart className="w-4 h-4" />}
            providers={providers.rent!}
          />
        )}

        {hasBuy && (
          <ProviderSection
            title="Buy"
            icon={<ShoppingCart className="w-4 h-4" />}
            providers={providers.buy!}
          />
        )}
      </div>

      {tmdbLink && (
        <a
          href={tmdbLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-gray-500 hover:text-gray-400 transition"
        >
          Powered by JustWatch
        </a>
      )}
    </div>
  );
}
