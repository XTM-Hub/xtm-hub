import { cn } from '@/lib/utils';

interface CountBadgeProps {
  count: number;
  bgFadedClass: string;
  textClass: string;
  className?: string;
  fontClass?: string;
}

export const CountBadge = ({
  count,
  bgFadedClass,
  textClass,
  className,
  fontClass = 'content-body-base-medium',
}: CountBadgeProps) => (
  <div
    className={cn(
      'rounded-full w-6 h-6 flex items-center justify-center relative shrink-0',
      className
    )}>
    <div className={cn('absolute inset-0 rounded-full', bgFadedClass)} />
    <span className={cn('relative z-10', fontClass, textClass)}>{count}</span>
  </div>
);
