import { type RpcInvocationData } from 'livekit-client';
import { describe, expect, it, vi } from 'vitest';
import { type DeckCommandState, initialDeckState } from '@/lib/deck/commands';
import { bindDeckRpc } from '@/lib/deck/rpc';

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

describe('bindDeckRpc', () => {
  it('unregisters show_slide and highlight on cleanup', () => {
    const room = fakeRoom();
    let current = initialDeckState;
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
    let current = initialDeckState;
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
    let current: DeckCommandState = initialDeckState;
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
