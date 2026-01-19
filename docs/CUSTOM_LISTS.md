# Custom Lists - Implementation Plan

> Feature to allow users to personalize list names and create custom lists for organizing media.

## Overview

Custom lists give users flexibility beyond the default system lists. There are two aspects:

1. **Personalized Names** - Rename default lists (e.g., "Watchlist" → "Up Next", "Finished" → "Completed")
2. **Custom Lists** - Create entirely new lists (e.g., "Date Night", "With Kids", "Comfort Rewatches")

---

## User Stories

### Primary Use Cases
> "I want to rename 'Finished' to 'Completed' because that's the term I prefer"

> "I want a 'Date Night' list for movies my wife and I want to watch together"

> "I want a 'Comfort Shows' list for my go-to rewatches when I'm stressed"

### Secondary Use Cases
- Genre-based lists: "Horror Marathon", "Documentary Queue"
- Mood-based lists: "Feel Good Movies", "Cry Worthy"
- Event-based lists: "Oscar Contenders 2024", "Halloween Watch"
- Shared custom lists with collaborators

---

## Feature Scope

### What IS included
- Rename default system lists (display name only, slug stays same)
- Create new custom lists (up to 10 per user)
- Add/remove media from custom lists
- Delete custom lists
- Share custom lists with collaborators
- Choose icons for custom lists

### What is NOT included (future consideration)
- Reordering lists in navigation
- List folders/grouping
- Public list sharing (link anyone can view)
- Importing/exporting lists

---

## Database Schema

### New Tables

```sql
-- ============================================
-- USER LIST PREFERENCES
-- Stores personalized names for system lists
-- ============================================
CREATE TABLE user_list_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Which system list this applies to
  -- 'watchlist', 'watching', 'finished', 'onhold', 'dropped', 'favorites', 'rewatch', 'nostalgia'
  list_type VARCHAR(30) NOT NULL,

  -- User's custom display name
  display_name VARCHAR(50) NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, list_type)
);


-- ============================================
-- CUSTOM LISTS
-- User-created lists beyond the system defaults
-- ============================================
CREATE TABLE custom_lists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- URL-safe identifier (auto-generated from name)
  slug VARCHAR(50) NOT NULL,

  -- Display name
  name VARCHAR(50) NOT NULL,

  -- Optional description
  description VARCHAR(200),

  -- Icon identifier (from predefined set)
  icon VARCHAR(30) DEFAULT 'list',

  -- Color for the icon (hex or preset name)
  color VARCHAR(20) DEFAULT 'gray',

  -- Is this list shared with collaborators?
  is_shared BOOLEAN DEFAULT false,

  -- Position for ordering (future use)
  position INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, slug)
);

-- Index for fast lookups
CREATE INDEX idx_custom_lists_user ON custom_lists(user_id);


-- ============================================
-- CUSTOM LIST ITEMS
-- Junction table linking media to custom lists
-- ============================================
CREATE TABLE custom_list_items (
  id SERIAL PRIMARY KEY,

  custom_list_id INTEGER NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,

  -- Who added this item (for shared lists)
  added_by INTEGER REFERENCES users(id),

  -- Optional notes for this item in this list
  notes VARCHAR(500),

  -- Position for manual ordering (future use)
  position INTEGER DEFAULT 0,

  -- Timestamps
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(custom_list_id, media_id)
);

-- Index for fast lookups
CREATE INDEX idx_custom_list_items_list ON custom_list_items(custom_list_id);
CREATE INDEX idx_custom_list_items_media ON custom_list_items(media_id);
```

### Schema Diagram

```
┌──────────────┐       ┌─────────────────────┐
│    users     │       │ user_list_preferences│
├──────────────┤       ├─────────────────────┤
│ id           │◄──────│ user_id             │
│ email        │       │ list_type           │
│ name         │       │ display_name        │
└──────────────┘       └─────────────────────┘

┌──────────────┐       ┌─────────────────┐       ┌───────────────────┐
│    users     │       │  custom_lists   │       │ custom_list_items │
├──────────────┤       ├─────────────────┤       ├───────────────────┤
│ id           │◄──────│ user_id         │◄──────│ custom_list_id    │
└──────────────┘       │ slug            │       │ media_id          │───► media
                       │ name            │       │ added_by          │───► users
                       │ icon            │       │ notes             │
                       │ is_shared       │       └───────────────────┘
                       └─────────────────┘
```

