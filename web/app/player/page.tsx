import { App } from '@/components/app/app';
import { loadCutoutCredits, resolveJrImageSrc } from '@/lib/deck/credits.server';

if (!process.env.LIVEKIT_URL) {
  throw new Error(
    'LIVEKIT_URL is not set. Copy the private .env into web/.env.local. Refusing to fall back to another agent.'
  );
}

export default function PlayerPage() {
  return (
    <App
      tokenEndpoint="/api/token"
      credits={loadCutoutCredits()}
      jrImageSrc={resolveJrImageSrc()}
    />
  );
}
