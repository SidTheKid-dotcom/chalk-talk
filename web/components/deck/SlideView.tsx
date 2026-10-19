import { Caption } from '@/components/deck/Caption';
import { HalfCourt } from '@/components/deck/HalfCourt';
import { Headline } from '@/components/deck/Headline';
import { JrCard } from '@/components/deck/JrCard';
import { LowerThird } from '@/components/deck/LowerThird';
import { NoteCard } from '@/components/deck/NoteCard';
import { PhotoCreditsLink } from '@/components/deck/PhotoCredits';
import type { DrawnArrow } from '@/components/deck/PlayArrows';
import { PlayerCutout } from '@/components/deck/PlayerCutout';
import { Points } from '@/components/deck/Points';
import { Sheet } from '@/components/deck/Sheet';
import { Stamp } from '@/components/deck/Stamp';
import { StatusStrip } from '@/components/deck/StatusStrip';
import { creditForFile, cutoutCaption } from '@/lib/deck/credits';
import { facts, featuredFact, firstSentence } from '@/lib/deck/load';
import type { CutoutCredit, Deck, DeckSlide, PlayerId, TargetId } from '@/lib/deck/types';

export type SlideViewProps = {
  deck: Deck;
  slide: DeckSlide;
  credits: CutoutCredit[];
  highlight?: TargetId;
  arrows?: DrawnArrow[];
  markerOverrides?: Partial<Record<PlayerId, [number, number]>>;
  ball?: PlayerId;
  jrImageSrc?: string | null;
  forceMissingCutout?: boolean;
  forceMissingJr?: boolean;
  revealJr?: boolean;
  noteFactId?: string;
  animate?: boolean;
  shot?: boolean;
};

export function SlideView({
  deck,
  slide,
  credits,
  highlight,
  arrows,
  markerOverrides,
  ball,
  jrImageSrc = null,
  forceMissingCutout = false,
  forceMissingJr = false,
  revealJr = false,
  noteFactId,
  animate = false,
  shot = false,
}: SlideViewProps) {
  const noteFact = noteFactId ? facts.find((fact) => fact.id === noteFactId) : featuredFact(slide);
  const caption = firstSentence(slide.notes);
  const jrCard = slide.cards.find((card) => card.id === 'k_jr_card');
  const showJr = Boolean(jrCard) && (revealJr || highlight === 'k_jr_card');
  const hasCourt = Boolean(slide.diagram);
  const sideCutouts =
    slide.id === 's2_lebron' || slide.id === 's3_kyrie' || slide.id === 's4_offense'
      ? slide.cutouts
      : [];

  return (
    <div
      className={`desk flex flex-col ${shot ? 'h-[1080px] w-[1920px] overflow-hidden' : 'min-h-[100vh] w-full'}`}
    >
      <div className="relative flex min-h-0 flex-1 items-stretch px-10 pt-4 pb-1">
        <Sheet className="relative flex min-h-0 flex-1 flex-col px-10 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <LowerThird number={slide.number} section={slide.section} />
            <Stamp animate={animate} />
          </div>

          <div className={`mt-3 min-h-0 flex-1 ${hasCourt ? 'slide-body' : 'flex flex-col'}`}>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Headline className={slide.title.length > 42 ? 'text-[42px]' : 'text-[52px]'}>
                {slide.title}
              </Headline>
              {slide.id === 's5_xfactors' ? (
                <div className="mt-5 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-10">
                  <Points points={slide.points} variant="checkbox" />
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
                    highlight={highlight}
                    arrows={arrows}
                    markerOverrides={markerOverrides}
                    ball={ball}
                    animate={animate}
                  />
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

          <div className="mt-2 flex items-end justify-between gap-6">
            <Caption text={caption} />
            <PhotoCreditsLink />
          </div>

          {noteFact ? (
            <div className="absolute right-8 bottom-5 z-10">
              <NoteCard kind="fact" fact={noteFact} />
            </div>
          ) : null}
        </Sheet>
      </div>
      <StatusStrip />
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
