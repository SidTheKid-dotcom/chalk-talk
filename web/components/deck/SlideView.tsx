import { HalfCourt } from '@/components/deck/HalfCourt';
import { Headline } from '@/components/deck/Headline';
import { JrCard } from '@/components/deck/JrCard';
import { KalamNote } from '@/components/deck/KalamNote';
import { NoteCard } from '@/components/deck/NoteCard';
import type { DrawnArrow } from '@/components/deck/PlayArrows';
import { PlayerCutout } from '@/components/deck/PlayerCutout';
import { Points } from '@/components/deck/Points';
import { TeamLogo } from '@/components/deck/TeamLogo';
import type { OverlayCallout } from '@/lib/deck/commands';
import { creditForFile } from '@/lib/deck/credits';
import { cutoutForPlayer, lineupFiles, playerIdForCutout } from '@/lib/deck/cutouts';
import { facts } from '@/lib/deck/load';
import type { Coord, CutoutCredit, Deck, DeckSlide, PlayerId, TargetId } from '@/lib/deck/types';

export type SlideViewProps = {
  deck: Deck;
  slide: DeckSlide;
  credits: CutoutCredit[];
  highlight?: TargetId;
  highlights?: TargetId[];
  arrows?: DrawnArrow[];
  markerOverrides?: Partial<Record<PlayerId, Coord>>;
  ball?: PlayerId;
  jrImageSrc?: string | null;
  forceMissingCutout?: boolean;
  forceMissingJr?: boolean;
  revealJr?: boolean;
  noteFactId?: string;
  callouts?: OverlayCallout[];
  playCaption?: string | null;
  playId?: string | null;
  animate?: boolean;
  shot?: boolean;
  captionText?: string;
  notice?: string | null;
};

function kickerLabel(slide: DeckSlide): string {
  if (slide.id === 's1_tipoff') return 'Film session';
  if (slide.id === 's2_lebron' || slide.id === 's3_kyrie') return 'Defense';
  if (slide.id === 's4_offense') return 'Offense';
  if (slide.id === 's5_xfactors') return 'Swing factors';
  return 'Late game';
}

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
  playId = null,
  animate = false,
}: SlideViewProps) {
  const noteFact = noteFactId ? facts.find((fact) => fact.id === noteFactId) : undefined;
  const activeHighlights = highlights ?? (highlight ? [highlight] : []);
  const jrCard = slide.cards.find((card) => card.id === 'k_jr_card');
  const showJr = Boolean(jrCard) && (revealJr || activeHighlights.includes('k_jr_card'));
  const layout =
    slide.id === 's5_xfactors'
      ? 'factors'
      : slide.id === 's1_tipoff'
        ? 'hero'
        : slide.id === 's6_last_two' && showJr
          ? 'close'
          : 'court';
  const focusIds = courtFocusIds(activeHighlights, ball, markerOverrides);

  return (
    <div className="slide-canvas" data-layout={layout} data-slide-canvas={slide.id}>
      <div className="min-w-0">
        <div className="slide-kicker">
          <b>{kickerLabel(slide)}</b>
          {slide.section}
        </div>
        <Headline>{slide.title}</Headline>
      </div>

      {layout === 'factors' ? (
        <FactorsGrid
          slide={slide}
          credits={credits}
          noteFact={noteFact}
          callouts={callouts}
          forceMissingCutout={forceMissingCutout}
        />
      ) : (
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-6">
          <div className="card">
            <div className="hd">
              <span>{slide.section}</span>
              <span className="tag">Game 7</span>
            </div>
            <Points points={slide.points} />
          </div>
          {noteFact ? <NoteCard kind="fact" fact={noteFact} /> : null}
          {layout === 'hero' ? <MatchupCard /> : null}
        </div>
      )}

      {layout === 'hero' ? (
        <div className="slide-visual relative flex min-h-0 flex-col justify-center gap-5">
          <LineupStrip
            files={slide.cutouts}
            credits={credits}
            highlights={activeHighlights}
            forceMissing={forceMissingCutout}
          />
        </div>
      ) : null}

      {showJr && jrCard ? (
        <div className="slide-jr flex items-center">
          <JrCard
            caption={jrCard.caption}
            imageSrc={jrImageSrc}
            forceMissing={forceMissingJr}
            revealed
          />
        </div>
      ) : null}

      {slide.diagram ? (
        <div className="slide-visual slide-court relative min-h-0">
          {layout === 'court' && !playId ? (
            <div className="pointer-events-none absolute bottom-10 left-0 z-[2] max-w-[280px]">
              <CutoutRow
                files={courtCutoutFiles(slide.cutouts, activeHighlights)}
                credits={credits}
                highlights={activeHighlights}
                size={188}
                forceMissing={forceMissingCutout}
              />
            </div>
          ) : null}
          <div className="slide-court-frame">
            <HalfCourt
              deck={deck}
              diagram={slide.diagram}
              highlights={activeHighlights}
              arrows={arrows}
              markerOverrides={markerOverrides}
              ball={ball}
              animate={animate}
              showZoneLabels={slide.id === 's6_last_two'}
              focusIds={focusIds}
            />
            {playCaption ? (
              <p className="play-caption" data-play-caption>
                <span className="lab">Play</span>
                {playCaption}
              </p>
            ) : null}
            {callouts.length > 0 ? (
              <div className="absolute top-6 left-0 z-[2] max-w-[360px]">
                <CalloutStack callouts={callouts} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {layout === 'hero' && callouts.length > 0 ? <CalloutStack callouts={callouts} /> : null}
    </div>
  );
}

function courtFocusIds(
  highlights: TargetId[],
  ball?: PlayerId,
  markerOverrides?: Partial<Record<PlayerId, Coord>>
): PlayerId[] {
  const focus = new Set<PlayerId>();
  for (const target of highlights) {
    if (cutoutForPlayer(target)) focus.add(target as PlayerId);
  }
  if (ball) focus.add(ball);
  if (markerOverrides) {
    for (const id of Object.keys(markerOverrides) as PlayerId[]) {
      focus.add(id);
    }
  }
  return [...focus];
}

function courtCutoutFiles(slideFiles: string[], highlights: TargetId[]): string[] {
  const files = [...slideFiles.slice(0, 1)];
  for (const target of highlights) {
    const file = cutoutForPlayer(target);
    if (file && !files.includes(file)) files.push(file);
  }
  return files.slice(0, 2);
}

function CalloutStack({ callouts }: { callouts: OverlayCallout[] }) {
  if (callouts.length === 0) return null;
  return (
    <div className="callout-stack flex flex-col items-start gap-4">
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
            <small className="coach-note-label">Coach note</small>
            <KalamNote text={callout.text ?? ''} />
          </aside>
        );
      })}
    </div>
  );
}

