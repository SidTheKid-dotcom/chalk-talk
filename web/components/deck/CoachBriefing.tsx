import { HalfCourt } from '@/components/deck/HalfCourt';
import { CameraReserve } from '@/components/hardwood/CameraReserve';
import type { Deck, DeckSlide } from '@/lib/deck/types';

type CoachBriefingProps = {
  deck: Deck;
  slide: DeckSlide;
  theyAsked: string;
  mainWorry: string;
  nowOn: string;
  jumpSlideNumber: number;
  jumpHref: string;
};

export function CoachBriefing({
  deck,
  slide,
  theyAsked,
  mainWorry,
  nowOn,
  jumpSlideNumber,
  jumpHref,
}: CoachBriefingProps) {
  return (
    <div
      className="flex min-h-[844px] w-[390px] flex-col bg-[#000] text-[var(--ink)]"
      data-coach-briefing
    >
      <header className="flex min-h-11 items-center gap-3 bg-[var(--blue)] px-4">
        <span className="h-3 w-2 bg-[var(--gold)]" aria-hidden />
        <p className="font-plex m-0 text-[14px] tracking-[0.08em] text-[var(--ink)]">
          Head coach · private
        </p>
      </header>
      <p className="font-plex mt-3 mb-2 px-4 text-[14px] tracking-wide text-[var(--ink-2)]">
        Live · Slide {slide.number} / 6 · {slide.title}
      </p>
      <div className="mx-4 mb-3 flex justify-end">
        <CameraReserve />
      </div>

      {slide.diagram ? (
        <div className="mx-4 mb-3 w-[70%]">
          <HalfCourt deck={deck} diagram={slide.diagram} />
        </div>
      ) : null}

      <div className="card mx-4 mt-2 px-5 pt-6 pb-5">
        <h1 className="slide-title m-0 text-[52px]">Before you take over</h1>
        <Field label="They asked" text={theyAsked} />
        <Field label="Main worry" text={mainWorry} highlight />
        <Field label="Now on" text={nowOn} />
      </div>

      <div className="mt-auto px-4 pt-6 pb-3">
        <button type="button" className="hold-button">
          Hold to take the floor
        </button>
        <p className="mt-3 mb-0 text-center">
          <a href={jumpHref} className="font-inter text-[16px] text-[var(--ink)] underline">
            Jump to slide {jumpSlideNumber}
          </a>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  text,
  highlight = false,
}: {
  label: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div className="border-b border-[var(--card-line)] py-3">
      <p className="lab m-0">
        <span className={highlight ? 'highlighter px-1 text-[var(--hardwood-panel)]' : undefined}>
          {label}
        </span>
      </p>
      <p className="font-inter mt-1 mb-0 text-[18px] leading-snug">{text}</p>
    </div>
  );
}

export function coachJump(slide: DeckSlide): { number: number; href: string } {
  const next = slide.number === 6 ? 1 : 6;
  const id = next === 1 ? 's1_tipoff' : 's6_last_two';
  return { number: next, href: `/lab?slide=${id}&shot=1` };
}
