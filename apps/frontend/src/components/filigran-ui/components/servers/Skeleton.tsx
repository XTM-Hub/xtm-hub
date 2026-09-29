import { cn } from '@/components/filigran-ui/lib/utils';

const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn('animate-pulse rounded bg-text-secondary/50', className)}
      {...props}
    />
  );
};

export { Skeleton };
