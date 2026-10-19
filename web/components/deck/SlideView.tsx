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
import { factsForSlide, firstSentence } from '@/lib/deck/load';
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
  const facts = factsForSlide(slide);
  const noteFact = noteFactId ? facts.find((fact) => fact.id === noteFactId) : facts[0];
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
      <div className="relative flex flex-1 items-stretch px-14 pt-9 pb-4">
        <Sheet className="relative flex flex-1 flex-col px-14 pt-9 pb-6">
          <div className="flex items-start justify-between">
            <LowerThird number={slide.number} section={slide.section} />
            <Stamp animate={animate} />
          </div>

          <div
            className={`mt-5 grid flex-1 gap-8 ${
              hasCourt && sideCutouts.length > 0
                ? 'grid-cols-[minmax(400px,1fr)_auto_minmax(520px,620px)] items-start'
                : hasCourt
                  ? 'grid-cols-[minmax(420px,1fr)_minmax(520px,640px)] items-start'
                  : 'grid-cols-1'
            }`}
          >
            <div className="min-w-0">
              <Headline className={slide.title.length > 42 ? 'text-[48px]' : 'text-[58px]'}>
                {slide.title}
              </Headline>
              <div className="mt-7 max-w-[640px]">
                <Points
                  points={slide.points}
                  variant={
                    slide.id === 's1_tipoff' || slide.id === 's4_offense' ? 'numeral' : 'checkbox'
                  }
                />
              </div>
              {slide.id === 's5_xfactors' ? (
                <CutoutRow
                  files={slide.cutouts}
                  credits={credits}
                  size={132}
                  forceMissing={forceMissingCutout}
                  className="mt-10"
                />
              ) : null}
            </div>

            {sideCutouts.length > 0 ? (
              <CutoutRow
                files={sideCutouts}
                credits={credits}
                size={slide.id === 's4_offense' ? 122 : 176}
                stacked={slide.id === 's4_offense'}
                forceMissing={forceMissingCutout}
                className="self-center"
              />
            ) : null}

            {slide.diagram ? (
              <div className="relative w-full max-w-[620px] justify-self-end">
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
                  <div className="absolute top-6 right-4">
                    <JrCard
                      caption={jrCard.caption}
                      imageSrc={jrImageSrc}
                      forceMissing={forceMissingJr}
                      revealed
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {slide.id === 's1_tipoff' ? (
            <div className="mt-6">
              <p className="font-archivo mb-3 text-[12px] tracking-wide text-[var(--ink-2)] uppercase">
                Warriors vs Cavs
              </p>
              <CutoutRow
                files={slide.cutouts}
                credits={credits}
                size={96}
                forceMissing={forceMissingCutout}
              />
            </div>
          ) : null}

          <div className="mt-auto flex items-end justify-between gap-6 pt-3">
            <Caption text={caption} />
            <div className="flex items-end gap-5">
              {noteFact ? <NoteCard kind="fact" fact={noteFact} /> : null}
              <PhotoCreditsLink />
            </div>
          </div>
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
  forceMissing = false,
  className = '',
}: {
  files: string[];
  credits: CutoutCredit[];
  size: number;
  stacked?: boolean;
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
            caption={cutoutCaption(credit, size < 130)}
            name={credit.name}
            size={size}
            forceMissing={forceMissing}
          />
        );
      })}
    </div>
  );
}
