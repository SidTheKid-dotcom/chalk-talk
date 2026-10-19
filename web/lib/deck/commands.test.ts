import { describe, expect, it } from 'vitest';
import {
  type DeckCommandState,
  RPC_ERROR,
  initialDeckState,
  markDeckReady,
  reduceAddCallout,
  reduceHighlight,
  reduceRunPlay,
  reduceShowSlide,
  seedDeckFromAgent,
  stateFromAgentAttributes,
} from '@/lib/deck/commands';

function state(partial: Partial<DeckCommandState> = {}): DeckCommandState {
  return { ...initialDeckState, ready: true, ...partial };
}

function overlayAttributes(overlay: {
  slide_id: string;
  seq: number;
  highlights?: string[];
  play?: { play_id: string; seq: number } | null;
  callouts?: Array<{ callout_id: string; text?: string; fact_id?: string }>;
}): Record<string, string> {
  return {
    current_slide: overlay.slide_id,
    slide_seq: String(overlay.seq),
    overlay_state: JSON.stringify({
      v: 1,
      slide_id: overlay.slide_id,
      seq: overlay.seq,
      highlights: overlay.highlights ?? [],
      play: overlay.play ?? null,
      callouts: overlay.callouts ?? [],
    }),
  };
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
      play: { play_id: 'p_blitz_lebron_pnr', seq: 1 },
      callouts: [{ callout_id: 'c1', text: 'Iguodala on LeBron' }],
    };
    const second = reduceShowSlide(highlighted, { slide_id: 's2_lebron', seq: 2 });
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(second.state.currentSlideId).toBe('s2_lebron');
    expect(second.state.highlights).toEqual([]);
    expect(second.state.play).toBeNull();
    expect(second.state.callouts).toEqual([]);
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

