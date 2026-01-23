# FlickLog

A movie and TV show tracking app. Track what you're watching, share lists with your partner, send recommendations to friends, and discover what's next—all filtered by the streaming services you actually have.

## Features

- **Track Media** - Watchlist, Watching, Finished with ratings and tags
- **Episode Tracking** - Track progress by season and episode for TV shows
- **Smart Discovery** - Filter by your streaming services, genres, ratings
- **Partner Sharing** - Share lists bidirectionally with a partner
- **Friend Recommendations** - Send and receive suggestions from friends
- **Trakt Sync** - Import watch history from Kodi, Plex, Jellyfin
- **Letterboxd Import** - Import your movie history

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Lucide React icons
- **Auth**: NextAuth.js v5 (email/password + Google OAuth)
- **Database**: Vercel Postgres
- **State**: Zustand
- **API**: TMDb for movie/TV data

## Getting Started

1. Clone the repo
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in values
4. `npm run dev`

See `CLAUDE.md` for detailed project documentation.

## Environment Variables

```
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
POSTGRES_URL=
TMDB_API_KEY=
TMDB_ACCESS_TOKEN=
TRAKT_CLIENT_ID=          # Optional
TRAKT_CLIENT_SECRET=      # Optional
```
