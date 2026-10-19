import { padSlideNumber } from '@/lib/deck/load';

type LowerThirdProps = {
  number: number;
  total?: number;
  section: string;
};

export function LowerThird({ number, total = 6, section }: LowerThirdProps) {
  return (
    <div className="lower-third font-archivo text-[15px] tracking-[0.04em]">
      <span className="lower-third__tick" aria-hidden />
      <span>
        {padSlideNumber(number)} / {padSlideNumber(total)} · {section}
      </span>
    </div>
  );
}
