'use client';

import { useState } from 'react';

export function TeamLogo({ src, abbrev, alt }: { src: string; abbrev: string; alt: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) return <span className="matchup-badge">{abbrev}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="matchup-logo" src={src} alt={alt} onError={() => setMissing(true)} />
  );
}
