'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Room } from 'livekit-client';

function CoachJoin() {
  const searchParams = useSearchParams();
  const roomName = searchParams.get('room');
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    if (!roomName) {
      setStatus('error: missing room');
      return;
    }

    const room = new Room();
    let cancelled = false;

    async function join() {
      try {
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'coach', room: roomName }),
        });
        if (!response.ok) {
          if (!cancelled) {
            setStatus(`error: ${response.status}`);
          }
          return;
        }

        const details = (await response.json()) as {
          serverUrl: string;
          roomName: string;
          participantName: string;
          participantToken: string;
        };
        await room.connect(details.serverUrl, details.participantToken);
        if (!cancelled) {
          setStatus(`connected as ${details.participantName} in ${details.roomName}`);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(`error: ${error instanceof Error ? error.message : 'join failed'}`);
        }
      }
    }

    void join();
    return () => {
      cancelled = true;
      void room.disconnect();
    };
  }, [roomName]);

  return <p>{status}</p>;
}

export default function CoachPage() {
  return (
    <Suspense fallback={<p>loading</p>}>
      <CoachJoin />
    </Suspense>
  );
}
