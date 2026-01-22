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
│   ├── collaborators/           # Collaboration management
│   ├── list-preferences/        # Custom list names
│   ├── search/                  # TMDb search
│   ├── trending/                # Trending content
│   ├── movie/[id]/              # Movie details from TMDb
│   └── tv/[id]/                 # TV show details from TMDb
├── community/                   # Placeholder - not implemented
├── discover/page.tsx            # REDIRECTS to /search
├── invite/[code]/page.tsx       # Accept collaboration invite
├── movie/[id]/page.tsx          # Movie detail page
├── tv/[id]/page.tsx             # TV show detail page
├── movies/page.tsx              # REDIRECTS to /library?type=movie
├── shows/page.tsx               # REDIRECTS to /library?type=tv
├── search/page.tsx              # Search & browse (unified)
├── library/page.tsx             # Unified library (movies + TV)
├── profile/page.tsx             # Profile tab (settings hub)
├── settings/
│   ├── page.tsx                 # Settings hub
│   ├── collaborators/page.tsx   # Manage shared lists
│   ├── lists/page.tsx           # Rename list names
│   ├── notifications/page.tsx   # Show alert preferences
│   └── trakt/page.tsx           # Trakt sync settings
├── add/page.tsx                 # Quick add page
└── page.tsx                     # Home (search hero + lists + trending)

components/
├── BottomNav.tsx                # Mobile bottom navigation (Home|Search|Library|Profile)
├── Sidebar.tsx                  # Desktop sidebar navigation
├── SearchBar.tsx                # Search input with debounce
├── SearchResults.tsx            # Search results grid
├── MediaCard.tsx                # Card for list/grid views
├── ProfileMenu.tsx              # User profile dropdown
├── StatusModal.tsx              # Add/edit media status modal
├── TagSelector.tsx              # Tag selection UI
├── InstallPrompt.tsx            # PWA install prompt
├── home/
│   ├── SearchHero.tsx           # Tappable search bar linking to /search
│   ├── ContinueWatching.tsx     # Mixed movies + TV with type badges
│   ├── ListsGrid.tsx            # Compact list cards for home
│   ├── TrendingRow.tsx          # Trending content with add buttons
│   └── HomePageSkeleton.tsx     # Loading skeleton for home
├── notifications/
│   ├── NotificationBell.tsx     # Bell icon with unread count
│   └── NotificationCenter.tsx   # Slide-out notification panel
└── tv/
    └── ShowAlertToggle.tsx      # Per-show alert toggle

lib/
├── db.ts                        # Database connection & schema
├── tmdb.ts                      # TMDb API helpers
├── trakt.ts                     # Trakt API helpers & OAuth
├── auth.ts                      # NextAuth configuration
├── collaborators.ts             # Collaboration logic
├── list-preferences.ts          # Custom list name logic
├── show-alerts.ts               # Notification settings & creation
└── show-sync.ts                 # TMDb metadata sync with rate limiting

hooks/
├── useAuth.ts                   # Authentication hook
├── useLibrary.ts                # Library data fetching hook
├── useMediaStatus.ts            # Media status management
├── useListPreferences.ts        # Custom list names hook
└── useNotificationSettings.ts   # Show alert settings hooks

types/
├── index.ts                     # TMDb API types
├── episodes.ts                  # Episode tracking types
├── import.ts                    # Import job types
└── notifications.ts             # Notification & alert types
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

### Collaboration Tables

**collaborators** (links users who share lists)
- id, owner_id, collaborator_id, invite_code, invite_expires_at, status, created_at, accepted_at

**shared_lists** (which lists are shared)
- id, collaborator_id, list_type, is_active, created_at

**user_list_preferences** (custom list names)
- id, user_id, list_type, display_name, created_at, updated_at

### Notification Tables

**user_notification_settings** (global alert preferences)
- id, user_id, alert_new_season, alert_season_premiere, alert_episode_airing, alert_season_finale, alert_show_ended, premiere_advance_days, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at

**user_show_alert_settings** (per-show overrides)
- id, user_id, media_id, alerts_enabled, alert_new_season, alert_season_premiere, alert_episode_airing, alert_season_finale, premiere_advance_days, created_at

**tv_show_metadata** (cached TMDb show data)
- id, media_id, tmdb_id, status, number_of_seasons, next_episode_to_air_date, next_episode_season, next_episode_number, next_episode_name, last_synced_at

**notifications** (unified notification storage)
- id, user_id, type, title, message, media_id, data (JSONB), is_read, created_at

**Notification Types**: 'new_season', 'premiere', 'episode', 'finale', 'show_ended', 'invite', 'collab_invite', 'collab_accepted'

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

