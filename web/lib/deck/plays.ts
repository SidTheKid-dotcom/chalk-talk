import type { DrawnArrow } from '@/components/deck/PlayArrows';
import type { Coord, DeckPlay, PlayerId, SlideDiagram } from '@/lib/deck/types';

export function playFrame(diagram: SlideDiagram, play: DeckPlay) {
  const markers: Partial<Record<PlayerId, Coord>> = { ...diagram.markers };
  if (play.start) {
    Object.assign(markers, play.start.positions);
  }

  const arrows: DrawnArrow[] = [];
  let ball: PlayerId | undefined = play.start?.ball;

  play.steps.forEach((step, stepIndex) => {
    step.arrows.forEach((arrow, arrowIndex) => {
      const from = markers[arrow.from] ?? diagram.markers[arrow.from];
      if (!from) return;
      arrows.push({
        from,
        to: arrow.to,
        kind: arrow.kind,
        option: arrow.option,
        key: `${play.id}-${stepIndex}-${arrowIndex}`,
      });
    });
    Object.assign(markers, step.moves);
    ball = step.ball;
  });

  return { markers, arrows, ball };
}
