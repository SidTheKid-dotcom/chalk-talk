'use client';

import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';

type StageChrome = {
  scale: number;
  reservePx: number;
};

const StageChromeContext = createContext<StageChrome>({ scale: 1, reservePx: 0 });

export function useStageChrome(): StageChrome {
  return useContext(StageChromeContext);
}

type RailBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function ScaledSlide({
  children,
  rail,
  portraitHint = true,
}: {
  children: ReactNode;
  rail?: ReactNode;
  portraitHint?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [portrait, setPortrait] = useState(false);
  const [reservePx, setReservePx] = useState(0);
  const [railBox, setRailBox] = useState<RailBox>({ left: 0, top: 0, width: 0, height: 44 });

  useEffect(() => {
    const frame = frameRef.current;
    const shell = frame?.parentElement;
    if (!frame || !shell) return;

    const resize = () => {
      const width = shell.clientWidth;
      const height = window.innerHeight;
      const isPortrait = width < 600 && height > width;
      const next = isPortrait ? width / 1920 : Math.min(width / 1920, shell.clientHeight / 1080);
      const safe = next > 0 ? next : 1;
      setPortrait(isPortrait);
      setScale(safe);
      if (!isPortrait) {
        const stageW = 1920 * safe;
        const stageH = 1080 * safe;
        const railH = Math.max(44, 64 * safe);
        setRailBox({
          left: (width - stageW) / 2,
          top: (shell.clientHeight - stageH) / 2 + stageH - railH,
          width: stageW,
          height: railH,
        });
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(shell);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const node = railRef.current;
    if (!node || portrait) {
      setReservePx(0);
      return;
    }
    const measure = () => setReservePx(Math.ceil(node.scrollWidth + 32));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [portrait, rail]);

  const stageStyle = portrait
    ? {
        width: 1920,
        height: 1080,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }
    : {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        width: 1920,
        height: 1080,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center',
      };

  const railNode = rail ? (
    <div
      className="unscaled-rail"
      data-unscaled-rail
      style={
        portrait
          ? undefined
          : {
              position: 'absolute',
              left: railBox.left,
              top: railBox.top,
              width: railBox.width,
              height: railBox.height,
            }
      }
    >
      <div ref={railRef} className="unscaled-rail-content">
        {rail}
      </div>
    </div>
  ) : null;

  return (
    <StageChromeContext.Provider value={{ scale, reservePx: portrait ? 0 : reservePx }}>
      <div
        ref={frameRef}
        className={portrait ? 'stage-frame is-portrait' : 'stage-frame'}
        style={portrait ? { height: 1080 * scale } : undefined}
      >
        <div data-scaled-slide style={stageStyle}>
          {children}
        </div>
        {portrait ? null : railNode}
      </div>
      {portrait && portraitHint ? (
        <div className="portrait-chrome" data-portrait-chrome>
          <p className="rotate-hint" data-rotate-hint>
            Rotate your phone or open on a laptop
          </p>
          {railNode}
        </div>
      ) : null}
    </StageChromeContext.Provider>
  );
}
