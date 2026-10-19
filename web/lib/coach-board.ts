import {
  type OverlayCallout,
  type OverlayState,
  type SlideId,
  isSlideId,
  parseOverlayState,
} from '@/lib/deck/commands';

export type CoachBoard = {
  seen: boolean;
  slideId: SlideId | null;
  seq: number;
  highlights: string[];
  play: { play_id: string; seq: number } | null;
  callouts: OverlayCallout[];
  playAnimate: boolean;
  mode: string | null;
  agentState: string | null;
};

export const emptyCoachBoard: CoachBoard = {
  seen: false,
  slideId: null,
  seq: 0,
  highlights: [],
  play: null,
  callouts: [],
  playAnimate: false,
  mode: null,
  agentState: null,
};

function matchingOverlay(
  slideId: string | null,
  overlay: OverlayState | null
): OverlayState | null {
  if (!overlay || !slideId || overlay.slide_id !== slideId) {
    return null;
  }
  return overlay;
}

export function coachBoardFromAgent(
  previous: CoachBoard,
  attributes: Record<string, string> | undefined
): CoachBoard {
  if (!attributes) {
    return previous;
  }
  const rawSlide = attributes.current_slide ?? null;
  const slideId = rawSlide && isSlideId(rawSlide) ? rawSlide : null;
  const overlay = matchingOverlay(slideId, parseOverlayState(attributes.overlay_state));
  const play = overlay?.play ?? null;
  const seqFromOverlay = overlay?.seq;
  const seqFromAttr = Number(attributes.slide_seq);
  const seq =
    typeof seqFromOverlay === 'number'
      ? seqFromOverlay
      : Number.isInteger(seqFromAttr) && seqFromAttr >= 0
        ? seqFromAttr
        : previous.seq;
  const playChanged = previous.seen && play !== null && play.seq !== previous.play?.seq;
  const playAnimate =
    playChanged || (previous.playAnimate && play !== null && play.seq === previous.play?.seq);
  return {
    seen: slideId !== null || previous.seen,
    slideId: slideId ?? (previous.seen ? previous.slideId : null),
    seq,
    highlights: overlay?.highlights ?? [],
    play,
    callouts: overlay?.callouts ?? [],
    playAnimate,
    mode: attributes.mode ?? null,
    agentState: attributes['lk.agent.state'] ?? null,
  };
}
