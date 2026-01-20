// Import system types

export type ImportSource = 'letterboxd' | 'trakt' | 'imdb' | 'csv';
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ImportItemStatus = 'pending' | 'success' | 'failed' | 'skipped';
export type MatchConfidence = 'exact' | 'fuzzy' | 'failed';
export type ConflictStrategy = 'skip' | 'overwrite' | 'keep_higher_rating';

export interface ImportItem {
  title: string;
  year?: number;
  rating?: number;         // Normalized 1-5
  originalRating?: number; // Source scale rating
  status?: 'watchlist' | 'watched';
  watchedDate?: string;
  isRewatch?: boolean;
  tags?: string[];
}

export interface LetterboxdItem extends ImportItem {
  letterboxdUri?: string;
}

export interface TMDbMatchResult {
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string | null;
  confidence: MatchConfidence;
  score: number;
}

export interface ImportJob {
  id: number;
  userId: number;
  source: ImportSource;
  status: ImportJobStatus;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ImportJobItem {
  id: number;
  importJobId: number;
  sourceTitle: string;
  sourceYear?: number;
  sourceRating?: number;
  sourceStatus?: string;
  tmdbId?: number;
  matchedTitle?: string;
  matchConfidence?: MatchConfidence;
  status: ImportItemStatus;
  resultAction?: 'created' | 'updated' | 'skipped_existing';
  errorMessage?: string;
  createdAt: string;
}

export interface ImportConfig {
  source: ImportSource;
  conflictStrategy: ConflictStrategy;
  importRatings: boolean;
  importWatchlist: boolean;
  importWatched: boolean;
  markRewatchAsTag: boolean;
}

export interface ImportProgress {
  jobId: number;
  status: ImportJobStatus;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  currentItem?: string;
  percentage: number;
}

export interface ImportSummary {
  jobId: number;
  status: ImportJobStatus;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  duration: number; // in seconds
  failedItemsList: ImportJobItem[];
}

// Letterboxd CSV row types
export interface LetterboxdDiaryRow {
  Date: string;
  Name: string;
  Year: string;
  'Letterboxd URI': string;
  Rating: string;
  Rewatch: string;
  Tags: string;
  'Watched Date': string;
}

export interface LetterboxdRatingsRow {
  Date: string;
  Name: string;
  Year: string;
  'Letterboxd URI': string;
  Rating: string;
}

export interface LetterboxdWatchedRow {
  Date: string;
  Name: string;
  Year: string;
  'Letterboxd URI': string;
}

export interface LetterboxdWatchlistRow {
  Date: string;
  Name: string;
  Year: string;
  'Letterboxd URI': string;
}

// Parsed result from Letterboxd export
export interface LetterboxdParseResult {
  items: LetterboxdItem[];
  stats: {
    diaryCount: number;
    ratingsCount: number;
    watchedCount: number;
    watchlistCount: number;
    totalUnique: number;
  };
  errors: string[];
}
