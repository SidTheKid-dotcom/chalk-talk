'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConnectionState, type RemoteParticipant, Room, RoomEvent, Track } from 'livekit-client';
import { RoomAudioRenderer } from '@livekit/components-react';
import { ScaledSlide } from '@/components/deck/ScaledSlide';
import { SlideView } from '@/components/deck/SlideView';
import { HardwoodStage } from '@/components/hardwood/HardwoodStage';
import { JoinPanel } from '@/components/hardwood/JoinPanel';
import { SlidePush } from '@/components/hardwood/SlidePush';
import { VideoRail } from '@/components/hardwood/VideoRail';
import { usePlayMotion } from '@/hooks/usePlayMotion';
import { type CoachBoard, coachBoardFromAgent, emptyCoachBoard } from '@/lib/coach-board';
import { type CoachBriefing, bindCoachBriefing, parseCoachBriefing } from '@/lib/coach-briefing';
import { slideTitle } from '@/lib/deck/commands';
import { deck, getSlide } from '@/lib/deck/load';
import type { AgentState, CutoutCredit, TargetId } from '@/lib/deck/types';
import { INSECURE_MEDIA_REASON, type PrimedMedia, primeLocalMedia } from '@/lib/media-join';
import { agentStateLabel } from '@/lib/player';

const MIC_FAILURE = 'Microphone blocked or missing. You can still watch the board.';
const CAMERA_FAILURE = 'Camera blocked or missing. Voice still works.';

type CoachSessionProps = {
  credits: CutoutCredit[];
  jrImageSrc: string | null;
};

function findAgent(room: Room): RemoteParticipant | undefined {
  for (const participant of room.remoteParticipants.values()) {
    if (participant.isAgent) {
      return participant;
    }
  }
  return undefined;
}

function connectionLabel(state: ConnectionState): string {
  if (state === ConnectionState.Connected) return 'Connected';
  if (state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting) {
    return 'Reconnecting';
  }
  if (state === ConnectionState.Connecting) return 'Connecting';
  return 'Disconnected';
}

function modeLabel(mode: string | null): string {
  if (mode === 'clicker') return 'Clicker';
  if (mode === 'presenter') return 'Presenter';
  return '—';
}

export function CoachSession({ credits, jrImageSrc }: CoachSessionProps) {
  return (
    <Suspense fallback={<CoachGate title="Head coach" body="Opening the film session." />}>
      <CoachJoin credits={credits} jrImageSrc={jrImageSrc} />
    </Suspense>
  );
}

function CoachJoin({ credits, jrImageSrc }: CoachSessionProps) {
  const searchParams = useSearchParams();
  const roomName = searchParams.get('room');
  const [primed, setPrimed] = useState<PrimedMedia | null>(null);
  const [joining, setJoining] = useState(false);
  const [gateError, setGateError] = useState<string | null>(
    roomName ? null : 'This coach link is missing a room.'
  );

  async function handleJoin() {
    setJoining(true);
    const next = await primeLocalMedia();
    if (!next.mic && next.reason === INSECURE_MEDIA_REASON) {
      setGateError(next.reason);
      setJoining(false);
      return;
    }
    setPrimed(next);
  }

  if (!roomName) {
    return (
      <CoachGate title="Head coach" body={gateError ?? 'This coach link is missing a room.'} />
    );
  }

  if (!primed) {
    return (
      <div className="lobby-shell">
        <ScaledSlide portraitHint={false}>
          <HardwoodStage topic="HEAD COACH" showCredits={false} showCameraReserve={false}>
            <div className="flex h-full items-center justify-center">
              <JoinPanel
                kicker="Head coach · same room"
                title="You're in, Coach"
                body="Tap join so this phone can use the mic and camera. You will see the same board as the film room."
                note="Allow both prompts. If the page is http, the phone will block media — wait for an https QR."
                actionLabel={joining ? 'Asking for mic' : 'Join as coach'}
                isStarting={joining}
                error={gateError}
                onJoin={() => void handleJoin()}
              />
            </div>
          </HardwoodStage>
        </ScaledSlide>
      </div>
    );
  }

  return (
    <CoachLive roomName={roomName} credits={credits} jrImageSrc={jrImageSrc} primed={primed} />
  );
}

