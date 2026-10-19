import { RpcError, type RpcInvocationData } from 'livekit-client';
import {
  type DeckCommandState,
  reduceAddCallout,
  reduceHighlight,
  reduceRunPlay,
  reduceShowSlide,
} from '@/lib/deck/commands';

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

function parsePayload(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new RpcError(2002, 'malformed payload');
  }
}

export function bindDeckRpc(
  room: DeckRpcHost,
  getState: () => DeckCommandState,
  setState: (state: DeckCommandState) => void,
  afterPaint: () => Promise<void> = afterNextPaint
): () => void {
  const handle = async (
    reducer: (state: DeckCommandState, payload: unknown) => ReturnType<typeof reduceShowSlide>,
    data: RpcInvocationData
  ) => {
    const result = reducer(getState(), parsePayload(data.payload));
    if (!result.ok) {
      throw new RpcError(result.code, result.message);
    }
    setState(result.state);
    if (result.ack.applied) {
      await afterPaint();
    }
    return JSON.stringify(result.ack);
  };

  const handleShowSlide = (data: RpcInvocationData) => handle(reduceShowSlide, data);
  const handleHighlight = (data: RpcInvocationData) => handle(reduceHighlight, data);
  const handleRunPlay = (data: RpcInvocationData) => handle(reduceRunPlay, data);
  const handleAddCallout = (data: RpcInvocationData) => handle(reduceAddCallout, data);

  room.registerRpcMethod('show_slide', handleShowSlide);
  room.registerRpcMethod('highlight', handleHighlight);
  room.registerRpcMethod('run_play', handleRunPlay);
  room.registerRpcMethod('add_callout', handleAddCallout);

  return () => {
    room.unregisterRpcMethod('show_slide');
    room.unregisterRpcMethod('highlight');
    room.unregisterRpcMethod('run_play');
    room.unregisterRpcMethod('add_callout');
  };
}
