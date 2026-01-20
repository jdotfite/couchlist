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

---

## Phase 2: Episode Tracking

### Database Changes
- [ ] Add seasons_watched, episodes_watched to user_media
- [ ] Consider separate episode tracking table for granular tracking

### UI Components
- [ ] Season/episode selector on TV detail page
- [ ] Progress bar showing completion percentage
- [ ] "Continue watching" section
- [ ] Episode checklist view

### Features
- [ ] Mark entire season as watched
- [ ] Track last watched episode
- [ ] Calculate total watch time for shows

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
- [ ] Import from Letterboxd/Trakt/IMDb
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
