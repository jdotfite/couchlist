# Navigation Redesign - Option A Implementation Plan

## Overview

Redesigning FlickLog's navigation from the current structure:
```
Shows | Movies | Discover | Community (4 tabs, split by media type)
```

To the new search-centric structure:
```
Home | Search | Library | Profile (4 tabs, unified content)
```

---

## New Information Architecture

```
/                    → Home (search hero + activity + lists + trending)
/search              → Search tab (TMDb search + browse categories)
/library             → Unified library (movies + TV with filters)
/library?type=movie  → Filtered to movies only
/library?type=tv     → Filtered to TV only
/library?status=X    → Filtered by status
/profile             → Profile tab (settings hub, stats, account)

REDIRECTS (backward compatibility):
/shows               → 301 to /library?type=tv
/shows/[status]      → 301 to /library?type=tv&status=[status]
/movies              → 301 to /library?type=movie
/movies/[status]     → 301 to /library?type=movie&status=[status]
/discover            → 301 to /search

UNCHANGED:
/tv/[id]             → TV detail page (as-is)
/movie/[id]          → Movie detail page (as-is)
/lists               → Custom lists (as-is)
/lists/[slug]        → Custom list detail (as-is)
/settings/*          → Settings pages (as-is)
```

---

## Bottom Navigation Structure

```tsx
const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/profile', label: 'Profile', icon: User },
];
```

---

## Page Designs

### 1. Home Page (`/`)

```
┌────────────────────────────────────┐
│ [≡]        FlickLog         [🔔]  │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ 🔍 What do you want to watch?  │ │  ← Links to /search
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ CONTINUE WATCHING              →  │  ← Movies + TV mixed
│ [poster] [poster] [poster] →      │
├────────────────────────────────────┤
│ YOUR LISTS                     →  │  ← Links to /library
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│ │ 5  │ │ 12 │ │ 45 │ │ ⋯ │     │
│ │Watch│ │List│ │Done│ │All │     │
│ └────┘ └────┘ └────┘ └────┘     │
├────────────────────────────────────┤
│ RECENTLY ADDED                 →  │  ← Last 10 items added
│ [poster] [poster] [poster] →      │
├────────────────────────────────────┤
│ TRENDING NOW                   →  │  ← Mix of movies + TV
│ [poster] [poster] [poster] →      │
└────────────────────────────────────┘
```

**Data sources:**
- Continue Watching: `/api/watching` (both types)
- Lists: Aggregate counts from existing APIs
- Recently Added: `/api/library?sort=added_date&limit=10`
- Trending: `/api/trending` (both types)

### 2. Search Page (`/search`)

```
┌────────────────────────────────────┐
│ ←  Search                         │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ 🔍 Search movies & TV shows... │ │  ← Auto-focus on mount
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ [All] [Movies] [TV Shows]         │  ← Type filter pills
├────────────────────────────────────┤
│                                    │
│ (When empty - show browse content) │
│                                    │
│ TRENDING                        → │
│ [poster] [poster] [poster]        │
│                                    │
│ BROWSE BY GENRE                   │
│ [Action] [Comedy] [Drama] [More]  │
│                                    │
│ POPULAR MOVIES                  → │
│ [poster] [poster] [poster]        │
│                                    │
│ TOP RATED TV                    → │
│ [poster] [poster] [poster]        │
│                                    │
├────────────────────────────────────┤
│ (When searching - show results)   │
│                                    │
│ Results for "breaking"            │
│ ┌─────┐ ┌─────┐ ┌─────┐          │
│ │ 📺  │ │ 🎬  │ │ 📺  │          │
│ └─────┘ └─────┘ └─────┘          │
└────────────────────────────────────┘
```

**Behavior:**
- Absorbs all functionality from current `/discover`
- Search input auto-focuses when tab is selected
- Shows browse content when search is empty
- Shows results when user types

### 3. Library Page (`/library`)

```
┌────────────────────────────────────┐
│ ←  Library                   [⚙]  │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ 🔍 Filter your library...      │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ [All] [Movies] [TV Shows]         │  ← Type filter
├────────────────────────────────────┤
│ Status: [All ▼]  Sort: [Added ▼]  │  ← Dropdowns
├────────────────────────────────────┤
│ 127 items                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│ │ 📺  │ │ 🎬  │ │ 📺  │ │ 🎬  │  │
│ │     │ │     │ │     │ │     │  │
│ └─────┘ └─────┘ └─────┘ └─────┘  │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│ │     │ │     │ │     │ │     │  │
│ └─────┘ └─────┘ └─────┘ └─────┘  │
└────────────────────────────────────┘
```

