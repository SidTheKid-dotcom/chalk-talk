import { describe, expect, it } from 'vitest';
import { cutoutForPlayer, lineupFiles, playerIdForCutout } from '@/lib/deck/cutouts';

describe('cutout player map', () => {
  it('maps Kyrie and Klay both ways', () => {
    expect(playerIdForCutout('kyrie-irving.png')).toBe('cle_irving');
    expect(playerIdForCutout('klay-thompson.png')).toBe('gsw_thompson');
    expect(cutoutForPlayer('cle_irving')).toBe('kyrie-irving.png');
    expect(cutoutForPlayer('gsw_thompson')).toBe('klay-thompson.png');
  });

  it('splits a mixed lineup into both teams', () => {
    const files = [
      'stephen-curry.png',
      'klay-thompson.png',
      'lebron-james.png',
      'kyrie-irving.png',
    ];
    expect(lineupFiles(files, 'gsw')).toEqual(['stephen-curry.png', 'klay-thompson.png']);
    expect(lineupFiles(files, 'cle')).toEqual(['lebron-james.png', 'kyrie-irving.png']);
  });
});
