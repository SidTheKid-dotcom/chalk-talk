import { Highlighter } from '@/components/deck/Highlighter';
import { JrCard } from '@/components/deck/JrCard';
import { KalamNote } from '@/components/deck/KalamNote';
import { LowerThird } from '@/components/deck/LowerThird';
import { Marker } from '@/components/deck/Marker';
import { MotionDemo } from '@/components/deck/MotionDemo';
import { NoteCard } from '@/components/deck/NoteCard';
import { PhotoCreditsLink } from '@/components/deck/PhotoCredits';
import { PlayArrows } from '@/components/deck/PlayArrows';
import { PlayerCutout } from '@/components/deck/PlayerCutout';
import { Points } from '@/components/deck/Points';
import { Sheet } from '@/components/deck/Sheet';
import { creditForFile } from '@/lib/deck/credits';
import { deck, facts } from '@/lib/deck/load';
import type { CutoutCredit } from '@/lib/deck/types';

type PrimitivesGalleryProps = {
  credits: CutoutCredit[];
  jrImageSrc: string | null;
};

export function PrimitivesGallery({ credits, jrImageSrc }: PrimitivesGalleryProps) {
  const curry = creditForFile(credits, 'stephen-curry.png');
  const fact = facts[0];
  const jrCaption =
    deck.slides.find((slide) => slide.id === 's6_last_two')?.cards[0]?.caption ?? '';
  const samplePoints = deck.slides[0]?.points ?? [];
  const textNote = deck.slides[2]?.points[1] ?? '';

  return (
    <div className="relative z-10 flex flex-col gap-10 px-10 py-10">
      <h2 className="slide-title m-0 text-[72px]">Primitives</h2>
      <div className="flex flex-wrap items-start gap-8">
        <LowerThird name="Stephen Curry" team="gsw" sub="GSW" />
        <span className="coach-pill font-plex text-[13px]">Private to the coach</span>
      </div>
      <Sheet className="max-w-xl">
        <Points points={samplePoints} />
      </Sheet>
      <svg viewBox="0 0 100 40" className="h-32 w-[420px]">
        <Marker player={deck.players.gsw_green} position={[20, 16]} />
        <Marker player={deck.players.cle_james} position={[48, 16]} highlighted />
        <PlayArrows
          arrows={[
            { from: [66, 28], to: [88, 10], kind: 'cut', key: 'gal-cut' },
            { from: [66, 28], to: [90, 30], kind: 'pass', option: true, key: 'gal-opt' },
            { from: [10, 30], to: [34, 30], kind: 'dribble', key: 'gal-drib' },
            { from: [38, 32], to: [58, 32], kind: 'screen', key: 'gal-scr' },
          ]}
        />
      </svg>
      <div className="flex flex-wrap items-end gap-6">
        <Highlighter width={120} height={18} />
        {fact ? <NoteCard kind="fact" fact={fact} /> : null}
        <NoteCard kind="text" text={textNote} />
        <KalamNote text={textNote} />
      </div>
      {curry ? (
        <PlayerCutout
          file={curry.file}
          caption={curry.teamAbbrev}
          name={curry.name}
          team="gsw"
          size={180}
        />
      ) : null}
      <JrCard caption={jrCaption} imageSrc={jrImageSrc} />
      <PhotoCreditsLink />
      <MotionDemo />
    </div>
  );
}
