import { calloutRuleReason } from '@/lib/deck/callout';
import deck from '@/lib/deck/deck.json';
import { playDurationMs } from '@/lib/deck/plays';
import type { DeckPlay } from '@/lib/deck/types';

export const SLIDE_IDS = [
  's1_tipoff',
  's2_lebron',
  's3_kyrie',
  's4_offense',
  's5_xfactors',
  's6_last_two',
] as const;

export type SlideId = (typeof SLIDE_IDS)[number];

export const HIGHLIGHT_SLIDE_IDS = ['s2_lebron', 's3_kyrie', 's4_offense', 's6_last_two'] as const;
export const PLAY_SLIDE_IDS = ['s2_lebron', 's3_kyrie', 's4_offense'] as const;

export const RPC_ERROR = {
  UNKNOWN_SLIDE: 2001,
  MALFORMED: 2002,
  NOT_READY: 2003,
  UNKNOWN_TARGET: 2004,
  CALLOUT_REJECTED: 2005,
  UNKNOWN_PLAY: 2006,
  SLIDE_MISMATCH: 2007,
} as const;

export type RpcErrorCode = (typeof RPC_ERROR)[keyof typeof RPC_ERROR];

export type OverlayCallout = {
  callout_id: string;
  fact_id?: string;
  text?: string;
};

export type OverlayState = {
  v: 1;
  slide_id: string;
  seq: number;
  highlights: string[];
  play: { play_id: string; seq: number } | null;
  callouts: OverlayCallout[];
};

export type DeckCommandState = {
  ready: boolean;
  currentSlideId: string | null;
  lastAppliedSeq: number;
  highlights: string[];
  play: { play_id: string; seq: number } | null;
  callouts: OverlayCallout[];
  playAnimate: boolean;
};

export const initialDeckState: DeckCommandState = {
  ready: false,
  currentSlideId: null,
  lastAppliedSeq: 0,
  highlights: [],
  play: null,
  callouts: [],
  playAnimate: false,
};

export function markDeckReady(state: DeckCommandState): DeckCommandState {
  return state.ready ? state : { ...state, ready: true };
}

export type ShowSlideAck = {
  ok: true;
  slide_id: string;
  seq: number;
  applied: boolean;
  reason?: 'stale';
};

export type HighlightAck = {
  ok: true;
  seq: number;
  applied: boolean;
  reason?: 'stale';
  target?: string;
  active: string[];
};

export type RunPlayAck = {
  ok: true;
  seq: number;
  applied: boolean;
  reason?: 'stale';
  play_id?: string;
  duration_ms: number;
};

export type AddCalloutAck = {
  ok: true;
  seq: number;
  applied: boolean;
  reason?: 'stale';
  callout_id?: string;
  active: string[];
};

export type DeckCommandAck = ShowSlideAck | HighlightAck | RunPlayAck | AddCalloutAck;

export type DeckCommandFailure = {
  ok: false;
  code: RpcErrorCode;
  message: string;
};

export type ReduceResult =
  | { ok: true; state: DeckCommandState; ack: DeckCommandAck }
  | (DeckCommandFailure & { state: DeckCommandState });

type DeckJson = {
  slides: Array<{
    id: string;
    title: string;
    diagram: { markers?: Record<string, unknown>; zones?: string[] } | null;
    cards?: Array<{ id: string }>;
  }>;
  plays: DeckPlay[];
};

const DECK = deck as DeckJson;

const SLIDE_ID_SET = new Set<string>(SLIDE_IDS);
const HIGHLIGHT_SLIDE_SET = new Set<string>(HIGHLIGHT_SLIDE_IDS);
const PLAY_SLIDE_SET = new Set<string>(PLAY_SLIDE_IDS);

export function isSlideId(value: string): value is SlideId {
  return SLIDE_ID_SET.has(value);
}

export function slideById(slideId: string) {
  return DECK.slides.find((slide) => slide.id === slideId);
}

export function playById(playId: string) {
  return DECK.plays.find((play) => play.id === playId);
}

export function slideTitle(slideId: string | null): string | null {
  if (!slideId) {
    return null;
  }
  return slideById(slideId)?.title ?? null;
}

export function targetsOnSlide(slideId: string): string[] {
  const slide = slideById(slideId);
  if (!slide) {
    return [];
  }
  const diagram = slide.diagram ?? { markers: {}, zones: [] };
  const markers = Object.keys(diagram.markers ?? {});
  const zones = diagram.zones ?? [];
  const cards = (slide.cards ?? []).map((card) => card.id);
  return [...markers, ...zones, ...cards];
}

