import { SLIDE_IDS, type SlideId } from '@/lib/deck/commands';

export const SLIDE_PUSH_MS = 320;

export type SlidePushDirection = 'forward' | 'backward' | 'none';

export type SlidePushPlan = {
  fromId: string | null;
  toId: string;
  seq: number;
  direction: SlidePushDirection;
  animate: boolean;
};

export function slideIndex(slideId: string | null): number {
  if (!slideId) return -1;
  return (SLIDE_IDS as readonly string[]).indexOf(slideId);
}

export function slidePushDirection(fromId: string | null, toId: string): SlidePushDirection {
  if (!fromId || fromId === toId) return 'none';
  const from = slideIndex(fromId);
  const to = slideIndex(toId);
  if (from < 0 || to < 0) return 'forward';
  if (to < from) return 'backward';
  return 'forward';
}

export function planSlidePush({
  fromId,
  fromSeq,
  toId,
  toSeq,
  animating,
  reducedMotion,
}: {
  fromId: string | null;
  fromSeq: number;
  toId: string;
  toSeq: number;
  animating: boolean;
  reducedMotion: boolean;
}): SlidePushPlan | null {
  if (toSeq < fromSeq) return null;
  if (fromId === toId && toSeq === fromSeq) return null;

  const direction = slidePushDirection(fromId, toId);
  const animate =
    !reducedMotion && !animating && direction !== 'none' && fromId !== null && fromId !== toId;

  return {
    fromId,
    toId,
    seq: toSeq,
    direction,
    animate,
  };
}

export function isKnownSlideId(id: string): id is SlideId {
  return (SLIDE_IDS as readonly string[]).includes(id);
}

export function dsegText(value: string): string {
  return value.replace(/ /g, '!');
}
