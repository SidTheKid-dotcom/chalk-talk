'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import { useAgent, useSessionContext } from '@livekit/components-react';
import { WelcomeView } from '@/components/app/welcome-view';
import { PhotoCreditsLink } from '@/components/deck/PhotoCredits';
import { ScaledSlide } from '@/components/deck/ScaledSlide';
import { SlideView } from '@/components/deck/SlideView';
import { CoachLinkCard } from '@/components/hardwood/CoachLinkCard';
import { HardwoodStage } from '@/components/hardwood/HardwoodStage';
import { JoinPanel } from '@/components/hardwood/JoinPanel';
import { SlidePush } from '@/components/hardwood/SlidePush';
import { useCoachLink } from '@/hooks/useCoachLink';
import { useDeckCommands } from '@/hooks/useDeckCommands';
import { usePlayMotion } from '@/hooks/usePlayMotion';
import { isSlideId } from '@/lib/deck/commands';
import { deck, getSlide } from '@/lib/deck/load';
import type { AgentState, CutoutCredit, TargetId } from '@/lib/deck/types';
import {
  agentStateLabel,
  decidePlayerPhase,
  isLiveAgentState,
  startupFailureMessage,
} from '@/lib/player';

const MIC_FAILURE = 'Microphone blocked or missing. Allow mic access and reload.';

const STARTUP_TIMEOUT_MS = 30_000;

interface ViewControllerProps {
  credits: CutoutCredit[];
  jrImageSrc: string | null;
}

