import type { ReactNode } from 'react';
import { cn } from '@/lib/shadcn/utils';

type SheetProps = {
  children: ReactNode;
  className?: string;
  rotate?: boolean;
};

export function Sheet({ children, className, rotate = true }: SheetProps) {
  return <div className={cn('sheet', !rotate && '[transform:none]', className)}>{children}</div>;
}
