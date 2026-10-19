'use client';

import { useState } from 'react';
import { KalamNote } from '@/components/deck/KalamNote';

type JrCardProps = {
  caption: string;
  imageSrc?: string | null;
  forceMissing?: boolean;
  revealed?: boolean;
  className?: string;
};

export function JrCard({
  caption,
  imageSrc = null,
  forceMissing = false,
  revealed = true,
  className = '',
}: JrCardProps) {
  const [missing, setMissing] = useState(forceMissing);
  const showImage = Boolean(imageSrc) && !missing && !forceMissing;

  if (!revealed) return null;

  return (
    <figure
      className={`note-card settle-in m-0 w-[220px] px-3 pt-5 pb-3 ${className}`}
      style={{ transform: 'rotate(-1.8deg)' }}
    >
      <span className="cutout-tape" />
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc ?? ''}
          alt=""
          className="cutout-photo mx-auto h-auto w-[170px] object-contain"
          onError={() => setMissing(true)}
        />
      ) : (
        <div className="flex h-[150px] items-center justify-center bg-[var(--sheet)] px-3">
          <KalamNote text={caption} className="text-center text-[20px]" />
        </div>
      )}
      {showImage ? <KalamNote text={caption} className="mt-3 text-center text-[18px]" /> : null}
      <p className="font-courier mt-1 mb-0 text-center text-[11px] text-[var(--ink-2)]">
        see: 2018
      </p>
    </figure>
  );
}
