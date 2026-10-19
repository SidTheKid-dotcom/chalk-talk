'use client';

import { useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import {
  type DeckCommandState,
  initialDeckState,
  markDeckReady,
  seedDeckFromAgent,
} from '@/lib/deck/commands';
import { bindDeckRpc } from '@/lib/deck/rpc';

export function findAgentParticipant(room: {
  remoteParticipants: Map<
    string,
    { identity: string; isAgent?: boolean; attributes: Record<string, string> }
  >;
}) {
  for (const participant of room.remoteParticipants.values()) {
    if (participant.isAgent) {
      return participant;
    }
  }
  return undefined;
}

export function useDeckCommands() {
  const room = useRoomContext();
  const [state, setState] = useState<DeckCommandState>(initialDeckState);
  const stateRef = useRef(state);
  const agentIdentityRef = useRef<string | null>(null);
  stateRef.current = state;

  useEffect(() => {
    const mounted = markDeckReady(stateRef.current);
    stateRef.current = mounted;
    setState(mounted);
    const unbind = bindDeckRpc(
      room,
      () => stateRef.current,
      (next) => {
        stateRef.current = next;
        setState(next);
      }
    );
    return () => {
      unbind();
      const unmounted = { ...stateRef.current, ready: false };
      stateRef.current = unmounted;
      setState(unmounted);
    };
  }, [room]);

  useEffect(() => {
    const seedFromAgent = () => {
      const agent = findAgentParticipant(room);
      const next = seedDeckFromAgent(stateRef.current, agentIdentityRef.current, agent);
      agentIdentityRef.current = next.agentIdentity;
      if (next.state !== stateRef.current) {
        stateRef.current = next.state;
        setState(next.state);
      }
    };

    seedFromAgent();
    room.on(RoomEvent.ParticipantConnected, seedFromAgent);
    room.on(RoomEvent.ParticipantAttributesChanged, seedFromAgent);
    return () => {
      room.off(RoomEvent.ParticipantConnected, seedFromAgent);
      room.off(RoomEvent.ParticipantAttributesChanged, seedFromAgent);
    };
  }, [room]);

  return state;
}
