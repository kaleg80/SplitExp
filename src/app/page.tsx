'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEvent } from '@/context/EventContext';
import CreateEvent from '@/components/CreateEvent';
import Dashboard from '@/components/Dashboard';

function HomeContent() {
  const { event, loadEvent, loading } = useEvent();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Check for 'id' query param (from shared Supabase link)
    const eventId = searchParams.get('id');
    if (eventId) {
      loadEvent(eventId).then(() => {
        // Clear URL to clean it up, but keep session
        router.replace('/');
      });
    }
  }, [searchParams, loadEvent, router]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40vh' }}>Loading...</div>;
  }

  if (!event) {
    return <CreateEvent />;
  }

  return <Dashboard />;
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}
