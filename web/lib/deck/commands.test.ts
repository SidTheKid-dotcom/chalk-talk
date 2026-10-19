import { describe, expect, it } from 'vitest';
import {
  type DeckCommandState,
  RPC_ERROR,
  initialDeckState,
  reduceHighlight,
  reduceShowSlide,
  stateFromAgentAttributes,
} from '@/lib/deck/commands';

function state(partial: Partial<DeckCommandState> = {}): DeckCommandState {
  return { ...initialDeckState, ...partial };
}

describe('reduceShowSlide', () => {
  it('applies an increasing seq and clears highlights', () => {
    const first = reduceShowSlide(state(), { slide_id: 's1_tipoff', seq: 1 });
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    expect(first.ack).toEqual({
      ok: true,
      slide_id: 's1_tipoff',
      seq: 1,
      applied: true,
    });
    const highlighted: DeckCommandState = {
      ...first.state,
      highlights: ['cle_james'],
    };
    const second = reduceShowSlide(highlighted, { slide_id: 's2_lebron', seq: 2 });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(second.state.currentSlideId).toBe('s2_lebron');
    expect(second.state.highlights).toEqual([]);
    expect(second.state.lastAppliedSeq).toBe(2);
  });

  it('does not render a stale seq', () => {
    const current = state({ currentSlideId: 's2_lebron', lastAppliedSeq: 7 });
    const result = reduceShowSlide(current, { slide_id: 's1_tipoff', seq: 7 });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.ack).toEqual({
      ok: true,
      slide_id: 's2_lebron',
      seq: 7,
      applied: false,
      reason: 'stale',
    });
    expect(result.state).toEqual(current);
  });

  it('returns 2001 for an unknown slide id', () => {
    const result = reduceShowSlide(state(), { slide_id: 's9_nope', seq: 1 });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe(RPC_ERROR.UNKNOWN_SLIDE);
    expect(result.state.lastAppliedSeq).toBe(0);
  });

  it('returns 2002 for malformed payloads', () => {
    expect(reduceShowSlide(state(), 'nope').ok).toBe(false);
    const extra = reduceShowSlide(state(), { slide_id: 's1_tipoff', seq: 1, extra: true });
    expect(extra.ok).toBe(false);
    if (!extra.ok) {
      expect(extra.code).toBe(RPC_ERROR.MALFORMED);
    }
  });

  it('returns 2003 when the deck is not ready', () => {
    const result = reduceShowSlide(state({ ready: false }), { slide_id: 's1_tipoff', seq: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(RPC_ERROR.NOT_READY);
    }
  });
});

describe('reduceHighlight', () => {
  it('returns 2004 for a target that is not on the slide', () => {
    const current = state({ currentSlideId: 's2_lebron', lastAppliedSeq: 2 });
    const result = reduceHighlight(current, {
      slide_id: 's2_lebron',
      seq: 3,
      target: 'k_jr_card',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(RPC_ERROR.UNKNOWN_TARGET);
    }
    expect(result.state).toEqual(current);
  });

  it('returns 2007 when payload slide_id is not the slide on screen', () => {
    const current = state({ currentSlideId: 's2_lebron', lastAppliedSeq: 4 });
    const result = reduceHighlight(current, {
      slide_id: 's3_kyrie',
      seq: 5,
      target: 'cle_irving',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(RPC_ERROR.SLIDE_MISMATCH);
    }
  });

  it('keeps the last two highlights and drops the oldest', () => {
    const current = state({
      currentSlideId: 's2_lebron',
      lastAppliedSeq: 4,
      highlights: ['cle_james'],
    });
    const one = reduceHighlight(current, {
      slide_id: 's2_lebron',
      seq: 5,
      target: 'gsw_iguodala',
    });
    expect(one.ok).toBe(true);
    if (!one.ok) {
      return;
    }
    const two = reduceHighlight(one.state, {
      slide_id: 's2_lebron',
      seq: 6,
      target: 'z_paint',
    });
    expect(two.ok).toBe(true);
    if (!two.ok) {
      return;
    }
    expect(two.ack).toMatchObject({
      applied: true,
      active: ['gsw_iguodala', 'z_paint'],
    });
  });

  it('ignores a stale highlight seq', () => {
    const current = state({
      currentSlideId: 's2_lebron',
      lastAppliedSeq: 9,
      highlights: ['cle_james'],
    });
    const result = reduceHighlight(current, {
      slide_id: 's2_lebron',
      seq: 8,
      target: 'gsw_green',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.ack).toMatchObject({ applied: false, reason: 'stale', active: ['cle_james'] });
    expect(result.state.highlights).toEqual(['cle_james']);
  });
});

describe('stateFromAgentAttributes', () => {
  it('seeds seq from overlay_state or slide_seq, whichever is higher', () => {
    const seeded = stateFromAgentAttributes({
      current_slide: 's3_kyrie',
      slide_seq: '3',
      overlay_state: JSON.stringify({
        v: 1,
        slide_id: 's3_kyrie',
        seq: 8,
        highlights: ['cle_irving'],
        play: null,
        callouts: [],
      }),
    });
    expect(seeded.currentSlideId).toBe('s3_kyrie');
    expect(seeded.lastAppliedSeq).toBe(8);
    expect(seeded.highlights).toEqual(['cle_irving']);
  });
});
