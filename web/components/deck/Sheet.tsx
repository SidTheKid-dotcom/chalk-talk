import type { ReactNode } from 'react';
import { cn } from '@/lib/shadcn/utils';

type SheetProps = {
  children: ReactNode;
  className?: string;
  rotate?: boolean;
};

export function Sheet({ children, className }: SheetProps) {
  return <div className={cn('sheet card', className)}>{children}</div>;
}
