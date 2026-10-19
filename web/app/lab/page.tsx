import { CoachBriefing, coachJump } from '@/components/deck/CoachBriefing';
import { MotionDemo } from '@/components/deck/MotionDemo';
import { PhotoCreditsLink } from '@/components/deck/PhotoCredits';
import { PrimitivesGallery } from '@/components/deck/PrimitivesGallery';
import { ScaledSlide } from '@/components/deck/ScaledSlide';
import { SlideView } from '@/components/deck/SlideView';
import { HardwoodStage } from '@/components/hardwood/HardwoodStage';
import { JoinPanel } from '@/components/hardwood/JoinPanel';
import { PushDemo } from '@/components/hardwood/PushDemo';
import { loadCutoutCredits, resolveJrImageSrc } from '@/lib/deck/credits.server';
import { deck, firstSentence, getPlay, getSlide } from '@/lib/deck/load';
import { playFrame, playMotionSegments } from '@/lib/deck/plays';
import type { AgentState, PlayId, SlideId, TargetId } from '@/lib/deck/types';

const SLIDE_IDS = new Set<SlideId>(deck.slides.map((slide) => slide.id));
const PLAY_IDS = new Set<PlayId>(deck.plays.map((play) => play.id));

type LabPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function frameForPlay(
  diagram: NonNullable<ReturnType<typeof getSlide>['diagram']>,
  play: ReturnType<typeof getPlay>,
  stepParam: string | undefined
) {
  const step = Number(stepParam);
  if (!stepParam || !Number.isFinite(step) || step < 1) return playFrame(diagram, play);
  const segments = playMotionSegments(diagram, play);
  const indexed = play.start ? segments.slice(1) : segments;
  const segment = indexed[Math.min(indexed.length, Math.floor(step)) - 1];
  if (!segment) return playFrame(diagram, play);
  return {
    markers: segment.to,
    arrows: segment.arrows,
    ball: segment.ball,
    caption: segment.caption,
  };
}

function LabControls() {
  return (
    <div className="player-session-controls" data-player-controls>
      <button type="button" data-player-camera disabled title="Camera tiles are reserved">
        Camera off
      </button>
      <button type="button" data-player-mic data-live="1" aria-pressed="true">
        Mic on
      </button>
      <button type="button" data-player-end>
        End session
      </button>
    </div>
  );
}

