# FlickLog - Project Overview

> A movie and TV show tracking application (similar to Letterboxd/TV Time)

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS + Lucide React icons
- **Auth**: NextAuth.js v5 (email/password + Google OAuth)
- **Database**: Vercel Postgres (SQL)
- **External API**: TMDb API for movie/TV data
- **PWA**: Service worker + web app manifest

## Project Structure

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── api/
│   ├── auth/[...nextauth]/     # NextAuth endpoints
│   ├── browse/                  # Category browsing
│   ├── library/                 # User's media library CRUD
│   ├── search/                  # TMDb search
│   ├── trending/                # Trending content
│   ├── movie/[id]/              # Movie details from TMDb
│   └── tv/[id]/                 # TV show details from TMDb
├── community/                   # Placeholder - not implemented
├── discover/page.tsx            # Search & browse page
├── movie/[id]/page.tsx          # Movie detail page
├── tv/[id]/page.tsx             # TV show detail page
├── movies/page.tsx              # User's movie library
├── shows/page.tsx               # User's TV show library
├── add/page.tsx                 # Quick add page
├── library/page.tsx             # Redirects to /shows
└── page.tsx                     # Home (redirects to /shows)

components/
├── BottomNav.tsx                # Mobile bottom navigation
├── Sidebar.tsx                  # Desktop sidebar navigation
├── SearchBar.tsx                # Search input with debounce
├── SearchResults.tsx            # Search results grid
├── MediaCard.tsx                # Card for list/grid views
├── ProfileMenu.tsx              # User profile dropdown
├── StatusModal.tsx              # Add/edit media status modal
├── TagSelector.tsx              # Tag selection UI
└── InstallPrompt.tsx            # PWA install prompt

lib/
├── db.ts                        # Database connection & queries
├── tmdb.ts                      # TMDb API helpers
└── auth.ts                      # NextAuth configuration

hooks/
├── useAuth.ts                   # Authentication hook
└── useLibrary.ts                # Library data fetching hook
```

## Database Schema

### Core Tables

**users**
- id, email, password_hash, name, image, created_at

**media** (centralized catalog)
- id, tmdb_id, media_type ('movie'|'tv'), title, poster_path, backdrop_path, overview, release_date, created_at

**user_media** (user's relationship to media)
- id, user_id, media_id, status, rating (1-5), notes, added_date, watched_date, created_at, updated_at

**Status values**: 'watchlist', 'watching', 'finished', 'onhold', 'dropped'

**tags** (system + user tags)
- id, name, user_id (null for system tags), is_system, created_at

**user_media_tags** (junction table)
- user_media_id, tag_id

### System Tags
- favorites (heart icon)
- rewatch (rotation icon)
- classics (star icon - nostalgia/throwback)

### Legacy Tables (still exist, may be redundant)
- watchlist, watched, watching, onhold, dropped, rewatch, nostalgia, favorites

## Key Features

### Media Tracking
- Add movies/TV shows to library with status
- Rate on 5-star scale
- Tag as favorite, rewatch, or classic
- Change status (watchlist -> watching -> finished)

### Discovery
- Search movies and TV shows via TMDb
- Browse trending, popular, top-rated
- Filter by media type (all/movies/TV)
- Popular searches suggestions

### Library Views
- Separate pages for movies (/movies) and TV shows (/shows)
- Filter by status (all, watchlist, watching, finished, on hold, dropped)
- Filter by tags (favorites, rewatch, classics)
- Grid and list view options
- Session caching for fast navigation

### Detail Pages
- Full movie/TV info from TMDb
- Cast and crew
- Genres, runtime, release date
- User's status, rating, and tags
- Add/edit functionality via modal

### Authentication
- Email/password registration and login
- Google OAuth
- Protected routes via middleware

### PWA
- Installable on mobile/desktop
- Service worker for offline support
- App manifest with icons

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/library | GET | Get user's library (filterable) |
| /api/library | POST | Add media to library |
| /api/library | PUT | Update status/rating/tags |
| /api/library | DELETE | Remove from library |
| /api/search | GET | Search TMDb |
| /api/movie/[id] | GET | Get movie details |
| /api/tv/[id] | GET | Get TV show details |
| /api/trending | GET | Get trending content |
| /api/browse | GET | Get category content |

## Styling Conventions

- **Primary color**: #8b5ef4 (purple)
- **Background**: black, zinc-900, zinc-800
- **Text**: white, gray-400, gray-500
- **Cards**: bg-zinc-900 with rounded-lg
- **Focus states**: ring-2 ring-[#8b5ef4]

## Environment Variables

```
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
POSTGRES_URL=
TMDB_API_KEY=
TMDB_ACCESS_TOKEN=
```

## Current Limitations

1. **No episode tracking** - TV shows tracked as whole, not by episode
2. **No text reviews** - Rating only, notes field unused
3. **No custom tags** - Only system tags available
4. **No social features** - Community page is placeholder
5. **No sorting** - Library lists can't be sorted
6. **No stats** - No watch time or analytics

## Code Patterns

### Data Fetching
- Server components for initial data
- Client components with useEffect for dynamic data
- SessionStorage caching on library pages

### State Management
- React useState/useEffect (no external state library)
- URL search params for filters

### Error Handling
- Try/catch in API routes
- Error states in UI components
- Fallback images for missing posters
