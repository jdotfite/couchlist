# Lists Feature Plan

> "Follow people whose taste you trust and subscribe to the lists they curate."

## Philosophy

### The Big Unlock

**Friends are NOT the primary sharing mechanism.**

- Friends = mutual connection (optional, lightweight)
- Following = asymmetric, taste-based
- Lists = the actual social object people care about

People don't share lists. **People publish lists. Other people follow them.**

### Core Mental Model

| Concept | Purpose |
|---------|---------|
| Follow a person | "I like their taste" |
| Follow a list | "I like this specific curation" |
| Friend | "We actually know each other" (optional) |

Most users never need to friend anyone to get value.

---

## The 5 Core Primitives

Everything else is derived from these:

1. **Title** - movie/show (from TMDb)
2. **Library entry** - your relationship to a title (status, rating, notes)
3. **List** - curated, followable collection
4. **Follow** - asymmetric subscription (people or lists)
5. **Friend** - mutual connection (optional)

---

## User Flows

### Creating a List (Dane's Experience)

1. Dane goes to Library → filters to 2025 watched movies
2. Taps "Create List from Selection" (or "Save as List")
3. Names it: "Dane's Top 5 Movies of 2025"
4. List is **public by default** (toggleable)
5. Done. List is followable and shareable.

### Discovering a List (Troy's Experience)

**Path A: Troy has the app**
1. Dane taps Share → searches "Troy" (Venmo-style)
2. Sends list to Troy
3. Troy sees notification: "Dane shared a list with you"
4. Troy can: Follow list, Add items to watchlist

**Path B: Troy doesn't have the app**
1. Dane taps Share → Copy Link / Text
2. Troy receives link, opens in browser
3. Sees list immediately (no account required)
4. CTA: "Save this list" or "Add to watchlist" → signup

### Following a List

When Troy follows Dane's list:
- List appears in Troy's "Following" section
- When Dane updates it, Troy sees "2 new additions"
- Troy can save individual titles or browse

**Important:** Lists do NOT auto-update the follower's library. They're curated snapshots that the creator controls.

---

## What Friends Unlock (Separate from Lists)

Friends are for trust and identity, not permissions:

- See private activity (ratings, notes) from friends
- "What my friends are watching" feed
- Recommendations weighted by friends
- Mutual trust signals

---

## Database Schema

### New Tables

```sql
-- Follows table (users following users OR lists)
CREATE TABLE follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(10) NOT NULL, -- 'user' or 'list'
  target_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, target_type, target_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_target ON follows(target_type, target_id);

-- Saved lists (user-created lists)
CREATE TABLE saved_lists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  icon VARCHAR(30) DEFAULT 'list',
  color VARCHAR(20) DEFAULT 'purple',
  list_type VARCHAR(20) DEFAULT 'manual', -- 'manual' or 'smart' (internal only)
  filter_rules JSONB DEFAULT '{}',
  sort_by VARCHAR(30) DEFAULT 'position',
  sort_direction VARCHAR(4) DEFAULT 'asc',
  item_limit INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_saved_lists_user ON saved_lists(user_id);
CREATE INDEX idx_saved_lists_public ON saved_lists(is_public) WHERE is_public = true;

-- Saved list items (pinned items in a list)
CREATE TABLE saved_list_pins (
  id SERIAL PRIMARY KEY,
  saved_list_id INTEGER NOT NULL REFERENCES saved_lists(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  pin_type VARCHAR(10) DEFAULT 'include', -- 'include' or 'exclude'
  position INTEGER DEFAULT 0,
  notes VARCHAR(500),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(saved_list_id, media_id)
);

CREATE INDEX idx_saved_list_pins_list ON saved_list_pins(saved_list_id);
CREATE INDEX idx_saved_list_pins_media ON saved_list_pins(media_id);

-- List shares (notifications when someone shares a list with you)
CREATE TABLE list_shares (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES saved_lists(id) ON DELETE CASCADE,
  from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message VARCHAR(200),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_list_shares_to_user ON list_shares(to_user_id, is_read);
```

### Tables to Simplify/Remove