function CoachLive({
  roomName,
  credits,
  jrImageSrc,
  primed,
}: CoachSessionProps & { roomName: string; primed: PrimedMedia }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connection, setConnection] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [board, setBoard] = useState<CoachBoard>(emptyCoachBoard);
  const [briefing, setBriefing] = useState<CoachBriefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micFailure, setMicFailure] = useState<string | null>(primed.mic ? null : primed.reason);
  const [cameraFailure, setCameraFailure] = useState<string | null>(
    primed.camera ? null : (primed.reason ?? CAMERA_FAILURE)
  );
  const [audioBlocked, setAudioBlocked] = useState(false);
  const boardRef = useRef(board);
  boardRef.current = board;

  useEffect(() => {
    const next = new Room();
    let cancelled = false;
    setRoom(next);
    setConnection(ConnectionState.Connecting);

    const refreshBoard = () => {
      if (cancelled) return;
      const attributes = findAgent(next)?.attributes;
      const updated = coachBoardFromAgent(boardRef.current, attributes);
      boardRef.current = updated;
      setBoard(updated);
      const fromAttribute = parseCoachBriefing(attributes?.coach_briefing ?? '');
      if (fromAttribute) setBriefing(fromAttribute);
    };
    const refreshConnection = (state: ConnectionState) => {
      if (!cancelled) setConnection(state);
    };
    const refreshMic = () => {
      if (cancelled) return;
      const publication = next.localParticipant.getTrackPublication(Track.Source.Microphone);
      setMicOn(Boolean(publication && !publication.isMuted));
    };
    const refreshCamera = () => {
      if (cancelled) return;
      setCameraOn(next.localParticipant.isCameraEnabled);
    };
    const refreshAudio = () => {
      if (!cancelled) setAudioBlocked(!next.canPlaybackAudio);
    };

    const unbindBriefing = bindCoachBriefing(next, (value) => {
      if (!cancelled) setBriefing(value);
    });

    next.on(RoomEvent.ConnectionStateChanged, refreshConnection);
    next.on(RoomEvent.ParticipantConnected, refreshBoard);
    next.on(RoomEvent.ParticipantDisconnected, refreshBoard);
    next.on(RoomEvent.ParticipantAttributesChanged, refreshBoard);
    next.on(RoomEvent.TrackMuted, refreshMic);
    next.on(RoomEvent.TrackUnmuted, refreshMic);
    next.on(RoomEvent.LocalTrackPublished, refreshMic);
    next.on(RoomEvent.LocalTrackUnpublished, refreshMic);
    next.on(RoomEvent.TrackMuted, refreshCamera);
    next.on(RoomEvent.TrackUnmuted, refreshCamera);
    next.on(RoomEvent.LocalTrackPublished, refreshCamera);
    next.on(RoomEvent.LocalTrackUnpublished, refreshCamera);
    next.on(RoomEvent.AudioPlaybackStatusChanged, refreshAudio);

    async function join() {
      try {
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'coach', room: roomName }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          if (!cancelled) setError(body?.error ?? `Could not join (${response.status}).`);
          return;
        }
        const details = (await response.json()) as {
          serverUrl: string;
          participantToken: string;
        };
        await next.connect(details.serverUrl, details.participantToken);
        if (cancelled) {
          await next.disconnect();
          return;
        }
        refreshBoard();
        refreshConnection(next.state);
        try {
          await next.startAudio();
        } catch {
          if (!cancelled) setAudioBlocked(true);
        }
        refreshAudio();
        if (primed.mic) {
          try {
            await next.localParticipant.setMicrophoneEnabled(true);
            refreshMic();
            if (!cancelled) setMicFailure(null);
          } catch {
            if (!cancelled) {
              setMicFailure(MIC_FAILURE);
              setMicOn(false);
            }
          }
        }
        if (primed.camera) {
          try {
            await next.localParticipant.setCameraEnabled(true);
            refreshCamera();
            if (!cancelled) setCameraFailure(null);
          } catch {
            if (!cancelled) {
              setCameraFailure(CAMERA_FAILURE);
              setCameraOn(false);
            }
          }
        }
      } catch (joinError) {
        if (!cancelled) {
          setError(joinError instanceof Error ? joinError.message : 'Could not join the room.');
        }
      }
    }

    void join();
    return () => {
      cancelled = true;
      unbindBriefing();
      next.off(RoomEvent.ConnectionStateChanged, refreshConnection);
      next.off(RoomEvent.ParticipantConnected, refreshBoard);
      next.off(RoomEvent.ParticipantDisconnected, refreshBoard);
      next.off(RoomEvent.ParticipantAttributesChanged, refreshBoard);
      next.off(RoomEvent.TrackMuted, refreshMic);
      next.off(RoomEvent.TrackUnmuted, refreshMic);
      next.off(RoomEvent.LocalTrackPublished, refreshMic);
      next.off(RoomEvent.LocalTrackUnpublished, refreshMic);
      next.off(RoomEvent.TrackMuted, refreshCamera);
      next.off(RoomEvent.TrackUnmuted, refreshCamera);
      next.off(RoomEvent.LocalTrackPublished, refreshCamera);
      next.off(RoomEvent.LocalTrackUnpublished, refreshCamera);
      next.off(RoomEvent.AudioPlaybackStatusChanged, refreshAudio);
      void next.disconnect();
      setRoom(null);
    };
  }, [primed.camera, primed.mic, roomName]);

  async function toggleMic() {
    if (!room) return;
    try {
      await room.localParticipant.setMicrophoneEnabled(!micOn);
      setMicFailure(null);
    } catch {
      setMicFailure(MIC_FAILURE);
    }
  }

  async function toggleCamera() {
    if (!room) return;
    try {
      await room.localParticipant.setCameraEnabled(!cameraOn);
      setCameraFailure(null);
    } catch {
      setCameraFailure(CAMERA_FAILURE);
    }
  }

  async function enableAudio() {
    if (!room) return;
    try {
      await room.startAudio();
      setAudioBlocked(!room.canPlaybackAudio);
    } catch {
      setAudioBlocked(true);
    }
  }

  if (error && connection !== ConnectionState.Connected) {
    return <CoachGate title="Head coach" body={error} />;
  }

  const status = agentStateLabel(board.agentState ?? undefined);
  const askedText = briefing && briefing.asked.length > 0 ? briefing.asked.join('\n') : '—';
  const nowOn = slideTitle(board.slideId) ?? slideTitle(briefing?.currentSlide ?? null) ?? '—';
  const briefText = briefing?.summary || 'Waiting for the private briefing.';

  return (
    <div
      className="coach-shell"
      data-coach-page
      data-connection={connection}
      data-agent-mode={board.mode ?? ''}
      data-slide-id={board.slideId ?? ''}
    >
      {room ? <RoomAudioRenderer room={room} /> : null}
      {room ? <VideoRail room={room} /> : null}
      <header className="coach-top">
        <span className="coach-mark" aria-hidden />
        <p className="coach-private">Head coach · private</p>
        <p className="coach-connection" data-connection-label>
          {connectionLabel(connection)}
        </p>
        <div className={`pill ${pillClass(status)}`} data-state-pill={status}>
          <span className="dot" />
          {status === '—' ? 'Waiting' : status}
        </div>
      </header>
      <div className="coach-body">
        <div className="coach-stage-wrap">
          <div className="coach-stage-shell">
            <ScaledSlide portraitHint={false}>
              <CoachStage
                board={board}
                credits={credits}
                jrImageSrc={jrImageSrc}
                status={status}
                notice={micFailure}
              />
            </ScaledSlide>
          </div>
        </div>
        <aside className="coach-side" data-coach-briefing>
          <h1 className="coach-brief-title">Before you take over</h1>
          <BriefingField label="Brief" text={briefText} />
          <BriefingField label="Main worry" text={briefing?.mainWorry || '—'} highlight />
          <BriefingField label="Topics" text={askedText} />
          <BriefingField label="Now on" text={nowOn} />
          {board.mode === 'clicker' || board.mode === 'presenter' ? (
            <p className="coach-mode" data-mode-label>
              {modeLabel(board.mode)}
            </p>
          ) : null}
        </aside>
      </div>
      <footer className="coach-controls" data-coach-controls>
        {audioBlocked ? (
          <button type="button" data-coach-audio onClick={() => void enableAudio()}>
            Enable audio
          </button>
        ) : null}
        <button
          type="button"
          data-coach-camera
          data-live={cameraOn && !cameraFailure ? '1' : '0'}
          aria-pressed={cameraOn}
          title={cameraFailure ?? undefined}
          onClick={() => void toggleCamera()}
        >
          {cameraFailure ? 'Retry camera' : cameraOn ? 'Camera on' : 'Camera off'}
        </button>
        <button
          type="button"
          data-coach-mic
          data-live={micOn && !micFailure ? '1' : '0'}
          aria-pressed={micOn}
          title={micFailure ?? undefined}
          onClick={() => void toggleMic()}
        >
          {micFailure ? 'Retry mic' : micOn ? 'Mic on' : 'Mic off'}
        </button>
        <a className="photo-credits-link" href="/lab/credits">
          Photo credits
        </a>
      </footer>
    </div>
  );
}

