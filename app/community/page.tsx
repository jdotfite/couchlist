'use client';

import { Users, MessageCircle, Trophy, Bell } from 'lucide-react';
import ProfileMenu from '@/components/ProfileMenu';

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <ProfileMenu />
          <h1 className="text-2xl font-bold">Community</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Coming Soon Hero */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-[#8b5ef4] to-[#5a30c0] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Community Coming Soon</h2>
            <p className="text-purple-100 text-sm">
              Connect with other movie and TV enthusiasts, share your lists, and discover what others are watching.
            </p>
          </div>
        </section>

        {/* Feature Preview */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">What's Coming</h2>
          <div className="space-y-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Follow Friends</h3>
                <p className="text-sm text-gray-400">
                  Follow your friends and see what they're watching in real-time.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start gap-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Shared Lists</h3>
                <p className="text-sm text-gray-400">
                  Create and share curated lists with the community.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Watch Challenges</h3>
                <p className="text-sm text-gray-400">
                  Join community challenges and compete with friends.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start gap-4">
              <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Activity Feed</h3>
                <p className="text-sm text-gray-400">
                  Stay updated with what's trending in your network.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Lists Preview (Placeholder) */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Popular Lists</h2>
          <div className="space-y-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 opacity-60">
              <h3 className="font-semibold mb-1">Best Sci-Fi of All Time</h3>
              <p className="text-sm text-gray-400">by @moviebuff • 50 items</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 opacity-60">
              <h3 className="font-semibold mb-1">Must-Watch Horror Movies</h3>
              <p className="text-sm text-gray-400">by @scaryfilms • 35 items</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 opacity-60">
              <h3 className="font-semibold mb-1">Top 10 Comedies 2025</h3>
              <p className="text-sm text-gray-400">by @laughoutloud • 10 items</p>
            </div>
          </div>
        </section>

        {/* Notify Me */}
        <section className="mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <h3 className="font-semibold mb-2">Be the First to Know</h3>
            <p className="text-sm text-gray-400 mb-4">
              We'll notify you when community features are ready.
            </p>
            <button className="bg-[#8b5ef4] hover:bg-[#7040e0] text-white px-6 py-2 rounded-full font-semibold text-sm transition">
              Notify Me
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
