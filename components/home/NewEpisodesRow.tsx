'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Calendar } from 'lucide-react';
import type { NewEpisodeItem } from '@/app/api/home/recommendations/route';

interface NewEpisodesRowProps {
  episodes: NewEpisodeItem[];
}

function getRelativeDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NewEpisodesRow({ episodes }: NewEpisodesRowProps) {
  if (episodes.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Airing Soon</h2>
      </div>

      <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
        <div className="flex gap-3 px-4">
          {episodes.map((episode) => {
            const episodeLabel = `S${episode.next_episode_season} E${episode.next_episode_number}`;
            const airedDate = getRelativeDate(episode.next_episode_to_air_date);

            return (
              <Link
                key={episode.media_id}
                href={`/tv/${episode.media_id}`}
                className="group flex-shrink-0 snap-start"
                style={{ width: 'calc(40% - 6px)' }}
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                  <Image
                    src={getImageUrl(episode.poster_path)}
                    alt={episode.title}
                    fill
                    className="object-cover group-hover:opacity-75 transition"
                    sizes="40vw"
                  />

                  {/* Episode badge - Top Left */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-brand-primary text-white text-xs font-medium rounded">
                    {episodeLabel}
                  </div>

                  {/* Aired indicator - Bottom */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/75 backdrop-blur-sm rounded text-xs text-gray-300">
                    <Calendar className="w-3 h-3" />
                    <span>{airedDate}</span>
                  </div>
                </div>
                <h3 className="font-semibold text-sm line-clamp-1">{episode.title}</h3>
                {episode.next_episode_name && (
                  <p className="text-xs text-gray-400 line-clamp-1">{episode.next_episode_name}</p>
                )}
              </Link>
            );
          })}
          <div className="flex-shrink-0 w-1" />
        </div>
      </div>
    </section>
  );
}
