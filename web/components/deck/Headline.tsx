import { cn } from '@/lib/shadcn/utils';

type HeadlineProps = {
  children: string;
  className?: string;
};

export function Headline({ children, className }: HeadlineProps) {
  const sizeClass = children.length > 42 ? 'is-long' : children.length < 28 ? 'is-hero' : undefined;
  return <h1 className={cn('slide-title', sizeClass, className)}>{children}</h1>;
}
