'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

export function ScaledSlide({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const resize = () => {
      setScale(Math.min(frame.clientWidth / 1920, frame.clientHeight / 1080));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden">
      <div
        data-scaled-slide
        className="absolute top-1/2 left-1/2 h-[1080px] w-[1920px] origin-center overflow-hidden"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
