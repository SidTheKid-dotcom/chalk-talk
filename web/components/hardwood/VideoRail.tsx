'use client';

import { useEffect, useRef } from 'react';
import { type Room, Track } from 'livekit-client';
import { useHumanTiles } from '@/hooks/useHumanTiles';
import type { HumanTile } from '@/lib/video-rail';

function cameraTrack(room: Room, identity: string) {
  const participant =
    identity === room.localParticipant.identity
      ? room.localParticipant
      : room.remoteParticipants.get(identity);
  const publication = participant?.getTrackPublication(Track.Source.Camera);
  if (!publication || publication.isMuted || !publication.track) return undefined;
  return publication.track;
}

function CameraFeed({
  track,
  mirror,
}: {
  track: NonNullable<ReturnType<typeof cameraTrack>>;
  mirror: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);

  return (
    <video
      ref={ref}
      className={mirror ? 'camera-feed is-local' : 'camera-feed'}
      muted
      playsInline
      autoPlay
    />
  );
}

function Tile({ tile, room }: { tile: HumanTile; room: Room }) {
  const track = tile.cameraOn ? cameraTrack(room, tile.identity) : undefined;
  return (
    <div
      className="camera-tile is-live"
      data-camera-tile={tile.role}
      data-identity={tile.identity}
      data-speaking={tile.speaking ? '1' : '0'}
      data-camera-on={track ? '1' : '0'}
    >
      {track ? (
        <CameraFeed track={track} mirror={tile.local} />
      ) : (
        <span className="camera-fallback">{tile.name.slice(0, 1)}</span>
      )}
      <span className="camera-caption">{tile.name}</span>
    </div>
  );
}

export function VideoRail({ room }: { room: Room }) {
  const tiles = useHumanTiles(room);
  if (tiles.length === 0) return null;
  return (
    <div className="video-rail-dock" data-video-rail>
      <div className="video-rail">
        {tiles.map((tile) => (
          <Tile key={tile.identity} tile={tile} room={room} />
        ))}
      </div>
    </div>
  );
}
