import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deck, getPlay, getSlide } from '@/lib/deck/load';
import {
  type PlayClock,
  advancePlayClock,
  createPlayClock,
  frameForPlayClock,
} from '@/lib/deck/play-clock';
import { SPEAKING_START_GRACE_MS, playMotionSegments } from '@/lib/deck/plays';
import type { PlayId, PlayerId } from '@/lib/deck/types';

function segmentsFor(playId: PlayId) {
  const play = getPlay(playId);
  const slide = getSlide(play.slide_id);
  if (!slide.diagram) throw new Error('expected court');
  return playMotionSegments(slide.diagram, play);
}

function run(playId: PlayId, steps: Array<[number, boolean | undefined]>) {
  const segments = segmentsFor(playId);
  let clock = createPlayClock();
  let frame = frameForPlayClock(segments, clock);
  for (const [dt, speaking] of steps) {
    clock = advancePlayClock(clock, dt, speaking, segments);
    frame = frameForPlayClock(segments, clock);
  }
  return { clock, frame, segments };
}

describe('usePlayMotion speaking clock', () => {
  it('tweens a step in duration_ms and then holds until the speech budget is gone', () => {
    const holding = run('p_blitz_lebron_pnr', [[2_000, true]]);
    const next = run('p_blitz_lebron_pnr', [[5_200, true]]);
    expect(holding.frame?.caption).toBe('Screen comes at the top');
    expect(holding.frame?.markers?.cle_tthompson).toEqual([56, 70]);
    expect(next.frame?.caption).toBe('Both defenders trap the ball');
  });

  it('does not advance captioned elapsed while the agent is not speaking', () => {
    const moved = run('p_blitz_lebron_pnr', [[200, true]]);
    const frozen = run('p_blitz_lebron_pnr', [
      [200, true],
      [400, false],
    ]);
    expect(frozen.clock.paceMs).toBe(200);
    expect(frozen.clock.mode).toBe('pace');
    expect(frozen.frame?.caption).toBe(moved.frame?.caption);
    expect(frozen.frame?.markers).toEqual(moved.frame?.markers);
  });

  it('freezes the current frame on listening before the quiet grace', () => {
    const before = run('p_blitz_lebron_pnr', [[480, true]]);
    const listening = run('p_blitz_lebron_pnr', [
      [480, true],
      [SPEAKING_START_GRACE_MS - 1, false],
    ]);
    expect(listening.clock.mode).toBe('pace');
    expect(listening.clock.paceMs).toBe(before.clock.paceMs);
    expect(listening.frame).toEqual(before.frame);
  });

  it('finishes a clicker-silent play at deck duration with no speech hold', () => {
    const silent = run('p_blitz_lebron_pnr', [
      [SPEAKING_START_GRACE_MS, false],
      [1200, false],
    ]);
    const stillTalking = run('p_blitz_lebron_pnr', [[1200, true]]);
    expect(silent.clock.mode).toBe('finish');
    expect(silent.frame?.caption).toBe('Both defenders trap the ball');
    expect(stillTalking.frame?.caption).toBe('Screen comes at the top');
  });

  it('keeps the current frame when speech pauses after a caption', () => {
    const paused = run('p_blitz_lebron_pnr', [
      [200, true],
      [SPEAKING_START_GRACE_MS, false],
      [1100, false],
    ]);
    const keptSpeaking = run('p_blitz_lebron_pnr', [[200, true]]);
    expect(paused.clock.mode).toBe('pace');
    expect(paused.clock.paceMs).toBe(200);
    expect(paused.frame?.caption).toBe(keptSpeaking.frame?.caption);
    expect(paused.frame?.markers).toEqual(keptSpeaking.frame?.markers);
  });

  it('resumes the speaking clock after a pause', () => {
    const resumed = run('p_blitz_lebron_pnr', [
      [200, true],
      [2_000, false],
      [5_000, true],
    ]);
    expect(resumed.clock.mode).toBe('pace');
    expect(resumed.clock.paceMs).toBe(5_200);
    expect(resumed.frame?.caption).toBe('Both defenders trap the ball');
  });

  it('stays on the last frame after the play ends', () => {
    const done = run('p_blitz_lebron_pnr', [[20_000, true]]);
    const later = run('p_blitz_lebron_pnr', [
      [20_000, true],
      [5_000, false],
    ]);
    expect(done.frame?.caption).toBe('Weak side rotates home');
    expect(done.frame?.markers?.gsw_curry).toEqual([28, 28]);
    expect(later.frame).toEqual(done.frame);
  });

  it('uses the wall clock when speaking is omitted', () => {
    const wall = run('p_blitz_lebron_pnr', [[5_000, undefined]]);
    const speaking = run('p_blitz_lebron_pnr', [[5_000, true]]);
    expect(wall.clock.mode).toBe('wall');
    expect(wall.frame?.caption).toBe('Weak side rotates home');
    expect(speaking.frame?.caption).toBe('Screen comes at the top');
    expect(speaking.frame?.markers?.gsw_curry).not.toEqual([28, 28]);
  });

  it('advances the start formation on the wall clock before anyone speaks', () => {
    const mid = run('p_draymond_short_roll', [[150, false]]);
    const formed = run('p_draymond_short_roll', [[300, false]]);
    expect(mid.frame?.caption).toBeNull();
    expect(mid.clock.paceMs).toBe(0);
    expect(formed.frame?.caption).toBe('They trap Curry on the ball');
    expect(formed.frame?.markers?.gsw_curry).toEqual([50, 62]);
    expect(formed.clock.mode).toBe('pace');
  });

  it('writes speech-pace stills for a 5s talk that has not reached the last step', () => {
    const segments = segmentsFor('p_blitz_lebron_pnr');
    const shots: Array<{ name: string; clock: PlayClock; label: string }> = [
      { name: '00-first-frame', clock: createPlayClock(), label: 'first painted frame' },
      {
        name: '01-speaking-5s',
        clock: advancePlayClock(createPlayClock(), 5_000, true, segments),
        label: 'speaking for 5s',
      },
      {
        name: '02-wall-5s',
        clock: advancePlayClock(createPlayClock(), 5_000, undefined, segments),
        label: 'wall clock 5s',
      },
    ];
    const dir = '/tmp/task12-speech-pace';
    mkdirSync(dir, { recursive: true });
    for (const shot of shots) {
      const frame = frameForPlayClock(segments, shot.clock);
      writeFileSync(
        `${dir}/${shot.name}.svg`,
        courtSvg(shot.label, frame?.caption ?? '', frame?.markers)
      );
    }
    const mid = frameForPlayClock(segments, shots[1].clock);
    expect(mid?.caption).toBe('Screen comes at the top');
    expect(shots[1].clock.wallMs).toBe(5_000);
  });
});