### Navigation (4-tab structure)
- **Home** (`/`) - Search hero + Your Lists + Continue Watching + Trending
- **Search** (`/search`) - Full search & browse functionality
- **Library** (`/library`) - Unified view of all movies + TV
- **Profile** (`/profile`) - User info + settings hub

### Library Views
- Unified library at `/library` with movies + TV together
- Filter by type (all, movies, TV shows)
- Filter by status (all, watchlist, watching, finished, on hold, dropped)
- Filter by tags (favorites, rewatch, classics)
- Grid and list view options
- Session caching for fast navigation
- Old URLs redirect: `/shows` → `/library?type=tv`, `/movies` → `/library?type=movie`

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

### Collaborative Lists
- Generate invite links (7-day expiry)
- Share specific lists (watchlist, watching, finished, etc.)
- Both users see shared items with "added by" attribution
- Edit which lists are shared after connecting
- Remove collaboration (items stay with original owner)
- "Shared" badge on collaborative list headers
- **Pending invites**: See and manage pending invite links you've created
- **Acceptance notifications**: Get notified when someone accepts your invite
- **Custom lists**: Shared separately via per-list invites from `/lists`

### Custom List Names
- Rename any of the 8 system lists (Settings → List Names)
- Custom names appear on dashboards, list headers, all lists pages
- 50 character limit per name
- Reset to default option
- Per-user preferences (doesn't affect collaborators)

### Show Alerts (New Season Alerts)
- Get notified about TV shows you're tracking
- **Alert types**: New season announced, season premiere, every episode (opt-in), season finale, show ended/canceled
- **Timing options**: Day of, day before, or week before
- **Quiet hours**: Pause notifications during specified hours
- **Per-show overrides**: Customize alerts for individual shows from TV detail pages
- **Smart defaults**: Premieres and finales enabled by default, not every episode
- Unified notification center shows both invites and show alerts
- Cron jobs sync TMDb metadata (every 6h) and generate alerts (8am/6pm)

### Trakt Sync
- Connect Trakt account via OAuth device flow (Settings → Trakt Sync)
- Import watch history from Kodi, Plex, Jellyfin, and other Trakt-connected apps
- **Device auth**: User goes to trakt.tv/activate and enters code
- **Sync behavior**: Imports watched movies/shows as "finished" status
- **Duplicate handling**: Skips items already in library
- **Manual sync**: User triggers sync from settings page
- Uses TMDB IDs from Trakt to match content

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
| /api/collaborators | GET/POST | List/create collaborations |
| /api/collaborators/[id] | PATCH/DELETE | Update/remove collaboration |
| /api/collaborators/invite/[code] | GET | Get invite details |
| /api/collaborators/accept/[code] | POST | Accept invite |
| /api/collaborators/shared-lists | GET | Get shared list types |
| /api/collaborators/pending-invites | GET | Get pending invite links |
| /api/collaborators/pending-invites/[id] | DELETE | Revoke pending invite |
| /api/list-preferences | GET/PATCH | Get/update custom list names |
| /api/notification-settings | GET/PATCH | Get/update global alert settings |
| /api/notification-settings/show/[mediaId] | GET/PATCH/DELETE | Per-show alert overrides |
| /api/notifications | GET | List notifications (paginated) |
| /api/notifications/count | GET | Get unread count |
| /api/notifications/[id]/read | POST | Mark notification as read |
| /api/notifications/[id] | DELETE | Delete a notification |
| /api/notifications/read-all | POST | Mark all notifications as read |
| /api/notifications/clear | POST | Clear all notifications |
| /api/cron/sync-shows | GET/POST | TMDb metadata sync (cron) |
| /api/cron/generate-alerts | GET/POST | Generate show alerts (cron) |
| /api/trakt/device-code | POST | Start Trakt device auth flow |
| /api/trakt/poll-token | POST | Poll for Trakt auth token |
| /api/trakt/status | GET/DELETE/PATCH | Get/disconnect/update Trakt connection |
| /api/trakt/sync | POST | Sync watched content from Trakt |

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
CRON_SECRET=              # Optional: Secure cron endpoints
TRAKT_CLIENT_ID=          # Optional: Trakt sync integration
TRAKT_CLIENT_SECRET=      # Optional: Trakt sync integration
```

## Current Limitations

1. **No episode tracking** - TV shows tracked as whole, not by episode
2. **No text reviews** - Rating only, notes field unused
3. **No custom tags** - Only system tags available (can rename but not create new)
4. **No sorting** - Library lists can't be sorted
5. **No stats** - No watch time or analytics

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
