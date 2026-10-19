'use client';

import { useEffect, useMemo, useState } from 'react';
import { SlideView } from '@/components/deck/SlideView';
import { HardwoodStage } from '@/components/hardwood/HardwoodStage';
import { SlidePush } from '@/components/hardwood/SlidePush';
import { SLIDE_IDS } from '@/lib/deck/commands';
import { deck, getSlide } from '@/lib/deck/load';
import type { CutoutCredit, SlideId } from '@/lib/deck/types';

type PushDemoProps = {
  credits: CutoutCredit[];
  jrImageSrc: string | null;
  fromId?: string;
  toId?: string;
  rapid?: boolean;
};

export function PushDemo({
  credits,
  jrImageSrc,
  fromId = 's1_tipoff',
  toId = 's2_lebron',
  rapid = false,
}: PushDemoProps) {
  const start = (SLIDE_IDS as readonly string[]).includes(fromId)
    ? (fromId as SlideId)
    : 's1_tipoff';
  const target = (SLIDE_IDS as readonly string[]).includes(toId) ? (toId as SlideId) : 's2_lebron';
  const [slideId, setSlideId] = useState<SlideId>(start);
  const [seq, setSeq] = useState(1);
  const slide = useMemo(() => getSlide(slideId), [slideId]);

  useEffect(() => {
    const first = window.setTimeout(() => {
      setSlideId(target);
      setSeq(2);
    }, 520);
    let second = 0;
    if (rapid) {
      second = window.setTimeout(() => {
        setSlideId('s4_offense');
        setSeq(3);
      }, 640);
    }
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [rapid, target]);

  return (
    <HardwoodStage slide={slide} status="Speaking">
      <SlidePush slideId={slideId} seq={seq}>
        <SlideView deck={deck} slide={slide} credits={credits} jrImageSrc={jrImageSrc} />
      </SlidePush>
    </HardwoodStage>
  );
}
