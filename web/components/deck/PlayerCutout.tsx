'use client';

import { useState } from 'react';
import { seededTilt } from '@/lib/sketch/rough';

type PlayerCutoutProps = {
  file: string;
  caption: string;
  name?: string;
  size?: number;
  forceMissing?: boolean;
  className?: string;
};

export function PlayerCutout({
  file,
  caption,
  name = '',
  size = 168,
  forceMissing = false,
  className = '',
}: PlayerCutoutProps) {
  const [missing, setMissing] = useState(forceMissing);
  const tilt = seededTilt(file, 3.2);
  const showImage = !missing && !forceMissing;

  return (
    <figure className={`relative m-0 inline-flex flex-col items-center ${className}`}>
      {showImage ? (
        <div
          className="relative px-1 pt-2"
          style={{ width: size, transform: `rotate(${tilt}deg)` }}
        >
          <span className="cutout-tape" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/players/${file}`}
            alt={name}
            width={size}
            height={Math.round(size * 1.15)}
            className="cutout-photo h-auto w-full object-contain"
            onError={() => setMissing(true)}
          />
        </div>
      ) : null}
      {caption ? (
        <figcaption className="cutout-caption font-courier relative z-10 mt-4 bg-[#f6f1e4] px-2 py-0.5 text-center text-[11px] leading-tight tracking-wide text-[#191714] uppercase">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
