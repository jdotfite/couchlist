'use client';

import {
  Swords,
  Mountain,
  Sparkles,
  Smile,
  Fingerprint,
  Film,
  Theater,
  Users,
  Wand2,
  Landmark,
  Skull,
  Music,
  Search,
  Heart,
  Rocket,
  Zap,
  Shield,
  Sun,
} from 'lucide-react';
import { TOP_US_PROVIDERS, COMMON_GENRES } from '@/types/streaming';
import StreamingServiceIcon, { STREAMING_COLORS } from '@/components/icons/StreamingServiceIcons';

interface BrowseCardsProps {
  userProviderIds?: number[];
  onProviderClick: (providerId: number) => void;
  onGenreClick: (genreId: number) => void;
}

// Icons for each genre
const GENRE_ICONS: Record<number, React.ElementType> = {
  28: Swords, // Action
  12: Mountain, // Adventure
  16: Sparkles, // Animation
  35: Smile, // Comedy
  80: Fingerprint, // Crime
  99: Film, // Documentary
  18: Theater, // Drama
  10751: Users, // Family
  14: Wand2, // Fantasy
  36: Landmark, // History
  27: Skull, // Horror
  10402: Music, // Music
  9648: Search, // Mystery
  10749: Heart, // Romance
  878: Rocket, // Sci-Fi
  53: Zap, // Thriller
  10752: Shield, // War
  37: Sun, // Western
};

// Color palette for genre cards - modern gradients
const GENRE_COLORS: Record<number, string> = {
  28: 'from-rose-500 to-orange-600', // Action - warm energy
  12: 'from-amber-500 to-orange-600', // Adventure - golden warmth
  16: 'from-violet-400 to-fuchsia-500', // Animation - playful
  35: 'from-emerald-500 to-teal-600', // Comedy - fun fresh
  80: 'from-slate-500 to-zinc-700', // Crime - dark moody
  99: 'from-sky-500 to-blue-600', // Documentary - informative
  18: 'from-indigo-500 to-purple-600', // Drama - deep emotional
  10751: 'from-pink-400 to-rose-500', // Family - soft warm
  14: 'from-purple-500 to-indigo-600', // Fantasy - magical
  36: 'from-stone-500 to-neutral-600', // History - earthy
  27: 'from-neutral-600 to-neutral-800', // Horror - dark
  10402: 'from-fuchsia-500 to-pink-500', // Music - vibrant
  9648: 'from-slate-600 to-indigo-700', // Mystery - intriguing
  10749: 'from-pink-500 to-rose-600', // Romance - passionate
  878: 'from-cyan-500 to-blue-600', // Sci-Fi - futuristic
  53: 'from-red-500 to-rose-600', // Thriller - intense
  10752: 'from-emerald-600 to-teal-700', // War - serious
  37: 'from-orange-500 to-amber-600', // Western - dusty warm
};

const getGenreColor = (genreId: number) => GENRE_COLORS[genreId] || 'from-zinc-600 to-zinc-800';

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
  userProviderIds = [],
  onProviderClick,
  onGenreClick,
}: BrowseCardsProps) {
  // Sort providers: user's services first
  const sortedProviders = [...TOP_US_PROVIDERS].sort((a, b) => {
    const aIsUser = userProviderIds.includes(a.provider_id);
    const bIsUser = userProviderIds.includes(b.provider_id);
    if (aIsUser && !bIsUser) return -1;
    if (!aIsUser && bIsUser) return 1;
    return 0;
  });

  // Take top 8 providers for display
  const displayProviders = sortedProviders.slice(0, 8);
  const displayGenres = COMMON_GENRES.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Browse by Service */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Browse by Service</h2>
        <div className="grid grid-cols-4 gap-2">
          {displayProviders.map(provider => {
            const isUserService = userProviderIds.includes(provider.provider_id);
            const bgColor = STREAMING_COLORS[provider.provider_id] || '#374151';
            return (
              <button
                key={provider.provider_id}
                onClick={() => onProviderClick(provider.provider_id)}
                className={`relative aspect-square rounded-xl overflow-hidden transition group flex items-center justify-center ${
                  isUserService ? 'ring-2 ring-brand-primary ring-offset-2 ring-offset-black' : ''
                }`}
                style={{ backgroundColor: hexToRgba(bgColor, 0.65) }}
              >
                <StreamingServiceIcon
                  providerId={provider.provider_id}
                  size={32}
                  className="text-white group-hover:scale-105 transition-transform"
                />
                {isUserService && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-brand-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Browse by Genre */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Browse by Genre</h2>
        <div className="grid grid-cols-2 gap-2">
          {displayGenres.map(genre => {
            const Icon = GENRE_ICONS[genre.id];
            return (
              <button
                key={genre.id}
                onClick={() => onGenreClick(genre.id)}
                className={`relative h-16 rounded-xl overflow-hidden bg-gradient-to-br ${getGenreColor(
                  genre.id
                )} hover:scale-[1.02] active:scale-[0.98] transition-transform`}
              >
                <span className="absolute inset-0 flex items-center justify-center gap-2 text-base font-semibold">
                  {Icon && <Icon className="w-5 h-5" />}
                  {genre.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