export function emptyOverlay(slideId: string, seq: number): OverlayState {
  return {
    v: 1,
    slide_id: slideId,
    seq,
    highlights: [],
    play: null,
    callouts: [],
  };
}

export function parseOverlayState(raw: string | undefined): OverlayState | null {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw) as OverlayState;
    if (value?.v !== 1 || typeof value.slide_id !== 'string' || typeof value.seq !== 'number') {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asPositiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

function fail(state: DeckCommandState, code: RpcErrorCode, message: string): ReduceResult {
  return { ok: false, code, message, state };
}

function onlyKeys(payload: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(payload).every((key) => allowed.includes(key));
}

export function reduceShowSlide(state: DeckCommandState, payload: unknown): ReduceResult {
  if (!state.ready) {
    return fail(state, RPC_ERROR.NOT_READY, 'deck not mounted');
  }
  if (!isRecord(payload) || !onlyKeys(payload, ['slide_id', 'seq'])) {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  const seq = asPositiveInt(payload.seq);
  const slideId = payload.slide_id;
  if (seq === null || typeof slideId !== 'string') {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  if (!isSlideId(slideId) || !slideById(slideId)) {
    return fail(state, RPC_ERROR.UNKNOWN_SLIDE, `unknown slide_id ${slideId}`);
  }
  if (seq <= state.lastAppliedSeq) {
    return {
      ok: true,
      state,
      ack: {
        ok: true,
        slide_id: state.currentSlideId ?? slideId,
        seq,
        applied: false,
        reason: 'stale',
      },
    };
  }
  const next: DeckCommandState = {
    ...state,
    currentSlideId: slideId,
    lastAppliedSeq: seq,
    highlights: [],
    play: null,
    callouts: [],
    playAnimate: false,
  };
  return {
    ok: true,
    state: next,
    ack: { ok: true, slide_id: slideId, seq, applied: true },
  };
}

export function reduceHighlight(state: DeckCommandState, payload: unknown): ReduceResult {
  if (!state.ready) {
    return fail(state, RPC_ERROR.NOT_READY, 'deck not mounted');
  }
  if (!isRecord(payload) || !onlyKeys(payload, ['slide_id', 'seq', 'target'])) {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  const seq = asPositiveInt(payload.seq);
  const slideId = payload.slide_id;
  const target = payload.target;
  if (seq === null || typeof slideId !== 'string' || typeof target !== 'string') {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  if (!HIGHLIGHT_SLIDE_SET.has(slideId)) {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  const allowed = targetsOnSlide(slideId);
  if (!allowed.includes(target)) {
    return fail(state, RPC_ERROR.UNKNOWN_TARGET, `unknown target ${target}`);
  }
  if (slideId !== state.currentSlideId) {
    return fail(state, RPC_ERROR.SLIDE_MISMATCH, 'slide mismatch');
  }
  if (seq <= state.lastAppliedSeq) {
    return {
      ok: true,
      state,
      ack: {
        ok: true,
        seq,
        applied: false,
        reason: 'stale',
        target,
        active: state.highlights,
      },
    };
  }
  const without = state.highlights.filter((item) => item !== target);
  const active = [...without, target].slice(-2);
  const next: DeckCommandState = {
    ...state,
    lastAppliedSeq: seq,
    highlights: active,
  };
  return {
    ok: true,
    state: next,
    ack: { ok: true, seq, applied: true, target, active },
  };
}

export function reduceRunPlay(state: DeckCommandState, payload: unknown): ReduceResult {
  if (!state.ready) {
    return fail(state, RPC_ERROR.NOT_READY, 'deck not mounted');
  }
  if (!isRecord(payload) || !onlyKeys(payload, ['slide_id', 'seq', 'play_id'])) {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  const seq = asPositiveInt(payload.seq);
  const slideId = payload.slide_id;
  const playId = payload.play_id;
  if (seq === null || typeof slideId !== 'string' || typeof playId !== 'string') {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  if (!PLAY_SLIDE_SET.has(slideId)) {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  const play = playById(playId);
  if (!play || play.slide_id !== slideId) {
    return fail(state, RPC_ERROR.UNKNOWN_PLAY, `unknown play_id ${playId}`);
  }
  if (slideId !== state.currentSlideId) {
    return fail(state, RPC_ERROR.SLIDE_MISMATCH, 'slide mismatch');
  }
  const durationMs = playDurationMs(play);
  if (seq <= state.lastAppliedSeq) {
    return {
      ok: true,
      state,
      ack: {
        ok: true,
        seq,
        applied: false,
        reason: 'stale',
        play_id: playId,
        duration_ms: durationMs,
      },
    };
  }
  const next: DeckCommandState = {
    ...state,
    lastAppliedSeq: seq,
    play: { play_id: playId, seq },
    playAnimate: true,
  };
  return {
    ok: true,
    state: next,
    ack: { ok: true, seq, applied: true, play_id: playId, duration_ms: durationMs },
  };
}

export function reduceAddCallout(state: DeckCommandState, payload: unknown): ReduceResult {
  if (!state.ready) {
    return fail(state, RPC_ERROR.NOT_READY, 'deck not mounted');
  }
  if (
    !isRecord(payload) ||
    !onlyKeys(payload, ['slide_id', 'seq', 'callout_id', 'fact_id', 'text'])
  ) {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  const seq = asPositiveInt(payload.seq);
  const slideId = payload.slide_id;
  const calloutId = payload.callout_id;
  const factId = payload.fact_id;
  const text = payload.text;
  if (seq === null || typeof slideId !== 'string' || typeof calloutId !== 'string') {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  if (!isSlideId(slideId) || !slideById(slideId)) {
    return fail(state, RPC_ERROR.UNKNOWN_SLIDE, `unknown slide_id ${slideId}`);
  }
  const hasFact = typeof factId === 'string';
  const hasText = typeof text === 'string';
  if (hasFact === hasText) {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  if (hasText && (text.length < 3 || text.length > 60)) {
    return fail(state, RPC_ERROR.MALFORMED, 'malformed payload');
  }
  const rule = calloutRuleReason(hasFact ? factId : null, hasText ? text : null);
  if (rule) {
    return fail(state, RPC_ERROR.CALLOUT_REJECTED, rule);
  }
  if (slideId !== state.currentSlideId) {
    return fail(state, RPC_ERROR.SLIDE_MISMATCH, 'slide mismatch');
  }
  if (seq <= state.lastAppliedSeq) {
    return {
      ok: true,
      state,
      ack: {
        ok: true,
        seq,
        applied: false,
        reason: 'stale',
        callout_id: calloutId,
        active: state.callouts.map((item) => item.callout_id),
      },
    };
  }
  const incoming: OverlayCallout = { callout_id: calloutId };
  if (hasFact) incoming.fact_id = factId;
  if (hasText) incoming.text = text;
  const without = state.callouts.filter((item) => item.callout_id !== calloutId);
  const callouts = [...without, incoming].slice(-3);
  const next: DeckCommandState = {
    ...state,
    lastAppliedSeq: seq,
    callouts,
  };
  return {
    ok: true,
    state: next,
    ack: {
      ok: true,
      seq,
      applied: true,
      callout_id: calloutId,
      active: callouts.map((item) => item.callout_id),
    },
  };
}

export function stateFromAgentAttributes(attributes: Record<string, string>): DeckCommandState {
  const overlay = parseOverlayState(attributes.overlay_state);
  const slideSeq = Number.parseInt(attributes.slide_seq ?? '0', 10);
  const seq = Math.max(overlay?.seq ?? 0, Number.isFinite(slideSeq) ? slideSeq : 0);
  const slideId = attributes.current_slide || overlay?.slide_id || null;
  const matching = overlay && overlay.slide_id === slideId;
  return {
    ready: false,
    currentSlideId: slideId && isSlideId(slideId) ? slideId : slideId,
    lastAppliedSeq: seq,
    highlights: matching ? overlay.highlights.slice(0, 2) : [],
    play: matching ? overlay.play : null,
    callouts: matching ? overlay.callouts.slice(0, 3) : [],
    playAnimate: false,
  };
}

export function seedDeckFromAgent(
  state: DeckCommandState,
  prevAgentIdentity: string | null,
  agent: { identity: string; attributes: Record<string, string> } | undefined
): { agentIdentity: string | null; state: DeckCommandState } {
  if (!agent) {
    return { agentIdentity: prevAgentIdentity, state };
  }
  const seeded = {
    ...stateFromAgentAttributes(agent.attributes),
    ready: state.ready,
  };
  if (prevAgentIdentity !== null && prevAgentIdentity !== agent.identity) {
    return { agentIdentity: agent.identity, state: seeded };
  }
  if (seeded.lastAppliedSeq < state.lastAppliedSeq) {
    return { agentIdentity: agent.identity, state };
  }
  return { agentIdentity: agent.identity, state: seeded };
}
