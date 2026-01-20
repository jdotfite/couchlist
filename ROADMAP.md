# FlickLog - Feature Roadmap

## Quick Wins (Low Effort, High Value)

### Sorting & Filtering Enhancements
- [x] Add sort options to library pages (date added, rating, title, release date)
- [x] Add search/filter within your own library
- [x] Genre badges on list items
- [ ] Advanced filters (by year, genre)

### User Content
- [x] Enable notes field in UI (DB column exists)
- [ ] Text reviews with ratings
- [x] Export watch history (CSV/JSON download)

### UI Polish
- [x] Consolidate MoviePage and TVShowPage into shared component
- [x] CSS variables for theme colors (Tailwind v4 @theme)
- [ ] Empty state improvements
- [ ] Loading skeletons

---

## Phase 1: Core Improvements

### Database Cleanup
- [x] Audit legacy status tables (watchlist, watched, etc.)
- [x] Consolidate to user_media + tags system
- [x] Add proper indexes for performance

### Custom Tags
- [ ] Allow users to create custom tags
- [ ] Tag management UI (create, edit, delete)
- [ ] Tag colors/icons

### Library Enhancements
- [ ] Unified library view option (movies + TV together)
- [ ] Batch operations (mark multiple as watched)
- [ ] Recently added section on home

### List Reordering
- [ ] Add drag-to-reorder for system lists (ListSettingsSheet)
  - Drag handle (⋮⋮ grip icon) or touch-and-hold gesture
  - Visual feedback during drag (lift effect, drop placeholder)
  - Persist order in user_list_preferences table (add `position` column)
- [ ] Add drag-to-reorder for custom lists (/lists page)
  - Same UX pattern as system lists
  - Update custom_lists.position on reorder

---

## Phase 2: Episode Tracking

> **Priority:** High - This is THE differentiator for TV tracking apps. Users cite lack of episode tracking as a dealbreaker.

### Design Philosophy
1. **Progressive disclosure** - Simple by default, detail on demand
2. **One-tap/swipe primary actions** - Mark watched instantly
3. **Visual progress everywhere** - Bars on cards, percentages on detail
4. **Respect existing design language** - Black/zinc/purple palette, bottom sheets
5. **Mobile-first** - Thumb-friendly, swipe-native

### Competitive Research Summary
| App | Strengths | Weaknesses |
|-----|-----------|------------|
| TV Time | Swipe-to-mark, progress bars, "mark all previous" | Buggy/slow, no episode notes |
| Trakt | Rich stats, rewatch tracking, calendar | Complex UI, notes paywalled |
| Serializd | Episode lists, community ratings | Too many taps, no swipe |
| Netflix | Clean season dropdown, familiar pattern | No tracking features |

### Database Schema

```sql
-- Track individual episode watches
CREATE TABLE user_episodes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  tmdb_episode_id INTEGER,
  status VARCHAR(20) DEFAULT 'watched',  -- 'watched', 'skipped'
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, media_id, season_number, episode_number)
);

CREATE INDEX idx_user_episodes_user_media ON user_episodes(user_id, media_id);
CREATE INDEX idx_user_episodes_watched ON user_episodes(user_id, watched_at DESC);

-- Add episode tracking fields to user_media
ALTER TABLE user_media
ADD COLUMN IF NOT EXISTS current_season INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_episode INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_episodes_watched INTEGER DEFAULT 0;
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tv/[id]/seasons` | GET | Get all seasons with episode lists (TMDb) |
| `/api/tv/[id]/season/[num]` | GET | Get specific season details |
| `/api/episodes` | POST | Mark episode(s) as watched |
| `/api/episodes` | DELETE | Unmark episode |
| `/api/episodes/batch` | POST | Mark up to episode X / entire season |
| `/api/progress/[media_id]` | GET | Get user's watch progress for a show |
| `/api/continue-watching` | GET | Get user's "up next" episodes |

### UI Components