describe('reduceRunPlay', () => {
  it('replaces the current play and keeps highlights', () => {
    const current = state({
      currentSlideId: 's2_lebron',
      lastAppliedSeq: 4,
      highlights: ['cle_james'],
    });
    const result = reduceRunPlay(current, {
      slide_id: 's2_lebron',
      seq: 5,
      play_id: 'p_blitz_lebron_pnr',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ack).toMatchObject({
      applied: true,
      play_id: 'p_blitz_lebron_pnr',
      duration_ms: 5000,
    });
    expect(result.state.highlights).toEqual(['cle_james']);
    expect(result.state.play).toEqual({ play_id: 'p_blitz_lebron_pnr', seq: 5 });
    expect(result.state.playAnimate).toBe(true);
  });

  it('returns 2006 for a play that does not belong to the slide', () => {
    const current = state({ currentSlideId: 's2_lebron', lastAppliedSeq: 2 });
    const result = reduceRunPlay(current, {
      slide_id: 's2_lebron',
      seq: 3,
      play_id: 'p_switch_kyrie',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(RPC_ERROR.UNKNOWN_PLAY);
    expect(result.state).toEqual(current);
  });

  it('returns 2007 on slide mismatch and ignores a stale seq', () => {
    const mismatch = reduceRunPlay(state({ currentSlideId: 's3_kyrie', lastAppliedSeq: 4 }), {
      slide_id: 's2_lebron',
      seq: 5,
      play_id: 'p_blitz_lebron_pnr',
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.code).toBe(RPC_ERROR.SLIDE_MISMATCH);

    const current = state({
      currentSlideId: 's2_lebron',
      lastAppliedSeq: 9,
      play: { play_id: 'p_blitz_lebron_pnr', seq: 8 },
    });
    const stale = reduceRunPlay(current, {
      slide_id: 's2_lebron',
      seq: 8,
      play_id: 'p_blitz_lebron_pnr',
    });
    expect(stale.ok).toBe(true);
    if (!stale.ok) return;
    expect(stale.ack).toMatchObject({ applied: false, reason: 'stale' });
    expect(stale.state.play?.play_id).toBe('p_blitz_lebron_pnr');
  });
});

describe('reduceAddCallout', () => {
  it('keeps the last three callouts and drops the oldest', () => {
    const current = state({
      currentSlideId: 's2_lebron',
      lastAppliedSeq: 4,
      callouts: [
        { callout_id: 'c1', text: 'Stay home' },
        { callout_id: 'c2', text: 'Help early' },
      ],
    });
    const one = reduceAddCallout(current, {
      slide_id: 's2_lebron',
      seq: 5,
      callout_id: 'c3',
      text: 'Iguodala on LeBron',
    });
    expect(one.ok).toBe(true);
    if (!one.ok) return;
    const two = reduceAddCallout(one.state, {
      slide_id: 's2_lebron',
      seq: 6,
      callout_id: 'c4',
      fact_id: 'F07',
    });
    expect(two.ok).toBe(true);
    if (!two.ok) return;
    expect(two.ack).toMatchObject({ applied: true, active: ['c2', 'c3', 'c4'] });
    expect(two.state.callouts.map((item) => item.callout_id)).toEqual(['c2', 'c3', 'c4']);
  });

  it('rejects digits, spelled-out numbers, and a stale seq', () => {
    const current = state({ currentSlideId: 's2_lebron', lastAppliedSeq: 9 });
    const digit = reduceAddCallout(current, {
      slide_id: 's2_lebron',
      seq: 10,
      callout_id: 'c9',
      text: 'He scores 40 a night',
    });
    expect(digit.ok).toBe(false);
    if (!digit.ok) expect(digit.code).toBe(RPC_ERROR.CALLOUT_REJECTED);

    const spelled = reduceAddCallout(current, {
      slide_id: 's2_lebron',
      seq: 10,
      callout_id: 'c9',
      text: 'LeBron scores forty a night',
    });
    expect(spelled.ok).toBe(false);

    const stale = reduceAddCallout(
      { ...current, callouts: [{ callout_id: 'c1', text: 'Stay home' }] },
      { slide_id: 's2_lebron', seq: 8, callout_id: 'c2', text: 'Help early' }
    );
    expect(stale.ok).toBe(true);
    if (!stale.ok) return;
    expect(stale.ack).toMatchObject({ applied: false, reason: 'stale', active: ['c1'] });
  });

  it('rejects short and long text as 2005, not 2002', () => {
    const current = state({ currentSlideId: 's2_lebron', lastAppliedSeq: 4 });
    const short = reduceAddCallout(current, {
      slide_id: 's2_lebron',
      seq: 5,
      callout_id: 'c5',
      text: 'no',
    });
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.code).toBe(RPC_ERROR.CALLOUT_REJECTED);

    const long = reduceAddCallout(current, {
      slide_id: 's2_lebron',
      seq: 5,
      callout_id: 'c5',
      text: 'x'.repeat(61),
    });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.code).toBe(RPC_ERROR.CALLOUT_REJECTED);
  });

  it('accepts padded valid text and stores the trimmed note', () => {
    const current = state({ currentSlideId: 's2_lebron', lastAppliedSeq: 4 });
    const result = reduceAddCallout(current, {
      slide_id: 's2_lebron',
      seq: 5,
      callout_id: 'c5',
      text: '  Iguodala on LeBron  ',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ack).toMatchObject({ applied: true, callout_id: 'c5' });
    expect(result.state.callouts).toEqual([{ callout_id: 'c5', text: 'Iguodala on LeBron' }]);
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
        play: { play_id: 'p_switch_kyrie', seq: 7 },
        callouts: [{ callout_id: 'c4', text: 'Stay home' }],
      }),
    });
    expect(seeded.currentSlideId).toBe('s3_kyrie');
    expect(seeded.lastAppliedSeq).toBe(8);
    expect(seeded.highlights).toEqual(['cle_irving']);
    expect(seeded.play).toEqual({ play_id: 'p_switch_kyrie', seq: 7 });
    expect(seeded.callouts).toEqual([{ callout_id: 'c4', text: 'Stay home' }]);
    expect(seeded.playAnimate).toBe(false);
  });
});