function CoachStage({
  board,
  credits,
  jrImageSrc,
  status,
  notice,
}: {
  board: CoachBoard;
  credits: CutoutCredit[];
  jrImageSrc: string | null;
  status: AgentState;
  notice: string | null;
}) {
  const slide = board.slideId ? getSlide(board.slideId) : null;
  const motion = usePlayMotion(
    slide?.diagram,
    board.play?.play_id ?? null,
    board.play?.seq ?? null,
    board.playAnimate,
    board.agentState === 'speaking'
  );

  if (!slide || !board.slideId) {
    return (
      <HardwoodStage
        status={status}
        notice={notice}
        topic="WAITING FOR THE BOARD"
        showCredits={false}
        showCameraReserve={false}
      >
        <div className="flex h-full items-center justify-center">
          <p className="font-inter m-0 text-[24px] text-[var(--ink-2)]">Waiting for the board.</p>
        </div>
      </HardwoodStage>
    );
  }

  return (
    <HardwoodStage
      slide={slide}
      status={status}
      notice={notice}
      showCredits={false}
      showCameraReserve={false}
    >
      <SlidePush slideId={board.slideId} seq={board.seq}>
        <SlideView
          deck={deck}
          slide={slide}
          credits={credits}
          highlights={board.highlights as TargetId[]}
          arrows={motion.arrows}
          markerOverrides={motion.markers}
          ball={motion.ball}
          playCaption={motion.caption}
          playId={board.play?.play_id ?? null}
          callouts={board.callouts}
          jrImageSrc={jrImageSrc}
          animate={board.playAnimate}
        />
      </SlidePush>
    </HardwoodStage>
  );
}

function BriefingField({
  label,
  text,
  highlight = false,
}: {
  label: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div className="coach-field" data-briefing-field={label}>
      <p className="coach-field-label">
        <span className={highlight ? 'coach-field-mark' : undefined}>{label}</span>
      </p>
      <p className="coach-field-text">{text}</p>
    </div>
  );
}

function pillClass(state: AgentState): string {
  if (state === 'Speaking') return 'speaking';
  if (state === 'Thinking') return 'thinking';
  if (state === 'Listening') return 'listening';
  return 'idle';
}

function CoachGate({ title, body }: { title: string; body: string }) {
  return (
    <div className="coach-shell" data-coach-page>
      <header className="coach-top">
        <span className="coach-mark" aria-hidden />
        <p className="coach-private">{title}</p>
      </header>
      <div className="coach-gate">
        <p className="font-inter">{body}</p>
      </div>
    </div>
  );
}
