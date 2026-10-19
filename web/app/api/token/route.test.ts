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

  it('returns 404 when the coach room does not exist', async () => {
    listRooms.mockResolvedValueOnce([]);
    const { POST } = await loadRoute();

    const response = await POST(jsonRequest({ role: 'coach', room: 'fr-missingxx' }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Room not found' });
    expect(listRooms).toHaveBeenCalledWith(['fr-missingxx']);
  });

  it('mints a player token without listing rooms', async () => {
    const { POST } = await loadRoute();
    const response = await POST(jsonRequest({ role: 'player' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.serverUrl).toBe(ENV.LIVEKIT_URL);
    expect(body.roomName).toMatch(/^fr-[0-9a-f]{10}$/);
    expect(body.participantName).toBe('Player');
    expect(typeof body.participantToken).toBe('string');
    expect(body.participantToken.length).toBeGreaterThan(20);
    expect(listRooms).not.toHaveBeenCalled();
  });

  it('mints a coach token when the room exists', async () => {
    listRooms.mockResolvedValueOnce([{ name: 'fr-existing1' }]);
    const { POST } = await loadRoute();

    const response = await POST(jsonRequest({ role: 'coach', room: 'fr-existing1' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.serverUrl).toBe(ENV.LIVEKIT_URL);
    expect(body.roomName).toBe('fr-existing1');
    expect(body.participantName).toBe('Coach');
    expect(typeof body.participantToken).toBe('string');
    expect(listRooms).toHaveBeenCalledWith(['fr-existing1']);
  });
});
