import { TokenVerifier } from 'livekit-server-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const listRooms = vi.fn();

vi.mock('livekit-server-sdk', async () => {
  const actual = await vi.importActual<typeof import('livekit-server-sdk')>('livekit-server-sdk');
  return {
    ...actual,
    RoomServiceClient: class {
      listRooms = listRooms;
    },
  };
});

const ENV = {
  LIVEKIT_URL: 'wss://example.livekit.cloud',
  LIVEKIT_API_KEY: 'testkey',
  LIVEKIT_API_SECRET: 'testsecret-testsecret-testsecret',
  AGENT_NAME: 'chalk-talk-agent',
};

const VALID_ROOM = 'fr-0123456789abcdef';

function expectedVideoGrant(room: string) {
  return {
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canPublishSources: ['microphone', 'camera'],
  };
}

async function loadRoute() {
  return import('./route');
}

function jsonRequest(body: unknown, method = 'POST') {
  return new Request('http://localhost/api/token', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/token', () => {
  const previousEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.resetModules();
    listRooms.mockReset();
    for (const key of Object.keys(ENV)) {
      previousEnv[key] = process.env[key];
    }
    Object.assign(process.env, ENV);
  });

  afterEach(() => {
    for (const key of Object.keys(ENV)) {
      if (previousEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousEnv[key];
      }
    }
  });

  it('returns 405 for GET', async () => {
    const { GET } = await loadRoute();
    const response = await GET();
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
  });

  it('returns 400 for unknown role, coach without room, and invalid JSON', async () => {
    const { POST } = await loadRoute();

    const unknown = await POST(jsonRequest({ role: 'admin' }));
    expect(unknown.status).toBe(400);
    await expect(unknown.json()).resolves.toEqual({ error: 'Unknown role' });

    const missingRoom = await POST(jsonRequest({ role: 'coach' }));
    expect(missingRoom.status).toBe(400);
    await expect(missingRoom.json()).resolves.toEqual({ error: 'room is required for coach' });

    const invalidJson = await POST(
      new Request('http://localhost/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      })
    );
    expect(invalidJson.status).toBe(400);
    await expect(invalidJson.json()).resolves.toEqual({ error: 'Invalid JSON body' });
  });

  it('rejects an invalid coach room before listing rooms', async () => {
    const { POST } = await loadRoute();

    const long = await POST(jsonRequest({ role: 'coach', room: `fr-${'a'.repeat(32)}` }));
    expect(long.status).toBe(400);
    await expect(long.json()).resolves.toEqual({ error: 'Invalid room' });

    const otherPrefix = await POST(jsonRequest({ role: 'coach', room: 'lk-0123456789abcdef' }));
    expect(otherPrefix.status).toBe(400);

    const uppercase = await POST(jsonRequest({ role: 'coach', room: 'fr-ABCDEF0123456789' }));
    expect(uppercase.status).toBe(400);

    expect(listRooms).not.toHaveBeenCalled();
  });

  it('returns 404 when the coach room does not exist', async () => {
    listRooms.mockResolvedValueOnce([]);
    const { POST } = await loadRoute();

    const response = await POST(jsonRequest({ role: 'coach', room: VALID_ROOM }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Room not found' });
    expect(listRooms).toHaveBeenCalledWith([VALID_ROOM]);
  });

  it('mints a player token without listing rooms', async () => {
    const { POST } = await loadRoute();
    const response = await POST(jsonRequest({ role: 'player' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.serverUrl).toBe(ENV.LIVEKIT_URL);
    expect(body.roomName).toMatch(/^fr-[0-9a-f]{16}$/);
    expect(body.participantName).toBe('Player');
    expect(typeof body.participantToken).toBe('string');
    expect(body.participantToken.length).toBeGreaterThan(20);
    expect(listRooms).not.toHaveBeenCalled();

    const claims = await new TokenVerifier(ENV.LIVEKIT_API_KEY, ENV.LIVEKIT_API_SECRET).verify(
      body.participantToken
    );
    expect(claims.video).toEqual(expectedVideoGrant(body.roomName));
    expect(claims.attributes).toEqual({ role: 'player' });
    const roomConfig = claims.roomConfig as
      | {
          emptyTimeout?: number;
          departureTimeout?: number;
          maxParticipants?: number;
          agents?: Array<{ agentName?: string }>;
        }
      | undefined;
    expect(roomConfig?.emptyTimeout).toBe(60);
    expect(roomConfig?.departureTimeout).toBe(20);
    expect(roomConfig?.maxParticipants).toBe(4);
    expect(roomConfig?.agents?.[0]?.agentName).toBe(ENV.AGENT_NAME);
  });

  it('mints a coach token when the room exists', async () => {
    listRooms.mockResolvedValueOnce([{ name: VALID_ROOM }]);
    const { POST } = await loadRoute();

    const response = await POST(jsonRequest({ role: 'coach', room: VALID_ROOM }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.serverUrl).toBe(ENV.LIVEKIT_URL);
    expect(body.roomName).toBe(VALID_ROOM);
    expect(body.participantName).toBe('Coach');
    expect(typeof body.participantToken).toBe('string');
    expect(listRooms).toHaveBeenCalledWith([VALID_ROOM]);

    const claims = await new TokenVerifier(ENV.LIVEKIT_API_KEY, ENV.LIVEKIT_API_SECRET).verify(
      body.participantToken
    );
    expect(claims.video).toEqual(expectedVideoGrant(VALID_ROOM));
    expect(claims.attributes).toEqual({ role: 'coach' });
    expect(claims.roomConfig).toBeUndefined();
  });

  it('logs the error message and returns generic 500 JSON', async () => {
    delete process.env.LIVEKIT_URL;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { POST } = await loadRoute();

    const response = await POST(jsonRequest({ role: 'player' }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal Server Error' });
    expect(errorSpy).toHaveBeenCalledWith('LIVEKIT_URL is not defined');
    errorSpy.mockRestore();
  });
});
