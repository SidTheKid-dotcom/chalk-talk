import { RpcError, type RpcInvocationData } from 'livekit-client';
import { type DeckCommandState, reduceHighlight, reduceShowSlide } from '@/lib/deck/commands';

export type DeckRpcHost = {
  registerRpcMethod: (
    method: string,
    handler: (data: RpcInvocationData) => Promise<string>
  ) => void;
  unregisterRpcMethod: (method: string) => void;
};

export const AFTER_PAINT_FALLBACK_MS = 100;

/**
 * Two animation frames: the first runs before the next paint, the second after
 * that paint. That is the point the slide (or highlight) is on screen, so the
 * RPC ack matches "after paint" in ARCHITECTURE.md.
 *
 * rAF pauses in a background tab, so a hidden document acks immediately and a
 * visible tab races the frames against a short timeout. A frozen tab never
 * runs this helper; the agent bounds that wait with max_round_trip_latency.
 */
export function afterNextPaint(): Promise<void> {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return Promise.resolve();
  }
  if (typeof requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve();
    };
    const timer = setTimeout(finish, AFTER_PAINT_FALLBACK_MS);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clearTimeout(timer);
        finish();
      });
    });
  });
}

export function bindDeckRpc(
  room: DeckRpcHost,
  getState: () => DeckCommandState,
  setState: (state: DeckCommandState) => void,
  afterPaint: () => Promise<void> = afterNextPaint
): () => void {
  const handleShowSlide = async (data: RpcInvocationData) => {
    let payload: unknown;
    try {
      payload = JSON.parse(data.payload);
    } catch {
      throw new RpcError(2002, 'malformed payload');
    }
    const result = reduceShowSlide(getState(), payload);
    if (!result.ok) {
      throw new RpcError(result.code, result.message);
    }
    setState(result.state);
    if (result.ack.applied) {
      await afterPaint();
    }
    return JSON.stringify(result.ack);
  };

  const handleHighlight = async (data: RpcInvocationData) => {
    let payload: unknown;
    try {
      payload = JSON.parse(data.payload);
    } catch {
      throw new RpcError(2002, 'malformed payload');
    }
    const result = reduceHighlight(getState(), payload);
    if (!result.ok) {
      throw new RpcError(result.code, result.message);
    }
    setState(result.state);
    if (result.ack.applied) {
      await afterPaint();
    }
    return JSON.stringify(result.ack);
  };

  room.registerRpcMethod('show_slide', handleShowSlide);
  room.registerRpcMethod('highlight', handleHighlight);

  return () => {
    room.unregisterRpcMethod('show_slide');
    room.unregisterRpcMethod('highlight');
  };
}
