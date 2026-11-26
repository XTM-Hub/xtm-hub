'use client';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SharedContentProps {
  children: ReactNode;
  className?: string;
  mainClassName?: string;
}

export const SharedContent = ({
  children,
  className,
  mainClassName = 'h-full w-full overflow-y-auto [scrollbar-gutter:stable]',
}: SharedContentProps) => (
  <div className="flex-1 min-h-0">
    <main className={mainClassName}>
      <div className={cn('flex flex-col min-h-full', className)}>
        {children}
      </div>
    </main>
  </div>
);
