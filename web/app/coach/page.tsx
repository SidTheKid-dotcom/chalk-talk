import { CoachSession } from '@/components/coach/CoachSession';
import { loadCutoutCredits, resolveJrImageSrc } from '@/lib/deck/credits.server';

export default function CoachPage() {
  return <CoachSession credits={loadCutoutCredits()} jrImageSrc={resolveJrImageSrc()} />;
}
