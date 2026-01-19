# Collaborative Lists - Implementation Plan

> Feature to allow users to share and collaborate on media lists with partners, family, or friends.

## Overview

Collaborative lists allow two or more users to share media tracking lists. When a list is shared:
- All collaborators see the same items
- Anyone can add or remove items
- Each item shows who added it ("Added by")
- Ratings remain personal (each user has their own rating)

This is inspired by [Spotify's collaborative playlists](https://support.spotify.com/us/article/collaborative-playlists/) and [Trakt's list collaboration](https://forums.trakt.tv/t/manage-your-watchlist-personal-lists/19080).

---

## User Stories

### Primary Use Case: Couples
> "My wife and I want to track shows we watch together. We each have accounts, but want our Watchlist and Watching lists to be shared."

### Secondary Use Cases
- Friends sharing a "Movie Night" custom list
- Family sharing a "Kids Can Watch" list
- Keeping personal favorites separate while sharing watchlist

---

## User Flow

### Inviting a Collaborator

```
1. User goes to Settings or a specific list
2. Clicks "Share List" or "Invite Collaborator"
3. Generates invite link (or searches by username/email)
4. Sends link to partner

┌─────────────────────────────────────────────┐
│  Share your lists                           │
│                                             │
│  Invite someone to collaborate on your      │
│  lists. They'll be able to add and remove   │
│  items from shared lists.                   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ https://flicklog.app/invite/abc123  │   │
│  └─────────────────────────────────────┘   │
│  [Copy Link]                                │
│                                             │
│  Link expires in 7 days                     │
└─────────────────────────────────────────────┘
```

### Accepting an Invite

```
1. Recipient clicks invite link
2. If not logged in, prompted to login/register
3. Sees invitation details
4. Chooses which lists to share
5. Optionally merges existing items

┌─────────────────────────────────────────────┐
│  Justin invited you to collaborate!         │
│                                             │
│  Choose which lists to share:               │
│                                             │
│  ☑ Watchlist                                │
│  ☑ Watching                                 │
│  ☑ Finished                                 │
│  ☐ Favorites (keep personal)                │
│  ☐ On Hold                                  │
│  ☐ Dropped                                  │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  You have 12 items in your Watchlist.       │
│  What should happen to them?                │
│                                             │
│  ◉ Add my items to shared list              │
│  ○ Start fresh (keep my items personal)     │
│  ○ Let me choose which items to add         │
│                                             │
│  [Accept Invitation]                        │
└─────────────────────────────────────────────┘
```

### Viewing Shared Lists

```
┌─────────────────────────────────────────────┐
│  👤 Watchlist                    Shared 👥  │
│  ─────────────────────────────────────────  │
│                                             │
│  ┌─────┐  Breaking Bad                      │
│  │     │  Added by Sarah • 2 days ago       │
│  └─────┘                                    │
│                                             │
│  ┌─────┐  The Bear                          │
│  │     │  Added by You • 1 week ago         │
│  └─────┘                                    │
│                                             │
│  ┌─────┐  Severance                         │
│  │     │  Added by Sarah • 3 weeks ago      │
│  └─────┘                                    │
└─────────────────────────────────────────────┘
```

---

## Database Schema

### New Tables

```sql
-- ============================================
-- COLLABORATORS
-- Links users who share lists together
-- ============================================
CREATE TABLE collaborators (
  id SERIAL PRIMARY KEY,

  -- The user who initiated the collaboration
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- The user who accepted the invitation
  collaborator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Invite mechanism
  invite_code VARCHAR(32) UNIQUE NOT NULL,
  invite_expires_at TIMESTAMP NOT NULL,

  -- Status: 'pending', 'accepted', 'declined', 'revoked'
  status VARCHAR(20) DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,

  -- Ensure unique pairing (owner can only invite same person once)
  UNIQUE(owner_id, collaborator_id)
);

-- Index for looking up by invite code
CREATE INDEX idx_collaborators_invite_code ON collaborators(invite_code);

-- Index for looking up user's collaborations
CREATE INDEX idx_collaborators_owner ON collaborators(owner_id);
CREATE INDEX idx_collaborators_collaborator ON collaborators(collaborator_id);


-- ============================================
-- SHARED LISTS CONFIG
-- Which lists are shared between collaborators
-- ============================================
CREATE TABLE shared_lists (
  id SERIAL PRIMARY KEY,

  -- Reference to the collaboration
  collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,

  -- Which list type is shared
  -- 'watchlist', 'watching', 'finished', 'onhold', 'dropped', 'favorites', 'rewatch', 'nostalgia'
  list_type VARCHAR(30) NOT NULL,

  -- Is this list currently being shared?
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  -- Each list type can only be shared once per collaboration
  UNIQUE(collaborator_id, list_type)
);


-- ============================================
-- MODIFICATIONS TO EXISTING TABLES
-- ============================================

-- Add 'added_by' to user_media to track who added each item
ALTER TABLE user_media
ADD COLUMN added_by INTEGER REFERENCES users(id);

-- Backfill: set added_by to user_id for existing records
UPDATE user_media SET added_by = user_id WHERE added_by IS NULL;

-- Add index for querying by added_by
CREATE INDEX idx_user_media_added_by ON user_media(added_by);
```

### Schema Diagram

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────┐
│    users     │       │  collaborators  │       │    users     │
├──────────────┤       ├─────────────────┤       ├──────────────┤
│ id           │◄──────│ owner_id        │       │ id           │
│ email        │       │ collaborator_id │──────►│ email        │
│ name         │       │ invite_code     │       │ name         │
└──────────────┘       │ status          │       └──────────────┘
                       └────────┬────────┘
                                │
                                │ 1:many
                                ▼
                       ┌─────────────────┐
                       │  shared_lists   │
                       ├─────────────────┤
                       │ collaborator_id │
                       │ list_type       │
                       │ is_active       │
                       └─────────────────┘

┌──────────────┐       ┌─────────────────┐
│    users     │       │   user_media    │
├──────────────┤       ├─────────────────┤
│ id           │◄──────│ user_id         │
└──────────────┘       │ added_by        │──────► users.id
                       │ media_id        │
                       │ status          │
                       └─────────────────┘
```

---

## API Endpoints

### Collaboration Management

```
POST   /api/collaborators/invite
       - Creates invitation, returns invite code/link
       - Body: { lists: ['watchlist', 'watching'] }

GET    /api/collaborators/invite/:code
       - Gets invitation details (for accept page)
       - Returns: { inviter: {...}, lists: [...], expiresAt: ... }

POST   /api/collaborators/accept/:code
       - Accepts invitation
       - Body: { lists: ['watchlist', 'watching'], mergeItems: true }

DELETE /api/collaborators/:id
       - Removes collaboration (either party can do this)

GET    /api/collaborators
       - Lists all active collaborations for current user

PATCH  /api/collaborators/:id/lists
       - Updates which lists are shared
       - Body: { lists: ['watchlist', 'watching', 'finished'] }
```

### Modified Existing Endpoints

```
GET    /api/watchlist (and other list endpoints)
       - Now returns items from all collaborators
       - Each item includes 'added_by' user info
       - Query param: ?personal=true to see only your items

POST   /api/library
       - Sets 'added_by' to current user
       - Item visible to all collaborators of that list

DELETE /api/library
       - Any collaborator can remove any item
       - (Future: could add confirmation for items you didn't add)
```

---

## Component Changes

### New Components

```
components/
├── CollaboratorInvite.tsx      # Modal to create/copy invite link
├── CollaboratorAccept.tsx      # Page to accept invitation
├── CollaboratorBadge.tsx       # Shows "Shared 👥" indicator on lists
├── CollaboratorSettings.tsx    # Manage collaborations in settings
└── AddedByLabel.tsx            # Shows "Added by [name]" on items
```

### Modified Components

```
components/
├── MediaCard.tsx               # Add 'addedBy' prop and display
├── Sidebar.tsx                 # Show collaboration indicator
└── ProfileMenu.tsx             # Link to collaboration settings

app/
├── settings/
│   └── collaborators/
│       └── page.tsx            # Collaboration management page
├── invite/
│   └── [code]/
│       └── page.tsx            # Accept invitation page
```

---

## Query Logic

### Fetching Shared List Items

When user requests their watchlist:

```sql
-- Get all items from watchlist where:
-- 1. User owns the item directly, OR
-- 2. User has an active collaboration with shared watchlist

SELECT
  um.*,
  m.title,
  m.poster_path,
  added_user.name as added_by_name,
  added_user.id as added_by_id
FROM user_media um
JOIN media m ON um.media_id = m.id
LEFT JOIN users added_user ON um.added_by = added_user.id
WHERE
  um.status = 'watchlist'
  AND (
    -- Items I own
    um.user_id = :currentUserId
    OR
    -- Items from my collaborators where watchlist is shared
    um.user_id IN (
      SELECT
        CASE
          WHEN c.owner_id = :currentUserId THEN c.collaborator_id
          ELSE c.owner_id
        END
      FROM collaborators c
      JOIN shared_lists sl ON sl.collaborator_id = c.id
      WHERE
        (c.owner_id = :currentUserId OR c.collaborator_id = :currentUserId)
        AND c.status = 'accepted'
        AND sl.list_type = 'watchlist'
        AND sl.is_active = true
    )
  )
ORDER BY um.created_at DESC;
```

### Simplified with a View (Optional)

```sql
-- Create a view for easier querying
CREATE VIEW user_visible_media AS
SELECT
  um.*,
  m.title,
  m.poster_path,
  m.media_type,
  added_user.name as added_by_name,
  viewer.id as viewer_id
FROM user_media um
JOIN media m ON um.media_id = m.id
JOIN users added_user ON um.added_by = added_user.id
CROSS JOIN users viewer
WHERE
  -- Direct ownership
  um.user_id = viewer.id
  OR
  -- Via collaboration
  EXISTS (
    SELECT 1 FROM collaborators c
    JOIN shared_lists sl ON sl.collaborator_id = c.id
    WHERE
      c.status = 'accepted'
      AND sl.is_active = true
      AND sl.list_type = um.status
      AND (
        (c.owner_id = viewer.id AND c.collaborator_id = um.user_id)
        OR
        (c.collaborator_id = viewer.id AND c.owner_id = um.user_id)
      )
  );
```

---

## Edge Cases & Considerations

### 1. Duplicate Items
**Scenario:** Both users have "Breaking Bad" in watchlist before sharing.

**Solution:** When merging, detect duplicates by `media_id`. Keep the one with more data (rating, notes) or the older one. Show notification: "3 duplicate items were merged."

### 2. Item Ownership for Display
**Scenario:** Who "owns" a merged duplicate?

**Solution:** Keep original `user_id` as owner, `added_by` tracks who added. For duplicates, `added_by` = whoever added first (or show "Added by both").

### 3. Removing Collaboration
**Scenario:** Users stop sharing lists.

**Solution:**
- Items stay with their original `user_id`
- Items added by the other person remain (they were added to your list)
- Optional: prompt "Remove items added by [partner]?"

### 4. Ratings
**Scenario:** Both users want to rate the same movie.

**Solution (Phase 1):** Rating stays on `user_media`, tied to `user_id`. Each person has their own rating. Display shows your rating.

**Solution (Phase 2):** Show both ratings: "You: ★★★★ | Sarah: ★★★★★"

### 5. Status Changes
**Scenario:** User A moves item from Watchlist to Watching. User B sees it?

**Solution:** Yes - the item's status changes for everyone. It moves from shared Watchlist to shared Watching (if both are shared).

### 6. Notifications (Future)
- "Sarah added 'The Bear' to Watchlist"
- "Sarah marked 'Breaking Bad' as Finished"
- "Sarah rated 'Severance' ★★★★★"

---

## Implementation Phases

### Phase 1: Core Collaboration (MVP)
- [ ] Database migrations
- [ ] Create invitation flow (generate link)
- [ ] Accept invitation page
- [ ] Modify list queries to include collaborator items
- [ ] Show "Added by" on items
- [ ] Basic settings page to manage collaborations

### Phase 2: Polish
- [ ] Show "Shared" badge on lists
- [ ] Merge flow with duplicate detection
- [ ] Choose which lists to share (granular)
- [ ] Remove collaboration flow

### Phase 3: Enhanced Features
- [ ] Show both ratings on shared items
- [ ] Activity feed for collaborator actions
- [ ] Notifications
- [ ] Custom lists with sharing

---

## File Structure for New Code

```
app/
├── api/
│   └── collaborators/
│       ├── route.ts              # GET (list), POST (create invite)
│       ├── [id]/
│       │   └── route.ts          # DELETE, PATCH
│       ├── invite/
│       │   └── [code]/
│       │       └── route.ts      # GET (details), POST (accept)
│       └── lists/
│           └── route.ts          # PATCH (update shared lists)
├── invite/
│   └── [code]/
│       └── page.tsx              # Accept invitation page
└── settings/
    └── collaborators/
        └── page.tsx              # Manage collaborations

components/
├── collaboration/
│   ├── InviteModal.tsx
│   ├── AcceptInvite.tsx
│   ├── CollaboratorList.tsx
│   ├── SharedBadge.tsx
│   └── AddedByLabel.tsx

lib/
├── collaborators.ts              # DB queries for collaborations
└── db.ts                         # Add collaboration queries
```

---

## Security Considerations

1. **Invite codes** - Use cryptographically secure random strings (32 chars)
2. **Expiration** - Invites expire after 7 days
3. **Rate limiting** - Limit invite creation (e.g., 10 per day)
4. **Authorization** - Only collaborators can see shared items
5. **Revocation** - Either party can end collaboration at any time

---

## Testing Checklist

- [ ] User can create invite link
- [ ] Invite link expires after 7 days
- [ ] User can accept invite and choose lists
- [ ] Merged items appear in shared lists
- [ ] "Added by" shows correct user
- [ ] Both users see same items
- [ ] Adding item shows for both users
- [ ] Removing item removes for both users
- [ ] Status change reflects for both users
- [ ] Ending collaboration keeps items with owners
- [ ] Cannot accept own invite
- [ ] Cannot accept expired invite
- [ ] Cannot accept already-used invite

---

## Questions to Resolve During Implementation

1. **Should there be a limit on collaborators?** (Suggest: 5 max)
2. **Can you have multiple collaboration groups?** (Suggest: Yes, for friends vs family)
3. **Should removing items added by others require confirmation?** (Suggest: No for MVP, trust model)
4. **How to handle tags (favorites, rewatch, classics)?** (Suggest: Treat same as status lists)
