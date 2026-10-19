import { describe, expect, it } from 'vitest';
import deck from '@/lib/deck/deck.json';
import type { Deck, PlayerId } from '@/lib/deck/types';
import {
  LABEL_OVERLAP_TOLERANCE_PX,
  boxOverlapPx,
  formationMarkers,
  labCourtWidthPx,
  layoutMarkers,
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