---

## Limits & Constraints

| Constraint | Limit | Rationale |
|------------|-------|-----------|
| Custom lists per user | 10 | Prevents abuse, keeps UI clean |
| List name length | 50 chars | Fits in UI comfortably |
| List description | 200 chars | Brief context |
| Items per custom list | 500 | Performance |
| Slug length | 50 chars | URL-safe |

---

## Available Icons

Users can choose from a predefined set of icons for their custom lists:

```typescript
const availableIcons = {
  // Generic
  'list': List,
  'folder': Folder,
  'bookmark': Bookmark,
  'star': Star,
  'heart': Heart,

  // Mood/Theme
  'smile': Smile,
  'laugh': Laugh,
  'frown': Frown,
  'ghost': Ghost,
  'flame': Flame,
  'snowflake': Snowflake,
  'sun': Sun,
  'moon': Moon,

  // Activity
  'popcorn': Popcorn,
  'couch': Sofa,
  'users': Users,
  'baby': Baby,
  'gamepad': Gamepad2,

  // Time
  'calendar': Calendar,
  'clock': Clock,
  'hourglass': Hourglass,

  // Categories
  'trophy': Trophy,
  'target': Target,
  'gift': Gift,
  'music': Music,
};

const availableColors = [
  { name: 'gray', value: '#6b7280' },
  { name: 'red', value: '#ef4444' },
  { name: 'orange', value: '#f97316' },
  { name: 'amber', value: '#f59e0b' },
  { name: 'yellow', value: '#eab308' },
  { name: 'lime', value: '#84cc16' },
  { name: 'green', value: '#22c55e' },
  { name: 'emerald', value: '#10b981' },
  { name: 'teal', value: '#14b8a6' },
  { name: 'cyan', value: '#06b6d4' },
  { name: 'sky', value: '#0ea5e9' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'indigo', value: '#6366f1' },
  { name: 'violet', value: '#8b5cf6' },
  { name: 'purple', value: '#a855f7' },
  { name: 'fuchsia', value: '#d946ef' },
  { name: 'pink', value: '#ec4899' },
  { name: 'rose', value: '#f43f5e' },
];
```

---

## API Endpoints

### List Preferences (Renaming)

```
GET    /api/list-preferences
       - Get user's custom names for system lists
       - Returns: { preferences: { watchlist: "Up Next", finished: "Done" } }

PATCH  /api/list-preferences
       - Update a system list's display name
       - Body: { listType: "watchlist", displayName: "Up Next" }
       - To reset: { listType: "watchlist", displayName: null }
```

### Custom Lists

```
GET    /api/custom-lists
       - Get all custom lists for current user
       - Returns: { lists: [...] }

POST   /api/custom-lists
       - Create a new custom list
       - Body: { name: "Date Night", icon: "heart", color: "pink", description: "..." }
       - Returns: { list: {...}, slug: "date-night" }

GET    /api/custom-lists/:slug
       - Get a specific custom list with its items
       - Returns: { list: {...}, items: [...] }

PATCH  /api/custom-lists/:slug
       - Update list details (name, icon, color, description, is_shared)
       - Body: { name: "Movie Night", icon: "popcorn" }

DELETE /api/custom-lists/:slug
       - Delete a custom list (items are removed, not the media)

POST   /api/custom-lists/:slug/items
       - Add media to a custom list
       - Body: { mediaId: 123, mediaType: "movie", notes: "..." }

DELETE /api/custom-lists/:slug/items/:mediaId
       - Remove media from a custom list
```

---

## UI Components

### New Components

```
components/
├── custom-lists/
│   ├── CustomListCard.tsx        # Display card in list management
│   ├── CreateListModal.tsx       # Modal to create new list
│   ├── EditListModal.tsx         # Modal to edit list details
│   ├── IconPicker.tsx            # Grid of available icons
│   ├── ColorPicker.tsx           # Color selection
│   └── RenameListModal.tsx       # Modal to rename system lists

app/
├── lists/
│   ├── page.tsx                  # Custom lists management page
│   └── [slug]/
│       └── page.tsx              # View custom list items
├── settings/
│   └── lists/
│       └── page.tsx              # System list preferences
```

