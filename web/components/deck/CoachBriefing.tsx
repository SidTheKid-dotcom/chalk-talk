import { HalfCourt } from '@/components/deck/HalfCourt';
import { BinderClip } from '@/components/deck/Paperclip';
import { Stamp } from '@/components/deck/Stamp';
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
    <div className="flex min-h-[844px] w-[390px] flex-col bg-[var(--manila)] text-[var(--ink)]">
      <header className="flex min-h-11 items-center gap-3 bg-[var(--blue)] px-4 text-[var(--sheet)]">
        <span className="h-3 w-2 bg-[var(--gold)]" aria-hidden />
        <p className="font-archivo m-0 text-[13px] tracking-[0.12em] uppercase">
          Head coach · private
        </p>
      </header>

      <p className="font-archivo mt-3 mb-2 px-4 text-[12px] tracking-wide text-[var(--ink)]">
        Live · Slide {slide.number} / 6 · {slide.title}
      </p>

      {slide.diagram ? (
        <div className="mx-4 mb-1 w-24">
          <HalfCourt deck={deck} diagram={slide.diagram} />
        </div>
      ) : null}

      <div className="relative mx-4 mt-4">
        <div className="absolute top-[-18px] left-1/2 z-10 -translate-x-1/2">
          <BinderClip />
        </div>
        <div className="note-card [transform:none] px-5 pt-8 pb-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h1 className="font-fraunces m-0 text-[34px]">Before you take over</h1>
            <Stamp label="Briefing" className="text-[16px]" />
          </div>

          <Field label="They asked" text={theyAsked} />
          <Field label="Main worry" text={mainWorry} highlight />
          <Field label="Now on" text={nowOn} />
        </div>
      </div>

      <div className="mt-auto px-4 pt-6 pb-3">
        <button
          type="button"
          className="hold-button font-archivo text-[16px] tracking-wide uppercase"
        >
          Hold to take the floor
        </button>
        <p className="mt-3 mb-0 text-center">
          <a href={jumpHref} className="font-courier text-[14px] text-[var(--ink)] underline">
            Jump to slide {jumpSlideNumber}
          </a>
        </p>
      </div>

      <p className="font-archivo px-4 pb-4 text-[12px] text-[var(--ink)]">
        — · latency — ms · interruptions —
      </p>
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
    <div className="border-b border-[var(--ink)]/20 py-3">
      <p
        className="font-archivo m-0 text-[12px] tracking-[0.06em]"
        style={{ wordSpacing: '0.2em' }}
      >
        <span className={highlight ? 'highlighter px-1' : undefined}>{label}</span>
      </p>
      <p className="font-courier mt-1 mb-0 text-[15px] leading-snug">{text}</p>
    </div>
  );
}

export function coachJump(slide: DeckSlide): { number: number; href: string } {
  const next = slide.number === 6 ? 1 : 6;
  const id = next === 1 ? 's1_tipoff' : 's6_last_two';
  return { number: next, href: `/lab?slide=${id}&shot=1` };
}
