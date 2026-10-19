import { Caption } from '@/components/deck/Caption';
import { HalfCourt } from '@/components/deck/HalfCourt';
import { Headline } from '@/components/deck/Headline';
import { JrCard } from '@/components/deck/JrCard';
import { KalamNote } from '@/components/deck/KalamNote';
import { LowerThird } from '@/components/deck/LowerThird';
import { NoteCard } from '@/components/deck/NoteCard';
import { PhotoCreditsLink } from '@/components/deck/PhotoCredits';
import type { DrawnArrow } from '@/components/deck/PlayArrows';
import { PlayerCutout } from '@/components/deck/PlayerCutout';
import { Points } from '@/components/deck/Points';
import { Sheet } from '@/components/deck/Sheet';
import { Stamp } from '@/components/deck/Stamp';
import { StatusStrip, type StatusStripProps } from '@/components/deck/StatusStrip';
import type { OverlayCallout } from '@/lib/deck/commands';
import { creditForFile, cutoutCaption } from '@/lib/deck/credits';
import { facts, featuredFact, firstSentence } from '@/lib/deck/load';
import type { CutoutCredit, Deck, DeckSlide, PlayerId, TargetId } from '@/lib/deck/types';

export type SlideViewProps = {
  deck: Deck;
  slide: DeckSlide;
  credits: CutoutCredit[];
  highlight?: TargetId;
  highlights?: TargetId[];
  arrows?: DrawnArrow[];
  markerOverrides?: Partial<Record<PlayerId, [number, number]>>;
  ball?: PlayerId;
  jrImageSrc?: string | null;
  forceMissingCutout?: boolean;
  forceMissingJr?: boolean;
  revealJr?: boolean;
  noteFactId?: string;
  callouts?: OverlayCallout[];
  playCaption?: string | null;
  animate?: boolean;
  shot?: boolean;
  captionText?: string;
  status?: StatusStripProps;
  notice?: string | null;
};

