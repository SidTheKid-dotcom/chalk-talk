import { RpcError, type RpcInvocationData } from 'livekit-client';
import type { DeckRpcHost } from '@/lib/deck/rpc';

/** Same room ids the token route accepts. Kept here so the client does not import the server SDK. */
const COACH_ROOM_PATTERN = /^fr-[0-9a-f]{16}$/;

export const COACH_LINK_METHOD = 'show_coach_link';

export function isCoachJoinUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }
  if (url.username || url.password) {
    return false;
  }
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (!/(^|\/)coach$/.test(path)) {
    return false;
  }
  const room = url.searchParams.get('room');
  return room !== null && COACH_ROOM_PATTERN.test(room);
}

export function coachLinkFromPayload(payload: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new RpcError(2002, 'malformed payload');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new RpcError(2002, 'malformed payload');
  }
  const url = 'url' in parsed ? parsed.url : undefined;
  if (typeof url !== 'string') {
    throw new RpcError(2002, 'malformed payload');
  }
  if (!isCoachJoinUrl(url)) {
    throw new RpcError(2002, 'invalid coach link');
  }
  return url;
}

export function bindCoachLinkRpc(
  room: DeckRpcHost,
  onLink: (url: string) => void,
  afterPaint: () => Promise<void>
): () => void {
  const handle = async (data: RpcInvocationData) => {
    const url = coachLinkFromPayload(data.payload);
    onLink(url);
    await afterPaint();
    return JSON.stringify({ ok: true });
  };

  room.registerRpcMethod(COACH_LINK_METHOD, handle);
  return () => {
    room.unregisterRpcMethod(COACH_LINK_METHOD);
  };
}
