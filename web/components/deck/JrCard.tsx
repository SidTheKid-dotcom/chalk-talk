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
    <figure className={`note-card settle-in m-0 w-[280px] ${className}`}>
      <p className="lab m-0">Coach card</p>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc ?? ''}
          alt=""
          className="cutout-photo mx-auto mt-4 h-auto w-[220px] object-contain"
          onError={() => setMissing(true)}
        />
      ) : (
        <div className="mt-6 flex min-h-[160px] items-center justify-center px-2">
          <KalamNote text={caption} className="text-center text-[28px]" />
        </div>
      )}
      {showImage ? <KalamNote text={caption} className="mt-4 text-center text-[24px]" /> : null}
    </figure>
  );
}
