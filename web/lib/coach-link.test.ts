import { RpcError, type RpcInvocationData } from 'livekit-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindCoachLinkRpc, coachLinkFromPayload, isCoachJoinUrl } from '@/lib/coach-link';

const VALID = 'http://localhost:3013/coach?room=fr-0123456789abcdef';

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

describe('isCoachJoinUrl', () => {
  it('accepts an http(s) /coach?room= link', () => {
    expect(isCoachJoinUrl(VALID)).toBe(true);
    expect(isCoachJoinUrl('https://chalk.example/base/coach?room=fr-0123456789abcdef')).toBe(true);
    expect(isCoachJoinUrl('http://localhost:3000/coach/?room=fr-0123456789abcdef')).toBe(true);
  });

  it('rejects non-http schemes, other paths, and bad room ids', () => {
    expect(isCoachJoinUrl('javascript:alert(1)')).toBe(false);
    expect(isCoachJoinUrl('http://localhost:3013/player?room=fr-0123456789abcdef')).toBe(false);
    expect(isCoachJoinUrl('http://localhost:3013/coach')).toBe(false);
    expect(isCoachJoinUrl('http://localhost:3013/coach?room=fr-ABCDEF0123456789')).toBe(false);
    expect(isCoachJoinUrl('http://localhost:3013/coach?room=fr-short')).toBe(false);
    expect(isCoachJoinUrl('http://user:pass@localhost:3013/coach?room=fr-0123456789abcdef')).toBe(
      false
    );
  });
});

describe('coachLinkFromPayload', () => {
  it('returns the url from a valid payload', () => {
    expect(coachLinkFromPayload(JSON.stringify({ url: VALID }))).toBe(VALID);
  });

  it('throws RpcError 2002 for a bad payload or url', () => {
    expect(() => coachLinkFromPayload('not-json')).toThrow(RpcError);
    expect(() => coachLinkFromPayload(JSON.stringify({ url: 'http://evil.test/nope' }))).toThrow(
      RpcError
    );
    try {
      coachLinkFromPayload('not-json');
    } catch (error) {
      expect(error).toBeInstanceOf(RpcError);
      expect((error as RpcError).code).toBe(2002);
    }
  });
});

describe('bindCoachLinkRpc', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('acks after paint and unregisters on cleanup', async () => {
    const room = fakeRoom();
    const seen: string[] = [];
    const unbind = bindCoachLinkRpc(
      room,
      (url) => {
        seen.push(url);
      },
      async () => undefined
    );
    const handler = room.handlers.get('show_coach_link');
    expect(handler).toBeTypeOf('function');
    await expect(handler?.(invocation({ url: VALID }))).resolves.toBe(JSON.stringify({ ok: true }));
    expect(seen).toEqual([VALID]);
    unbind();
    expect(room.unregisterRpcMethod).toHaveBeenCalledWith('show_coach_link');
    expect(room.handlers.size).toBe(0);
  });

  it('does not publish a link when the url is rejected', async () => {
    const room = fakeRoom();
    const seen: string[] = [];
    bindCoachLinkRpc(
      room,
      (url) => {
        seen.push(url);
      },
      async () => undefined
    );
    const handler = room.handlers.get('show_coach_link');
    await expect(
      handler?.(invocation({ url: 'file:///coach?room=fr-0123456789abcdef' }))
    ).rejects.toBeInstanceOf(RpcError);
    expect(seen).toEqual([]);
  });
});
