'use client';

import { useEffect, useState } from 'react';
import { type Room, RoomEvent } from 'livekit-client';
import { type HumanSnap, type HumanTile, listHumanTiles } from '@/lib/video-rail';

const ROOM_EVENTS = [
  RoomEvent.Connected,
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
  RoomEvent.ParticipantAttributesChanged,
  RoomEvent.TrackPublished,
  RoomEvent.TrackUnpublished,
  RoomEvent.TrackSubscribed,
  RoomEvent.TrackUnsubscribed,
  RoomEvent.TrackMuted,
  RoomEvent.TrackUnmuted,
  RoomEvent.LocalTrackPublished,
  RoomEvent.LocalTrackUnpublished,
  RoomEvent.ActiveSpeakersChanged,
] as const;

function snapPeople(room: Room): HumanSnap[] {
  const speaking = new Set(
    room.activeSpeakers
      .filter((participant) => !participant.isAgent)
      .map((participant) => {
        return participant.identity;
      })
  );
  const people = [room.localParticipant, ...room.remoteParticipants.values()];
  return people.map((participant) => ({
    identity: participant.identity,
    name: participant.name,
    isAgent: participant.isAgent,
    isLocal: participant.isLocal,
    isSpeaking: speaking.has(participant.identity) || participant.isSpeaking,
    attributes: { ...participant.attributes },
    cameraOn: participant.isCameraEnabled,
  }));
}

export function useHumanTiles(room: Room | null | undefined): HumanTile[] {
  const [tiles, setTiles] = useState<HumanTile[]>([]);

  useEffect(() => {
    if (!room) {
      setTiles([]);
      return;
    }
    const refresh = () => {
      setTiles(listHumanTiles(snapPeople(room), room.localParticipant.identity));
    };
    refresh();
    for (const event of ROOM_EVENTS) {
      room.on(event, refresh);
    }
    return () => {
      for (const event of ROOM_EVENTS) {
        room.off(event, refresh);
      }
    };
  }, [room]);

  return tiles;
}
