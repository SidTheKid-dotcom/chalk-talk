'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Participant, Room, RoomEvent } from 'livekit-client';
import { type OverlayState, parseOverlayState, slideTitle } from '@/lib/deck/commands';

type CoachView = {
  status: string;
  slideId: string | null;
  slideTitle: string | null;
  seq: string | null;
  overlay: OverlayState | null;
};

function findAgent(room: Room): Participant | undefined {
  for (const participant of room.remoteParticipants.values()) {
    if (participant.isAgent) {
      return participant;
    }
  }
  return undefined;
}

function viewFromAgent(agent: Participant | undefined, status: string): CoachView {
  const slideId = agent?.attributes.current_slide ?? null;
  const overlay = parseOverlayState(agent?.attributes.overlay_state);
  const overlayForSlide =
    overlay && slideId && overlay.slide_id === slideId
      ? overlay
      : overlay && !slideId
        ? overlay
        : null;
  return {
    status,
    slideId,
    slideTitle: slideTitle(slideId),
    seq: agent?.attributes.slide_seq ?? null,
    overlay: overlayForSlide,
  };
}

function CoachJoin() {
  const searchParams = useSearchParams();
  const roomName = searchParams.get('room');
  const [view, setView] = useState<CoachView>({
    status: 'connecting',
    slideId: null,
    slideTitle: null,
    seq: null,
    overlay: null,
  });

  useEffect(() => {
    if (!roomName) {
      setView((current) => ({ ...current, status: 'error: missing room' }));
      return;
    }

    const room = new Room();
    let cancelled = false;
    let statusText = 'connecting';

    const refresh = (status?: string) => {
      if (cancelled) {
        return;
      }
      if (status) {
        statusText = status;
      }
      setView(viewFromAgent(findAgent(room), statusText));
    };

    async function join() {
      try {
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'coach', room: roomName }),
        });
        if (!response.ok) {
          if (!cancelled) {
            setView((current) => ({ ...current, status: `error: ${response.status}` }));
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
        refresh(`connected as ${details.participantName} in ${details.roomName}`);
      } catch (error) {
        if (!cancelled) {
          setView((current) => ({
            ...current,
            status: `error: ${error instanceof Error ? error.message : 'join failed'}`,
          }));
        }
      }
    }

    const onAttrs = () => refresh();
    room.on(RoomEvent.ParticipantConnected, onAttrs);
    room.on(RoomEvent.ParticipantAttributesChanged, onAttrs);

    void join();
    return () => {
      cancelled = true;
      room.off(RoomEvent.ParticipantConnected, onAttrs);
      room.off(RoomEvent.ParticipantAttributesChanged, onAttrs);
      void room.disconnect();
    };
  }, [roomName]);

  const highlights = view.overlay?.highlights?.length
    ? view.overlay.highlights.join(', ')
    : '(none)';

  return (
    <div data-testid="coach-deck" style={{ padding: 24, fontFamily: 'monospace' }}>
      <p>{view.status}</p>
      <p>slide: {view.slideTitle ?? view.slideId ?? '(none)'}</p>
      <p>seq: {view.seq ?? '(none)'}</p>
      <p>highlights: {highlights}</p>
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense fallback={<p>loading</p>}>
      <CoachJoin />
    </Suspense>
  );
}
