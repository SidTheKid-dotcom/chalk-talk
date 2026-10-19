'use client';

import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { bindCoachLinkRpc } from '@/lib/coach-link';
import { afterNextPaint } from '@/lib/deck/rpc';

export function useCoachLink(): string | null {
  const room = useRoomContext();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    return bindCoachLinkRpc(room, setUrl, afterNextPaint);
  }, [room]);

  return url;
}
