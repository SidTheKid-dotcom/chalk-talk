import { describe, expect, it, vi } from 'vitest';
import { type BriefingReader, bindCoachBriefing, parseCoachBriefing } from '@/lib/coach-briefing';

const SAMPLE = {
  asked: ['How do we stop Kyrie?'],
  main_worry: 'How do we stop Kyrie?',
  current_slide: 's3_kyrie',
  summary: 'Main concern: How do we stop Kyrie? Current slide: s3_kyrie.',
};

describe('parseCoachBriefing', () => {
  it('reads the contracted fields', () => {
    expect(parseCoachBriefing(JSON.stringify(SAMPLE))).toEqual({
      asked: ['How do we stop Kyrie?'],
      mainWorry: 'How do we stop Kyrie?',
      currentSlide: 's3_kyrie',
      summary: SAMPLE.summary,
    });
  });

  it('returns null for a partial or malformed stream', () => {
    expect(parseCoachBriefing('not-json')).toBeNull();
    expect(parseCoachBriefing(JSON.stringify({ asked: 'nope' }))).toBeNull();
    expect(parseCoachBriefing(JSON.stringify({ ...SAMPLE, main_worry: 1 }))).toBeNull();
  });
});

describe('bindCoachBriefing', () => {
  it('unregisters the topic and ignores a failed read', async () => {
    const handlers = new Map<
      string,
      (reader: BriefingReader, info: { identity: string }) => void
    >();
    const room = {
      registerTextStreamHandler: vi.fn(
        (topic: string, handler: (reader: BriefingReader, info: { identity: string }) => void) => {
          handlers.set(topic, handler);
        }
      ),
      unregisterTextStreamHandler: vi.fn((topic: string) => {
        handlers.delete(topic);
      }),
    };
    const seen: string[] = [];
    const unbind = bindCoachBriefing(room, (briefing) => {
      seen.push(briefing.mainWorry);
    });
    const handler = handlers.get('coach-briefing');
    await handler?.(
      {
        readAll: async () => {
          throw new Error('stream aborted');
        },
      },
      { identity: 'agent' }
    );
    expect(seen).toEqual([]);
    await handler?.({ readAll: async () => JSON.stringify(SAMPLE) }, { identity: 'agent' });
    expect(seen).toEqual(['How do we stop Kyrie?']);
    unbind();
    expect(room.unregisterTextStreamHandler).toHaveBeenCalledWith('coach-briefing');
    expect(handlers.size).toBe(0);
  });
});
