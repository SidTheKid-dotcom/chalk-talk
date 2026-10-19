import type { PlayerId } from '@/lib/deck/types';

export const CUTOUT_BY_PLAYER: Record<PlayerId, string> = {
  gsw_curry: 'stephen-curry.png',
  gsw_thompson: 'klay-thompson.png',
  gsw_green: 'draymond-green.png',
  gsw_iguodala: 'andre-iguodala.png',
  gsw_barnes: 'harrison-barnes.png',
  cle_james: 'lebron-james.png',
  cle_irving: 'kyrie-irving.png',
  cle_love: 'kevin-love.png',
  cle_smith: 'jr-smith.png',
  cle_tthompson: 'tristan-thompson.png',
};

const PLAYER_BY_CUTOUT: Record<string, PlayerId> = Object.fromEntries(
  Object.entries(CUTOUT_BY_PLAYER).map(([player, file]) => [file, player])
) as Record<string, PlayerId>;

export function playerIdForCutout(file: string): PlayerId | null {
  return PLAYER_BY_CUTOUT[file] ?? null;
}

export function cutoutForPlayer(id: string): string | null {
  return (CUTOUT_BY_PLAYER as Record<string, string>)[id] ?? null;
}

export function lineupFiles(files: string[], team: 'gsw' | 'cle'): string[] {
  return files.filter((file) => {
    const player = playerIdForCutout(file);
    return player?.startsWith(team) ?? false;
  });
}
