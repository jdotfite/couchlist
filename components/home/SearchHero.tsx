'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';

export default function SearchHero() {
  return (
    <Link
      href="/search?focus=1"
      className="card card-interactive block w-full mb-6 group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-zinc-800 group-hover:bg-zinc-700 rounded-full flex items-center justify-center transition">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1">
          <p className="text-gray-400 text-sm">What would you like to watch?</p>
          <p className="text-xs text-gray-500">Search movies & TV shows to add to a list</p>
        </div>
      </div>
    </Link>
  );
}
