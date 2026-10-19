import { type RpcInvocationData } from 'livekit-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type DeckCommandState, initialDeckState } from '@/lib/deck/commands';
import { AFTER_PAINT_FALLBACK_MS, afterNextPaint, bindDeckRpc } from '@/lib/deck/rpc';

const mountedState: DeckCommandState = { ...initialDeckState, ready: true };

function invocation(payload: unknown): RpcInvocationData {
  return {
    requestId: 'req-1',
    callerIdentity: 'agent',
    payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
    responseTimeout: 3000,
  };
}

function fakeRoom() {
  const handlers = new Map<string, (data: RpcInvocationData) => Promise<string>>();
  return {
    handlers,
    registerRpcMethod: vi.fn(
      (method: string, handler: (data: RpcInvocationData) => Promise<string>) => {
        handlers.set(method, handler);
      }
    ),
    unregisterRpcMethod: vi.fn((method: string) => {
      handlers.delete(method);
    }),
  };
}

describe('afterNextPaint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('resolves immediately when the document is hidden', async () => {
    const raf = vi.fn();
    vi.stubGlobal('document', { visibilityState: 'hidden' });
    vi.stubGlobal('requestAnimationFrame', raf);
    await afterNextPaint();
    expect(raf).not.toHaveBeenCalled();
  });

  it('races two animation frames against a fallback timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('document', { visibilityState: 'visible' });
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    const pending = afterNextPaint();
    await vi.advanceTimersByTimeAsync(AFTER_PAINT_FALLBACK_MS);
    await pending;
  });
});

describe('bindDeckRpc', () => {
  it('unregisters show_slide and highlight on cleanup', () => {
    const room = fakeRoom();
    let current = mountedState;
    const unbind = bindDeckRpc(
      room,
      () => current,
      (next) => {
        current = next;
      },
      async () => undefined
    );
    expect([...room.handlers.keys()].sort()).toEqual(['highlight', 'show_slide']);
    unbind();
    expect(room.unregisterRpcMethod).toHaveBeenCalledWith('show_slide');
    expect(room.unregisterRpcMethod).toHaveBeenCalledWith('highlight');
    expect(room.handlers.size).toBe(0);
  });

  it('throws RpcError 2001 for an unknown slide id', async () => {
    const room = fakeRoom();
    let current = mountedState;
    bindDeckRpc(
      room,
      () => current,
      (next) => {
        current = next;
      },
      async () => undefined
    );
    const handler = room.handlers.get('show_slide');
    await expect(handler?.(invocation({ slide_id: 's9_nope', seq: 1 }))).rejects.toMatchObject({
      code: 2001,
    });
  });

  it('acks an applied show_slide after paint', async () => {
    const room = fakeRoom();
    let current: DeckCommandState = mountedState;
    const afterPaint = vi.fn(async () => undefined);
    bindDeckRpc(
      room,
      () => current,
      (next) => {
        current = next;
      },
      afterPaint
    );
    const ack = await room.handlers.get('show_slide')?.(
      invocation({ slide_id: 's3_kyrie', seq: 4 })
    );
    expect(afterPaint).toHaveBeenCalledOnce();
    expect(JSON.parse(ack ?? '{}')).toEqual({
      ok: true,
      slide_id: 's3_kyrie',
      seq: 4,
      applied: true,
    });
    expect(current.currentSlideId).toBe('s3_kyrie');
  });
});
