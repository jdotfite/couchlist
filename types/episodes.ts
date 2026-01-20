// Episode Tracking Types

export interface TMDbEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
  vote_average: number;
  season_number: number;
}

export interface TMDbSeasonDetails {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episodes: TMDbEpisode[];
}

export interface SeasonProgress {
  seasonNumber: number;
  totalEpisodes: number;
  watchedEpisodes: number;
  isComplete: boolean;
}

export interface ShowProgress {
  mediaId: number;
  totalEpisodes: number;
  watchedEpisodes: number;
  percentage: number;
  currentSeason: number;
  currentEpisode: number;
  nextEpisode: {
    seasonNumber: number;
    episodeNumber: number;
    name: string;
    runtime: number | null;
  } | null;
  seasons: SeasonProgress[];
  watchedList: Array<{ season: number; episode: number; status: string }>;
}

export interface EpisodeWithStatus extends TMDbEpisode {
  userStatus: 'watched' | 'skipped' | 'unwatched';
  isNext: boolean;
}

export interface UserEpisode {
  id: number;
  userId: number;
  mediaId: number;
  seasonNumber: number;
  episodeNumber: number;
  tmdbEpisodeId: number | null;
  status: 'watched' | 'skipped';
  rating: number | null;
  notes: string | null;
  watchedAt: string;
}
