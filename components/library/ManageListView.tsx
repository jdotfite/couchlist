'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import {
  CheckSquare,
  Square,
  Trash2,
  ArrowRightLeft,
  X,
  Film,
  Tv,
  Star,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';

export interface ManageableItem {
  user_media_id: number;
  media_id: number;
  tmdb_id: number;
  media_type: string;
  title: string;
  poster_path: string | null;
  genre_ids: string | null;
  release_year: number | null;
  status: string;
  rating: number | null;
}

interface ManageListViewProps {
  items: ManageableItem[];
  showStatus?: boolean; // Show status badge (useful for full library view)
  currentList?: string; // Current list context (e.g., 'watchlist', 'watching')
  isSelectMode?: boolean; // Whether selection mode is active
  onDelete: (mediaIds: number[]) => Promise<void>;
  onMove: (mediaIds: number[], targetStatus: string) => Promise<void>;
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'watchlist', label: 'Watchlist', color: 'bg-blue-500' },
  { value: 'watching', label: 'Watching', color: 'bg-emerald-500' },
  { value: 'finished', label: 'Watched', color: 'bg-purple-500' },
];


export default function ManageListView({
  items,
  showStatus = false,
  currentList,
  isSelectMode = true,
  onDelete,
  onMove,
  onRefresh,
  searchQuery,
  onSearchChange,
}: ManageListViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveSheet, setShowMoveSheet] = useState(false);
  const [mounted, setMounted] = useState(false);

  // For portal - need to render fixed elements outside the transformed AppLayout container
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => item.title.toLowerCase().includes(query));
  }, [items, searchQuery]);

  const toggleSelect = (mediaId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(mediaId)) {
      newSelected.delete(mediaId);
    } else {
      newSelected.add(mediaId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.media_id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async (targetStatus: string) => {
    if (selectedIds.size === 0) return;
    setIsMoving(true);
    try {
      await onMove(Array.from(selectedIds), targetStatus);
      setSelectedIds(new Set());
      setShowMoveSheet(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to move:', error);
    } finally {
      setIsMoving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find((o) => o.value === status);
    if (!option) return null;
    return (
      <span className={`${option.color} text-white text-[9px] px-1.5 py-0.5 rounded font-medium`}>
        {option.label}
      </span>
    );
  };

  // Available move targets (exclude current list)
  const moveTargets = STATUS_OPTIONS.filter((o) => o.value !== currentList);

  return (
    <>
      {/* Selection Controls - only show in select mode */}
      {isSelectMode && (
        <div className="px-4 py-3 flex items-center justify-between text-sm border-b border-zinc-800">
          <span className="text-gray-400">
            {filteredItems.length} items
            {selectedIds.size > 0 && <span className="text-white"> · {selectedIds.size} selected</span>}
          </span>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 ? (
              <button onClick={deselectAll} className="text-gray-400 hover:text-white">
                Deselect all
              </button>
            ) : (
              <button onClick={selectAll} className="text-gray-400 hover:text-white">
                Select all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Items Grid */}
      <div className="px-4 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.media_id);
              const itemContent = (
                <>
                  {/* Poster */}
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
                    {/* Top Left: Checkbox in select mode, otherwise media type icon */}
                    <div className="absolute top-2 left-2 z-[1]">
                      {isSelectMode ? (
                        isSelected ? (
                          <CheckSquare className="w-5 h-5 text-brand-primary bg-black rounded" />
                        ) : (
                          <Square className="w-5 h-5 text-white/60 bg-black/50 rounded" />
                        )
                      ) : (
                        <div className="w-6 h-6 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center">
                          {item.media_type === 'movie' ? (
                            <Film className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Tv className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Top Right: Status badge */}
                    {showStatus && item.status && (
                      <div className="absolute top-2 right-2 z-[1]">
                        {getStatusBadge(item.status)}
                      </div>
                    )}

                    <Image
                      src={getImageUrl(item.poster_path)}
                      alt={item.title}
                      fill
                      className={`object-cover ${isSelectMode && isSelected ? 'opacity-80' : ''}`}
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                    />
                  </div>
                </>
              );

              // Shared content for title and meta
              const metaContent = (
                <>
                  {/* Title */}
                  <p className="mt-1 text-xs truncate">{item.title}</p>

                  {/* Meta Row - year and rating */}
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                    {item.release_year && <span>{item.release_year}</span>}
                    {item.rating && (
                      <>
                        {item.release_year && <span>·</span>}
                        <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        <span>{item.rating}</span>
                      </>
                    )}
                  </div>
                </>
              );

              // In select mode, use div with onClick; otherwise use Link
              if (isSelectMode) {
                return (
                  <div
                    key={item.user_media_id}
                    onClick={() => toggleSelect(item.media_id)}
                    className={`relative cursor-pointer transition ${
                      isSelected ? 'ring-2 ring-brand-primary rounded-lg' : ''
                    }`}
                  >
                    {itemContent}
                    {metaContent}
                  </div>
                );
              }

              return (
                <Link
                  key={item.user_media_id}
                  href={`/${item.media_type}/${item.tmdb_id}`}
                  className="relative block transition hover:opacity-80"
                >
                  {itemContent}
                  {metaContent}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Action Bar - rendered via portal to escape transformed container */}
      {mounted && selectedIds.size > 0 && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[100]">
          <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-20 px-4">
            <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-sm text-white">{selectedIds.size} selected</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMoveSheet(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition text-white"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Move
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal - rendered via portal */}
      {mounted && showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2 text-white">Remove {selectedIds.size} items?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will remove these items from your library. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 text-white"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Move Sheet - rendered via portal */}
      {mounted && showMoveSheet && createPortal(
        <div className="fixed inset-0 z-[110] bg-black/80" onClick={() => setShowMoveSheet(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl max-h-[60vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-zinc-600 rounded-full" />
            </div>

            <div className="px-4 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Move {selectedIds.size} items to...</h2>
                <button
                  onClick={() => setShowMoveSheet(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {moveTargets.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleMove(option.value)}
                    disabled={isMoving}
                    className="w-full flex items-center gap-3 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition disabled:opacity-50 text-white"
                  >
                    <div className={`w-3 h-3 rounded-full ${option.color}`} />
                    <span className="font-medium">{option.label}</span>
                    {isMoving && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
