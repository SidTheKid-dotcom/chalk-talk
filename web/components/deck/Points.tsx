import { hashSeed, roughLine, roughRect } from '@/lib/sketch/rough';

type PointsProps = {
  points: string[];
  variant?: 'checkbox' | 'numeral';
};

function InkCheckbox({ index }: { index: number }) {
  const box = roughRect(1.2, 1.2, 13.6, 13.6, hashSeed(`box-${index}`), 0.7);
  const mark = roughLine(4, 8.4, 7.1, 12.2, hashSeed(`tick-a-${index}`), 0.4);
  const mark2 = roughLine(7.1, 12.2, 13.2, 3.6, hashSeed(`tick-b-${index}`), 0.4);
  return (
    <svg className="checkbox-ink mt-1" viewBox="0 0 16 16" aria-hidden>
      <path d={box} fill="none" stroke="var(--blue)" strokeWidth="1.5" />
      <path d={`${mark} ${mark2}`} fill="none" stroke="var(--blue)" strokeWidth="1.6" />
    </svg>
  );
}

export function Points({ points, variant = 'checkbox' }: PointsProps) {
  return (
    <ol className="font-courier m-0 flex list-none flex-col gap-4 p-0 text-[20px] leading-snug text-[var(--ink)]">
      {points.slice(0, 3).map((point, index) => (
        <li key={point} className="flex gap-3">
          {variant === 'checkbox' ? (
            <InkCheckbox index={index} />
          ) : (
            <span className="font-archivo w-6 text-[var(--blue)]">{index + 1}</span>
          )}
          <span>{point}</span>
        </li>
      ))}
    </ol>
  );
}