### Modified Components

```
components/
├── Sidebar.tsx                   # Show custom lists in nav
├── BottomNav.tsx                 # Quick access to lists
├── MediaOptionsSheet.tsx         # "Add to list" with custom lists
```

---

## User Flows

### Renaming a System List

```
1. User goes to Settings > List Names (or long-press on list header)
2. Sees all system lists with their current names
3. Taps on a list to edit
4. Types new name
5. Saves

┌─────────────────────────────────────────────┐
│  Personalize List Names                     │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📋 Watchlist                    ✏️  │   │
│  │    Currently: "Watchlist"            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ▶️ Watching                     ✏️  │   │
│  │    Currently: "Watching"             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ✅ Finished                     ✏️  │   │
│  │    Renamed to: "Completed"           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Tip: Changes only affect how lists        │
│  appear to you.                            │
└─────────────────────────────────────────────┘
```

### Creating a Custom List

```
1. User taps "+" in lists section or goes to Lists page
2. Modal opens with:
   - Name field
   - Icon picker (grid of icons)
   - Color picker (row of colors)
   - Optional description
   - "Share with collaborators" toggle
3. User fills in and saves
4. New list appears in navigation

┌─────────────────────────────────────────────┐
│  Create New List                            │
│                                             │
│  Name                                       │
│  ┌─────────────────────────────────────┐   │
│  │ Date Night                          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Icon                                       │
│  ┌─────────────────────────────────────┐   │
│  │ ❤️ 📋 ⭐ 🎬 👨‍👩‍👧 🍿 😊 👻 🔥 │   │
│  │ 🎮 🏆 🎁 📅 ⏰ ❄️ ☀️ 🌙 🎵 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Color                                      │
│  ┌─────────────────────────────────────┐   │
│  │ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Description (optional)                     │
│  ┌─────────────────────────────────────┐   │
│  │ Movies for romantic evenings        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ☑️ Share with collaborators               │
│                                             │
│  [        Create List        ]              │
└─────────────────────────────────────────────┘
```

### Adding Media to Custom List

```
1. User opens media options (three dots on any media card)
2. Sees "Add to List" option
3. Taps it → shows checkboxes for all custom lists
4. Toggles lists on/off
5. Changes save automatically

┌─────────────────────────────────────────────┐
│  Add "The Bear" to lists                    │
│                                             │
│  ☑️ ❤️ Date Night                          │
│  ☐ 🍿 Comfort Shows                        │
│  ☐ 👨‍👩‍👧 Watch with Family                   │
│                                             │
│  [+ Create New List]                        │
│                                             │
│  [        Done        ]                     │
└─────────────────────────────────────────────┘
```

### Navigation with Custom Lists

```
┌─────────────────────────────────────────────┐
│  📺 TV Shows                                │
│  🎬 Movies                                  │
│  🔍 Discover                                │
│                                             │
│  ─────────────────────────────────────────  │
│  MY LISTS                                   │
│                                             │
│  📋 Watchlist (12)                         │
│  ▶️ Watching (3)                           │
│  ✅ Finished (47)                          │
│                                             │
│  ─────────────────────────────────────────  │
│  CUSTOM LISTS                               │
│                                             │
│  ❤️ Date Night (8)           👥 Shared     │
│  🍿 Comfort Shows (15)                      │
│  👻 Horror Marathon (23)                    │
│                                             │
│  [+ New List]                               │
│                                             │
│  ─────────────────────────────────────────  │
│  ⚙️ Settings                               │
└─────────────────────────────────────────────┘
```

---

## Sharing Custom Lists

When a custom list is marked as shared:
- All collaborators can see the list
- All collaborators can add/remove items
- "Added by" shows who added each item
- Only the owner can edit list details or delete it
- If collaboration ends, shared items stay in list

### Database for Shared Custom Lists

```sql
-- Add to shared_lists table
-- list_type can now be 'custom:slug' format for custom lists
-- e.g., 'custom:date-night'

INSERT INTO shared_lists (collaborator_id, list_type, is_active)
VALUES (123, 'custom:date-night', true);
```

