import { App } from '@/components/app/app';

if (!process.env.LIVEKIT_URL) {
  throw new Error(
    'LIVEKIT_URL is not set. Copy the private .env into web/.env.local. Refusing to fall back to another agent.'
  );
}

export default function Page() {
  return <App tokenEndpoint="/api/token" isVideoInputSupported={true} />;
}
