'use client';

import { useMemo } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { ViewController } from '@/components/app/view-controller';
import { useDebugMode } from '@/hooks/useDebug';
import type { CutoutCredit } from '@/lib/deck/types';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });

  return null;
}

interface AppProps {
  tokenEndpoint: string;
  credits: CutoutCredit[];
  jrImageSrc: string | null;
}

export function App({ tokenEndpoint, credits, jrImageSrc }: AppProps) {
  const tokenSource = useMemo(
    () =>
      TokenSource.custom(async () => {
        const response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'player' }),
        });
        if (!response.ok) {
          throw new Error(`Token request failed: ${response.status}`);
        }
        return response.json();
      }),
    [tokenEndpoint]
  );

  const session = useSession(tokenSource);

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <main className="h-svh overflow-hidden">
        <ViewController credits={credits} jrImageSrc={jrImageSrc} />
      </main>
      <StartAudioButton
        label="Enable session audio"
        className="font-archivo fixed top-4 left-1/2 z-[80] min-h-11 -translate-x-1/2 rounded-none bg-[var(--blue)] px-5 text-[13px] text-[var(--sheet)]"
      />
    </AgentSessionProvider>
  );
}
