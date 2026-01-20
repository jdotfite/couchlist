'use client';

import { use } from 'react';
import MediaDetailPage from '@/components/MediaDetailPage';

export default function TVShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MediaDetailPage mediaType="tv" id={id} />;
}
