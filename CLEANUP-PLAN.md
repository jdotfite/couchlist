# Couchlist Simplification - Cleanup Plan

## Goal
Simplify the app to:
- **Personal Library**: Watchlist, Watching, Finished, On Hold, Dropped, Favorites
- **Saved Lists**: Simple manual lists (replacing complex custom-lists system)
- **Friends/Partners**: Keep for collaborative features, but remove bidirectional library sharing

## Current State
- Rolled back to commit `cbb51c9` (clean, working state)
- Build passes
- Preserved new work in: `C:\Users\Justin\AppData\Local\Temp\claude\couchlist-preserve\`

---

## Phase 1: Remove User's Saved Streaming Services (isolated, low risk)

### What We're Removing
The feature where users can select "I subscribe to Netflix, Hulu, etc." and have those services
highlighted/sorted first in the filter UI. We are **keeping** the ability to filter by provider.

### What We're Keeping
- `components/icons/StreamingServiceIcons.tsx` - Provider icons (used everywhere)
- `types/streaming.ts` - Provider list, genre types, filter interfaces (just remove `UserStreamingService` type)
- `app/settings/discovery/page.tsx` - Discovery rows customization (unrelated to user's subscriptions)
- Provider filtering in `FilterBottomSheet.tsx` - Just won't auto-sort user's services first

### Files to Delete:
| File | Purpose |
|------|---------|
| `app/api/streaming-services/route.ts` | API endpoint for user's saved streaming services |
| `app/settings/services/page.tsx` | Settings page to select user's subscriptions |
| `lib/streaming-services.ts` | CRUD functions for `user_streaming_services` table |
| `hooks/useStreamingServices.ts` | React hook for managing user's services |
| `scripts/tests/test-streaming-services.ts` | Test file for streaming services |

### Files to Update:

| File | Change |
|------|--------|
| `types/streaming.ts` | Remove `UserStreamingService` interface (lines 133-141) |
| `components/search/FilterBottomSheet.tsx` | Remove `userProviderIds` prop (line 16, 26) and sorting logic (lines 75-81), remove "Your Services" label (line 169-170), remove ring highlight (line 178) |
| `components/search/BrowseCards.tsx` | Remove `userProviderIds` prop (line 7, 22) and sorting logic (lines 26-32), remove ring/dot indicators (lines 42, 48-49, 58-60) |
| `scripts/tests/run-all-tests.ts` | Remove streaming services test import |

### Detailed Changes

**FilterBottomSheet.tsx:**
```diff
- interface FilterBottomSheetProps {
-   userProviderIds?: number[];
-   ...
- }
```
- Remove sorting of providers by user's services
- Remove "Your Services" section header
- Remove ring highlight on user's selected services

**BrowseCards.tsx:**
```diff
- interface BrowseCardsProps {
-   userProviderIds?: number[];
-   ...
- }
```
- Remove sorting by user's services (keep `TOP_US_PROVIDERS` order)
- Remove ring-2 ring-brand-primary highlight
- Remove small dot indicator on user's services

### Database (no action needed now)
The `user_streaming_services` table can remain in the database. It won't be used, and we can
drop it later during a proper DB migration.

### Verification
After completing Phase 1:
1. Build passes: `npm run build`
2. Filter sheet still works (just without user's services sorted first)
3. Provider icons still display correctly
4. Settings page no longer shows "My Services" option

---

## Phase 2: Remove Custom Lists (old system)

### Files to Delete:
- `app/api/custom-lists/` (entire directory)
  - `[slug]/bulk/route.ts`
  - `[slug]/collaborators/route.ts`
  - `[slug]/invite/route.ts`
  - `[slug]/items/route.ts`
  - `[slug]/route.ts`
  - `connections/route.ts`
  - `invite/[code]/route.ts`
  - `media/route.ts`
  - `route.ts`
  - `shared/route.ts`
- `components/custom-lists/` (entire directory)
  - `ColorPicker.tsx`
  - `CreateListModal.tsx`
  - `CustomListSelector.tsx`
  - `EditListModal.tsx`
  - `IconPicker.tsx`
- `lib/custom-lists.ts`
- `lib/invites.ts`
- `app/lists/[slug]/manage/page.tsx` (if exists)
- `app/lists/[slug]/page.tsx` (if exists)
- `app/lists/invite/[code]/page.tsx` (if exists)

### Files to Update:
- `app/lists/page.tsx` - simplify or redirect
- Any imports of custom-lists components
- MediaOptionsSheet if it references custom lists

---

## Phase 3: Remove Rewatch/Nostalgia Tags (keep only Favorites)

### Files to Delete:
- `app/api/rewatch/route.ts`
- `app/api/nostalgia/route.ts`

### Files to Update (remove rewatch/nostalgia references):
- `app/movies/all/page.tsx` - remove from allSystemLists
- `app/shows/all/page.tsx` - remove from allSystemLists
- `app/movies/[slug]/page.tsx` - remove from listConfig
- `app/shows/[slug]/page.tsx` - remove from listConfig
- `app/library/[slug]/page.tsx` - remove from listConfig
- `app/invite/[code]/page.tsx` - remove from listConfig
- `app/settings/collaborators/page.tsx` - remove references
- `app/friends/page.tsx` - remove references
- `hooks/useMediaStatus.ts` - remove from TAG_ENDPOINTS
- `components/MediaOptionsSheet.tsx` - remove tag options
- `lib/db.ts` - keep system tags in DB for now (no schema change needed)

---

## Phase 4: Add Back Saved Lists (from preserved files)

### Preserved files location:
`C:\Users\Justin\AppData\Local\Temp\claude\couchlist-preserve\`

### Files to add:
- `lib/saved-lists.ts` - Core CRUD logic
- `app/api/saved-lists/` - API routes
- `app/saved-lists/[slug]/page.tsx` - View page
- `components/lists/SaveAsListModal.tsx`
- `components/lists/SavedListCard.tsx`

### Review first:
- Check if `lib/saved-lists.ts` has smart list complexity to strip out
- Ensure it's simple manual lists only

---

## Preserved Files Summary

Located at: `C:\Users\Justin\AppData\Local\Temp\claude\couchlist-preserve\`

```
app/
  api/
    batch-status/route.ts
    saved-lists/
      route.ts
      preview/route.ts
      [id]/route.ts
      [id]/items/route.ts
      [id]/pins/route.ts
  saved-lists/
    [slug]/page.tsx
  favicon.ico
  icon.png

components/
  lists/
    SaveAsListModal.tsx
    SavedListCard.tsx
  providers/
    ToastProvider.tsx
  ui/
    ColorPicker.tsx
    IconPicker.tsx
    StatusIcon.tsx

hooks/
  useLibraryStatusBatch.ts

lib/
  list-resolver.ts
  saved-lists.ts
  search.ts
  toast.tsx
```

---

## Order of Operations

1. **Phase 1**: Remove streaming services
2. **Phase 2**: Remove custom-lists
3. **Phase 3**: Remove rewatch/nostalgia
4. **Verify**: Build passes, app works
5. **Phase 4**: Add saved-lists back incrementally
