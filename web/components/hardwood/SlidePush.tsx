'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/deck/plays';
import { SLIDE_PUSH_MS, type SlidePushDirection, planSlidePush } from '@/lib/slide-transition';

type Layer = {
  key: string;
  seq: number;
  slideId: string;
  node: ReactNode;
  dir: SlidePushDirection;
  state: 'enter' | 'present' | 'exit';
  animate: boolean;
};

type SlidePushProps = {
  slideId: string;
  seq: number;
  children: ReactNode;
};

export function SlidePush({ slideId, seq, children }: SlidePushProps) {
  const [layers, setLayers] = useState<Layer[]>(() => [
    {
      key: `${seq}:${slideId}`,
      seq,
      slideId,
      node: children,
      dir: 'none',
      state: 'present',
      animate: false,
    },
  ]);
  const layersRef = useRef(layers);
  const childrenRef = useRef(children);
  layersRef.current = layers;
  childrenRef.current = children;

  useEffect(() => {
    const current =
      layersRef.current.find((layer) => layer.state !== 'exit') ?? layersRef.current[0];
    const animating = layersRef.current.some((layer) => layer.state !== 'present');
    const plan = planSlidePush({
      fromId: current?.slideId ?? null,
      fromSeq: current?.seq ?? 0,
      toId: slideId,
      toSeq: seq,
      animating,
      reducedMotion: prefersReducedMotion(),
    });
    if (!plan) {
      setLayers((prev) =>
        prev.map((layer) =>
          layer.slideId === slideId && layer.state !== 'exit'
            ? { ...layer, node: childrenRef.current, seq }
            : layer
        )
      );
      return;
    }

    if (!plan.animate) {
      setLayers([
        {
          key: `${plan.seq}:${plan.toId}`,
          seq: plan.seq,
          slideId: plan.toId,
          node: childrenRef.current,
          dir: plan.direction,
          state: 'present',
          animate: false,
        },
      ]);
      return;
    }

    const outgoing: Layer = {
      key: current?.key ?? `out-${plan.seq}`,
      seq: current?.seq ?? 0,
      slideId: current?.slideId ?? plan.fromId ?? plan.toId,
      node: current?.node ?? childrenRef.current,
      dir: plan.direction,
      state: 'exit',
      animate: true,
    };
    const incoming: Layer = {
      key: `${plan.seq}:${plan.toId}`,
      seq: plan.seq,
      slideId: plan.toId,
      node: childrenRef.current,
      dir: plan.direction,
      state: 'enter',
      animate: true,
    };
    setLayers([outgoing, incoming]);
    const done = window.setTimeout(() => {
      setLayers([
        {
          ...incoming,
          state: 'present',
          animate: false,
        },
      ]);
    }, SLIDE_PUSH_MS);
    return () => {
      window.clearTimeout(done);
    };
  }, [seq, slideId]);

  useEffect(() => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.slideId === slideId && layer.state !== 'exit' ? { ...layer, node: children } : layer
      )
    );
  }, [children, slideId]);

  return (
    <div data-slide-push className="relative h-full min-h-0 min-w-0">
      {layers.map((layer) => (
        <div
          key={layer.key}
          className="slide-layer"
          data-slide-layer={layer.slideId}
          data-seq={layer.seq}
          data-state={layer.state}
          data-dir={layer.dir}
          data-animate={layer.animate ? '1' : '0'}
        >
          {layer.node}
        </div>
      ))}
    </div>
  );
}