describe('seedDeckFromAgent', () => {
  it('resets lastAppliedSeq when the agent identity changes', () => {
    const current = state({
      currentSlideId: 's4_offense',
      lastAppliedSeq: 10,
      highlights: ['cle_james'],
    });
    const next = seedDeckFromAgent(current, 'agent-old', {
      identity: 'agent-new',
      attributes: { current_slide: 's1_tipoff', slide_seq: '0' },
    });
    expect(next.agentIdentity).toBe('agent-new');
    expect(next.state.lastAppliedSeq).toBe(0);
    expect(next.state.ready).toBe(true);
  });

  it('does not rewind seq for the same agent identity', () => {
    const current = state({ currentSlideId: 's4_offense', lastAppliedSeq: 10 });
    const next = seedDeckFromAgent(current, 'agent-same', {
      identity: 'agent-same',
      attributes: { current_slide: 's1_tipoff', slide_seq: '1' },
    });
    expect(next.state).toEqual(current);
  });

  it('keeps playAnimate through a same-seq overlay echo after RPC', () => {
    const current = state({
      currentSlideId: 's2_lebron',
      lastAppliedSeq: 5,
      play: { play_id: 'p_blitz_lebron_pnr', seq: 5 },
      playAnimate: true,
    });
    const next = seedDeckFromAgent(current, 'agent-same', {
      identity: 'agent-same',
      attributes: overlayAttributes({
        slide_id: 's2_lebron',
        seq: 5,
        play: { play_id: 'p_blitz_lebron_pnr', seq: 5 },
      }),
    });
    expect(next.state).toEqual(current);
    expect(next.state.playAnimate).toBe(true);
  });

  it('animates a new play.seq after the initial connect snap', () => {
    const initial = seedDeckFromAgent(state({ ready: true }), null, {
      identity: 'agent-same',
      attributes: overlayAttributes({
        slide_id: 's2_lebron',
        seq: 3,
        play: { play_id: 'p_blitz_lebron_pnr', seq: 3 },
      }),
    });
    expect(initial.state.playAnimate).toBe(false);
    expect(initial.state.play).toEqual({ play_id: 'p_blitz_lebron_pnr', seq: 3 });

    const later = seedDeckFromAgent(initial.state, 'agent-same', {
      identity: 'agent-same',
      attributes: overlayAttributes({
        slide_id: 's2_lebron',
        seq: 8,
        play: { play_id: 'p_blitz_lebron_pnr', seq: 8 },
      }),
    });
    expect(later.state.lastAppliedSeq).toBe(8);
    expect(later.state.play).toEqual({ play_id: 'p_blitz_lebron_pnr', seq: 8 });
    expect(later.state.playAnimate).toBe(true);
  });

  it('keeps an in-flight play animating when highlight or callout seq advances', () => {
    const current = state({
      currentSlideId: 's2_lebron',
      lastAppliedSeq: 5,
      highlights: ['cle_james'],
      play: { play_id: 'p_blitz_lebron_pnr', seq: 5 },
      callouts: [],
      playAnimate: true,
    });
    const next = seedDeckFromAgent(current, 'agent-same', {
      identity: 'agent-same',
      attributes: overlayAttributes({
        slide_id: 's2_lebron',
        seq: 7,
        highlights: ['cle_james', 'gsw_green'],
        play: { play_id: 'p_blitz_lebron_pnr', seq: 5 },
        callouts: [{ callout_id: 'c7', text: 'Iguodala on LeBron' }],
      }),
    });
    expect(next.state.lastAppliedSeq).toBe(7);
    expect(next.state.highlights).toEqual(['cle_james', 'gsw_green']);
    expect(next.state.callouts).toEqual([{ callout_id: 'c7', text: 'Iguodala on LeBron' }]);
    expect(next.state.play).toEqual({ play_id: 'p_blitz_lebron_pnr', seq: 5 });
    expect(next.state.playAnimate).toBe(true);
  });
});

describe('markDeckReady', () => {
  it('starts unready so 2003 can fire, then ready on mount', () => {
    expect(initialDeckState.ready).toBe(false);
    expect(reduceShowSlide(initialDeckState, { slide_id: 's1_tipoff', seq: 1 }).ok).toBe(false);
    const mounted = markDeckReady(initialDeckState);
    const result = reduceShowSlide(mounted, { slide_id: 's1_tipoff', seq: 1 });
    expect(result.ok).toBe(true);
  });
});