**URL Parameters:**
- `?type=movie|tv` - Filter by media type
- `?status=watching|watchlist|finished|onhold|dropped` - Filter by status
- `?tag=favorites|rewatch|classics` - Filter by tag
- `?sort=added|title|rating|release` - Sort order
- `?q=query` - Search within library

**Gear icon opens:** ListSettingsSheet for customization

### 4. Profile Page (`/profile`)

```
┌────────────────────────────────────┐
│ ←  Profile                        │
├────────────────────────────────────┤
│         ┌─────────┐               │
│         │  Avatar │               │
│         └─────────┘               │
│         Username                  │
│         @handle                   │
│         127 movies • 45 shows     │
├────────────────────────────────────┤
│ 🔔 Notifications               →  │
│ ⚙️ Settings                    →  │
│ 📊 Stats (coming soon)         →  │
│ 📤 Export Data                 →  │
│ 📥 Import Data                 →  │
├────────────────────────────────────┤
│ 🚪 Log out                        │
└────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/(main)/page.tsx` | New Home page |
| `app/search/page.tsx` | New Search page |
| `app/library/page.tsx` | Unified library page |
| `app/profile/page.tsx` | Profile tab page |
| `components/home/SearchHero.tsx` | Tappable search bar component |
| `components/home/ListsGrid.tsx` | Compact list cards for home |
| `components/home/ContinueWatching.tsx` | Mixed media continue watching |
| `components/library/LibraryFilters.tsx` | Type/status/sort filters |
| `components/library/LibraryGrid.tsx` | Unified grid with type badges |

## Files to Modify

| File | Changes |
|------|---------|
| `components/BottomNav.tsx` | New 4-tab structure |
| `components/Sidebar.tsx` | Update menu items |
| `app/shows/page.tsx` | Add redirect to /library?type=tv |
| `app/movies/page.tsx` | Add redirect to /library?type=movie |
| `app/discover/page.tsx` | Add redirect to /search |

## Files to Keep (No Changes)

- `app/tv/[id]/page.tsx` - Detail pages work as-is
- `app/movie/[id]/page.tsx` - Detail pages work as-is
- `app/lists/*` - Custom lists work as-is
- `app/settings/*` - Settings work as-is
- All API routes - Backend already supports unified queries

---

## Implementation Order

### Phase A1: Home Page
1. Create `app/(main)/page.tsx` with new home layout
2. Create `components/home/SearchHero.tsx`
3. Create `components/home/ContinueWatching.tsx` (mixed content)
4. Create `components/home/ListsGrid.tsx`
5. Fetch unified data (watching, trending for both types)

### Phase A2: Search Page
1. Create `app/search/page.tsx`
2. Move search logic from `/discover`
3. Add type filter pills
4. Show browse content when empty

### Phase A3: Library Page
1. Create `app/library/page.tsx`
2. Create `components/library/LibraryFilters.tsx`
3. Create unified API call with type/status params
4. Add type badges to media cards

### Phase A4: Profile Page
1. Create `app/profile/page.tsx`
2. Link to existing settings pages
3. Add stats placeholder
4. Add logout button

### Phase A5: Navigation Update
1. Update `components/BottomNav.tsx`
2. Update `components/Sidebar.tsx`
3. Test all navigation paths

### Phase A6: Redirects
1. Update `/shows` to redirect
2. Update `/movies` to redirect
3. Update `/discover` to redirect
4. Handle `/shows/[status]` and `/movies/[status]`

### Phase A7: Link Cleanup
1. Search codebase for old URLs
2. Update all internal links
3. Update documentation

---

## API Changes Needed

### New: `/api/library/unified`
Returns combined movies + TV with filters:
```typescript
GET /api/library/unified?type=all|movie|tv&status=all|watching|...&sort=added|title|...

Response: {
  items: LibraryItem[],
  counts: {
    all: number,
    movies: number,
    tv: number,
    byStatus: { watching: number, ... }
  }
}
```

### Existing APIs (no changes needed)
- `/api/watching` - Already returns both types
- `/api/watchlist` - Already returns both types
- `/api/trending` - Already has both movie and TV
- `/api/search` - Already supports type filter

---

## Testing Checklist

- [ ] Home page loads with all sections
- [ ] Search bar on home navigates to /search
- [ ] Search page auto-focuses input
- [ ] Search results show both movies and TV
- [ ] Library shows unified content
- [ ] Library filters work (type, status, sort)
- [ ] Profile page links to all settings
- [ ] Bottom nav highlights correct tab
- [ ] Sidebar menu items work
- [ ] Old URLs redirect correctly
- [ ] Deep links still work (/tv/123, /movie/456)
- [ ] Notifications still work
- [ ] PWA still works
