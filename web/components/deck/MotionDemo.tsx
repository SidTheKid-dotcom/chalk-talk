import { Highlighter } from '@/components/deck/Highlighter';
import { PlayArrows } from '@/components/deck/PlayArrows';
import { Stamp } from '@/components/deck/Stamp';

export function MotionDemo() {
  return (
    <div className="desk flex min-h-[100vh] items-center justify-center px-16 py-16">
      <section className="sheet w-full max-w-4xl [transform:none] px-12 py-10">
        <h2 className="font-fraunces m-0 text-[48px]">Motion</h2>
        <p className="font-courier mt-3 text-[16px] text-[var(--ink-2)]">
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
            <span className="font-courier relative text-[22px] text-[var(--ink)]">
              <Highlighter
                width={168}
                height={18}
                animate
                className="absolute top-1.5 left-[-6px] -z-0"
              />
              <span className="relative">Look here</span>
            </span>
            <Stamp animate />
          </div>
        </div>
      </section>
    </div>
  );
}
