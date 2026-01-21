'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Simple cache to avoid refetching on every mount
let cachedImage: string | null = null;
let cacheUserId: string | null = null;
let fetchPromise: Promise<string | null> | null = null;

export function useProfileImage() {
  const { data: session, status } = useSession();
  const [profileImage, setProfileImage] = useState<string | null>(cachedImage);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      setIsLoading(false);
      return;
    }

    // If we have a cached image for the current user, use it
    if (cacheUserId === session.user.id && cachedImage !== null) {
      setProfileImage(cachedImage);
      setIsLoading(false);
      return;
    }

    // If a fetch is already in progress, wait for it
    if (fetchPromise && cacheUserId === session.user.id) {
      fetchPromise.then((image) => {
        setProfileImage(image);
        setIsLoading(false);
      });
      return;
    }

    // Fetch the profile image
    cacheUserId = session.user.id;
    fetchPromise = fetch('/api/users/profile-image')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        const image = data?.profileImage || null;
        cachedImage = image;
        return image;
      })
      .catch(() => null)
      .finally(() => {
        fetchPromise = null;
      });

    fetchPromise.then((image) => {
      setProfileImage(image);
      setIsLoading(false);
    });
  }, [status, session?.user?.id]);

  // Function to update the cache when image changes
  const updateProfileImage = (newImage: string | null) => {
    cachedImage = newImage;
    setProfileImage(newImage);
  };

  // Function to clear the cache (useful on logout)
  const clearCache = () => {
    cachedImage = null;
    cacheUserId = null;
    fetchPromise = null;
  };

  return {
    profileImage,
    isLoading,
    updateProfileImage,
    clearCache,
  };
}
