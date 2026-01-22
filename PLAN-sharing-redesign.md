# Sharing Redesign: Partner + Friend Models

## Overview

Two distinct sharing models based on relationship type:

| Model | Trust Level | Behavior |
|-------|-------------|----------|
| **Partner** | High | Bidirectional shared lists, synchronized watched state |
| **Friend** | Medium | One-way suggestions via notifications, you curate |

---

## Database Schema Changes

### 1. Modify `collaborators` table

```sql
-- Add relationship type column
ALTER TABLE collaborators
ADD COLUMN type VARCHAR(10) DEFAULT 'friend'
CHECK (type IN ('partner', 'friend'));

-- Index for querying by type
CREATE INDEX idx_collaborators_type ON collaborators(type);
```

### 2. New: `partner_lists` table

Dedicated shared lists between partners (separate from personal lists).

```sql
CREATE TABLE partner_lists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. New: `partner_list_members` table

Links users to partner lists (allows for exactly 2 members).

```sql
CREATE TABLE partner_list_members (
  id SERIAL PRIMARY KEY,
  partner_list_id INTEGER NOT NULL REFERENCES partner_lists(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- 'owner' or 'member'
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(partner_list_id, user_id)
);

CREATE INDEX idx_partner_list_members_user ON partner_list_members(user_id);
CREATE INDEX idx_partner_list_members_list ON partner_list_members(partner_list_id);
```

### 4. New: `partner_list_items` table

Items within a partner list.

```sql
CREATE TABLE partner_list_items (
  id SERIAL PRIMARY KEY,
  partner_list_id INTEGER NOT NULL REFERENCES partner_lists(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  added_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(partner_list_id, media_id)
);

CREATE INDEX idx_partner_list_items_list ON partner_list_items(partner_list_id);
CREATE INDEX idx_partner_list_items_media ON partner_list_items(media_id);
```

### 5. New: `partner_list_item_status` table

Per-user watched/rating status on shared items.

```sql
CREATE TABLE partner_list_item_status (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES partner_list_items(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  watched BOOLEAN DEFAULT FALSE,
  watched_at TIMESTAMP,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, user_id)
);

CREATE INDEX idx_partner_list_item_status_item ON partner_list_item_status(item_id);
CREATE INDEX idx_partner_list_item_status_user ON partner_list_item_status(user_id);
```

### 6. New: `friend_suggestions` table

Tracks suggestions between friends.

```sql
CREATE TABLE friend_suggestions (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  note TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  -- Prevent duplicate active suggestions
  UNIQUE(from_user_id, to_user_id, media_id)
);

CREATE INDEX idx_friend_suggestions_to_user ON friend_suggestions(to_user_id, status);
CREATE INDEX idx_friend_suggestions_from_user ON friend_suggestions(from_user_id);
```

### 7. Modify `user_media` table

Add attribution for accepted suggestions.

```sql
ALTER TABLE user_media
ADD COLUMN suggested_by_user_id INTEGER REFERENCES users(id);

CREATE INDEX idx_user_media_suggested_by ON user_media(suggested_by_user_id);
```

### 8. Update `notifications` types

Add new notification types in `types/notifications.ts`:

```typescript
export type NotificationType =
  // ... existing types
  | 'friend_suggestion'      // Someone suggested a title to you
  | 'friend_suggestion_group' // Grouped: "Mike suggested 3 titles"
  | 'suggestion_watched';     // You watched something they suggested
```

Extend `NotificationData`:

```typescript
export interface NotificationData {
  // ... existing fields

  // For friend suggestions
  suggestion_id?: number;
  suggestion_ids?: number[];  // For grouped suggestions
  suggester_id?: number;
  suggester_name?: string;
  suggestion_note?: string;
  suggestion_count?: number;  // For grouped
}
```

---

## API Endpoints

### Partner Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/partners/invite` | Create partner invite (type='partner') |
| GET | `/api/partners` | Get current partner info |
| DELETE | `/api/partners` | Remove partner relationship |
| GET | `/api/partner-lists` | Get all shared lists with partner |
| POST | `/api/partner-lists` | Create new shared list |
| GET | `/api/partner-lists/[id]` | Get list details + items |
| POST | `/api/partner-lists/[id]/items` | Add item to shared list |
| DELETE | `/api/partner-lists/[id]/items/[itemId]` | Remove item from list |
| PATCH | `/api/partner-lists/[id]/items/[itemId]/status` | Update your watched/rating |
| POST | `/api/partner-lists/[id]/items/[itemId]/watched-together` | Mark as watched together |

### Friend Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/invite` | Create friend invite (type='friend') |
| GET | `/api/friends` | Get all friends |
| DELETE | `/api/friends/[id]` | Remove friend |

### Suggestion Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/suggestions` | Create suggestion to a friend |
| GET | `/api/suggestions/pending` | Get pending suggestions (for you) |
| GET | `/api/suggestions/sent` | Get suggestions you've sent |
| POST | `/api/suggestions/[id]/accept` | Accept → adds to watchlist |
| POST | `/api/suggestions/[id]/dismiss` | Dismiss suggestion |
| POST | `/api/suggestions/batch-accept` | Accept multiple at once |

---

## UI Components

### Settings / Sharing Page

```
┌─────────────────────────────────────────────────┐
│ Sharing                                    ✕    │
├─────────────────────────────────────────────────┤
│                                                 │
│  Partner                                        │
│  ┌───────────────────────────────────────────┐  │
│  │ 👩 Kari                        [Manage]   │  │
│  │ Sharing: Our Watchlist (12 items)         │  │
│  └───────────────────────────────────────────┘  │
│  - or -                                         │
│  ┌───────────────────────────────────────────┐  │
│  │ + Invite Partner                          │  │
│  │   Share lists with someone you watch with │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Friends                                        │
│  ┌───────────────────────────────────────────┐  │
│  │ 👨 Dane                       3 suggested │  │
│  │ You suggested 1 to them        [Manage]   │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ + Add Friend                              │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Partner Invite Flow

1. **Invite screen**: Generate link or search by username
2. **Accept screen**: Create shared list name (e.g., "Our Watchlist")
3. **Confirmation**: Show shared list created

### Partner List View

```
┌─────────────────────────────────────────────────┐
│ Our Watchlist                    👤👤  8 items  │
├─────────────────────────────────────────────────┤
│ 🎬 Dune: Part Two                          [J]  │
│ 2024 • Sci-Fi                                   │
│                                    [✓ Watched]  │
├─────────────────────────────────────────────────┤
│ 🎬 Poor Things                             [K]  │
│ 2023 • Comedy                 ✓ Kari watched    │
│                               [Remove] [Watch]  │
├─────────────────────────────────────────────────┤
```

### "Mark Watched" Modal (Partner List)

```
┌─────────────────────────────────────────────────┐
│              Dune: Part Two                     │
│              2024 • Sci-Fi                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │     ✓ We Watched Together                 │  │
│  │     Moves to both your Watched lists      │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │       Just Me                             │  │
│  │       Kari can still watch it later       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│                   Cancel                        │
└─────────────────────────────────────────────────┘
```

### Friend Suggestion Notification (Grouped)

```
┌─────────────────────────────────────────────────┐
│ 🔔 Notifications                                │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ 👨 Dane suggested 3 titles         2h ago  │ │
│ │                                             │ │
│ │ ┌─────┬─────┬─────┐                         │ │
│ │ │ 🎬  │ 🎬  │ 🎬  │  Severance, Shogun...   │ │
│ │ └─────┴─────┴─────┘                         │ │
│ │                                             │ │
│ │ [View All]              [+ Add All]         │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📺 The White Lotus S3E4       tomorrow     │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Friend Suggestion Detail (Expanded)

```
┌─────────────────────────────────────────────────┐
│ ← Dane's Suggestions                    3 new   │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎬 Severance                               │ │
│ │ TV Series • Thriller                       │ │
│ │ "Trust me, this show is incredible"        │ │
│ │                                            │ │
│ │ [+ Add to Watchlist]           [Dismiss]   │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎬 Shogun                                  │ │
│ │ TV Series • Drama                          │ │
│ │ "Epic historical drama"                    │ │
│ │                                            │ │
│ │ [+ Add to Watchlist]           [Dismiss]   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│         [+ Add All to Watchlist]                │
└─────────────────────────────────────────────────┘
```

### Media Detail Page - Suggest Button

When viewing a movie/show, if you have friends:

```
┌─────────────────────────────────────────────────┐
│ 🎬 Severance                                    │
│ ★★★★★  TV Series • Thriller                     │
├─────────────────────────────────────────────────┤
│                                                 │
│ [+ Add to Watchlist]    [→ Suggest to Friend]   │
│                                                 │
└─────────────────────────────────────────────────┘
```

Tapping "Suggest to Friend" opens:

```
┌─────────────────────────────────────────────────┐
│ Suggest Severance                          ✕    │
├─────────────────────────────────────────────────┤
│                                                 │
│  Who should watch this?                         │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ ☐ 👨 Dane                                 │  │
│  │ ☐ 👩 Alex                                 │  │
│  │ ☐ 👤 Mike                                 │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Add a note (optional)                          │
│  ┌───────────────────────────────────────────┐  │
│  │ Trust me on this one...                   │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │            Send Suggestion                │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Watchlist with Attribution

```
┌─────────────────────────────────────────────────┐
│ Watchlist                              15 items │
├─────────────────────────────────────────────────┤
│ [All] [Mine] [Suggested ▼]                      │
│               ├─ All suggestions                │
│               ├─ Dane (3)                       │
│               └─ Alex (1)                       │
├─────────────────────────────────────────────────┤
│ 🎬 Severance                                    │
│ TV Series • via Dane                            │
├─────────────────────────────────────────────────┤
│ 🎬 Dune: Part Two                               │
│ 2024                                            │
├─────────────────────────────────────────────────┤
```

---

## Implementation Phases

### Phase 1: Database & Types (Day 1)
- [ ] Add migration for all new tables
- [ ] Add `type` column to collaborators
- [ ] Update notification types
- [ ] Create TypeScript types for new entities

### Phase 2: Partner Backend (Day 2)
- [ ] Create `lib/partners.ts` with core functions
- [ ] Partner invite/accept flow (reuse collaborator logic with type='partner')
- [ ] Partner list CRUD operations
- [ ] Partner list item operations
- [ ] Watched together / watched solo logic

### Phase 3: Friend Backend (Day 2-3)
- [ ] Create `lib/friends.ts` for friend-specific logic
- [ ] Friend invite/accept flow (type='friend')
- [ ] Create `lib/suggestions.ts`
- [ ] Suggestion CRUD operations
- [ ] Notification grouping logic
- [ ] Accept suggestion → add to watchlist with attribution

### Phase 4: Partner UI (Day 3-4)
- [ ] Settings page: Partner section
- [ ] Partner invite modal
- [ ] Partner accept page (with list name input)
- [ ] Partner list page
- [ ] Partner list item cards (with dual-user status)
- [ ] "Watched together" modal

### Phase 5: Friend UI (Day 4-5)
- [ ] Settings page: Friends section
- [ ] Friend invite modal
- [ ] Suggestion notifications (grouped)
- [ ] Suggestion detail page
- [ ] "Suggest to Friend" button on media pages
- [ ] Suggest modal (friend picker + note)
- [ ] Watchlist filter by suggester

### Phase 6: Polish & Edge Cases (Day 5-6)
- [ ] Partner limit enforcement (max 1)
- [ ] Duplicate suggestion prevention
- [ ] "Already on watchlist" handling
- [ ] Suggestion expiry (optional)
- [ ] Feedback when friend watches suggestion (optional)
- [ ] Empty states
- [ ] Loading states
- [ ] Error handling

---

## Key Business Rules

### Partner Model
1. **Max 1 partner per user** - UI prevents inviting if already have partner
2. **Shared lists are separate** from personal lists
3. **Both partners can add/remove** items from shared lists
4. **Watched status is per-user** on shared items
5. **"Watched together"** = both users have watched = item moves to shared "Watched Together" view
6. **"Just me"** = only you watched = item stays on list, shows "You watched" badge to partner
7. **Partner can dismiss** items the other watched solo ("Not interested")

### Friend Model
1. **Unlimited friends**
2. **Bidirectional** - both can suggest to each other once connected
3. **Suggestions go to notifications** - not directly to watchlist
4. **Grouping** - Multiple suggestions from same friend in short window = grouped notification
5. **Accept adds to watchlist** with `suggested_by_user_id` attribution
6. **Dismiss removes notification** - suggester not notified of dismissal
7. **No duplicate suggestions** - Can't suggest same title twice to same person
8. **Already on list** - If target already has it, show message, don't create suggestion

### Notification Grouping Logic

```typescript
// When creating a friend suggestion notification:
// 1. Check for existing unread suggestion notification from same user within 24h
// 2. If exists, update it to grouped format
// 3. If not, create single notification

async function createSuggestionNotification(suggestion: FriendSuggestion) {
  const existing = await db`
    SELECT * FROM notifications
    WHERE user_id = ${suggestion.to_user_id}
    AND type IN ('friend_suggestion', 'friend_suggestion_group')
    AND (data->>'suggester_id')::int = ${suggestion.from_user_id}
    AND is_read = false
    AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (existing.rows.length > 0) {
    // Update to grouped
    const current = existing.rows[0];
    const currentIds = current.data.suggestion_ids || [current.data.suggestion_id];
    const newIds = [...currentIds, suggestion.id];

    await db`
      UPDATE notifications
      SET type = 'friend_suggestion_group',
          title = ${`${suggestion.from_user_name} suggested ${newIds.length} titles`},
          data = ${JSON.stringify({
            ...current.data,
            suggestion_ids: newIds,
            suggestion_count: newIds.length
          })}
      WHERE id = ${current.id}
    `;
  } else {
    // Create single
    await createNotification({
      user_id: suggestion.to_user_id,
      type: 'friend_suggestion',
      title: `${suggestion.from_user_name} suggested ${mediaTitle}`,
      media_id: suggestion.media_id,
      data: {
        suggestion_id: suggestion.id,
        suggester_id: suggestion.from_user_id,
        suggester_name: suggestion.from_user_name,
        suggestion_note: suggestion.note
      }
    });
  }
}
```

---

## Files to Create/Modify

### New Files
- `lib/partners.ts` - Partner logic
- `lib/friends.ts` - Friend logic
- `lib/suggestions.ts` - Suggestion logic
- `app/api/partners/` - Partner API routes
- `app/api/partner-lists/` - Partner list API routes
- `app/api/friends/` - Friend API routes
- `app/api/suggestions/` - Suggestion API routes
- `components/sharing/PartnerSection.tsx`
- `components/sharing/FriendSection.tsx`
- `components/sharing/SuggestModal.tsx`
- `components/notifications/SuggestionNotification.tsx`
- `app/partner-list/[id]/page.tsx` - Partner list view

### Modified Files
- `lib/db.ts` - Add new table migrations
- `lib/collaborators.ts` - Add type parameter
- `types/notifications.ts` - Add new types
- `components/notifications/NotificationCenter.tsx` - Handle suggestion types
- `app/settings/page.tsx` - New sharing section
- `app/movie/[id]/page.tsx` - Add suggest button
- `app/tv/[id]/page.tsx` - Add suggest button
- `app/library/page.tsx` - Add suggested_by filter
- `components/MediaCard.tsx` - Show "via [Name]" attribution

---

## Ready to Build?

This plan gives us:
- Clean separation between Partner (shared lists) and Friend (suggestions)
- Leverages existing notification system for friend suggestions
- Grouping for a less noisy notification experience
- Attribution throughout the watchlist
- Clear business rules for edge cases

Let me know when you want to start implementation!
