import { TokenVerifier } from 'livekit-server-sdk';
import { describe, expect, it } from 'vitest';
import {
  createIdentity,
  createRoomName,
  livekitHttpUrl,
  mintHumanToken,
  parseTokenRequest,
} from '@/lib/token';

const API_KEY = 'testkey';
const API_SECRET = 'testsecret-testsecret-testsecret';
const AGENT_NAME = 'chalk-talk-agent';

function forbiddenGrantKeys() {
  return ['roomAdmin', 'roomCreate', 'roomList', 'canUpdateOwnMetadata'] as const;
}

async function claimsFor(token: string) {
  return new TokenVerifier(API_KEY, API_SECRET).verify(token);
}

describe('parseTokenRequest', () => {
  it('accepts player without a room', () => {
    expect(parseTokenRequest({ role: 'player' })).toEqual({ ok: true, role: 'player' });
  });

  it('accepts coach with a room', () => {
    expect(parseTokenRequest({ role: 'coach', room: 'fr-abc123defg' })).toEqual({
      ok: true,
      role: 'coach',
      room: 'fr-abc123defg',
    });
  });

  it('rejects unknown roles and a coach without a room', () => {
    expect(parseTokenRequest({ role: 'admin' })).toEqual({
      ok: false,
      status: 400,
      error: 'Unknown role',
    });
    expect(parseTokenRequest({ role: 'coach' })).toEqual({
      ok: false,
      status: 400,
      error: 'room is required for coach',
    });
    expect(parseTokenRequest(null)).toEqual({
      ok: false,
      status: 400,
      error: 'Invalid JSON body',
    });
  });
});

describe('room and identity ids', () => {
  it('uses a crypto room prefix, not Math.random', () => {
    expect(createRoomName()).toMatch(/^fr-[0-9a-f]{10}$/);
    expect(createIdentity('player')).toMatch(/^player-[0-9a-f]{10}$/);
    expect(createIdentity('coach')).toMatch(/^coach-[0-9a-f]{10}$/);
  });

  it('maps wss LiveKit URLs to https for RoomService', () => {
    expect(livekitHttpUrl('wss://example.livekit.cloud')).toBe('https://example.livekit.cloud');
    expect(livekitHttpUrl('ws://localhost:7880')).toBe('http://localhost:7880');
  });
});

describe('mintHumanToken', () => {
  it('mints a player token with role, grants, TTL, and dispatch', async () => {
    const roomName = 'fr-playerroom1';
    const { token, identity, participantName } = await mintHumanToken({
      apiKey: API_KEY,
      apiSecret: API_SECRET,
      role: 'player',
      roomName,
      agentName: AGENT_NAME,
    });

    expect(identity).toMatch(/^player-[0-9a-f]{10}$/);
    expect(participantName).toBe('Player');

    const claims = await claimsFor(token);
    expect(claims.sub).toBe(identity);
    expect(claims.name).toBe('Player');
    expect(claims.attributes).toEqual({ role: 'player' });
    expect(claims.video).toMatchObject({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    for (const key of forbiddenGrantKeys()) {
      expect(claims.video?.[key], key).toBeFalsy();
    }
    expect(claims.exp).toBeDefined();
    expect(claims.nbf).toBeDefined();
    expect(claims.exp! - claims.nbf!).toBeGreaterThanOrEqual(14 * 60);
    expect(claims.exp! - claims.nbf!).toBeLessThanOrEqual(16 * 60);

    const roomConfig = claims.roomConfig as { agents?: Array<{ agentName?: string }> } | undefined;
    expect(roomConfig?.agents?.[0]?.agentName).toBe(AGENT_NAME);
  });

  it('mints a coach token without dispatch or admin grants', async () => {
    const roomName = 'fr-coachroom1';
    const { token, identity, participantName } = await mintHumanToken({
      apiKey: API_KEY,
      apiSecret: API_SECRET,
      role: 'coach',
      roomName,
    });

    expect(identity).toMatch(/^coach-[0-9a-f]{10}$/);
    expect(participantName).toBe('Coach');

    const claims = await claimsFor(token);
    expect(claims.attributes).toEqual({ role: 'coach' });
    expect(claims.video).toMatchObject({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    for (const key of forbiddenGrantKeys()) {
      expect(claims.video?.[key], key).toBeFalsy();
    }

    const roomConfig = claims.roomConfig as { agents?: Array<{ agentName?: string }> } | undefined;
    expect(roomConfig?.agents ?? []).toEqual([]);
  });
});
