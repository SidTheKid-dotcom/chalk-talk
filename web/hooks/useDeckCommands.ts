'use client';

import { useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import {
  type DeckCommandState,
  initialDeckState,
  stateFromAgentAttributes,
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
  stateRef.current = state;

  useEffect(() => {
    const unbind = bindDeckRpc(
      room,
      () => stateRef.current,
      (next) => {
        stateRef.current = next;
        setState(next);
      }
    );
    return unbind;
  }, [room]);

  useEffect(() => {
    const seedFromAgent = () => {
      const agent = findAgentParticipant(room);
      if (!agent) {
        return;
      }
      const seeded = stateFromAgentAttributes(agent.attributes);
      if (seeded.lastAppliedSeq < stateRef.current.lastAppliedSeq) {
        return;
      }
      stateRef.current = seeded;
      setState(seeded);
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
