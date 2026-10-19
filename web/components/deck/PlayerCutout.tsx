'use client';

import { useState } from 'react';
import { LowerThird } from '@/components/deck/LowerThird';

type PlayerCutoutProps = {
  file: string;
  caption: string;
  name?: string;
  size?: number;
  forceMissing?: boolean;
  className?: string;
  team?: 'gsw' | 'cle';
  highlighted?: boolean;
};

export function PlayerCutout({
  file,
  caption,
  name = '',
  size = 280,
  forceMissing = false,
  className = '',
  team,
  highlighted = false,
}: PlayerCutoutProps) {
  const [missing, setMissing] = useState(forceMissing);
  const showImage = !missing && !forceMissing;
  const resolvedTeam = team ?? (caption.includes('CLE') ? 'cle' : 'gsw');

  return (
    <figure
      className={`relative m-0 inline-flex flex-col items-center ${highlighted ? 'cutout-highlighted' : ''} ${className}`}
      data-cutout-highlight={highlighted ? '1' : '0'}
    >
      {showImage ? (
        <div className="relative" style={{ width: size }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/players/${file}`}
            alt={name}
            width={size}
            height={Math.round(size * 1.15)}
            className="cutout-photo h-auto w-full object-contain object-bottom"
            onError={() => setMissing(true)}
          />
        </div>
      ) : null}
      {name ? (
        <figcaption className="cutout-caption relative z-10 mt-[-8px]">
          <LowerThird name={name} team={resolvedTeam} />
        </figcaption>
      ) : null}
    </figure>
  );
}
