import { cn } from '@/lib/shadcn/utils';

type HeadlineProps = {
  children: string;
  className?: string;
};

export function Headline({ children, className }: HeadlineProps) {
  return (
    <h1 className={cn('font-fraunces text-[var(--ink)]', className ?? 'text-[58px]')}>
      {children}
    </h1>
  );
}
