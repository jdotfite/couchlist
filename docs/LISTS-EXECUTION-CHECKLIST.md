# Lists Feature - Execution Checklist

## Phase 1: Database Foundation

### 1.1 Add Core Tables to `lib/db.ts`

- [ ] Add `saved_lists` table
- [ ] Add `saved_list_pins` table
- [ ] Add `follows` table
- [ ] Add `list_shares` table (for sharing notifications)
- [ ] Run migration / verify tables exist

**Reference:** The `lib/saved-lists.ts` already expects these tables but they're not in `db.ts`

### 1.2 Cleanup Legacy Tables (Later)

These tables support the old "permission-based sharing" model:
- [ ] `shared_lists` - stop using, then remove
- [ ] `friend_list_access` - stop using, then remove
- [ ] `list_visibility` - stop using, then remove
- [ ] `friend_default_sharing` - stop using, then remove

---

## Phase 2: Core Lists Pages

### 2.1 Lists Index Page (`/lists/page.tsx`)

Currently redirects to `/saved-lists`. Change to:

- [ ] Show all user's lists in cards
- [ ] "Create List" button (opens modal or goes to /lists/new)
- [ ] Empty state: "Create your first list"
- [ ] Reuse `SavedListCard.tsx` component

**Files to modify:**
- `app/lists/page.tsx` (currently just a redirect)

### 2.2 Single List Page (`/lists/[slug]/page.tsx`)

Already exists at `app/saved-lists/[slug]/page.tsx`. Rename/move:

- [ ] Move from `/saved-lists/[slug]` to `/lists/[slug]`
- [ ] Add edit functionality (name, description, public toggle)
- [ ] Add "Share" button
- [ ] Add "Add to List" action for items
- [ ] Show follower count (later)

**Files to modify:**
- Move `app/saved-lists/[slug]/page.tsx` → `app/lists/[slug]/page.tsx`
- Update any imports/links

### 2.3 Create List Flow

Two entry points:

1. **Direct create** (`/lists` → Create button)
   - [ ] "Create List" button opens `SaveAsListModal`
   - [ ] Or dedicated `/lists/new` page

2. **From library filter** (Library → filter → "Save as List")
   - [ ] Add "Save as List" button to library filter UI
   - [ ] Opens `SaveAsListModal` with filter rules pre-filled

**Files to modify:**
- `components/lists/SaveAsListModal.tsx` (already exists, may need tweaks)
- `app/library/page.tsx` or library filter component

---

## Phase 3: Add Items to Lists

### 3.1 "Add to List" in MediaOptionsSheet

- [ ] Add "Add to List" option in `MediaOptionsSheet.tsx`
- [ ] Opens bottom sheet showing user's lists
- [ ] Checkboxes for which lists to add/remove item
- [ ] Create new `AddToListSheet.tsx` component

**Files to create:**
- `components/lists/AddToListSheet.tsx`

**Files to modify:**
- `components/MediaOptionsSheet.tsx`

### 3.2 Quick Add from List Page

- [ ] "Add Items" button on list detail page
- [ ] Search for titles to add
- [ ] Or "Add from Library" picker

---

## Phase 4: Library Integration

### 4.1 Show Lists on Library Page

- [ ] Add "Your Lists" section below system lists
- [ ] Show list cards with preview posters
- [ ] "See All" → `/lists`

**Files to modify:**
- `app/library/page.tsx`

### 4.2 API Endpoint Review

Existing endpoints in `app/api/saved-lists/`:
- `route.ts` - GET (list all), POST (create)
- `[id]/route.ts` - GET, PATCH, DELETE
- `[id]/items/route.ts` - GET items
- `[id]/pins/route.ts` - POST (add), DELETE (remove)
- `preview/route.ts` - preview filter results

Consider renaming `/api/saved-lists` → `/api/lists` for consistency.

---

## Phase 5: Public Lists & Sharing

### 5.1 Public List View (No Auth)

