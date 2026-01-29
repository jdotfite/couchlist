require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Rate limiter for TMDb API (40 requests per 10 seconds)
class RateLimiter {
  constructor(maxTokens = 40, refillPeriodMs = 10000) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = maxTokens / refillPeriodMs;
  }

  async acquire() {
    this.refill();

    if (this.tokens < 1) {
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens -= 1;
  }

  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

const rateLimiter = new RateLimiter();

async function fetchMovieDetails(tmdbId) {
  await rateLimiter.acquire();

  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`TMDb API error: ${response.status}`);
  }

  return response.json();
}

async function fetchTVDetails(tmdbId) {
  await rateLimiter.acquire();

  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`TMDb API error: ${response.status}`);
  }

  return response.json();
}

async function main() {
  console.log('Fetching movies missing runtime...');

  // Get all movies without runtime
  const moviesResult = await sql`
    SELECT id, tmdb_id, title
    FROM media
    WHERE media_type = 'movie'
      AND runtime IS NULL
    ORDER BY id
  `;

  console.log(`Found ${moviesResult.rows.length} movies missing runtime`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < moviesResult.rows.length; i++) {
    const movie = moviesResult.rows[i];

    try {
      const details = await fetchMovieDetails(movie.tmdb_id);

      if (details.runtime) {
        // Build genre_ids string if genres are available and we don't have them
        let genreIds = null;
        if (details.genres && details.genres.length > 0) {
          genreIds = details.genres.map(g => g.id).join(',');
        }

        await sql`
          UPDATE media
          SET runtime = ${details.runtime},
              genre_ids = COALESCE(genre_ids, ${genreIds})
          WHERE id = ${movie.id}
        `;

        updated++;
        if (updated % 50 === 0) {
          console.log(`Progress: ${i + 1}/${moviesResult.rows.length} (${updated} updated, ${failed} failed)`);
        }
      } else {
        console.log(`No runtime for "${movie.title}" (${movie.tmdb_id})`);
        failed++;
      }
    } catch (error) {
      console.error(`Failed to fetch "${movie.title}" (${movie.tmdb_id}):`, error.message);
      failed++;
    }
  }

  console.log(`\nMovies complete: ${updated} updated, ${failed} failed`);

  // Now do TV shows
  console.log('\nFetching TV shows missing runtime...');

  const tvResult = await sql`
    SELECT id, tmdb_id, title
    FROM media
    WHERE media_type = 'tv'
      AND runtime IS NULL
    ORDER BY id
  `;

  console.log(`Found ${tvResult.rows.length} TV shows missing runtime`);

  let tvUpdated = 0;
  let tvFailed = 0;

  for (let i = 0; i < tvResult.rows.length; i++) {
    const show = tvResult.rows[i];

    try {
      const details = await fetchTVDetails(show.tmdb_id);

      // TV shows have episode_run_time array
      let runtime = null;
      if (details.episode_run_time && details.episode_run_time.length > 0) {
        runtime = Math.round(
          details.episode_run_time.reduce((a, b) => a + b, 0) / details.episode_run_time.length
        );
      }

      let genreIds = null;
      if (details.genres && details.genres.length > 0) {
        genreIds = details.genres.map(g => g.id).join(',');
      }

      if (runtime || genreIds) {
        await sql`
          UPDATE media
          SET runtime = COALESCE(${runtime}, runtime),
              genre_ids = COALESCE(genre_ids, ${genreIds})
          WHERE id = ${show.id}
        `;
        tvUpdated++;
      }

      if ((tvUpdated + tvFailed) % 50 === 0) {
        console.log(`Progress: ${i + 1}/${tvResult.rows.length} (${tvUpdated} updated, ${tvFailed} failed)`);
      }
    } catch (error) {
      console.error(`Failed to fetch "${show.title}" (${show.tmdb_id}):`, error.message);
      tvFailed++;
    }
  }

  console.log(`\nTV shows complete: ${tvUpdated} updated, ${tvFailed} failed`);
  console.log(`\nTotal: ${updated + tvUpdated} updated, ${failed + tvFailed} failed`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
