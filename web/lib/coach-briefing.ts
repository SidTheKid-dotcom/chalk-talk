export type CoachBriefing = {
  asked: string[];
  mainWorry: string;
  currentSlide: string;
  summary: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseCoachBriefing(raw: string): CoachBriefing | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const { asked, main_worry: mainWorry, current_slide: currentSlide, summary } = parsed;
  if (!Array.isArray(asked) || asked.some((item) => typeof item !== 'string')) {
    return null;
  }
  if (
    typeof mainWorry !== 'string' ||
    typeof currentSlide !== 'string' ||
    typeof summary !== 'string'
  ) {
    return null;
  }
  return {
    asked,
    mainWorry,
    currentSlide,
    summary,
  };
}

export const COACH_BRIEFING_TOPIC = 'coach-briefing';

export type BriefingReader = {
  readAll: () => Promise<string>;
};

export type BriefingStreamHost = {
  registerTextStreamHandler: (
    topic: string,
    handler: (reader: BriefingReader, info: { identity: string }) => void | Promise<void>
  ) => void;
  unregisterTextStreamHandler: (topic: string) => void;
};

export function bindCoachBriefing(
  room: BriefingStreamHost,
  onBriefing: (briefing: CoachBriefing) => void
): () => void {
  const handle = async (reader: BriefingReader) => {
    let text: string;
    try {
      text = await reader.readAll();
    } catch {
      return;
    }
    const briefing = parseCoachBriefing(text);
    if (briefing) {
      onBriefing(briefing);
    }
  };

  room.registerTextStreamHandler(COACH_BRIEFING_TOPIC, handle);
  return () => {
    room.unregisterTextStreamHandler(COACH_BRIEFING_TOPIC);
  };
}
