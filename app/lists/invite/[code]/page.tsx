'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { getIconComponent } from '@/components/custom-lists/IconPicker';
import { getColorValue } from '@/components/custom-lists/ColorPicker';

interface InviteDetails {
  list: {
    name: string;
    description: string | null;
    icon: string;
    color: string;
  };
  owner: {
    name: string;
  };
  expiresAt: string;
}

export default function CustomListInvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedList, setAcceptedList] = useState<{ slug: string; name: string } | null>(null);

  useEffect(() => {
    fetchInviteDetails();
  }, [code]);

  const fetchInviteDetails = async () => {
    try {
      const response = await fetch(`/api/custom-lists/invite/${code}`);
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

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/custom-lists/invite/${code}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invite');
        return;
      }

      setAcceptedList({ slug: data.list.slug, name: data.list.name });
      setAccepted(true);

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/lists/${data.list.slug}`);
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
          Log in or create an account to join this list.
        </p>
        <div className="flex gap-3">
          <Link
            href={`/login?callbackUrl=/lists/invite/${code}`}
            className="px-6 py-3 bg-brand-primary hover:bg-brand-primary-light rounded-full font-semibold transition"
          >
            Log In
          </Link>
          <Link
            href={`/register?callbackUrl=/lists/invite/${code}`}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-full font-semibold transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  // Error state (invalid or expired)
  if (error && !invite) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Invalid Invite</h1>
        <p className="text-gray-400 mb-8 text-center">{error}</p>
        <Link
          href="/lists"
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-full font-semibold transition"
        >
          Go to Lists
        </Link>
      </div>
    );
  }

  // Success state
  if (accepted && acceptedList) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">You're in!</h1>
        <p className="text-gray-400 mb-4 text-center">
          You've joined "{acceptedList.name}".
        </p>
        <p className="text-sm text-gray-500">Redirecting to your list...</p>
      </div>
    );
  }

  // Main accept form
  const IconComponent = invite ? getIconComponent(invite.list.icon) : null;
  const colorValue = invite ? getColorValue(invite.list.color) : '#6b7280';

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-brand-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {invite?.owner.name} invited you!
          </h1>
          <p className="text-gray-400">
            You've been invited to collaborate on a list.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* List preview */}
        {invite && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${colorValue}20` }}
              >
                {IconComponent && <IconComponent className="w-7 h-7" style={{ color: colorValue }} />}
              </div>
              <div>
                <h2 className="text-xl font-bold">{invite.list.name}</h2>
                <p className="text-sm text-gray-400">by {invite.owner.name}</p>
              </div>
            </div>
            {invite.list.description && (
              <p className="text-gray-400 text-sm mb-4">{invite.list.description}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Invite expires {new Date(invite.expiresAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8">
          <h3 className="font-medium mb-2">What happens when you join?</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• You'll see all items in this list</li>
            <li>• You can add and remove items</li>
            <li>• Each item shows who added it</li>
            <li>• You can leave the list anytime</li>
          </ul>
        </div>

        {/* Accept button */}
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full py-4 bg-brand-primary hover:bg-brand-primary-light disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-full font-bold transition flex items-center justify-center gap-2"
        >
          {accepting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin-fast text-gray-400" />
              Joining...
            </>
          ) : (
            <>
              <Users className="w-5 h-5" />
              Join List
            </>
          )}
        </button>

        {/* Skip link */}
        <div className="text-center mt-4">
          <Link href="/lists" className="text-sm text-gray-500 hover:text-gray-400">
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}
