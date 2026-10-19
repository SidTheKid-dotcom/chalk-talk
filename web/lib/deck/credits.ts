import type { CutoutCredit } from '@/lib/deck/types';

const TEAM_ABBREV: Record<string, CutoutCredit['teamAbbrev']> = {
  Warriors: 'GSW',
  Cavaliers: 'CLE',
};

export function parseCutoutCredits(markdown: string): CutoutCredit[] {
  const blocks = markdown.split(/^## /m).slice(1);
  const credits: CutoutCredit[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    const name = (lines[0] ?? '').trim();
    const file = matchInline(block, /File:\s+`([^`]+)`/);
    if (!file || !name) continue;

    const teamLine = matchInline(block, /Team \/ era:\s+(.+)/) ?? '';
    const teamKey = Object.keys(TEAM_ABBREV).find((key) => teamLine.includes(key));
    const teamAbbrev = teamKey ? TEAM_ABBREV[teamKey] : undefined;
    if (!teamAbbrev) continue;

    credits.push({
      file,
      name,
      teamAbbrev,
      teamLine,
      license: matchInline(block, /License:\s+\[([^\]]+)\]/) ?? '',
      source: matchInline(block, /Source:\s+\[([^\]]+)\]/) ?? '',
    });
  }

  return credits;
}

export function creditForFile(credits: CutoutCredit[], file: string): CutoutCredit | undefined {
  return credits.find((credit) => credit.file === file);
}

export function cutoutCaption(credit: CutoutCredit, compact = false): string {
  const name = compact ? (credit.name.split(/\s+/).at(-1) ?? credit.name) : credit.name;
  return `${name.toUpperCase()} · ${credit.teamAbbrev}`;
}

function matchInline(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern);
  return match?.[1]?.trim();
}