export function ViewController({ credits, jrImageSrc }: ViewControllerProps) {
  const session = useSessionContext();
  const agent = useAgent();
  const commands = useDeckCommands();
  const coachUrl = useCoachLink();
  const coachLink = coachUrl ? <CoachLinkCard url={coachUrl} /> : null;
  const [phase, setPhase] = useState<'ready' | 'starting' | 'active' | 'ended'>('ready');
  const [micFailure, setMicFailure] = useState<string | null>(null);
  const [startFailure, setStartFailure] = useState<string | null>(null);
  const [roomConnected, setRoomConnected] = useState(session.room.state === 'connected');
  const endedRef = useRef(false);
  const phaseRef = useRef(phase);
  const agentWasLiveRef = useRef(false);
  phaseRef.current = phase;
  if (isLiveAgentState(agent.state)) {
    agentWasLiveRef.current = true;
  }

  useEffect(() => {
    const room = session.room;
    const onConnected = () => setRoomConnected(true);
    const onDisconnected = () => setRoomConnected(false);
    if (room.state === 'connected') setRoomConnected(true);
    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [session.room]);

  useEffect(() => {
    if (phase !== 'starting' && phase !== 'active') return;
    const decision = decidePlayerPhase({
      phase,
      hasSlide: Boolean(commands.currentSlideId && isSlideId(commands.currentSlideId)),
      agentState: agent.state,
      agentFinished: agent.isFinished,
      roomConnected,
      agentWasLive: agentWasLiveRef.current,
    });
    if (decision.phase === phase) return;
    if (decision.disconnect && !endedRef.current) {
      endedRef.current = true;
      void session.end().catch(() => undefined);
      if (phase === 'starting') {
        setStartFailure(startupFailureMessage('agent'));
      }
    }
    setPhase(decision.phase);
  }, [agent.isFinished, agent.state, commands.currentSlideId, phase, roomConnected, session]);

  useEffect(() => {
    if (phase !== 'starting') return;
    const timeout = window.setTimeout(() => {
      if (endedRef.current || phaseRef.current !== 'starting') return;
      endedRef.current = true;
      void session.end().catch(() => undefined);
      setStartFailure(startupFailureMessage('timeout'));
      setPhase('ended');
    }, STARTUP_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [phase, session]);

  async function startSession() {
    endedRef.current = false;
    agentWasLiveRef.current = isLiveAgentState(agent.state);
    setPhase('starting');
    setStartFailure(null);

    let microphoneEnabled = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia is unavailable');
      }
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((track) => track.stop());
      setMicFailure(null);
    } catch {
      microphoneEnabled = false;
      setMicFailure(MIC_FAILURE);
    }

    try {
      await session.start({
        tracks: {
          microphone: {
            enabled: microphoneEnabled,
            publishOptions: { preConnectBuffer: true },
          },
        },
      });
      if (endedRef.current) return;
      setPhase((current) => (current === 'ended' ? current : 'active'));
    } catch (error) {
      if (endedRef.current) return;
      if (phaseRef.current === 'active' || phaseRef.current === 'ended') return;
      await session.end().catch(() => undefined);
      setStartFailure(error instanceof Error ? error.message : 'Unable to start the film session.');
      setPhase('ready');
    }
  }

  async function endSession() {
    endedRef.current = true;
    await session.end().catch(() => undefined);
    setPhase('ended');
  }

  async function restartSession() {
    endedRef.current = true;
    await session.end().catch(() => undefined);
    setPhase('ready');
    await startSession();
  }

  const microphoneOn = Boolean(
    session.local.microphoneTrack && !session.local.microphoneTrack.publication.isMuted
  );

  async function toggleMicrophone() {
    try {
      await session.room.localParticipant.setMicrophoneEnabled(!microphoneOn);
      setMicFailure(null);
    } catch {
      setMicFailure(MIC_FAILURE);
    }
  }

  if (phase === 'ready' || phase === 'starting') {
    return (
      <WelcomeView
        isStarting={phase === 'starting'}
        error={startFailure}
        onStartCall={() => void startSession()}
      />
    );
  }

  if (phase === 'ended') {
    return <EndedView notice={startFailure} onRestart={() => void restartSession()} />;
  }

  const sessionControls = (
    <SessionControls
      microphoneOn={microphoneOn}
      micFailure={micFailure}
      toggleMicrophone={toggleMicrophone}
      endSession={endSession}
    />
  );

  const status = agentStateLabel(agent.state);

  if (!commands.currentSlideId || !isSlideId(commands.currentSlideId)) {
    return (
      <div className="player-shell">
        <ScaledSlide
          rail={
            <>
              {coachLink}
              <PhotoCreditsLink />
              {sessionControls}
            </>
          }
        >
          <HardwoodStage
            status={status}
            notice={micFailure}
            topic="SETTING THE BOARD"
            showCredits={false}
          >
            <div className="flex h-full items-center justify-center">
              <p className="font-inter m-0 text-[24px] text-[var(--ink-2)]">
                Waiting for the first sheet.
              </p>
            </div>
          </HardwoodStage>
        </ScaledSlide>
      </div>
    );
  }

  const highlights = commands.highlights as TargetId[];
  return (
    <PlayerSlide
      credits={credits}
      jrImageSrc={jrImageSrc}
      slideId={commands.currentSlideId}
      seq={commands.lastAppliedSeq}
      highlights={highlights}
      playId={commands.play?.play_id ?? null}
      playSeq={commands.play?.seq ?? null}
      playAnimate={commands.playAnimate}
      speaking={agent.state === 'speaking'}
      callouts={commands.callouts}
      status={status}
      notice={micFailure}
      controls={sessionControls}
      coachLink={coachLink}
    />
  );
}

function PlayerSlide({
  credits,
  jrImageSrc,
  slideId,
  seq,
  highlights,
  playId,
  playSeq,
  playAnimate,
  speaking,
  callouts,
  status,
  notice,
  controls,
  coachLink,
}: {
  credits: CutoutCredit[];
  jrImageSrc: string | null;
  slideId: string;
  seq: number;
  highlights: TargetId[];
  playId: string | null;
  playSeq: number | null;
  playAnimate: boolean;
  speaking: boolean;
  callouts: ReturnType<typeof useDeckCommands>['callouts'];
  status: AgentState;
  notice: string | null;
  controls: ReactNode;
  coachLink: ReactNode;
}) {
  const slide = getSlide(slideId as Parameters<typeof getSlide>[0]);
  const motion = usePlayMotion(slide.diagram, playId, playSeq, playAnimate, speaking);
  return (
    <div className="player-shell">
      <ScaledSlide
        rail={
          <>
            {coachLink}
            <PhotoCreditsLink />
            {controls}
          </>
        }
      >
        <HardwoodStage slide={slide} status={status} notice={notice} showCredits={false}>
          <SlidePush slideId={slideId} seq={seq}>
            <SlideView
              deck={deck}
              slide={slide}
              credits={credits}
              highlights={highlights}
              arrows={motion.arrows}
              markerOverrides={motion.markers}
              ball={motion.ball}
              playCaption={motion.caption}
              playId={playId}
              callouts={callouts}
              jrImageSrc={jrImageSrc}
              animate
            />
          </SlidePush>
        </HardwoodStage>
      </ScaledSlide>
    </div>
  );
}

function SessionControls({
  microphoneOn,
  micFailure,
  toggleMicrophone,
  endSession,
}: {
  microphoneOn: boolean;
  micFailure: string | null;
  toggleMicrophone: () => Promise<void>;
  endSession: () => Promise<void>;
}) {
  return (
    <div className="player-session-controls" data-player-controls>
      <button
        type="button"
        data-player-camera
        disabled
        title="Camera tiles are reserved for the head-coach handoff"
      >
        Camera off
      </button>
      <button
        type="button"
        data-player-mic
        data-live={microphoneOn && !micFailure ? '1' : '0'}
        aria-pressed={microphoneOn}
        disabled={Boolean(micFailure)}
        onClick={() => void toggleMicrophone()}
      >
        {micFailure ? 'Mic unavailable' : microphoneOn ? 'Mic on' : 'Mic off'}
      </button>
      <button type="button" data-player-end onClick={() => void endSession()}>
        End session
      </button>
    </div>
  );
}

function EndedView({ notice, onRestart }: { notice?: string | null; onRestart: () => void }) {
  return (
    <div className="lobby-shell">
      <ScaledSlide rail={<PhotoCreditsLink />}>
        <HardwoodStage topic="SESSION CLOSED" showCredits={false}>
          <div className="flex h-full items-center justify-center">
            <JoinPanel
              kicker="Session closed"
              title="The film session ended."
              body="Start a fresh room when you are ready to continue."
              note={null}
              error={notice}
              onJoin={onRestart}
              actionLabel="Restart session"
            />
          </div>
        </HardwoodStage>
      </ScaledSlide>
    </div>
  );
}
