import { describe, expect, it } from 'vitest';
import { deck, getPlay, getSlide } from '@/lib/deck/load';
import {
  PLAY_START_DURATION_MS,
  frameAtElapsed,
  interpolateMarkers,
  playDurationMs,
  playFrame,
  playMotionSegments,
} from '@/lib/deck/plays';

describe('play data helpers', () => {
  it('sums step durations from deck data', () => {
    const play = getPlay('p_blitz_lebron_pnr');
    expect(playDurationMs(play)).toBe(5000);
  });

  it('keeps the last frame after every step', () => {
    const slide = getSlide('s2_lebron');
    const play = getPlay('p_blitz_lebron_pnr');
    if (!slide.diagram) throw new Error('expected court');
    const end = playFrame(slide.diagram, play);
    expect(end.ball).toBe('cle_james');
    expect(end.markers.gsw_curry).toEqual([28, 28]);
    expect(end.caption).toBe('Weak side rotates home');
  });

  it('starts a play with its own formation before the first caption', () => {
    const slide = getSlide('s4_offense');
    const play = getPlay('p_draymond_short_roll');
    if (!slide.diagram) throw new Error('expected court');
    const segments = playMotionSegments(slide.diagram, play);
    expect(segments[0]?.caption).toBeNull();
    expect(segments[0]?.durationMs).toBe(PLAY_START_DURATION_MS);
    expect(segments[0]?.to.gsw_curry).toEqual([50, 62]);
    expect(segments[1]?.caption).toBe('They trap Curry on the ball');
  });

  it('interpolates a highlighted marker along its path', () => {
    const mid = interpolateMarkers({ cle_james: [0, 0] }, { cle_james: [10, 20] }, 0.5);
    expect(mid.cle_james).toEqual([5, 10]);
  });

  it('holds the last frame after the total duration', () => {
    const slide = getSlide('s2_lebron');
    const play = getPlay('p_blitz_lebron_pnr');
    if (!slide.diagram) throw new Error('expected court');
    const segments = playMotionSegments(slide.diagram, play);
    const end = frameAtElapsed(segments, 20_000);
    expect(end?.caption).toBe('Weak side rotates home');
    expect(end?.markers.gsw_curry).toEqual(playFrame(slide.diagram, play).markers.gsw_curry);
    expect(deck.plays).toHaveLength(4);
  });
});
