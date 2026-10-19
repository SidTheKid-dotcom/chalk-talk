import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCutoutCredits } from '@/lib/deck/credits';
import type { CutoutCredit } from '@/lib/deck/types';

export const JR_PUBLIC_PATHS = ['/local/lebron-jr-cutout.png', '/local/lebron-jr.jpg'] as const;

export function creditsMarkdownPath(): string {
  return join(process.cwd(), '..', 'design', 'players', 'CREDITS.md');
}

export function hardwoodCreditsPath(): string {
  return join(process.cwd(), 'public', 'hardwood', 'CREDITS.md');
}

export function loadCreditsMarkdown(): string {
  return readFileSync(creditsMarkdownPath(), 'utf8');
}

export function loadHardwoodCreditsMarkdown(): string {
  return readFileSync(hardwoodCreditsPath(), 'utf8');
}

export function loadCutoutCredits(): CutoutCredit[] {
  return parseCutoutCredits(loadCreditsMarkdown());
}

export function resolveJrImageSrc(): string | null {
  for (const publicPath of JR_PUBLIC_PATHS) {
    const absolute = join(process.cwd(), 'public', publicPath.replace(/^\//, ''));
    if (existsSync(absolute)) {
      return publicPath;
    }
  }
  return null;
}
