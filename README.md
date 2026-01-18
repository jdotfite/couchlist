# FlickLog - TV Show & Movie Tracker

A Spotify-inspired web application to track TV shows and movies you've watched, built with Next.js 16, TypeScript, and Tailwind CSS.

## Features

- 🎬 Search for movies and TV shows using the TMDb API
- 📱 Mobile-first Spotify-inspired UI
- 📝 Track what you're watching, watchlist, and completed shows
- ⭐ Rate and review your content
- 🔐 User authentication with NextAuth.js
- 🎨 Modern, responsive UI with Tailwind CSS
- 🚀 Fast performance with Next.js App Router & Turbopack

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [NextAuth.js v5](https://next-auth.js.org/)
- **Database**: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- **API**: [The Movie Database (TMDb)](https://www.themoviedb.org/documentation/api)
- **HTTP Client**: [Axios](https://axios-http.com/)

## Project Structure

```
flicklog/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth routes
│   │   ├── register/      # User registration
│   │   └── search/        # Search endpoint
│   ├── add/               # Quick add page
│   ├── library/           # User library
│   ├── login/             # Login page
│   ├── register/          # Register page
│   ├── search/            # Search page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/            # React components
│   ├── BottomNav.tsx     # Mobile navigation
│   ├── SearchBar.tsx     # Search component
│   └── SearchResults.tsx # Results display
├── lib/                  # Utility functions
│   ├── auth.ts          # NextAuth configuration
│   ├── db.ts            # Database client
│   └── tmdb.ts          # TMDb API client
├── types/               # TypeScript type definitions
│   └── index.ts         # Shared types
└── public/              # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- TMDb API key (free - [get one here](https://www.themoviedb.org/settings/api))
- Vercel Postgres database (or any Postgres database)

### Installation

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd flicklog
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   
   Create a `.env.local` file in the root directory (see `.env.local.example`):
   ```env
   # TMDb API
   TMDB_ACCESS_TOKEN=your_tmdb_access_token_here
   TMDB_API_KEY=your_tmdb_api_key_here
   
   # NextAuth
   NEXTAUTH_SECRET=your_nextauth_secret_here
   NEXTAUTH_URL=http://localhost:3000
   
   # Database (Vercel Postgres)
   POSTGRES_URL=your_postgres_connection_string_here
   POSTGRES_PRISMA_URL=your_postgres_prisma_connection_string_here
   POSTGRES_URL_NON_POOLING=your_postgres_non_pooling_connection_string_here
   POSTGRES_USER=your_postgres_user_here
   POSTGRES_HOST=your_postgres_host_here
   POSTGRES_PASSWORD=your_postgres_password_here
   POSTGRES_DATABASE=your_postgres_database_here
   ```

4. **Get your TMDb API credentials**:
   - Go to [https://www.themoviedb.org/signup](https://www.themoviedb.org/signup)
   - Create an account
   - Request an API key from Settings > API
   - Get your Read Access Token (Bearer Token) - recommended

5. **Set up your database**:
   
   **Option A: Vercel Postgres (Recommended)**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Create a new Postgres database
   - Copy all the connection strings to your `.env.local`
   - The database tables will be created automatically on first run
   
   **Option B: Local Postgres**
   - Install PostgreSQL locally
   - Create a database
   - Set the `POSTGRES_URL` environment variable
   - The database tables will be created automatically on first run

6. **Generate NextAuth secret**:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output to `NEXTAUTH_SECRET` in `.env.local`

7. **Run the development server**:
   ```bash
   npm run dev
   ```

8. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Schema

The application automatically creates the following tables on first run:

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Watched Table
```sql
CREATE TABLE watched (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  media_id INTEGER NOT NULL,
  media_type TEXT NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  watched_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rating INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, media_id, media_type)
);
```

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## API Routes

### Search

`GET /api/search?query={search_term}&type={movie|tv|multi}`

Search for movies and TV shows.

**Parameters:**
- `query` (required): Search term
- `type` (optional): Filter by media type (default: `multi`)

**Example:**
```bash
curl http://localhost:3000/api/search?query=inception&type=movie
```

## Next Steps

Here are some features you might want to add:

- [ ] User authentication (NextAuth.js)
- [ ] Database integration (Prisma + PostgreSQL/MongoDB)
- [ ] Watched list with persistent storage
- [ ] Episode tracking for TV series
- [ ] Personal ratings and reviews
- [ ] Watchlist functionality
- [ ] Advanced filtering and sorting
- [ ] Social features (share lists, follow friends)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_TMDB_API_KEY` | TMDb API key (client-side) | Yes |
| `TMDB_API_KEY` | TMDb API key (server-side) | Yes |

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [TMDb API Documentation](https://developers.themoviedb.org/3)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

MIT

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.