function FactorsGrid({
  slide,
  credits,
  noteFact,
  callouts,
  forceMissingCutout,
}: {
  slide: DeckSlide;
  credits: CutoutCredit[];
  noteFact: (typeof facts)[number] | undefined;
  callouts: OverlayCallout[];
  forceMissingCutout: boolean;
}) {
  const columns = [
    ...slide.points.map((point, index) => ({
      key: `p-${index}`,
      n: String(index + 1).padStart(2, '0'),
      body: point,
      kind: 'point' as const,
    })),
    noteFact
      ? {
          key: 'fact',
          n: 'F',
          body: noteFact.claim,
          kind: 'fact' as const,
          fact: noteFact,
        }
      : null,
  ].filter((column): column is NonNullable<typeof column> => Boolean(column));

  return (
    <>
      {slide.cutouts.length > 0 ? (
        <div className="factor-strip" data-factor-photos>
          <CutoutRow
            files={slide.cutouts}
            credits={credits}
            size={148}
            forceMissing={forceMissingCutout}
            nowrap
          />
        </div>
      ) : null}
      {columns.map((column) => (
        <article key={column.key} className="factor-col">
          <span className="n">{column.n}</span>
          {column.kind === 'fact' && 'fact' in column && column.fact ? (
            <div data-note-kind="fact">
              <p className="lab mt-2">{column.fact.id}</p>
              <p className="row-detail mt-3 text-[21px] text-[var(--ink)]">{column.body}</p>
            </div>
          ) : (
            <p className="row-head mt-3">{column.body}</p>
          )}
        </article>
      ))}
      {callouts.length > 0 ? (
        <div className="factor-callouts">
          <CalloutStack callouts={callouts} />
        </div>
      ) : null}
    </>
  );
}

function MatchupCard() {
  return (
    <div className="matchup-card" data-matchup>
      <div className="matchup-team gsw">
        <TeamLogo src="/local/warriors-logo.svg" abbrev="GSW" alt="Golden State Warriors" />
        <span className="matchup-name">Warriors</span>
      </div>
      <span className="matchup-vs">vs</span>
      <div className="matchup-team cle">
        <TeamLogo src="/local/cavaliers-logo.svg" abbrev="CLE" alt="Cleveland Cavaliers" />
        <span className="matchup-name">Cavaliers</span>
      </div>
    </div>
  );
}

function LineupStrip({
  files,
  credits,
  highlights,
  forceMissing,
}: {
  files: string[];
  credits: CutoutCredit[];
  highlights: TargetId[];
  forceMissing: boolean;
}) {
  const warriors = lineupFiles(files, 'gsw');
  const cavs = lineupFiles(files, 'cle');
  return (
    <div className="lineup-board" data-lineup>
      <LineupRow
        label="GSW"
        files={warriors}
        credits={credits}
        highlights={highlights}
        forceMissing={forceMissing}
      />
      <LineupRow
        label="CLE"
        files={cavs}
        credits={credits}
        highlights={highlights}
        forceMissing={forceMissing}
      />
    </div>
  );
}

function LineupRow({
  label,
  files,
  credits,
  highlights,
  forceMissing,
}: {
  label: string;
  files: string[];
  credits: CutoutCredit[];
  highlights: TargetId[];
  forceMissing: boolean;
}) {
  if (files.length === 0) return null;
  return (
    <div className="lineup-row" data-lineup-team={label}>
      <span className="lineup-label">{label}</span>
      <CutoutRow
        files={files}
        credits={credits}
        highlights={highlights}
        size={140}
        forceMissing={forceMissing}
        className="lineup-cells"
      />
    </div>
  );
}

function CutoutRow({
  files,
  credits,
  size,
  forceMissing = false,
  nowrap = false,
  className = '',
  highlights = [],
}: {
  files: string[];
  credits: CutoutCredit[];
  size: number;
  forceMissing?: boolean;
  nowrap?: boolean;
  className?: string;
  highlights?: TargetId[];
}) {
  return (
    <div
      className={`flex flex-row items-end justify-start gap-8 ${nowrap ? 'flex-nowrap' : 'flex-wrap'} ${className}`}
    >
      {files.map((file) => {
        const credit = creditForFile(credits, file);
        const team = credit?.teamAbbrev === 'CLE' ? 'cle' : 'gsw';
        const playerId = playerIdForCutout(file);
        return (
          <PlayerCutout
            key={file}
            file={file}
            caption={credit?.teamAbbrev ?? ''}
            name={credit?.name ?? ''}
            team={team}
            size={size}
            forceMissing={forceMissing}
            highlighted={playerId !== null && highlights.includes(playerId)}
          />
        );
      })}
    </div>
  );
}
