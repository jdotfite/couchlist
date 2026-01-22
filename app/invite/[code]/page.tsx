'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  Clock,
  Play,
  PauseCircle,
  XCircle,
  Heart,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';

interface InviteDetails {
  inviter: {
    id: number;
    name: string;
    image: string | null;
  };
  sharedLists: string[];
  expiresAt: string;
  isExpired: boolean;
  isUsed: boolean;
  isOwnInvite: boolean;
  status: string;
}

const listConfig: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  watchlist: {
    label: 'Watchlist',
    icon: <Clock className="w-5 h-5 text-blue-500" />,
    description: 'Movies & shows you want to watch',
  },
  watching: {
    label: 'Watching',
    icon: <Play className="w-5 h-5 text-green-500" />,
    description: 'Currently in progress',
  },
  finished: {
    label: 'Watched',
    icon: <CheckCircle2 className="w-5 h-5 text-brand-primary" />,
    description: 'Completed movies & shows',
  },
  onhold: {
    label: 'On Hold',
    icon: <PauseCircle className="w-5 h-5 text-yellow-500" />,
    description: 'Paused for later',
  },
  dropped: {
    label: 'Dropped',
    icon: <XCircle className="w-5 h-5 text-red-500" />,
    description: 'Stopped watching',
  },
  favorites: {
    label: 'Favorites',
    icon: <Heart className="w-5 h-5 text-pink-500" />,
    description: 'Your all-time favorites',
  },
  rewatch: {
    label: 'Rewatch',
    icon: <RotateCcw className="w-5 h-5 text-cyan-500" />,
    description: 'Worth watching again',
  },
  nostalgia: {
    label: 'Classics',
    icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    description: 'Nostalgic favorites',
  },
};

const allListTypes = ['watchlist', 'watching', 'finished', 'onhold', 'dropped', 'favorites', 'rewatch', 'nostalgia'];

export default function InviteAcceptPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [duplicatesCount, setDuplicatesCount] = useState(0);

  useEffect(() => {
    fetchInviteDetails();
  }, [code]);

  useEffect(() => {
    // Pre-select the lists that the inviter suggested
    if (invite?.sharedLists) {
      setSelectedLists(invite.sharedLists);
    }
  }, [invite?.sharedLists]);

  const fetchInviteDetails = async () => {
    try {
      const response = await fetch(`/api/collaborators/invite/${code}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load invite');
        return;
      }

      setInvite(data);
    } catch (err) {
      setError('Failed to load invite details');
    } finally {
      setLoading(false);
    }
  };

  const toggleList = (listType: string) => {
    setSelectedLists(prev =>
      prev.includes(listType)
        ? prev.filter(l => l !== listType)
        : [...prev, listType]
    );
  };

  const handleAccept = async () => {
    if (selectedLists.length === 0) {
      setError('Please select at least one list to share');
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/collaborators/accept/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lists: selectedLists,
          mergeItems: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invite');
        return;
      }

      setDuplicatesCount(data.duplicatesCount || 0);
      setAccepted(true);

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setError('Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  // Loading state
  if (loading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin-fast text-gray-400" />
      </div>
    );
  }

  // Not logged in
  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mb-6">
          <Users className="w-8 h-8 text-brand-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">You've been invited!</h1>
        <p className="text-gray-400 mb-8 text-center">
          Log in or create an account to accept this invitation.
        </p>
        <div className="flex gap-3">
          <Link
            href={`/login?callbackUrl=/invite/${code}`}
            className="px-6 py-3 bg-brand-primary hover:bg-brand-primary-light rounded-full font-semibold transition"
          >
            Log In
          </Link>
          <Link
            href={`/register?callbackUrl=/invite/${code}`}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-full font-semibold transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !invite) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Invalid Invite</h1>
        <p className="text-gray-400 mb-8 text-center">{error}</p>
        <Link
          href="/"
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-full font-semibold transition"
        >
          Go Home
        </Link>
      </div>
    );
  }

  // Invite expired
  if (invite?.isExpired) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-8 h-8 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Invite Expired</h1>
        <p className="text-gray-400 mb-8 text-center">
          This invite link has expired. Ask {invite.inviter.name} to send a new one.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-full font-semibold transition"
        >
          Go Home
        </Link>
      </div>
    );
  }

  // Invite already used
  if (invite?.isUsed) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Already Accepted</h1>
        <p className="text-gray-400 mb-8 text-center">
          This invite has already been accepted.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-full font-semibold transition"
        >
          Go Home
        </Link>
      </div>
    );
  }

  // Own invite
  if (invite?.isOwnInvite) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">This is your invite</h1>
        <p className="text-gray-400 mb-8 text-center">
          You can't accept your own invite. Share this link with someone else!
        </p>
        <Link
          href="/settings/collaborators"
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-full font-semibold transition"
        >
          Manage Collaborations
        </Link>
      </div>
    );
  }

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">You're connected!</h1>
        <p className="text-gray-400 mb-4 text-center">
          You and {invite?.inviter.name} are now sharing lists.
        </p>
        {duplicatesCount > 0 && (
          <p className="text-sm text-brand-primary mb-4 text-center">
            {duplicatesCount} item{duplicatesCount !== 1 ? 's' : ''} you both had will appear once in your shared lists.
          </p>
        )}
        <p className="text-sm text-gray-500">Redirecting to your library...</p>
      </div>
    );
  }

  // Main accept form
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
            {invite?.inviter.image ? (
              <img src={invite.inviter.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">
                {invite?.inviter.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {invite?.inviter.name} invited you!
          </h1>
          <p className="text-gray-400">
            Collaborate on your movie & TV lists together.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* List selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Choose lists to share</h2>
          <p className="text-sm text-gray-400 mb-4">
            Both of you will see and be able to edit items in shared lists.
          </p>

          <div className="space-y-2">
            {allListTypes.map(listType => {
              const config = listConfig[listType];
              const isSelected = selectedLists.includes(listType);
              const isSuggested = invite?.sharedLists.includes(listType);

              return (
                <button
                  key={listType}
                  onClick={() => toggleList(listType)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition ${
                    isSelected
                      ? 'bg-brand-primary/10 border-brand-primary'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                    isSelected
                      ? 'bg-brand-primary border-brand-primary'
                      : 'border-zinc-600'
                  }`}>
                    {isSelected && <Check className="w-4 h-4" />}
                  </div>
                  {config.icon}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{config.label}</span>
                      {isSuggested && (
                        <span className="text-xs bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded">
                          Suggested
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8">
          <h3 className="font-medium mb-2">What happens when you accept?</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Your existing items will be merged into shared lists</li>
            <li>• Both of you can add and remove items</li>
            <li>• Each item shows who added it</li>
            <li>• Ratings stay personal to each person</li>
          </ul>
        </div>

        {/* Accept button */}
        <button
          onClick={handleAccept}
          disabled={accepting || selectedLists.length === 0}
          className="w-full py-4 bg-brand-primary hover:bg-brand-primary-light disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-full font-bold transition flex items-center justify-center gap-2"
        >
          {accepting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin-fast text-gray-400" />
              Accepting...
            </>
          ) : (
            <>
              <Users className="w-5 h-5" />
              Accept Invitation
            </>
          )}
        </button>

        {/* Skip link */}
        <div className="text-center mt-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-400">
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}