export function SlideView({
  deck,
  slide,
  credits,
  highlight,
  highlights,
  arrows,
  markerOverrides,
  ball,
  jrImageSrc = null,
  forceMissingCutout = false,
  forceMissingJr = false,
  revealJr = false,
  noteFactId,
  callouts = [],
  playCaption = null,
  animate = false,
  shot = false,
  captionText,
  status,
  notice,
}: SlideViewProps) {
  const noteFact = noteFactId ? facts.find((fact) => fact.id === noteFactId) : featuredFact(slide);
  const caption = captionText ?? firstSentence(slide.notes);
  const activeHighlights = highlights ?? (highlight ? [highlight] : []);
  const jrCard = slide.cards.find((card) => card.id === 'k_jr_card');
  const showJr = Boolean(jrCard) && (revealJr || activeHighlights.includes('k_jr_card'));
  const hasCourt = Boolean(slide.diagram);
  const sideCutouts =
    slide.id === 's2_lebron' || slide.id === 's3_kyrie' || slide.id === 's4_offense'
      ? slide.cutouts
      : [];

  return (
    <div
      data-slide-desk
      className={`desk flex min-w-0 flex-col ${shot ? 'h-[1080px] w-[1920px] max-w-[1920px] overflow-hidden' : 'min-h-[100vh] w-full'}`}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 items-stretch overflow-hidden px-10 pt-4 pb-1">
        <Sheet className="relative flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col px-10 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <LowerThird number={slide.number} section={slide.section} />
            <Stamp animate={animate} />
          </div>

          {notice ? (
            <aside className="font-courier absolute top-5 left-1/2 z-20 max-w-[680px] -translate-x-1/2 border-l-4 border-[var(--rust)] bg-[var(--sheet)] px-4 py-2 text-[13px] text-[var(--rust)] shadow-sm">
              {notice}
            </aside>
          ) : null}

          <div className={`mt-3 min-h-0 flex-1 ${hasCourt ? 'slide-body' : 'flex flex-col'}`}>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Headline className={slide.title.length > 42 ? 'text-[42px]' : 'text-[52px]'}>
                {slide.title}
              </Headline>
              {slide.id === 's5_xfactors' ? (
                <div className="mt-5 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-10">
                  <div className="flex min-w-0 flex-col items-start">
                    <Points points={slide.points} variant="checkbox" />
                    {noteFact ? (
                      <div className="mt-7">
                        <NoteCard kind="fact" fact={noteFact} />
                      </div>
                    ) : null}
                    <CalloutStack callouts={callouts} />
                  </div>
                  <CutoutRow
                    files={slide.cutouts}
                    credits={credits}
                    size={210}
                    forceMissing={forceMissingCutout}
                  />
                </div>
              ) : (
                <div className="mt-5 max-w-[34rem]">
                  <Points
                    points={slide.points}
                    variant={
                      slide.id === 's1_tipoff' || slide.id === 's4_offense' ? 'numeral' : 'checkbox'
                    }
                  />
                  {noteFact ? (
                    <div className="mt-7">
                      <NoteCard kind="fact" fact={noteFact} />
                    </div>
                  ) : null}
                  <CalloutStack callouts={callouts} />
                </div>
              )}
              {slide.id === 's1_tipoff' ? (
                <div className="mt-auto pt-6">
                  <p className="font-archivo mb-3 text-[12px] tracking-wide text-[var(--ink-2)]">
                    Warriors vs Cavs
                  </p>
                  <CutoutRow
                    files={slide.cutouts}
                    credits={credits}
                    size={156}
                    compact
                    forceMissing={forceMissingCutout}
                    className="w-full justify-between"
                  />
                </div>
              ) : null}
            </div>

            {slide.diagram ? (
              <div className="slide-court">
                <div className="slide-court-frame">
                  {sideCutouts.length > 0 ? (
                    <div className="slide-cutouts-edge">
                      <CutoutRow
                        files={sideCutouts}
                        credits={credits}
                        size={slide.id === 's4_offense' ? 120 : 156}
                        stacked={slide.id === 's4_offense'}
                        forceMissing={forceMissingCutout}
                      />
                    </div>
                  ) : null}
                  <HalfCourt
                    deck={deck}
                    diagram={slide.diagram}
                    highlights={activeHighlights}
                    arrows={arrows}
                    markerOverrides={markerOverrides}
                    ball={ball}
                    animate={animate}
                  />
                  {playCaption ? (
                    <p className="play-caption font-kalam" data-play-caption>
                      {playCaption}
                    </p>
                  ) : null}
                  {showJr && jrCard ? (
                    <div className="absolute top-4 right-2">
                      <JrCard
                        caption={jrCard.caption}
                        imageSrc={jrImageSrc}
                        forceMissing={forceMissingJr}
                        revealed
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="caption-row mt-2" data-caption-row>
            <Caption text={caption} />
            <PhotoCreditsLink />
          </div>
        </Sheet>
      </div>
      <StatusStrip {...status} />
    </div>
  );
}

function CalloutStack({ callouts }: { callouts: OverlayCallout[] }) {
  if (callouts.length === 0) return null;
  return (
    <div className="callout-stack mt-5 flex flex-col items-start gap-3">
      {callouts.map((callout) => {
        if (callout.fact_id) {
          const fact = facts.find((row) => row.id === callout.fact_id);
          if (!fact) return null;
          return (
            <div
              key={callout.callout_id}
              data-callout={callout.callout_id}
              data-callout-kind="fact"
            >
              <NoteCard kind="fact" fact={fact} />
            </div>
          );
        }
        return (
          <aside
            key={callout.callout_id}
            className="coach-note"
            data-callout={callout.callout_id}
            data-callout-kind="text"
          >
            <p className="font-archivo m-0 text-[11px] tracking-wide text-[var(--blue)] uppercase">
              Coach&apos;s note
            </p>
            <KalamNote text={callout.text ?? ''} className="mt-1 text-[20px]" />
          </aside>
        );
      })}
    </div>
  );
}

function CutoutRow({
  files,
  credits,
  size,
  stacked = false,
  compact = false,
  forceMissing = false,
  className = '',
}: {
  files: string[];
  credits: CutoutCredit[];
  size: number;
  stacked?: boolean;
  compact?: boolean;
  forceMissing?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex ${stacked ? 'flex-col' : 'flex-row'} flex-wrap items-end justify-start gap-3 ${className}`}
    >
      {files.map((file) => {
        const credit = creditForFile(credits, file);
        if (!credit) {
          return (
            <PlayerCutout
              key={file}
              file={file}
              caption=""
              size={size}
              forceMissing={forceMissing}
            />
          );
        }
        return (
          <PlayerCutout
            key={file}
            file={file}
            caption={cutoutCaption(credit, compact || size < 130)}
            name={credit.name}
            size={size}
            forceMissing={forceMissing}
          />
        );
      })}
    </div>
  );
}