function courtSvg(
  label: string,
  caption: string,
  markers: Partial<Record<PlayerId, [number, number]>> | undefined
): string {
  const dots = Object.entries(markers ?? {})
    .map(([id, pos]) => {
      if (!pos) return '';
      const player = deck.players[id as PlayerId];
      const x = 40 + pos[0] * 3.2;
      const y = 70 + pos[1] * 3.2;
      const fill = player?.team === 'cle' ? '#C8102E' : '#1D428A';
      const tag = (player?.label ?? id).split(' ').at(-1) ?? '';
      return `<g><circle cx="${x}" cy="${y}" r="11" fill="${fill}" stroke="#fff" stroke-width="1.5"/><text x="${x}" y="${y + 3}" text-anchor="middle" fill="#fff" font-size="8" font-family="sans-serif">${tag}</text></g>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="560" viewBox="0 0 480 560">
  <rect width="480" height="560" fill="#14110e"/>
  <text x="24" y="36" fill="#b9b4aa" font-size="14" font-family="sans-serif">${label}</text>
  <text x="24" y="72" fill="#ffc72c" font-size="28" font-family="sans-serif">${caption || 'Formation'}</text>
  <rect x="36" y="96" width="328" height="328" fill="#1c1916" stroke="#fff" stroke-opacity="0.35"/>
  ${dots}
</svg>
`;
}
