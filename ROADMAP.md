# FlickLog - Feature Roadmap

## Quick Wins (Low Effort, High Value)

### Sorting & Filtering Enhancements
- [ ] Add sort options to library pages (date added, rating, title, release date)
- [ ] Add search/filter within your own library
- [ ] Genre badges on list items
- [ ] Advanced filters (by year, genre)

### User Content
- [ ] Enable notes field in UI (DB column exists)
- [ ] Text reviews with ratings
- [ ] Export watch history (CSV/JSON download)

### UI Polish
- [ ] Consolidate MoviePage and TVShowPage into shared component
- [ ] CSS variables for theme colors (currently hardcoded #8b5ef4)
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
- [ ] Custom lists (Best of 2024, Halloween movies, etc.)
- [ ] Public/private list toggle
- [ ] Collaborative lists
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
