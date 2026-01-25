'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronRight,
  Plus,
  LucideIcon,
  Users2,
} from 'lucide-react';
import LibraryPageSkeleton from '@/components/skeletons/LibraryPageSkeleton';
import MainHeader from '@/components/ui/MainHeader';
import QuickStats from '@/components/stats/QuickStats';
import { getImageUrl } from '@/lib/tmdb';
import { useListPreferences } from '@/hooks/useListPreferences';
import { getIconComponent } from '@/components/custom-lists/IconPicker';
import { getColorValue } from '@/components/custom-lists/ColorPicker';
import { ListVisibilityInline } from '@/components/sharing';
import SectionHeader from '@/components/ui/SectionHeader';
import { SYSTEM_LISTS } from '@/lib/list-config';

interface ListData {
  slug: string;
  title: string;
  icon: LucideIcon;
  color: string;
  items: { poster_path: string | null }[];
  count: number;
}

interface CustomList {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
  item_count: number;
  items: { poster_path: string | null }[];
}

interface CollaborativeList {
  id: number;
  name: string;
  itemCount: number;
  friendUserId: number;
  friendName: string;
  friendImage: string | null;
}

// Core system lists - uses centralized config from lib/list-config.ts
const listConfig = SYSTEM_LISTS.map((list) => ({
  slug: list.slug,
  title: list.title,
  icon: list.icon,
  color: list.bgColorClass,
  api: list.slug === 'finished' ? '/api/watched' : `/api/${list.slug}`,
}));

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { getListName } = useListPreferences();

  const [lists, setLists] = useState<ListData[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [collaborativeLists, setCollaborativeLists] = useState<CollaborativeList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAllLists();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchAllLists = async () => {
    setIsLoading(true);
    try {
      // Fetch system lists, custom lists, and collaborative lists in parallel
      const [systemListsResults, customListsRes, collaborativeListsRes] = await Promise.all([
        Promise.all(
          listConfig.map(async (config) => {
            try {
              const response = await fetch(config.api);
              if (response.ok) {
                const data = await response.json();
                const items = data.items || [];
                return {
                  slug: config.slug,
                  title: config.title,
                  icon: config.icon,
                  color: config.color,
                  items: items.slice(0, 5),
                  count: items.length,
                };
              }
            } catch (error) {
              console.error(`Failed to fetch ${config.slug}:`, error);
            }
            return {
              slug: config.slug,
              title: config.title,
              icon: config.icon,
              color: config.color,
              items: [],
              count: 0,
            };
          })
        ),
        fetch('/api/custom-lists'),
        fetch('/api/collaborative-lists'),
      ]);

      setLists(systemListsResults);

      // Parse custom lists
      if (customListsRes.ok) {
        const customData = await customListsRes.json();
        setCustomLists(customData.lists || []);
      }

      // Parse collaborative lists
      if (collaborativeListsRes.ok) {
        const collabData = await collaborativeListsRes.json();
        setCollaborativeLists(collabData.lists || []);
      }
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return <LibraryPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <MainHeader title="Library" />

      <main className="px-4">
        <SectionHeader
          title="Your Library"
          ctaText="View All"
          ctaHref="/library/manage"
          className="mb-3"
        />

        {/* List Cards */}
        <div className="space-y-3">
          {lists.map((list) => {
            const IconComponent = list.icon;
            const displayName = getListName(list.slug) || list.title;

            return (
              <Link
                key={list.slug}
                href={`/library/${list.slug}`}
                className="block bg-zinc-900 hover:bg-zinc-800 rounded-xl overflow-hidden transition group"
              >
                <div className="flex items-center p-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br ${list.color} flex-shrink-0`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 ml-4 min-w-0">
                    <h3 className="font-semibold text-lg">{displayName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{list.count} items</span>
                      <ListVisibilityInline listType={list.slug} />
                    </div>
                  </div>

                  {/* Preview Posters - stacked with rightmost on top */}
                  {list.items.length > 0 && (
                    <div className="flex mr-2">
                      {list.items.slice(0, 5).map((item, index) => (
                        <div
                          key={index}
                          className="relative w-8 h-12 rounded overflow-hidden flex-shrink-0"
                          style={{
                            zIndex: index,
                            marginLeft: index === 0 ? 0 : -16,
                            boxShadow: index > 0 ? '-3px 0 6px rgba(0, 0, 0, 0.4)' : 'none',
                          }}
                        >
                          {item.poster_path ? (
                            <Image
                              src={getImageUrl(item.poster_path)}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-700" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Custom Lists Section */}
        <div className="mt-8">
          <SectionHeader
            title="Custom Lists"
            ctaText="Manage"
            ctaHref="/lists"
            className="mb-4"
          />

          {customLists.length > 0 ? (
            <div className="space-y-3">
              {customLists.map((list) => {
                const IconComponent = getIconComponent(list.icon);
                const colorValue = getColorValue(list.color);

                return (
                  <Link
                    key={list.id}
                    href={`/lists/${list.slug}`}
                    className="block bg-zinc-900 hover:bg-zinc-800 rounded-xl overflow-hidden transition group"
                  >
                    <div className="flex items-center p-4">
                      {/* Icon */}
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: colorValue }}
                      >
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 ml-4 min-w-0">
                        <h3 className="font-semibold text-lg">{list.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>{list.item_count} items</span>
                          <ListVisibilityInline listType="custom" listId={list.id} />
                        </div>
                      </div>

                      {/* Preview Posters - stacked with rightmost on top */}
                      {list.items && list.items.length > 0 && (
                        <div className="flex mr-2">
                          {list.items.slice(0, 5).map((item, index) => (
                            <div
                              key={index}
                              className="relative w-8 h-12 rounded overflow-hidden flex-shrink-0"
                              style={{
                                zIndex: index,
                                marginLeft: index === 0 ? 0 : -16,
                                boxShadow: index > 0 ? '-3px 0 6px rgba(0, 0, 0, 0.4)' : 'none',
                              }}
                            >
                              {item.poster_path ? (
                                <Image
                                  src={getImageUrl(item.poster_path)}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="32px"
                                />
                              ) : (
                                <div className="w-full h-full bg-zinc-700" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Link
              href="/lists"
              className="block border-2 border-dashed border-zinc-700 hover:border-brand-primary rounded-xl overflow-hidden transition group"
            >
              <div className="flex items-center p-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-zinc-800 group-hover:bg-brand-primary/20 transition flex-shrink-0">
                  <Plus className="w-6 h-6 text-gray-400 group-hover:text-brand-primary transition" />
                </div>

                {/* Info */}
                <div className="flex-1 ml-4 min-w-0">
                  <h3 className="font-semibold text-lg text-gray-300 group-hover:text-white transition">Create Custom List</h3>
                  <p className="text-sm text-gray-400">Organize your way</p>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition flex-shrink-0" />
              </div>
            </Link>
          )}
        </div>

        {/* Shared With Friends Section */}
        {collaborativeLists.length > 0 && (
          <div className="mt-8">
            <SectionHeader
              title="Shared With Friends"
              className="mb-3"
            />
            <div className="space-y-3">
              {collaborativeLists.map((list) => (
                <Link
                  key={list.id}
                  href={`/friends/${list.friendUserId}`}
                  className="block bg-zinc-900 hover:bg-zinc-800 rounded-xl overflow-hidden transition group"
                >
                  <div className="flex items-center p-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-brand-primary flex-shrink-0">
                      <Users2 className="w-6 h-6 text-white" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 ml-4 min-w-0">
                      <h3 className="font-semibold text-lg">{list.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{list.itemCount} items</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {list.friendImage ? (
                            <Image
                              src={list.friendImage}
                              alt={list.friendName}
                              width={16}
                              height={16}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-4 h-4 bg-zinc-600 rounded-full flex items-center justify-center">
                              <span className="text-[8px] font-medium">
                                {list.friendName?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          with {list.friendName}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats Section */}
        <QuickStats />
      </main>
    </div>
  );
}