export default async function LabPage({ searchParams }: LabPageProps) {
  const query = await searchParams;
  const view = param(query.view);
  const slideId = param(query.slide);
  const highlight = param(query.highlight) as TargetId | undefined;
  const playId = param(query.play);
  const fallback = param(query.fallback);
  const shot = param(query.shot) === '1';
  const credits = loadCutoutCredits();
  const jrImageSrc = resolveJrImageSrc();

  if (view === 'coach') {
    const slide = getSlide((slideId as SlideId) || 's3_kyrie');
    const jump = coachJump(slide);
    return (
      <div className="flex min-h-screen justify-center bg-black">
        <CoachBriefing
          deck={deck}
          slide={slide}
          theyAsked={slide.title}
          mainWorry={firstSentence(slide.notes)}
          nowOn={`${slide.section}. ${slide.title}`}
          jumpSlideNumber={jump.number}
          jumpHref={jump.href}
        />
      </div>
    );
  }

  if (view === 'motion') {
    return <MotionDemo />;
  }

  if (view === 'lobby' || view === 'ended') {
    const ended = view === 'ended';
    return (
      <div className="lobby-shell">
        <ScaledSlide rail={<PhotoCreditsLink />}>
          <HardwoodStage
            vignette={!ended}
            topic={ended ? 'SESSION CLOSED' : 'FILM SESSION'}
            showCredits={false}
          >
            <div className="flex h-full items-center justify-center">
              <JoinPanel
                kicker={ended ? 'Session closed' : 'Film session · Game 7'}
                title={ended ? 'The film session ended.' : 'Chalk Talk'}
                body={
                  ended
                    ? 'Start a fresh room when you are ready to continue.'
                    : 'The assistant coach walks you through the Game 7 plan by voice. Six slides. Cut in any time.'
                }
                note={ended ? null : undefined}
                actionLabel={ended ? 'Restart session' : 'Join film session'}
              />
            </div>
          </HardwoodStage>
        </ScaledSlide>
      </div>
    );
  }

  if (view === 'push') {
    return (
      <div className="player-shell">
        <ScaledSlide rail={<PhotoCreditsLink />}>
          <PushDemo
            credits={credits}
            jrImageSrc={jrImageSrc}
            fromId={param(query.from)}
            toId={param(query.to) ?? slideId}
            rapid={param(query.rapid) === '1'}
            showCredits={false}
          />
        </ScaledSlide>
      </div>
    );
  }

  if (slideId && SLIDE_IDS.has(slideId as SlideId)) {
    const slide = getSlide(slideId as SlideId);
    const play = playId && PLAY_IDS.has(playId as PlayId) ? getPlay(playId as PlayId) : undefined;
    const frame =
      play && slide.diagram ? frameForPlay(slide.diagram, play, param(query.step)) : undefined;
    const scaled = param(query.scale) === '1';
    const status: AgentState =
      param(query.state) === 'listening'
        ? 'Listening'
        : param(query.state) === 'thinking'
          ? 'Thinking'
          : param(query.state) === 'speaking'
            ? 'Speaking'
            : '—';
    const callouts =
      param(query.callout) === 'text'
        ? [{ callout_id: 'c6', text: 'Iguodala on LeBron' }]
        : param(query.callout) === 'fact' && slide.fact_ids[0]
          ? [{ callout_id: 'c1', fact_id: slide.fact_ids[0] }]
          : [];
    const view = (
      <HardwoodStage
        slide={slide}
        status={status}
        vignette={slide.id === 's1_tipoff'}
        showCredits={!scaled}
        railExtra={scaled ? undefined : <LabControls />}
      >
        <SlideView
          deck={deck}
          slide={slide}
          credits={credits}
          highlight={highlight}
          arrows={frame?.arrows}
          markerOverrides={frame?.markers}
          ball={frame?.ball}
          playCaption={frame?.caption}
          playId={play?.id ?? null}
          callouts={callouts}
          jrImageSrc={jrImageSrc}
          forceMissingCutout={fallback === 'cutout'}
          forceMissingJr={fallback === 'jr'}
          revealJr={highlight === 'k_jr_card' || fallback === 'jr'}
          animate={param(query.animate) === '1'}
          shot={shot || true}
        />
      </HardwoodStage>
    );
    if (scaled) {
      return (
        <div className="player-shell" data-player-scale>
          <ScaledSlide
            rail={
              <>
                <PhotoCreditsLink />
                <LabControls />
              </>
            }
          >
            {view}
          </ScaledSlide>
        </div>
      );
    }
    return view;
  }

  return (
    <div className="hardwood-stage" style={{ height: 'auto', minHeight: '100vh', width: '100%' }}>
      <div className="hardwood-floor" />
      <header className="relative z-10 px-10 pt-10">
        <p className="lab m-0" style={{ color: 'var(--gold)' }}>
          Lab
        </p>
        <h1 className="slide-title mt-2 text-[72px]">Hardwood Broadcast</h1>
        <p className="font-inter max-w-2xl text-[18px] text-[var(--ink-2)]">
          Every slide is drawn from deck JSON. Open a slide, the coach view, or the primitives.
        </p>
        <nav className="font-plex mt-4 flex flex-wrap gap-4 text-[14px]">
          {deck.slides.map((slide) => (
            <a key={slide.id} className="underline" href={`/lab?slide=${slide.id}&shot=1`}>
              {slide.number}. {slide.section}
            </a>
          ))}
          <a className="underline" href="/lab?view=coach">
            Coach
          </a>
          <a className="underline" href="/lab?view=motion">
            Motion
          </a>
          <a className="underline" href="/lab?view=push">
            Push
          </a>
          <a className="underline" href="/lab/credits">
            Photo credits
          </a>
        </nav>
      </header>
      <div className="relative z-10 flex flex-col gap-12 px-6 py-10">
        {deck.slides.map((slide) => (
          <div key={slide.id} className="origin-top scale-[0.72]" style={{ width: 1920 }}>
            <HardwoodStage slide={slide}>
              <SlideView deck={deck} slide={slide} credits={credits} jrImageSrc={jrImageSrc} shot />
            </HardwoodStage>
          </div>
        ))}
      </div>
      <PrimitivesGallery credits={credits} jrImageSrc={jrImageSrc} />
    </div>
  );
}