These permission-based sharing tables are no longer needed:

- `shared_lists` - Remove (was for collaborator-based permissions)
- `friend_list_access` - Remove (was for friend-based permissions)
- `list_visibility` - Remove (replace with simple `is_public` boolean)
- `friend_default_sharing` - Remove

### Tables to Keep (Repurposed)

- `collaborators` - Keep for "Friends" (mutual connections), but simplify
- `friend_suggestions` - Keep (sending recommendations to friends)

---

## UX Language Rules

### Use These Terms
- "Lists"
- "Your Lists"
- "Following"
- "Public" / "Private"
- "Share"
- "Follow"

### Never Use
- "Smart list"
- "Rules"
- "Filters"
- "Permissions"
- "Collaborator"

Smart filtering exists under the hood but users just see "Lists."

---

## Implementation Phases

### Phase 1: Core Lists Infrastructure
- [ ] Add `saved_lists` and `saved_list_pins` tables to `lib/db.ts`
- [ ] Add `follows` table to `lib/db.ts`
- [ ] Verify `lib/saved-lists.ts` works with new schema
- [ ] Create `/lists` page (view all your lists)
- [ ] Create `/lists/[slug]` page (view single list)

### Phase 2: Create & Manage Lists
- [ ] "Create List" button on /lists page
- [ ] "Save as List" from library filters
- [ ] Edit list (name, description, icon, color, public/private)
- [ ] Add/remove items from list
- [ ] Delete list

### Phase 3: Public Lists & Sharing
- [ ] Public list view (no auth required) at `/u/[username]/lists/[slug]`
- [ ] Share list via link (copy URL)
- [ ] Share list to user (in-app search + notification)
- [ ] Add `list_shares` table for notifications

### Phase 4: Following
- [ ] Follow a list
- [ ] Follow a user
- [ ] "Following" section showing followed lists
- [ ] "New in lists you follow" indicator

### Phase 5: Cleanup Legacy
- [ ] Remove `shared_lists` table usage
- [ ] Remove `friend_list_access` table usage
- [ ] Simplify collaborators page (friends only, no list permissions)
- [ ] Update CLAUDE.md documentation

---

## API Endpoints

### Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lists` | Get user's lists |
| POST | `/api/lists` | Create new list |
| GET | `/api/lists/[id]` | Get list details |
| PATCH | `/api/lists/[id]` | Update list |
| DELETE | `/api/lists/[id]` | Delete list |
| GET | `/api/lists/[id]/items` | Get list items |
| POST | `/api/lists/[id]/items` | Add item to list |
| DELETE | `/api/lists/[id]/items/[mediaId]` | Remove item |

### Public Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/u/[username]/lists` | Get user's public lists |
| GET | `/api/u/[username]/lists/[slug]` | Get public list (no auth) |

### Following
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/following` | Get followed users/lists |
| POST | `/api/following` | Follow user or list |
| DELETE | `/api/following/[type]/[id]` | Unfollow |

### Sharing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lists/[id]/share` | Share list to user |
| GET | `/api/shared-with-me` | Lists shared with current user |

---

## File Structure

```
app/
  lists/
    page.tsx              # Your lists index
    new/page.tsx          # Create new list
    [slug]/
      page.tsx            # View/edit your list
  u/
    [username]/
      page.tsx            # Public profile
      lists/
        page.tsx          # User's public lists
        [slug]/page.tsx   # Public list view (no auth)
  following/
    page.tsx              # Lists/people you follow

components/
  lists/
    ListCard.tsx          # Display a list card
    CreateListModal.tsx   # Create list modal
    EditListModal.tsx     # Edit list modal
    ListItemCard.tsx      # Item within a list
    AddToListSheet.tsx    # Bottom sheet to add item to lists
    ShareListSheet.tsx    # Share list options

lib/
  lists.ts                # List CRUD operations
  follows.ts              # Follow/unfollow logic
```

---

## Recommendations Display

Instead of "Recommended by Dane," show:

- "From lists you follow"
- "Appears in 3 lists you follow"
- "Trending among people you follow"

This feels organic, modern, and non-creepy.
