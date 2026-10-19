'use client';

import { useEffect, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { findAgentParticipant, useDeckCommands } from '@/hooks/useDeckCommands';
import { slideTitle } from '@/lib/deck/commands';

export function DeckPlaceholder() {
  const room = useRoomContext();
  const deck = useDeckCommands();
  const [agentIdentity, setAgentIdentity] = useState<string | null>(null);
  const [probeLog, setProbeLog] = useState('idle');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const syncAgent = () => {
      const agent = findAgentParticipant(room);
      setAgentIdentity(agent?.identity ?? null);
    };
    syncAgent();
    room.on(RoomEvent.ParticipantConnected, syncAgent);
    room.on(RoomEvent.ParticipantDisconnected, syncAgent);
    return () => {
      room.off(RoomEvent.ParticipantConnected, syncAgent);
      room.off(RoomEvent.ParticipantDisconnected, syncAgent);
    };
  }, [room]);

  const title = slideTitle(deck.currentSlideId) ?? deck.currentSlideId ?? '(none)';
  const coachHref = room.name ? `/coach?room=${encodeURIComponent(room.name)}` : '/coach';

  async function runProbe(action: 'script' | 'dead_tab') {
    if (!agentIdentity) {
      setProbeLog('no agent in room');
      return;
    }
    setBusy(true);
    try {
      const result = await room.localParticipant.performRpc({
        destinationIdentity: agentIdentity,
        method: 'debug_probe',
        payload: JSON.stringify({ action }),
        responseTimeout: 60_000,
      });
      setProbeLog(result);
    } catch (error) {
      setProbeLog(error instanceof Error ? error.message : 'probe failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-testid="deck-placeholder"
      style={{
        position: 'fixed',
        top: 72,
        left: 16,
        zIndex: 40,
        maxWidth: 460,
        padding: 12,
        background: '#fff',
        color: '#111',
        border: '1px solid #111',
        fontFamily: 'monospace',
        fontSize: 13,
      }}
    >
      <p>room: {room.name || '(none)'}</p>
      <p>slide: {title}</p>
      <p>seq: {deck.lastAppliedSeq}</p>
      <p>highlights: {deck.highlights.length ? deck.highlights.join(', ') : '(none)'}</p>
      <p>
        <a href={coachHref}>open coach tab</a>
      </p>
      <p>
        <button
          type="button"
          disabled={busy || !agentIdentity}
          onClick={() => void runProbe('script')}
        >
          Run RPC probe
        </button>{' '}
        <button
          type="button"
          disabled={busy || !agentIdentity}
          onClick={() => void runProbe('dead_tab')}
        >
          Dead-tab call
        </button>
      </p>
      <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto' }}>{probeLog}</pre>
    </div>
  );
}