- [ ] Create `/u/[username]/lists/[slug]/page.tsx`
- [ ] Fetch list by username + slug (public only)
- [ ] Show list items with poster grid
- [ ] CTA: "Follow this list" (if logged in) or "Sign up"

**Files to create:**
- `app/u/[username]/lists/[slug]/page.tsx`
- `app/api/u/[username]/lists/[slug]/route.ts`

### 5.2 Share List Flow

**Share via Link:**
- [ ] Copy URL button on list page
- [ ] URL format: `flicklog.app/u/username/lists/my-list-slug`

**Share to User (in-app):**
- [ ] "Share" button → `ShareListSheet.tsx`
- [ ] Search for users (by username)
- [ ] Send creates `list_shares` record
- [ ] Recipient sees notification

**Files to create:**
- `components/lists/ShareListSheet.tsx`
- `app/api/lists/[id]/share/route.ts`

### 5.3 Shared With Me

- [ ] Notification when someone shares a list with you
- [ ] "Shared with you" section in notifications or lists page
- [ ] Action: Follow or dismiss

---

## Phase 6: Following System

### 6.1 Follow a List

- [ ] "Follow" button on public list pages
- [ ] API: `POST /api/following` with `{ type: 'list', id: listId }`
- [ ] Followed lists appear in "Following" section

### 6.2 Follow a User

- [ ] "Follow" button on user profile
- [ ] See their public lists in your feed
- [ ] API: `POST /api/following` with `{ type: 'user', id: userId }`

### 6.3 Following Page/Section

- [ ] Create `/following/page.tsx` or section on `/lists`
- [ ] Show lists you follow grouped by owner
- [ ] Show "New items" badge when list is updated

**Files to create:**
- `lib/follows.ts`
- `app/api/following/route.ts`
- `app/following/page.tsx` (or integrate into /lists)

---

## Phase 7: Cleanup & Migration

### 7.1 Remove Old Sharing Code

- [ ] Remove `/app/settings/collaborators/page.tsx` sharing UI (keep friends)
- [ ] Remove `shared_lists` references
- [ ] Remove `friend_list_access` references
- [ ] Remove `list_visibility` references

### 7.2 Rename Routes

- [ ] `/saved-lists/*` → `/lists/*`
- [ ] `/api/saved-lists/*` → `/api/lists/*`
- [ ] Update all imports and links

### 7.3 Update Documentation

- [ ] Update `CLAUDE.md` with new list model
- [ ] Remove references to old sharing model
- [ ] Add new API endpoints

---

## File Mapping: Old → New

| Old Location | New Location | Notes |
|--------------|--------------|-------|
| `app/saved-lists/[slug]/page.tsx` | `app/lists/[slug]/page.tsx` | Rename |
| `app/lists/page.tsx` (redirect) | `app/lists/page.tsx` (real page) | Replace |
| `app/api/saved-lists/*` | `app/api/lists/*` | Rename |
| `lib/saved-lists.ts` | `lib/lists.ts` | Rename |
| N/A | `lib/follows.ts` | Create |
| N/A | `app/u/[username]/lists/[slug]/page.tsx` | Create |
| N/A | `app/api/following/route.ts` | Create |
| N/A | `components/lists/AddToListSheet.tsx` | Create |
| N/A | `components/lists/ShareListSheet.tsx` | Create |

---

## Quick Wins (Start Here)

1. **Add tables to db.ts** - Unblocks everything else
2. **Create /lists/page.tsx** - Visible progress, simple
3. **Move /saved-lists/[slug] → /lists/[slug]** - Clean up naming
4. **Add "Your Lists" to library page** - Immediate value

---

## Testing Checklist

- [ ] Can create a new list
- [ ] Can add items to a list
- [ ] Can view list at /lists/[slug]
- [ ] Can make list public/private
- [ ] Can share list via link
- [ ] Can share list to another user
- [ ] Can follow a public list
- [ ] Can see followed lists
- [ ] Public list viewable without login
