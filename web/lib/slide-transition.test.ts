import { describe, expect, it } from 'vitest';
import { SLIDE_PUSH_MS, dsegText, planSlidePush, slidePushDirection } from '@/lib/slide-transition';

describe('slide push planning', () => {
  it('uses a 280-360ms push', () => {
    expect(SLIDE_PUSH_MS).toBeGreaterThanOrEqual(280);
    expect(SLIDE_PUSH_MS).toBeLessThanOrEqual(360);
  });

  it('pushes forward from a lower slide number and backward from a higher one', () => {
    expect(slidePushDirection('s1_tipoff', 's2_lebron')).toBe('forward');
    expect(slidePushDirection('s4_offense', 's2_lebron')).toBe('backward');
    expect(slidePushDirection('s3_kyrie', 's3_kyrie')).toBe('none');
  });

  it('animates the first in-order change and ignores a stale seq', () => {
    expect(
      planSlidePush({
        fromId: 's1_tipoff',
        fromSeq: 1,
        toId: 's2_lebron',
        toSeq: 2,
        animating: false,
        reducedMotion: false,
      })
    ).toEqual({
      fromId: 's1_tipoff',
      toId: 's2_lebron',
      seq: 2,
      direction: 'forward',
      animate: true,
    });
    expect(
      planSlidePush({
        fromId: 's2_lebron',
        fromSeq: 4,
        toId: 's1_tipoff',
        toSeq: 3,
        animating: false,
        reducedMotion: false,
      })
    ).toBeNull();
  });

  it('cancels an in-flight push and settles on the latest seq', () => {
    expect(
      planSlidePush({
        fromId: 's2_lebron',
        fromSeq: 2,
        toId: 's4_offense',
        toSeq: 5,
        animating: true,
        reducedMotion: false,
      })
    ).toEqual({
      fromId: 's2_lebron',
      toId: 's4_offense',
      seq: 5,
      direction: 'forward',
      animate: false,
    });
  });

  it('swaps immediately when reduced motion is set', () => {
    expect(
      planSlidePush({
        fromId: 's1_tipoff',
        fromSeq: 1,
        toId: 's2_lebron',
        toSeq: 2,
        animating: false,
        reducedMotion: true,
      })
    ).toMatchObject({ animate: false, toId: 's2_lebron' });
  });

  it('maps spaces to DSEG blank glyphs', () => {
    expect(dsegText('GAME 7')).toBe('GAME!7');
  });
});
