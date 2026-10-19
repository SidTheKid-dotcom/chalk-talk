import {
  AccessToken,
  RoomAgentDispatch,
  RoomConfiguration,
  TrackSource,
  type VideoGrant,
} from 'livekit-server-sdk';

export const TOKEN_TTL = '15m';

export const PLAYER_ROOM_PATTERN = /^fr-[0-9a-f]{16}$/;
export const PLAYER_EMPTY_TIMEOUT_S = 60;
export const PLAYER_DEPARTURE_TIMEOUT_S = 20;
export const PLAYER_MAX_PARTICIPANTS = 4;

export type TokenRole = 'player' | 'coach';

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export type ParsedTokenRequest =
  | { ok: true; role: 'player' }
  | { ok: true; role: 'coach'; room: string }
  | { ok: false; status: 400; error: string };

const HUMAN_GRANTS: VideoGrant = {
  roomJoin: true,
  canPublish: true,
  canSubscribe: true,
  canPublishData: true,
  canPublishSources: [TrackSource.MICROPHONE, TrackSource.CAMERA],
};

export function randomSuffix(length = 10): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, length);
}

export function createRoomName(): string {
  return `fr-${randomSuffix(16)}`;
}

export function isPlayerRoomName(room: string): boolean {
  return PLAYER_ROOM_PATTERN.test(room);
}

export function createIdentity(role: TokenRole): string {
  return `${role}-${randomSuffix()}`;
}

export function participantNameFor(role: TokenRole): string {
  return role === 'player' ? 'Player' : 'Coach';
}

export function livekitHttpUrl(livekitUrl: string): string {
  return livekitUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
}

export function parseTokenRequest(body: unknown): ParsedTokenRequest {
  if (body === null || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Invalid JSON body' };
  }

  const role = 'role' in body ? body.role : undefined;
  const room = 'room' in body ? body.room : undefined;

  if (role === 'player') {
    return { ok: true, role: 'player' };
  }

  if (role === 'coach') {
    if (typeof room !== 'string' || room.length === 0) {
      return { ok: false, status: 400, error: 'room is required for coach' };
    }
    if (!isPlayerRoomName(room)) {
      return { ok: false, status: 400, error: 'Invalid room' };
    }
    return { ok: true, role: 'coach', room };
  }

  return { ok: false, status: 400, error: 'Unknown role' };
}

export async function mintHumanToken(options: {
  apiKey: string;
  apiSecret: string;
  role: TokenRole;
  roomName: string;
  agentName?: string;
}): Promise<{ token: string; identity: string; participantName: string }> {
  const identity = createIdentity(options.role);
  const participantName = participantNameFor(options.role);

  const at = new AccessToken(options.apiKey, options.apiSecret, {
    identity,
    name: participantName,
    ttl: TOKEN_TTL,
    attributes: { role: options.role },
  });

  at.addGrant({
    ...HUMAN_GRANTS,
    room: options.roomName,
  });

  if (options.role === 'player') {
    if (!options.agentName) {
      throw new Error('AGENT_NAME is required for player dispatch');
    }
    at.roomConfig = new RoomConfiguration({
      emptyTimeout: PLAYER_EMPTY_TIMEOUT_S,
      departureTimeout: PLAYER_DEPARTURE_TIMEOUT_S,
      maxParticipants: PLAYER_MAX_PARTICIPANTS,
      agents: [new RoomAgentDispatch({ agentName: options.agentName })],
    });
  }

  return {
    token: await at.toJwt(),
    identity,
    participantName,
  };
}