#### 1. Show Card Enhancement (Library Grid)
- Add 3px progress bar at bottom of poster
- Purple (#8b5ef4) fill on zinc-800 track
- Only shows for "watching" status with tracked progress

#### 2. Continue Watching Section (/shows page)
- Horizontal scroll row at top of library
- Shows poster + progress bar + "S4 E13" label
- Tap → Goes to show detail page
- Only shows "watching" status items with episode data

#### 3. Show Detail Page - Progress Section
Location: Below genres/synopsis, above cast

```
YOUR PROGRESS
████████████████████░░░░░░░░░░  47/62  (76%)

Up Next: S4 E13 "Face Off"
┌─────────────────────────────────────────┐
│   advancement  │ ▶ Mark Watched │  52m  │
└─────────────────────────────────────────┘

SEASONS
┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│ 1  │ │ 2  │ │ 3  │ │ 4  │ │ 5  │
│ ✓  │ │ ✓  │ │ ✓  │ │12/16│ │0/16│
└────┘ └────┘ └────┘ └────┘ └────┘
```

- "Mark Watched" button advances to next episode
- Season pills: tap opens episode list bottom sheet
- Completed seasons show ✓, partial show count

#### 4. Episode List Bottom Sheet
Trigger: Tap season pill

```
Season 4                              Mark All ✓
████████████████░░░░  12/16 episodes

┌─────────────────────────────────────────┐
│ ✓ │  1. Box Cutter                 52m │
├─────────────────────────────────────────┤
│ ✓ │  2. Thirty-Eight Snub          47m │
├─────────────────────────────────────────┤
│ ○ │  13. Face Off         ← NEXT   47m │  ← purple accent
├─────────────────────────────────────────┤
│ ○ │  14. Live Free or Die          47m │
└─────────────────────────────────────────┘
```

**Interactions:**
- Tap row → Toggle watched/unwatched
- Swipe right → Quick mark watched (haptic feedback)
- Long press → Options menu (Skip, Add note, View details)
- "Mark All" → Marks entire season
- Long press episode → "Mark all previous?" batch action

#### 5. Episode Row States
- **Unwatched:** ○ + normal text
- **Next to watch:** ○ + "← NEXT" badge (purple accent)
- **Watched:** ✓ + dimmed text
- **Skipped:** ⊘ + gray strikethrough + "(skipped)" label

#### 6. Episode Expansion (tap title)
Inline expand showing:
- Air date
- Synopsis
- ★★★★★ rating input
- 📝 Add note field

#### 7. Swipe Gesture
- Swipe right reveals green "✓ Watched" indicator
- Release → marks episode, snaps back
- Haptic feedback + toast confirmation

### Implementation Phases

#### Phase 2A: Foundation (MVP) ✅ COMPLETE
- [x] Database schema for episode tracking
- [x] TMDb season/episode API integration with caching
- [x] Progress section on TV detail page (bar + percentage)
- [x] Season pills with episode counts
- [x] Episode list bottom sheet
- [x] Tap to mark individual episodes watched
- [x] "Mark All" for entire season
- [x] Update user_media progress fields on changes

#### Phase 2B: Quick Actions
- [ ] Swipe-to-mark gesture on episode rows
- [ ] "Mark all previous" (long press → batch)
- [x] "Up Next" card with quick mark button
- [ ] Progress bar overlay on show cards in library
- [ ] Continue Watching section on /shows page

#### Phase 2C: Polish
- [ ] Per-episode ratings (1-5 stars)
- [ ] Per-episode notes
- [ ] Skip episode option
- [ ] Episode detail expansion (inline)
- [ ] Watch date tracking per episode
- [ ] Haptic feedback on mobile

#### Phase 2D: Advanced (Future)
- [ ] Specials (Season 0) handling preference
- [ ] Rewatch tracking (watch count per episode)
- [ ] Calendar view for upcoming episodes
- [ ] Push notifications for new episodes
- [ ] Episode-level activity in stats

### Key Decisions Made
1. **Entry point:** Progress section visible by default on TV detail pages
2. **Data fetching:** Lazy-load seasons on tap (less upfront data, acceptable delay)
3. **Continue Watching:** Sits above existing library content (not replacing)
4. **Swipe gestures:** Include from Phase 2B (not MVP but high priority)

### FlickLog Differentiators vs Competitors
| Feature | TV Time | Trakt | Serializd | FlickLog |
|---------|---------|-------|-----------|----------|
| Swipe to mark | ✓ | ✗ | ✗ | ✓ |
| Progress on cards | ✓ | ✗ | ✓ | ✓ |
| Continue Watching | ✓ | ✓ | ✓ | ✓ |
| Mark all previous | ✓ | ✓ | ✗ | ✓ |
| Episode notes | ✗ | VIP | ✗ | ✓ Free |
| Skip episode | ✗ | ✓ | ✗ | ✓ |
| Inline episode expand | ✗ | ✗ | ✗ | ✓ |
| Movies + TV unified | ✗ | ✓ | ✗ | ✓ |
| Fast/stable | ✗ | ✓ | Mixed | ✓ Goal |

---

## Phase 3: Statistics & Analytics

### Watch Stats Dashboard
- [ ] Total movies/shows watched
- [ ] Total watch time (hours)
- [ ] Average rating given
- [ ] Completion rate (finished vs dropped)

### Visualizations
- [ ] Genre distribution chart
- [ ] Watching activity over time (heatmap or graph)
- [ ] Rating distribution
- [ ] Monthly/yearly breakdown

### Fun Stats
- [ ] Most watched genre
- [ ] Favorite decade
- [ ] Top directors/actors in your library
- [ ] Yearly wrapped (end of year summary)

---

## Phase 4: Social & Community

### User Profiles
- [ ] Public profile page with stats
- [ ] Profile customization (bio, avatar)
- [ ] Privacy settings (public/private library)
- [ ] Shareable profile links

### Friend System
- [ ] Follow/unfollow users
- [ ] Friends list
- [ ] Activity feed (what friends are watching)
- [ ] Friend suggestions

### Community Page (/community)
- [ ] Implement community page (currently placeholder)
- [ ] User search integration (reuse existing searchUsers from lib/users.ts)
- [ ] Find and follow friends by username
- [ ] See who's watching what in your network
- [ ] Discover users with similar taste

### Social Features
- [ ] Share lists/collections
- [ ] Comments on reviews
- [ ] Like/react to reviews
- [ ] Watch together (sync feature)

### Community Discovery
- [ ] Trending among users
- [ ] Popular reviews
- [ ] Leaderboards
- [ ] User recommendations

---

## Phase 5: Advanced Features

### Recommendations
- [ ] "Because you watched X" suggestions
- [ ] Genre-based recommendations
- [ ] Similar movies/shows (TMDb similar endpoint)
- [ ] AI-powered recommendations based on ratings

### Notifications
- [ ] New season/movie releases for favorites
- [ ] Friend activity notifications
- [ ] Watchlist reminders
- [ ] Email digest options

### Integrations
- [x] Import from Letterboxd (ZIP export with diary, ratings, watchlist) ✅
- [ ] Import from Trakt (JSON export)
- [ ] Import from IMDb (CSV export)
- [ ] Calendar integration (release dates)
- [ ] Streaming availability (JustWatch API)
- [ ] Share to social media with custom cards

### Lists & Collections
- [x] Custom lists (Best of 2024, Halloween movies, etc.) ✅ Phase B
- [x] Public/private list toggle (is_shared flag) ✅ Phase E
- [x] Collaborative lists ✅ Phase E
- [ ] List templates

---

## Technical Debt & Code Quality

### Performance
- [ ] Image optimization audit
- [ ] API response caching (Redis or similar)
- [ ] Database query optimization
- [ ] Bundle size analysis

### Code Quality
- [ ] Add error boundaries
- [ ] Input validation/sanitization in API routes
- [ ] Unit tests for critical paths
- [ ] E2E tests for user flows

### Infrastructure
- [ ] Logging and monitoring
- [ ] Rate limiting on API routes
- [ ] Database backups
- [ ] CI/CD pipeline improvements

### Recommended Libraries
- [ ] **SWR or TanStack Query** - Data fetching with auto-caching, revalidation, loading/error states
- [ ] **Zod** - Schema validation for API routes, pairs well with TypeScript
- [ ] **@upstash/ratelimit** - Serverless-friendly rate limiting for Vercel
- [ ] **sonner** - Clean toast notifications for user feedback
- [ ] **fuse.js** - Client-side fuzzy search for library filtering
- [ ] **framer-motion** - Smooth animations and page transitions

---

## Ideas Backlog

These are ideas to consider but not yet prioritized:

- Dark/light mode toggle
- Multiple rating systems (5-star, 10-point, thumbs)
- Spoiler tags for reviews
- Movie/TV quotes collection
- Watchlist priority/ordering
- "Recommend to friend" feature
- Mood-based recommendations
- Watch parties with chat
- Achievement badges/gamification
- Movie club features (group watching schedules)
- Crew following (get notified when favorite director releases new film)
- Box office tracking
- Awards tracking (Oscars, Emmys watchlist)

---

## Completed Features

- [x] User authentication (email + Google OAuth)
- [x] Movie and TV show search via TMDb
- [x] Add to library with status
- [x] 5-star rating system
- [x] System tags (favorites, rewatch, classics)
- [x] Status management (watchlist, watching, finished, on hold, dropped)
- [x] Discovery page with browse categories
- [x] Filter by media type
- [x] Grid and list views
- [x] PWA support
- [x] Mobile-responsive design
- [x] Session caching for library pages
- [x] Collaborative lists (share system lists via invite link)
- [x] Custom list names (rename system lists like Watchlist → "My Queue")
- [x] Custom lists core (create up to 10 custom lists with icons/colors)
- [x] Add media to custom lists from options sheet
- [x] List page enhancements (custom lists on /all pages, settings button, hide lists)
- [x] Custom list sharing (invite via link, add from connections, collaborator management)
- [x] In-app collaboration invites (user search, pending invites, notifications, privacy settings)
- [x] Episode tracking MVP (progress bar, season pills, episode list sheet, mark watched)
- [x] Letterboxd import (ZIP export with diary, ratings, watchlist, conflict resolution)

---

## Custom Lists & Sharing - Detailed Design

### Current Implementation Status

| Phase | Feature | Status |
|-------|---------|--------|
| A | Custom List Names (rename system lists) | ✅ Complete |
| B | Custom Lists Core (CRUD, UI, icons, colors) | ✅ Complete |
| C | Add Media to Custom Lists (from options sheet) | ✅ Complete |
| D | List Page Enhancements | ✅ Complete |
| E | Custom List Sharing (link-based) | ✅ Complete |
| E.2 | In-App Collaboration Invites | ✅ Complete |
| F | Polish & Refinements | 🔲 Planned |

### How System List Renaming Works

When a user renames "Rewatch" to "Watch Again":
- The backend still uses `rewatch` as the slug for all operations
- Only the display name changes (stored in `user_list_preferences`)
- Tags in `user_media_tags` still reference the `rewatch` tag
- This preserves system functionality while allowing personalization

### Phase D - List Page Enhancements (COMPLETE)

**Goal:** Improve /movies/all and /shows/all pages

1. **Show Custom Lists**
   - Append custom lists containing items of that media type
   - Display after system lists
   - Only show lists with at least 1 item

2. **Settings Button** (top right)
   - Opens unified bottom sheet with:
     - Create new list
     - Inline rename (tap list name to edit)
     - Hide/show lists (eye icon toggle)
     - Reset to default name option

3. **Create List Card**
   - Dashed border card at bottom of grid
   - "+ Create List" - opens CreateListModal

4. **Hide Lists Feature**
   - Add `is_hidden` boolean to `user_list_preferences`
   - Hidden lists don't appear on /all pages
   - Items still exist and work normally

5. **UI Standardization**
   - Removed separate /settings/lists page (consolidated into bottom sheet)
   - Standardized bottom sheet style: white/gray icons, "Add to X" / "Remove from X" pattern
   - Custom lists selector now matches tag toggle style (no checkboxes)

### Phase E - Custom List Sharing (COMPLETE)

**Goal:** Share custom lists with collaborators via in-app + links

#### Implementation Summary

1. **Database**: Added `custom_list_collaborators` table with indexes
2. **API Endpoints**:
   - `GET/POST/DELETE /api/custom-lists/[slug]/collaborators` - Manage collaborators
   - `POST /api/custom-lists/[slug]/invite` - Generate invite link
   - `GET/POST /api/custom-lists/invite/[code]` - View/accept invites
   - `GET /api/custom-lists/connections` - Get existing connections
   - `GET/DELETE /api/custom-lists/shared` - View/leave shared lists
3. **UI**: EditListModal now has "Collaborators" tab with:
   - Current collaborators list
   - Generate invite link button with copy functionality
   - Quick add from existing connections
   - Remove collaborator button
4. **Invite Page**: `/lists/invite/[code]` for accepting invitations
5. **Query Updates**: All custom list queries now include shared lists

#### Sharing Methods

**A. Link Sharing (External/New Users)**
- Generate shareable link for any custom list
- Link expires after 7 days
- Recipient can be new or existing user
- Good for: public sharing, inviting new users

**B. In-App Sharing (Existing Connections)**
- When editing a custom list, show "Add Collaborator" option
- Display list of existing connections (people you've collaborated with before)
- One-tap to add them to the list
- Good for: quick sharing with known collaborators

#### User Scenario: "Dane's movie recommendations"

1. User creates list "Dane's movie recommendations"
2. Opens list settings (gear icon)
3. Sees "Collaborators" section:
   - Current collaborators (if any)
   - "Add from connections" - shows existing collaborators
   - "Invite via link" - generates shareable link
4. Option A: Taps on Dane (existing connection) → Dane immediately has access
5. Option B: Generates link → sends to Dane via text/email

#### Database Changes

```sql
-- New table to link custom lists to collaborators
CREATE TABLE custom_list_collaborators (
  id SERIAL PRIMARY KEY,
  custom_list_id INTEGER NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'collaborator', -- 'owner' | 'collaborator'
  invite_code VARCHAR(32) UNIQUE,
  invite_expires_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'accepted', -- 'pending' | 'accepted'
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(custom_list_id, user_id)
);
```

#### API Endpoints Needed

- `POST /api/custom-lists/[slug]/collaborators` - Add collaborator
- `DELETE /api/custom-lists/[slug]/collaborators/[userId]` - Remove
- `GET /api/custom-lists/[slug]/collaborators` - List collaborators
- `POST /api/custom-lists/[slug]/invite` - Generate invite link
- `GET /api/custom-lists/invite/[code]` - View invite
- `POST /api/custom-lists/invite/[code]/accept` - Accept invite

#### Getting Existing Connections

```sql
SELECT DISTINCT
  CASE WHEN c.owner_id = :userId THEN c.collaborator_id ELSE c.owner_id END as user_id,
  u.name, u.email
FROM collaborators c
JOIN users u ON u.id = CASE WHEN c.owner_id = :userId THEN c.collaborator_id ELSE c.owner_id END
WHERE (c.owner_id = :userId OR c.collaborator_id = :userId)
AND c.status = 'accepted'
```

### Phase E.2 - In-App Collaboration Invites (NEW)

**Goal:** Enable streamlined in-app user discovery, invitations, and notifications

#### Competitor Analysis

| App | User Discovery | Invite Method | Notifications | Privacy Controls |
|-----|----------------|---------------|---------------|------------------|
| Letterboxd | Search by name/handle | Link to private lists | Follow-based | Public/Private lists |
| Spotify | None (link only) | Link invite (7-day expiry) | None for changes | Basic |
| Notion | Name/email search | Email or link | Real-time presence | Permission levels |
| Discord | Username search | Friend request | Badge + Message Requests | Granular (Everyone/FoF/Server/None) |
| Trakt | Username search | VIP: collaborate | Following-based | Public/Private/Shared |

#### Our Improvements Over Competitors

1. **Better than Letterboxd**: True collaborative editing + in-app user search (not just follow)
2. **Better than Spotify**: Actually notify users when invited or when items are added
3. **Better than Discord**: Simpler privacy settings focused on list-sharing context
4. **Better than Notion**: Mobile-first design, simpler permission model
5. **Better than Trakt**: Free collaboration (not VIP-only), modern notification UX

#### Implementation Phases

**E.2.1 - User Discovery System** ✅
- [x] Add `username` field to users table (unique, URL-safe)
- [x] Username selection during registration or first use
- [x] Profile settings to edit username
- [x] Search API endpoint: `/api/users/search?q=term`
- [x] Search by username (exact/partial match) or email (exact match only)
- [x] Return minimal info: id, name, username, avatar (not email unless exact match)

**E.2.2 - Privacy Settings** ✅
- [x] Add `privacy_settings` JSON column to users table or new table
- [x] Settings:
  - `discoverability`: 'everyone' | 'connections_only' | 'nobody'
  - `show_in_search`: boolean (default true)
  - `allow_invites_from`: 'everyone' | 'connections_only' | 'nobody'
- [x] Privacy settings page in /settings/privacy
- [x] Respect privacy settings in search results and invite flow

**E.2.3 - Pending Invites System** ✅
- [x] Update `custom_list_collaborators` table:
  - Add `invited_by` column (user ID of inviter)
  - Add `invite_message` column (optional personal note)
  - Status values: 'pending' | 'accepted' | 'declined'
- [x] API endpoints:
  - `GET /api/invites/pending` - Get user's pending invites
  - `POST /api/invites/[id]/accept` - Accept invite
  - `POST /api/invites/[id]/decline` - Decline invite
  - `GET /api/invites/sent` - Invites user has sent (pending)
  - `POST /api/invites/[id]/cancel` - Cancel sent invite

**E.2.4 - Notification UI** ✅
- [x] Notification bell icon in header (shows, movies, lists pages)
- [x] Badge count for unread notifications
- [x] Notification center slide-in sheet:
  - Pending list invites (with Accept/Decline CTAs)
  - Shows sender info, list name, and invite message
- [x] Banner on `/lists` page when pending invites exist
- [x] Real-time invite processing with loading states

**E.2.5 - Enhanced Invite Flow in EditListModal** ✅
- [x] User search input in Collaborators tab
- [x] Search results with avatar, name, username
- [x] "Invite" button per result (sends invite or adds directly if connected)
- [x] "Pending" section showing sent invites awaiting response
- [x] Cancel pending invite option

**E.2.6 - Accept/Decline UI** ✅
- [x] Notification center shows invite with:
  - List name
  - Inviter name and avatar
  - Invite message (if provided)
  - Accept / Decline buttons
- [x] Accept redirects to the list
- [x] Decline removes from pending

#### Database Changes

```sql
-- Add username to users
ALTER TABLE users ADD COLUMN username VARCHAR(30) UNIQUE;
CREATE INDEX idx_users_username ON users(username);

-- User privacy settings
CREATE TABLE user_privacy_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discoverability VARCHAR(20) DEFAULT 'everyone',
  show_in_search BOOLEAN DEFAULT true,
  allow_invites_from VARCHAR(20) DEFAULT 'everyone',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Update collaborators table
ALTER TABLE custom_list_collaborators
  ADD COLUMN invited_by INTEGER REFERENCES users(id),
  ADD COLUMN invite_message VARCHAR(200),
  ADD COLUMN declined_at TIMESTAMP;
```

#### UI/UX Specifications

**Notification Bell**
- Position: Header right side (desktop), bottom nav (mobile)
- Badge: Red circle with count, max "9+"
- Tap opens notification center sheet

**Notification Center**
- Full-screen bottom sheet on mobile
- Dropdown panel on desktop
- Sections: "Invites" (pending), "Activity" (recent, Phase F)
- Empty state: "No new notifications"

**Privacy Settings Page**
- Located at /settings/privacy
- Toggle: "Show me in search results"
- Radio: "Who can invite me to lists" - Everyone / Connections only / Nobody
- Explanation text for each option

**Search UI in Collaborators Tab**
- Search input with magnifying glass icon
- Debounced search (300ms)
- Results list with: Avatar, Name, @username
- "Invite" button (primary color)
- "Already invited" or "Already collaborating" states
- "User not found" or "User has disabled invites" feedback

### Phase F - Polish & Refinements

1. **List Reordering** - Drag and drop to reorder lists
2. **Empty State Improvements** - Better messaging when lists are empty
3. **Activity Notifications** - When collaborator adds/removes items from shared lists
4. **Real-time Presence** - Show who's viewing a list (like Notion)
5. **Invite History** - See past invites sent/received

---

## External Data Import System

### Implementation Status: Letterboxd ✅ Complete

**Goal:** Allow users to import their movie history from other tracking services

### Supported Sources

| Source | Status | Format | Notes |
|--------|--------|--------|-------|
| Letterboxd | ✅ Complete | ZIP export | diary.csv, ratings.csv, watched.csv, watchlist.csv |
| Trakt | 🔲 Planned | JSON | 1-10 rating scale, includes TV shows |
| IMDb | 🔲 Planned | CSV | Can match via IMDb IDs |
| Generic CSV | 🔲 Planned | CSV | User-defined column mapping |

### Features Implemented

1. **File Upload**
   - Drag-and-drop ZIP upload
   - 10MB file size limit
   - File type validation

2. **Letterboxd Parser**
   - Extracts and parses all CSV files from ZIP
   - Priority order: diary.csv > ratings.csv > watched.csv > watchlist.csv
   - Deduplicates by title+year, keeping most complete entry
   - Extracts: title, year, rating, watched date, rewatch flag, tags

3. **TMDb Matching**
   - Fuzzy search with confidence scoring
   - Exact match: title + year both match
   - Fuzzy match: high similarity score
   - Failed: no good match found
   - Rate limited: 35 requests per 10 seconds

4. **Conflict Resolution**
   - **Skip**: Keep existing data, ignore duplicates
   - **Overwrite**: Replace existing rating with imported
   - **Keep Higher Rating**: Only update if imported rating is higher

5. **Rating Conversion**
   - Letterboxd 0.5-5 scale → FlickLog 1-5 scale
   - Formula: `Math.round(letterboxdRating)` clamped to 1-5

6. **Progress Tracking**
   - Real-time progress updates via polling
   - Shows: imported / skipped / not found counts
   - Background processing (non-blocking)

7. **Results Summary**
   - Final statistics
   - List of failed items with reasons
   - View library button

### Database Schema

```sql
-- Track import operations
CREATE TABLE import_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  source VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  successful_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  skipped_items INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track individual item results
CREATE TABLE import_job_items (
  id SERIAL PRIMARY KEY,
  import_job_id INTEGER NOT NULL REFERENCES import_jobs(id),
  source_title VARCHAR(500) NOT NULL,
  source_year INTEGER,
  source_rating DECIMAL(3,1),
  source_status VARCHAR(30),
  tmdb_id INTEGER,
  matched_title VARCHAR(500),
  match_confidence VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  result_action VARCHAR(30),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/import/upload` | POST | Upload file and start import |
| `/api/import/jobs` | GET | List user's import jobs |
| `/api/import/jobs/[id]` | GET | Get job details with items |
| `/api/import/jobs/[id]` | DELETE | Delete import job |

### UI Flow

1. **Source Selection** → Choose Letterboxd (more sources later)
2. **File Upload** → Drag-drop or click to upload ZIP
3. **Configuration** → Select what to import, conflict strategy
4. **Processing** → Real-time progress with counts
5. **Complete** → Summary with failed items list

### Files Created

```
lib/import/
├── parsers/
│   └── letterboxd.ts    # ZIP/CSV parser
├── tmdb-matcher.ts      # TMDb search with scoring
├── rate-limiter.ts      # API rate limiting
└── processor.ts         # Batch processing logic

app/api/import/
├── upload/route.ts      # File upload endpoint
└── jobs/
    ├── route.ts         # List jobs
    └── [id]/route.ts    # Job details

components/import/
├── FileUploadZone.tsx   # Drag-drop upload
├── ImportConfigForm.tsx # Configuration options
├── ImportProgress.tsx   # Real-time progress
└── ImportSummary.tsx    # Results display

app/settings/import/
└── page.tsx             # Multi-step wizard
```

### Adding New Import Sources

To add a new source (e.g., Trakt):

1. Create parser: `lib/import/parsers/trakt.ts`
2. Update `ImportSource` type in `types/import.ts`
3. Add source to UI in `app/settings/import/page.tsx`
4. Handle source-specific rating conversion
5. For JSON/different formats, adjust the processor as needed

---

## Design Decisions Summary

| Question | Decision |
|----------|----------|
| In-app + link sharing for custom lists? | Yes, support both methods |
| Show existing connections when sharing? | Yes, in "Add Collaborator" UI |
| Custom lists on /movies/all, /shows/all? | Yes, append at bottom |
| Reorganize/edit button on list pages? | Yes, settings button in header |
| Are renamed lists still tagged correctly? | Yes, backend uses original slugs |
| Can users hide lists they don't use? | Yes, add hidden flag to preferences |
| Create custom list from list pages? | Yes, both card and menu option |
| User search by username or email? | Yes, both (email requires exact match for privacy) |
| Where to show pending invites? | Combination: notification bell + /lists banner |
| Can users opt-out of being searchable? | Yes, privacy settings with granular controls |
| Notification approach? | In-app bell icon with badge (better than Spotify's no-notifications) |
| Username requirements? | Unique, URL-safe, 3-30 chars, set during onboarding or settings |
