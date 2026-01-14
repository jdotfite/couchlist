# Seenit - TV Show & Movie Tracker

A modern web application to track TV shows and movies you've watched, built with Next.js 14+, TypeScript, and Tailwind CSS.

## Features

- 🎬 Search for movies and TV shows using the TMDb API
- 📝 Track what you've watched
- ⭐ Rate and review your content
- 🎨 Modern, responsive UI with Tailwind CSS
- 🚀 Fast performance with Next.js App Router

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **API**: [The Movie Database (TMDb)](https://www.themoviedb.org/documentation/api)
- **HTTP Client**: [Axios](https://axios-http.com/)

## Project Structure

```
seenit/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   └── search/        # Search endpoint
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/            # React components
├── lib/                  # Utility functions
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

### Installation

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd seenit
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
   TMDB_API_KEY=your_tmdb_api_key_here
   ```

   Get your free TMDb API key:
   - Go to [https://www.themoviedb.org/signup](https://www.themoviedb.org/signup)
   - Create an account
   - Request an API key from Settings > API

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000) (or port 3001 if 3000 is in use)

## Available Scripts

- `npm run dev` - Start development server
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
