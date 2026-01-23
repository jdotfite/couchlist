import { create } from 'zustand';

export interface LibraryItem {
  id: number;
  media_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
}

interface LibraryState {
  // Data
  watchingItems: LibraryItem[];
  watchlistItems: LibraryItem[];
  finishedItems: LibraryItem[];
  customListsCount: number;
  isLoading: boolean;
  lastFetched: number | null;

  // Actions
  setWatchingItems: (items: LibraryItem[]) => void;
  setWatchlistItems: (items: LibraryItem[]) => void;
  setFinishedItems: (items: LibraryItem[]) => void;
  setCustomListsCount: (count: number) => void;
  setIsLoading: (loading: boolean) => void;

  // Convenience actions
  addToWatchlist: (item: LibraryItem) => void;
  removeFromWatchlist: (mediaId: number) => void;
  moveToWatching: (item: LibraryItem) => void;
  moveToFinished: (item: LibraryItem) => void;
  removeFromLibrary: (mediaId: number) => void;

  // Fetch all library data
  fetchLibrary: () => Promise<void>;

  // Invalidate cache (force refetch next time)
  invalidate: () => void;
}

const CACHE_DURATION = 30000; // 30 seconds

export const useLibraryStore = create<LibraryState>((set, get) => ({
  // Initial state
  watchingItems: [],
  watchlistItems: [],
  finishedItems: [],
  customListsCount: 0,
  isLoading: false,
  lastFetched: null,

  // Basic setters
  setWatchingItems: (items) => set({ watchingItems: items }),
  setWatchlistItems: (items) => set({ watchlistItems: items }),
  setFinishedItems: (items) => set({ finishedItems: items }),
  setCustomListsCount: (count) => set({ customListsCount: count }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Add to watchlist
  addToWatchlist: (item) => {
    const { watchlistItems } = get();
    // Avoid duplicates
    if (!watchlistItems.some(i => i.media_id === item.media_id)) {
      set({ watchlistItems: [item, ...watchlistItems] });
    }
  },

  // Remove from watchlist
  removeFromWatchlist: (mediaId) => {
    set({ watchlistItems: get().watchlistItems.filter(i => i.media_id !== mediaId) });
  },

  // Move item to watching
  moveToWatching: (item) => {
    const { watchlistItems, watchingItems, finishedItems } = get();
    set({
      watchlistItems: watchlistItems.filter(i => i.media_id !== item.media_id),
      finishedItems: finishedItems.filter(i => i.media_id !== item.media_id),
      watchingItems: [item, ...watchingItems.filter(i => i.media_id !== item.media_id)],
    });
  },

  // Move item to finished (watched)
  moveToFinished: (item) => {
    const { watchlistItems, watchingItems, finishedItems } = get();
    set({
      watchlistItems: watchlistItems.filter(i => i.media_id !== item.media_id),
      watchingItems: watchingItems.filter(i => i.media_id !== item.media_id),
      finishedItems: [item, ...finishedItems.filter(i => i.media_id !== item.media_id)],
    });
  },

  // Remove from all lists
  removeFromLibrary: (mediaId) => {
    const { watchlistItems, watchingItems, finishedItems } = get();
    set({
      watchlistItems: watchlistItems.filter(i => i.media_id !== mediaId),
      watchingItems: watchingItems.filter(i => i.media_id !== mediaId),
      finishedItems: finishedItems.filter(i => i.media_id !== mediaId),
    });
  },

  // Fetch all library data from API (single endpoint)
  fetchLibrary: async () => {
    const { lastFetched, isLoading } = get();

    // Skip if already loading or recently fetched
    if (isLoading) return;
    if (lastFetched && Date.now() - lastFetched < CACHE_DURATION) return;

    set({ isLoading: true });

    try {
      const response = await fetch('/api/library/summary');

      // Handle auth errors silently - user will be redirected
      if (response.status === 401) {
        set({ isLoading: false });
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch library summary');
      }

      const data = await response.json();

      set({
        watchingItems: data.watching || [],
        watchlistItems: data.watchlist || [],
        finishedItems: data.finished || [],
        customListsCount: data.customListsCount || 0,
        lastFetched: Date.now(),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch library:', error);
      set({ isLoading: false });
    }
  },

  // Invalidate cache to force refetch
  invalidate: () => {
    set({ lastFetched: null });
  },
}));
