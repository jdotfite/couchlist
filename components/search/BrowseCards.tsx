'use client';

import { TOP_US_PROVIDERS } from '@/types/streaming';
import StreamingServiceIcon, { STREAMING_COLORS } from '@/components/icons/StreamingServiceIcons';

interface BrowseCardsProps {
  onProviderClick: (providerId: number) => void;
}

// Convert hex to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default function BrowseCards({
  onProviderClick,
}: BrowseCardsProps) {
  // Take top 8 providers for display
  const displayProviders = TOP_US_PROVIDERS.slice(0, 8);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Browse by Service</h2>
      <div className="grid grid-cols-4 gap-2">
        {displayProviders.map(provider => {
          const bgColor = STREAMING_COLORS[provider.provider_id] || '#374151';
          return (
            <button
              key={provider.provider_id}
              onClick={() => onProviderClick(provider.provider_id)}
              className="relative aspect-square rounded-xl overflow-hidden transition group flex items-center justify-center"
              style={{ backgroundColor: hexToRgba(bgColor, 0.70) }}
            >
              <StreamingServiceIcon
                providerId={provider.provider_id}
                size={32}
                className="text-white group-hover:scale-105 transition-transform"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
