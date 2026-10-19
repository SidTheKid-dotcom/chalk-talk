import { Highlighter } from '@/components/deck/Highlighter';
import { PlayArrows } from '@/components/deck/PlayArrows';

export function MotionDemo() {
  return (
    <div className="flex min-h-[100vh] items-center justify-center px-16 py-16">
      <section className="card w-full max-w-4xl px-12 py-10">
        <h2 className="slide-title m-0 text-[72px]">Motion</h2>
        <p className="font-inter mt-3 text-[18px] text-[var(--ink-2)]">
          Strokes draw on. The highlighter swipes. Reduced motion shows the final state.
        </p>
        <div className="mt-8 grid grid-cols-2 items-center gap-10">
          <svg viewBox="0 0 100 60" className="h-48 w-full">
            <PlayArrows
              animate
              arrows={[
                { from: [12, 44], to: [72, 16], kind: 'cut', key: 'demo-cut' },
                { from: [20, 18], to: [68, 42], kind: 'pass', key: 'demo-pass' },
              ]}
            />
          </svg>
          <div className="relative flex flex-col items-start gap-8">
            <span className="font-inter relative text-[24px] text-[var(--ink)]">
              <Highlighter
                width={168}
                height={18}
                animate
                className="absolute top-1.5 left-[-6px] -z-0"
              />
              <span className="relative">Look here</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
