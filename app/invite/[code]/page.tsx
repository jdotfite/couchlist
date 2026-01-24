'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  UserPlus,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { ListShareSelector, type ListOption } from '@/components/sharing/ListShareSelector';

type InviteType = 'partner' | 'friend' | 'collaboration';

interface BaseInviteDetails {
  type: InviteType;
  ownerName: string;
  ownerImage: string | null;
  expiresAt: string;
}

interface PartnerInviteDetails extends BaseInviteDetails {
  type: 'partner';
}

interface FriendInviteDetails extends BaseInviteDetails {
  type: 'friend';
}

interface CollaborationInviteDetails extends BaseInviteDetails {
  type: 'collaboration';
  inviter: {
    id: number;
    name: string;
    image: string | null;
  };
  sharedLists: string[];
  isExpired: boolean;
  isUsed: boolean;
  isOwnInvite: boolean;
  status: string;
}

type InviteDetails = PartnerInviteDetails | FriendInviteDetails | CollaborationInviteDetails;

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
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get('type') as InviteType | null;
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [duplicatesCount, setDuplicatesCount] = useState(0);

  // Friend list sharing state
  const [showListSelection, setShowListSelection] = useState(false);
  const [friendUserId, setFriendUserId] = useState<number | null>(null);
  const [availableLists, setAvailableLists] = useState<ListOption[]>([]);
  const [selectedShareLists, setSelectedShareLists] = useState<string[]>([]);
  const [savingSharedLists, setSavingSharedLists] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  useEffect(() => {
    fetchInviteDetails();
  }, [code, typeFromUrl]);

  useEffect(() => {
    // Pre-select the lists that the inviter suggested (for collaboration type)
    if (invite && 'sharedLists' in invite && invite.sharedLists) {
      setSelectedLists(invite.sharedLists);
    }
  }, [invite]);

  const fetchInviteDetails = async () => {
    try {
      // Determine which endpoint to call based on URL type param
      let endpoint = `/api/collaborators/invite/${code}`;

      if (typeFromUrl === 'partner') {
        endpoint = `/api/partners/invite/${code}`;
      } else if (typeFromUrl === 'friend') {
        endpoint = `/api/friends/invite/${code}`;
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load invite');
        return;
      }

      // Normalize the response based on type
      if (typeFromUrl === 'partner') {
        setInvite({
          type: 'partner',
          ownerName: data.ownerName,
          ownerImage: data.ownerImage,
          expiresAt: data.expiresAt,
        });
      } else if (typeFromUrl === 'friend') {
        setInvite({
          type: 'friend',
          ownerName: data.ownerName,
          ownerImage: data.ownerImage,
          expiresAt: data.expiresAt,
        });
      } else {
        // Legacy collaboration type
        setInvite({
          type: 'collaboration',
          ownerName: data.inviter?.name,
          ownerImage: data.inviter?.image,
          expiresAt: data.expiresAt,
          inviter: data.inviter,
          sharedLists: data.sharedLists,
          isExpired: data.isExpired,
          isUsed: data.isUsed,
          isOwnInvite: data.isOwnInvite,
          status: data.status,
        });
      }
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
    if (!invite) return;

    // For collaboration type, require at least one list
    if (invite.type === 'collaboration' && selectedLists.length === 0) {
      setError('Please select at least one list to share');
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      let endpoint = `/api/collaborators/accept/${code}`;
      let body: Record<string, unknown> = {};

      if (invite.type === 'partner') {
        endpoint = `/api/partners/accept/${code}`;
      } else if (invite.type === 'friend') {
        endpoint = `/api/friends/accept/${code}`;
      } else {
        body = {
          lists: selectedLists,
          mergeItems: true,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invite');
        return;
      }

      setDuplicatesCount(data.duplicatesCount || 0);
      setAccepted(true);

      // For friend invites, show list selection step
      if (invite.type === 'friend' && data.friendUserId) {
        setFriendUserId(data.friendUserId);
        // Fetch available lists
        await fetchAvailableLists(data.friendUserId);
        setShowListSelection(true);
        return; // Don't redirect yet
      }

      // Redirect after a short delay for other types
      setTimeout(() => {
        if (invite.type === 'partner') {
          router.push('/partner-lists');
        } else {
          router.push('/');
        }
      }, 2000);
    } catch (err) {
      setError('Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  const fetchAvailableLists = async (friendId: number) => {
    try {
      const response = await fetch(`/api/friends/${friendId}/shared`);
      const data = await response.json();
      if (response.ok && data.availableLists) {
        setAvailableLists(data.availableLists);
      }
    } catch (err) {
      console.error('Failed to fetch available lists:', err);
    }
  };

  const handleSaveSharedLists = async () => {
    if (!friendUserId) return;

    setSavingSharedLists(true);

    try {
      // Save selected lists to share with this friend
      const lists = selectedShareLists.map(listType => ({
        listType,
        listId: null,
        canEdit: false,
      }));

      const response = await fetch(`/api/friends/${friendUserId}/shared`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists }),
      });

      if (!response.ok) {
        console.error('Failed to save shared lists');
      }

      // Optionally save as default
      if (saveAsDefault && selectedShareLists.length > 0) {
        const defaultLists = selectedShareLists.map(listType => ({
          listType,
          listId: null,
          shareByDefault: true,
        }));

        await fetch('/api/list-visibility/defaults', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lists: defaultLists }),
        });
      }

      // Redirect to profile/sharing
      router.push('/settings/sharing');
    } catch (err) {
      console.error('Failed to save shared lists:', err);
      router.push('/settings/sharing');
    } finally {
      setSavingSharedLists(false);
    }
  };

  const handleSkipListSelection = () => {
    router.push('/settings/sharing');
  };

  // Loading state
  if (loading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Not logged in
  if (authStatus === 'unauthenticated') {
    const inviteTypeLabel = typeFromUrl === 'partner' ? 'partner' : typeFromUrl === 'friend' ? 'friend' : 'collaboration';
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
          typeFromUrl === 'partner' ? 'bg-pink-500/20' : typeFromUrl === 'friend' ? 'bg-blue-500/20' : 'bg-brand-primary/20'
        }`}>
          {typeFromUrl === 'partner' ? (
            <Heart className="w-8 h-8 text-pink-500" />
          ) : typeFromUrl === 'friend' ? (
            <UserPlus className="w-8 h-8 text-blue-500" />
          ) : (
            <Users className="w-8 h-8 text-brand-primary" />
          )}
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">You've been invited!</h1>
        <p className="text-gray-400 mb-8 text-center">
          Log in or create an account to accept this {inviteTypeLabel} invitation.
        </p>
        <div className="flex gap-3">
          <Link
            href={`/login?callbackUrl=/invite/${code}${typeFromUrl ? `?type=${typeFromUrl}` : ''}`}
            className="px-6 py-3 bg-brand-primary hover:bg-brand-primary-light rounded-full font-semibold transition"
          >
            Log In
          </Link>
          <Link
            href={`/register?callbackUrl=/invite/${code}${typeFromUrl ? `?type=${typeFromUrl}` : ''}`}
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

  // Check for expired/used/own invite (collaboration type only)
  if (invite?.type === 'collaboration') {
    const collabInvite = invite as CollaborationInviteDetails;

    if (collabInvite.isExpired) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invite Expired</h1>
          <p className="text-gray-400 mb-8 text-center">
            This invite link has expired. Ask {collabInvite.inviter.name} to send a new one.
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

    if (collabInvite.isUsed) {
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

    if (collabInvite.isOwnInvite) {
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
            href="/settings/sharing"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-full font-semibold transition"
          >
            Manage Sharing
          </Link>
        </div>
      );
    }
  }

  // Success state - Friend with list selection
  if (accepted && invite?.type === 'friend' && showListSelection) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto pt-8">
          {/* Success header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">You're friends with {invite.ownerName}!</h1>
            <p className="text-gray-400">
              Now choose which lists {invite.ownerName} can see.
            </p>
          </div>

          {/* List selection */}
          <div className="mb-6">
            <ListShareSelector
              lists={availableLists}
              selectedLists={selectedShareLists}
              onSelectionChange={setSelectedShareLists}
              title={`Share your lists with ${invite.ownerName}`}
              description="They'll be able to browse items in your selected lists."
              showItemCounts={true}
            />
          </div>

          {/* Save as default checkbox */}
          <label className="flex items-center gap-3 p-4 bg-zinc-900 rounded-lg mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsDefault}
              onChange={(e) => setSaveAsDefault(e.target.checked)}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-brand-primary focus:ring-brand-primary focus:ring-offset-0"
            />
            <div>
              <p className="font-medium text-white">Save as my default</p>
              <p className="text-sm text-gray-400">Use these settings for future friends</p>
            </div>
          </label>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSaveSharedLists}
              disabled={savingSharedLists}
              className="w-full py-4 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-full font-bold transition flex items-center justify-center gap-2"
            >
              {savingSharedLists ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : selectedShareLists.length > 0 ? (
                <>
                  <Eye className="w-5 h-5" />
                  Share {selectedShareLists.length} List{selectedShareLists.length !== 1 ? 's' : ''}
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  Continue Without Sharing
                </>
              )}
            </button>

            <button
              onClick={handleSkipListSelection}
              className="w-full py-3 text-gray-400 hover:text-white transition text-sm"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state - Other types
  if (accepted) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {invite?.type === 'partner' ? "You're partners!" :
           invite?.type === 'friend' ? "You're friends!" : "You're connected!"}
        </h1>
        <p className="text-gray-400 mb-4 text-center">
          {invite?.type === 'partner' ? (
            <>You and {invite?.ownerName} can now share lists and track what you watch together.</>
          ) : invite?.type === 'friend' ? (
            <>You and {invite?.ownerName} can now send each other suggestions.</>
          ) : (
            <>You and {invite?.ownerName} are now sharing lists.</>
          )}
        </p>
        {duplicatesCount > 0 && invite?.type === 'collaboration' && (
          <p className="text-sm text-brand-primary mb-4 text-center">
            {duplicatesCount} item{duplicatesCount !== 1 ? 's' : ''} you both had will appear once in your shared lists.
          </p>
        )}
        <p className="text-sm text-gray-500">Redirecting...</p>
      </div>
    );
  }

  // Partner invite accept form
  if (invite?.type === 'partner') {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto pt-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden bg-gradient-to-br from-pink-500 to-rose-500">
              {invite.ownerImage ? (
                <img src={invite.ownerImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {invite.ownerName?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {invite.ownerName} wants to be your partner!
            </h1>
            <p className="text-gray-400">
              Partners share lists bidirectionally and can track shows watched together.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Info box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              What partners can do
            </h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Create shared lists just for the two of you</li>
              <li>• Mark shows as "Watched Together"</li>
              <li>• See each other's watch progress</li>
              <li>• You can only have one partner at a time</li>
            </ul>
          </div>

          {/* Accept button */}
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-4 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-full font-bold transition flex items-center justify-center gap-2"
          >
            {accepting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                Accepting...
              </>
            ) : (
              <>
                <Heart className="w-5 h-5" />
                Accept Partner Invite
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

  // Friend invite accept form
  if (invite?.type === 'friend') {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto pt-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500">
              {invite.ownerImage ? (
                <img src={invite.ownerImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {invite.ownerName?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {invite.ownerName} wants to be friends!
            </h1>
            <p className="text-gray-400">
              Friends can send each other movie and TV show suggestions.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Info box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-500" />
              What friends can do
            </h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Send you suggestions that appear as notifications</li>
              <li>• You can accept or dismiss suggestions</li>
              <li>• Accepted suggestions show who recommended them</li>
              <li>• Your lists stay private - no automatic sharing</li>
            </ul>
          </div>

          {/* Accept button */}
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-4 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-full font-bold transition flex items-center justify-center gap-2"
          >
            {accepting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                Accepting...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Accept Friend Invite
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

  // Legacy collaboration accept form
  const collabInvite = invite as CollaborationInviteDetails;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
            {collabInvite?.inviter?.image ? (
              <img src={collabInvite.inviter.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">
                {collabInvite?.inviter?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {collabInvite?.inviter?.name} invited you!
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
              const isSuggested = collabInvite?.sharedLists?.includes(listType);

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
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
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
