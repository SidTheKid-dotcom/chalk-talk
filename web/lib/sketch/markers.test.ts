import { describe, expect, it } from 'vitest';
import deck from '@/lib/deck/deck.json';
import { playStartMarkers } from '@/lib/deck/plays';
import type { Coord, Deck, DeckPlay, PlayerId, SlideDiagram } from '@/lib/deck/types';
import {
  LABEL_OVERLAP_TOLERANCE_PX,
  boxOverlapPx,
  formationMarkers,
  labCourtWidthPx,
  layoutMarkers,
  separateGhostsFromLive,
  svgUnitPx,
} from '@/lib/sketch/markers';

const data = deck as unknown as Deck;
const courtWidthPx = labCourtWidthPx();

function expectNoLabelOverlap(label: string, markers: ReturnType<typeof layoutMarkers>) {
  const collisions: string[] = [];
  for (let i = 0; i < markers.length; i += 1) {
    for (let j = i + 1; j < markers.length; j += 1) {
      const overlap = boxOverlapPx(markers[i].box, markers[j].box);
      if (overlap > LABEL_OVERLAP_TOLERANCE_PX) {
        collisions.push(
          `${label}: ${markers[i].id}/${markers[j].id} overlap ${overlap.toFixed(1)}px`
        );
      }
    }
  }
  expect(collisions).toEqual([]);
}

describe('marker label boxes at 1920x1080', () => {
  it('do not overlap on every slide', () => {
    for (const slide of data.slides) {
      const markers = slide.diagram?.markers;
      if (!markers || Object.keys(markers).length === 0) continue;
      expectNoLabelOverlap(
        slide.id,
        layoutMarkers({
          markers,
          players: data.players,
          matchups: slide.diagram?.matchups,
          courtWidthPx,
        })
      );
    }
  });

  it('do not overlap on every play start formation', () => {
    for (const play of data.plays) {
      const slide = data.slides.find((item) => item.id === play.slide_id);
      if (!slide?.diagram) continue;
      expectNoLabelOverlap(
        play.id,
        layoutMarkers({
          markers: formationMarkers(slide.diagram, play.start),
          players: data.players,
          matchups: slide.diagram.matchups,
          courtWidthPx,
        })
      );
    }
  });

  it('offsets every play step, ghosts included', () => {
    const collisions: string[] = [];
    const unit = svgUnitPx(courtWidthPx);
    for (const play of data.plays) {
      const slide = data.slides.find((item) => item.id === play.slide_id);
      if (!slide?.diagram) continue;
      const start = playStartMarkers(slide.diagram, play);
      for (let step = 0; step < play.steps.length; step += 1) {
        const current = markersAtStep(slide.diagram, play, step);
        const ghosts = ghostCoords(start, current);
        const live = layoutMarkers({
          markers: current,
          players: data.players,
          matchups: slide.diagram.matchups,
          courtWidthPx,
        });
        for (let i = 0; i < live.length; i += 1) {
          for (let j = i + 1; j < live.length; j += 1) {
            const overlap = boxOverlapPx(live[i].box, live[j].box);
            if (overlap > LABEL_OVERLAP_TOLERANCE_PX) {
              collisions.push(
                `${play.id} step ${step + 1}: ${live[i].id}/${live[j].id} overlap ${overlap.toFixed(1)}px`
              );
            }
          }
        }
        if (Object.keys(ghosts).length === 0) continue;
        const originLaid = layoutMarkers({
          markers: { ...current, ...ghosts },
          players: data.players,
          matchups: slide.diagram.matchups,
          courtWidthPx,
        }).filter((marker) => Boolean(ghosts[marker.id]));
        const separated = separateGhostsFromLive(originLaid, live, courtWidthPx);
        for (const ghost of separated) {
          const radius = ghost.radiusSvg * unit;
          const disk = {
            x: ghost.svg[0] * unit - radius,
            y: ghost.svg[1] * unit - radius,
            w: radius * 2,
            h: radius * 2,
          };
          for (const marker of live) {
            if (marker.id === ghost.id) continue;
            const overlap = boxOverlapPx(disk, marker.box);
            if (overlap > LABEL_OVERLAP_TOLERANCE_PX) {
              collisions.push(
                `${play.id} step ${step + 1}: ghost ${ghost.id} covers ${marker.id} by ${overlap.toFixed(1)}px`
              );
            }
          }
        }
      }
    }
    expect(collisions).toEqual([]);
  });

  it('offsets an overlapping defender toward the rim without changing deck coords', () => {
    const markers = {
      cle_james: [50, 70] as [number, number],
      gsw_iguodala: [50, 64] as [number, number],
    };
    const laid = layoutMarkers({
      markers,
      players: data.players,
      matchups: { gsw_iguodala: 'cle_james' as PlayerId },
      courtWidthPx,
    });
    const james = laid.find((item) => item.id === 'cle_james');
    const andre = laid.find((item) => item.id === 'gsw_iguodala');
    expect(james).toBeTruthy();
    expect(andre).toBeTruthy();
    // Rim is to the right in SVG (x increases). Defender should sit righter than the deck mapping.
    expect(andre!.svg[0]).toBeGreaterThan(36);
    expect(james!.svg[0]).toBeCloseTo(30, 5);
  });
});

function markersAtStep(diagram: SlideDiagram, play: DeckPlay, stepIndex: number) {
  const markers = playStartMarkers(diagram, play);
  for (let index = 0; index <= stepIndex; index += 1) {
    Object.assign(markers, play.steps[index]?.moves ?? {});
  }
  return markers;
}

function ghostCoords(
  start: Partial<Record<PlayerId, Coord>>,
  current: Partial<Record<PlayerId, Coord>>
) {
  const ghosts: Partial<Record<PlayerId, Coord>> = {};
  for (const [id, pos] of Object.entries(current)) {
    const origin = start[id as PlayerId];
    if (!origin || !pos) continue;
    if (origin[0] !== pos[0] || origin[1] !== pos[1]) ghosts[id as PlayerId] = origin;
  }
  return ghosts;
}
