import { CoachBriefing, coachJump } from '@/components/deck/CoachBriefing';
import { MotionDemo } from '@/components/deck/MotionDemo';
import { PrimitivesGallery } from '@/components/deck/PrimitivesGallery';
import { SlideView } from '@/components/deck/SlideView';
import { loadCutoutCredits, resolveJrImageSrc } from '@/lib/deck/credits.server';
import { deck, firstSentence, getPlay, getSlide } from '@/lib/deck/load';
import { playFrame } from '@/lib/deck/plays';
import type { PlayId, SlideId, TargetId } from '@/lib/deck/types';

const SLIDE_IDS = new Set<SlideId>(deck.slides.map((slide) => slide.id));
const PLAY_IDS = new Set<PlayId>(deck.plays.map((play) => play.id));

type LabPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
      <div className="flex min-h-screen justify-center bg-[var(--manila)]">
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

  if (slideId && SLIDE_IDS.has(slideId as SlideId)) {
    const slide = getSlide(slideId as SlideId);
    const play = playId && PLAY_IDS.has(playId as PlayId) ? getPlay(playId as PlayId) : undefined;
    const frame = play && slide.diagram ? playFrame(slide.diagram, play) : undefined;
    return (
      <SlideView
        deck={deck}
        slide={slide}
        credits={credits}
        highlight={highlight}
        arrows={frame?.arrows}
        markerOverrides={frame?.markers}
        ball={frame?.ball}
        jrImageSrc={jrImageSrc}
        forceMissingCutout={fallback === 'cutout'}
        forceMissingJr={fallback === 'jr'}
        revealJr={highlight === 'k_jr_card' || fallback === 'jr'}
        animate={param(query.animate) === '1'}
        shot={shot || true}
      />
    );
  }

  return (
    <div className="desk">
      <header className="px-10 pt-10">
        <p className="font-archivo m-0 text-[13px] tracking-wide text-[var(--blue)] uppercase">
          Lab
        </p>
        <h1 className="font-fraunces mt-2 text-[56px]">Scouting packet</h1>
        <p className="font-courier max-w-2xl text-[16px] text-[var(--ink-2)]">
          Every slide is drawn from deck JSON. Open a slide, the coach view, or the primitives.
        </p>
        <nav className="font-archivo mt-4 flex flex-wrap gap-4 text-[14px]">
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
          <a className="underline" href="/lab/credits">
            Photo credits
          </a>
        </nav>
      </header>
      <div className="flex flex-col gap-12 px-6 py-10">
        {deck.slides.map((slide) => (
          <div key={slide.id} className="origin-top scale-[0.72]" style={{ width: 1920 }}>
            <SlideView deck={deck} slide={slide} credits={credits} jrImageSrc={jrImageSrc} shot />
          </div>
        ))}
      </div>
      <PrimitivesGallery credits={credits} jrImageSrc={jrImageSrc} />
    </div>
  );
}