---

## Implementation Phases

### Phase A: List Preferences (Renaming)
- [ ] Database table for preferences
- [ ] API endpoints for get/update preferences
- [ ] Settings page for renaming lists
- [ ] Update list headers to use custom names
- [ ] Apply preferences throughout app

### Phase B: Custom Lists Core
- [ ] Database tables for custom lists
- [ ] API endpoints for CRUD operations
- [ ] Create list modal with icon/color picker
- [ ] Custom list page (view items)
- [ ] Add to sidebar navigation

### Phase C: Adding to Custom Lists
- [ ] Update MediaOptionsSheet with custom list selection
- [ ] Checkbox UI for toggling lists
- [ ] Quick add from media detail pages

### Phase D: Sharing Custom Lists
- [ ] Add is_shared toggle to custom lists
- [ ] Integrate with existing collaboration system
- [ ] Show shared indicator on lists
- [ ] Handle collaborator permissions

---

## Edge Cases

### 1. Deleting a Custom List
**Scenario:** User deletes a list with items in it.
**Behavior:** List and list items are deleted. Media remains in library.
**UI:** Confirm dialog: "Delete 'Date Night'? The 8 items in this list will be removed from it but stay in your library."

### 2. Collaborator Leaves
**Scenario:** Collaborator ends sharing while custom list is shared.
**Behavior:** Items stay in list with their original `added_by`. List becomes unshared for that collaborator.

### 3. Duplicate Slugs
**Scenario:** User creates "Date Night", deletes it, creates it again.
**Behavior:** Generate unique slug: "date-night", "date-night-2", etc.

### 4. Reserved Slugs
**Scenario:** User tries to create list named "Watchlist" or "Watching".
**Behavior:** Allow it - slug will be different (e.g., "watchlist-1"). System lists have fixed slugs.

### 5. Hitting Limit
**Scenario:** User has 10 custom lists and tries to create another.
**Behavior:** Show message: "You've reached the limit of 10 custom lists. Delete one to create a new one."

---

## Questions to Resolve

1. **Should custom list names be unique per user?**
   - Recommendation: No, allow duplicates. Slug handles uniqueness.

2. **Can users reorder custom lists?**
   - Recommendation: Phase 2. For now, show newest first or alphabetical.

3. **Should custom lists appear in bottom nav?**
   - Recommendation: No, only in sidebar. Bottom nav stays focused on core actions.

4. **Can media be in multiple custom lists?**
   - Recommendation: Yes, absolutely. A movie can be in "Date Night" AND "Comfort Shows".

5. **What happens to renamed list preferences if user is collaborating?**
   - Recommendation: Preferences are personal. Each user sees their own names.

---

## File Structure

```
app/
├── api/
│   ├── list-preferences/
│   │   └── route.ts              # GET, PATCH preferences
│   └── custom-lists/
│       ├── route.ts              # GET all, POST create
│       └── [slug]/
│           ├── route.ts          # GET, PATCH, DELETE list
│           └── items/
│               └── route.ts      # POST add, DELETE remove
├── lists/
│   ├── page.tsx                  # Manage custom lists
│   └── [slug]/
│       └── page.tsx              # View custom list
└── settings/
    └── lists/
        └── page.tsx              # Rename system lists

components/
├── custom-lists/
│   ├── CreateListModal.tsx
│   ├── EditListModal.tsx
│   ├── IconPicker.tsx
│   ├── ColorPicker.tsx
│   └── CustomListSelector.tsx    # For adding media to lists

lib/
├── custom-lists.ts               # Database queries
└── list-preferences.ts           # Preferences queries
```

---

## Summary

| Feature | Complexity | Priority |
|---------|------------|----------|
| Rename system lists | Low | High |
| Create custom lists | Medium | High |
| Icon/color picker | Low | Medium |
| Add media to lists | Medium | High |
| Share custom lists | Medium | Medium |
| List management UI | Medium | High |

**Estimated effort:**
- Phase A (Renaming): Small
- Phase B (Core): Medium
- Phase C (Adding): Medium
- Phase D (Sharing): Small (leverages existing collaboration)

