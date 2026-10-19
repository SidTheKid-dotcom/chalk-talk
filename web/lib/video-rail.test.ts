import { describe, expect, it } from 'vitest';
import { type HumanSnap, humanRole, listHumanTiles } from '@/lib/video-rail';

function snap(partial: Partial<HumanSnap> & Pick<HumanSnap, 'identity'>): HumanSnap {
  return {
    name: partial.name,
    isAgent: false,
    isLocal: false,
    isSpeaking: false,
    attributes: {},
    cameraOn: false,
    ...partial,
  };
}

describe('humanRole', () => {
  it('drops the agent and keeps humans, including guests without a role', () => {
    expect(humanRole({ isAgent: true, attributes: { role: 'player' } })).toBeNull();
    expect(humanRole({ isAgent: false, attributes: { role: 'player' } })).toBe('player');
    expect(humanRole({ isAgent: false, attributes: { role: 'coach' } })).toBe('coach');
    expect(humanRole({ isAgent: false, attributes: {} })).toBe('guest');
  });
});

describe('listHumanTiles', () => {
  it('excludes the agent, marks the speaker, and puts the local human first', () => {
    const tiles = listHumanTiles(
      [
        snap({
          identity: 'agent-1',
          isAgent: true,
          name: 'Assistant',
          isSpeaking: true,
        }),
        snap({
          identity: 'coach-aa',
          name: 'Coach',
          attributes: { role: 'coach' },
          cameraOn: true,
        }),
        snap({
          identity: 'player-ff',
          name: 'Player',
          isLocal: true,
          isSpeaking: true,
          attributes: { role: 'player' },
          cameraOn: true,
        }),
        snap({ identity: 'friend-1', name: 'Pat' }),
      ],
      'player-ff'
    );

    expect(tiles.map((tile) => tile.identity)).toEqual(['player-ff', 'coach-aa', 'friend-1']);
    expect(tiles[0]).toMatchObject({
      role: 'player',
      local: true,
      speaking: true,
      cameraOn: true,
    });
    expect(tiles[1]).toMatchObject({ role: 'coach', speaking: false, cameraOn: true });
    expect(tiles[2]).toMatchObject({ role: 'guest', name: 'Pat', speaking: false });
  });

  it('uses role labels when a participant has no name', () => {
    const tiles = listHumanTiles(
      [snap({ identity: 'player-1', attributes: { role: 'player' } })],
      'player-1'
    );
    expect(tiles[0]?.name).toBe('Player');
  });
});
