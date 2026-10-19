'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import { useAgent, useSessionContext, useSessionMessages } from '@livekit/components-react';
import { WelcomeView } from '@/components/app/welcome-view';
import { PhotoCreditsLink } from '@/components/deck/PhotoCredits';
import { ScaledSlide } from '@/components/deck/ScaledSlide';
import { SlideView } from '@/components/deck/SlideView';
import { useDeckCommands } from '@/hooks/useDeckCommands';
import { usePlayMotion } from '@/hooks/usePlayMotion';
import { isSlideId } from '@/lib/deck/commands';
import { deck, getSlide } from '@/lib/deck/load';
import type { AgentState, CutoutCredit, TargetId } from '@/lib/deck/types';
import {
  agentStateLabel,
  agentTurnCount,
  decidePlayerPhase,
  isLiveAgentState,
  latestAgentLine,
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
  const { messages } = useSessionMessages(session);
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
  const turnCount = agentTurnCount(messages);

  if (!commands.currentSlideId || !isSlideId(commands.currentSlideId)) {
    return (
      <div className="relative flex h-svh min-h-0 flex-col bg-[var(--manila)]">
        <MobileSessionMeta state={status} turn={turnCount} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 px-6">
          <p className="font-archivo m-0 text-[13px] tracking-[0.16em] text-[var(--blue)] uppercase">
            {status} · turn {String(turnCount).padStart(2, '0')}
          </p>
          <p className="font-courier m-0 text-center text-[15px] text-[var(--ink-2)]">
            Waiting for the first sheet.
          </p>
          {micFailure ? (
            <p className="font-courier m-0 max-w-md border-l-4 border-[var(--rust)] pl-4 text-[14px] text-[var(--rust)]">
              {micFailure}
            </p>
          ) : null}
        </div>
        {sessionControls}
      </div>
    );
  }

  const caption = latestAgentLine(messages);
  const turn = String(turnCount).padStart(2, '0');
  const highlights = commands.highlights as TargetId[];
  return (
    <PlayerSlide
      credits={credits}
      jrImageSrc={jrImageSrc}
      slideId={commands.currentSlideId}
      highlights={highlights}
      playId={commands.play?.play_id ?? null}
      playSeq={commands.play?.seq ?? null}
      playAnimate={commands.playAnimate}
      callouts={commands.callouts}
      caption={caption}
      status={status}
      turn={turn}
      notice={micFailure}
      controls={sessionControls}
    />
  );
}

function PlayerSlide({
  credits,
  jrImageSrc,
  slideId,
  highlights,
  playId,
  playSeq,
  playAnimate,
  callouts,
  caption,
  status,
  turn,
  notice,
  controls,
}: {
  credits: CutoutCredit[];
  jrImageSrc: string | null;
  slideId: string;
  highlights: TargetId[];
  playId: string | null;
  playSeq: number | null;
  playAnimate: boolean;
  callouts: ReturnType<typeof useDeckCommands>['callouts'];
  caption: string | null;
  status: AgentState;
  turn: string;
  notice: string | null;
  controls: ReactNode;
}) {
  const slide = getSlide(slideId as Parameters<typeof getSlide>[0]);
  const motion = usePlayMotion(slide.diagram, playId, playSeq, playAnimate);
  return (
    <div className="relative flex h-svh min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--manila)]">
      <MobileSessionMeta state={status} turn={Number(turn)} />
      <ScaledSlide>
        <SlideView
          deck={deck}
          slide={slide}
          credits={credits}
          highlights={highlights}
          arrows={motion.arrows}
          markerOverrides={motion.markers}
          ball={motion.ball}
          playCaption={motion.caption}
          callouts={callouts}
          captionText={caption ?? undefined}
          status={{ state: status, turn }}
          notice={notice}
          jrImageSrc={jrImageSrc}
          animate
          shot
        />
      </ScaledSlide>
      {controls}
    </div>
  );
}

function MobileSessionMeta({ state, turn }: { state: string; turn: number }) {
  return (
    <div className="player-mobile-meta flex items-center justify-between gap-3 border-b-2 border-[var(--ink)] bg-[var(--ink)] px-3 py-2 sm:hidden">
      <p className="font-archivo m-0 min-h-11 text-[13px] leading-[44px] tracking-wide text-[var(--sheet)]">
        {state} · turn {String(turn).padStart(2, '0')}
      </p>
      <PhotoCreditsLink />
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
        data-player-mic
        disabled={Boolean(micFailure)}
        onClick={() => void toggleMicrophone()}
        className="font-archivo min-h-11 shrink-0 border border-[var(--blue)] bg-[var(--sheet)] px-3 text-[12px] text-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {micFailure ? 'Mic unavailable' : microphoneOn ? 'Mic on' : 'Mic off'}
      </button>
      <button
        type="button"
        data-player-end
        onClick={() => void endSession()}
        className="font-archivo min-h-11 shrink-0 bg-[var(--sheet)] px-3 text-[12px] text-[var(--rust)] underline"
      >
        End session
      </button>
    </div>
  );
}

function EndedView({ notice, onRestart }: { notice?: string | null; onRestart: () => void }) {
  return (
    <SessionPaper
      eyebrow="Session closed"
      title="The film session ended."
      body="Start a fresh room when you are ready to continue."
      notice={notice}
      action="Restart session"
      onAction={onRestart}
    />
  );
}

function SessionPaper({
  eyebrow,
  title,
  body,
  notice,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  body: string;
  notice?: string | null;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="desk flex h-svh items-center justify-center p-5 sm:p-10">
      <section className="sheet relative z-10 w-full max-w-3xl px-7 py-10 sm:px-12 sm:py-14">
        <p className="font-archivo m-0 text-[12px] tracking-[0.16em] text-[var(--blue)] uppercase">
          {eyebrow}
        </p>
        <h1 className="font-fraunces mt-4 mb-0 text-[44px] text-[var(--ink)] sm:text-[64px]">
          {title}
        </h1>
        <p className="font-courier mt-5 max-w-xl text-[15px] leading-7 text-[var(--ink-2)] sm:text-[17px]">
          {body}
        </p>
        {notice ? (
          <p className="font-courier mt-5 border-l-4 border-[var(--rust)] pl-4 text-[14px] text-[var(--rust)]">
            {notice}
          </p>
        ) : null}
        {action && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="font-archivo mt-7 min-h-11 bg-[var(--blue)] px-6 text-[13px] text-[var(--sheet)]"
          >
            {action}
          </button>
        ) : null}
        <span className="stamp font-archivo absolute top-7 right-7 text-[12px]">Game 7</span>
      </section>
    </div>
  );
}
