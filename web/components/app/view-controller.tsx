'use client';

import { useEffect, useRef, useState } from 'react';
import { useAgent, useSessionContext, useSessionMessages } from '@livekit/components-react';
import { WelcomeView } from '@/components/app/welcome-view';
import { SlideView } from '@/components/deck/SlideView';
import { useDeckCommands } from '@/hooks/useDeckCommands';
import { isSlideId } from '@/lib/deck/commands';
import { deck, getSlide } from '@/lib/deck/load';
import type { CutoutCredit, TargetId } from '@/lib/deck/types';
import { agentStateLabel, agentTurnCount, latestAgentLine } from '@/lib/player';

const MIC_FAILURE = 'Microphone blocked or missing. Allow mic access and reload.';

type Phase = 'ready' | 'starting' | 'active' | 'ended';

interface ViewControllerProps {
  credits: CutoutCredit[];
  jrImageSrc: string | null;
}

export function ViewController({ credits, jrImageSrc }: ViewControllerProps) {
  const session = useSessionContext();
  const agent = useAgent();
  const commands = useDeckCommands();
  const { messages, send, isSending } = useSessionMessages(session);
  const [phase, setPhase] = useState<Phase>('ready');
  const [micFailure, setMicFailure] = useState<string | null>(null);
  const [startFailure, setStartFailure] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [sendFailure, setSendFailure] = useState<string | null>(null);

  useEffect(() => {
    if (phase === 'active' && agent.isFinished) {
      setPhase('ended');
    }
  }, [agent.isFinished, phase]);

  async function startSession() {
    setPhase('starting');
    setStartFailure(null);
    setSendFailure(null);

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
      setPhase('active');
    } catch (error) {
      await session.end().catch(() => undefined);
      setStartFailure(error instanceof Error ? error.message : 'Unable to start the film session.');
      setPhase('ready');
    }
  }

  async function endSession() {
    await session.end().catch(() => undefined);
    setPhase('ended');
  }

  async function restartSession() {
    await session.end().catch(() => undefined);
    setPhase('ready');
    await startSession();
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
    return <EndedView onRestart={() => void restartSession()} />;
  }

  if (!commands.currentSlideId || !isSlideId(commands.currentSlideId)) {
    return (
      <SessionPaper
        eyebrow="Film room"
        title="Setting the board"
        body="The assistant coach is joining and preparing the first sheet."
        notice={micFailure}
      />
    );
  }

  const slide = getSlide(commands.currentSlideId);
  const status = agentStateLabel(agent.state);
  const caption = latestAgentLine(messages);
  const turn = String(agentTurnCount(messages)).padStart(2, '0');
  const highlights = commands.highlights as TargetId[];
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

  async function submitQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text || isSending) return;
    try {
      setSendFailure(null);
      await send(text);
      setQuestion('');
    } catch (error) {
      setSendFailure(error instanceof Error ? error.message : 'Question could not be sent.');
    }
  }

  return (
    <div className="flex h-svh min-h-0 flex-col bg-[var(--manila)]">
      <ScaledSlide>
        <SlideView
          deck={deck}
          slide={slide}
          credits={credits}
          highlights={highlights}
          captionText={caption}
          status={{ state: status, turn }}
          notice={micFailure}
          jrImageSrc={jrImageSrc}
          animate
          shot
        />
      </ScaledSlide>
      <form
        className="player-command-bar relative z-20 flex min-h-[62px] items-center gap-2 border-t-2 border-[var(--ink)] bg-[var(--sheet)] px-3 py-2 sm:px-5"
        onSubmit={submitQuestion}
      >
        <button
          type="button"
          disabled={Boolean(micFailure)}
          onClick={() => void toggleMicrophone()}
          className="font-archivo min-h-11 shrink-0 border border-[var(--blue)] px-3 text-[12px] text-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {micFailure ? 'Mic unavailable' : microphoneOn ? 'Mic on' : 'Mic off'}
        </button>
        <label className="sr-only" htmlFor="player-question">
          Ask the assistant coach
        </label>
        <input
          id="player-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask the assistant coach"
          className="font-courier min-h-11 min-w-0 flex-1 border border-[var(--ink-2)] bg-transparent px-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-2)]"
        />
        <button
          type="submit"
          disabled={isSending || question.trim().length === 0}
          className="font-archivo min-h-11 shrink-0 bg-[var(--blue)] px-4 text-[12px] text-[var(--sheet)] disabled:opacity-55"
        >
          {isSending ? 'Sending' : 'Ask'}
        </button>
        <button
          type="button"
          onClick={() => void endSession()}
          className="font-archivo hidden min-h-11 shrink-0 px-3 text-[12px] text-[var(--rust)] underline sm:block"
        >
          End session
        </button>
        {sendFailure ? (
          <p className="font-courier absolute right-4 bottom-full mb-2 bg-[var(--sheet)] px-2 py-1 text-[12px] text-[var(--rust)]">
            {sendFailure}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function ScaledSlide({ children }: { children: React.ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const resize = () => {
      setScale(Math.min(frame.clientWidth / 1920, frame.clientHeight / 1080));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="relative min-h-0 flex-1 overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 h-[1080px] w-[1920px] origin-center"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

function EndedView({ onRestart }: { onRestart: () => void }) {
  return (
    <SessionPaper
      eyebrow="Session closed"
      title="The film session ended."
      body="Start a fresh room when you are ready to continue."
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
