import { describe, expect, it } from 'vitest';
import { coachBoardFromAgent, emptyCoachBoard } from '@/lib/coach-board';

const overlay = {
  v: 1,
  slide_id: 's2_lebron',
  seq: 4,
  highlights: ['cle_james'],
  play: { play_id: 'p_blitz_lebron_pnr', seq: 4 },
  callouts: [],
};

describe('coachBoardFromAgent', () => {
  it('renders the end state on the first attribute read', () => {
    const board = coachBoardFromAgent(emptyCoachBoard, {
      current_slide: 's2_lebron',
      slide_seq: '4',
      overlay_state: JSON.stringify(overlay),
      mode: 'clicker',
      'lk.agent.state': 'listening',
    });
    expect(board.slideId).toBe('s2_lebron');
    expect(board.highlights).toEqual(['cle_james']);
    expect(board.play?.play_id).toBe('p_blitz_lebron_pnr');
    expect(board.playAnimate).toBe(false);
    expect(board.mode).toBe('clicker');
    expect(board.agentState).toBe('listening');
  });

  it('animates a later play seq and drops overlays for a different slide', () => {
    const first = coachBoardFromAgent(emptyCoachBoard, {
      current_slide: 's2_lebron',
      overlay_state: JSON.stringify(overlay),
    });
    const nextPlay = coachBoardFromAgent(first, {
      current_slide: 's2_lebron',
      overlay_state: JSON.stringify({
        ...overlay,
        seq: 5,
        play: { play_id: 'p_blitz_lebron_pnr', seq: 5 },
      }),
    });
    expect(nextPlay.playAnimate).toBe(true);

    const changed = coachBoardFromAgent(nextPlay, {
      current_slide: 's6_last_two',
      overlay_state: JSON.stringify(overlay),
    });
    expect(changed.slideId).toBe('s6_last_two');
    expect(changed.highlights).toEqual([]);
    expect(changed.play).toBeNull();
    expect(changed.playAnimate).toBe(false);
  });
});
