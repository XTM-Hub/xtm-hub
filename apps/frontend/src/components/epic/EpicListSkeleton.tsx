'use client';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslate } from '@/hooks/use-translate';

const PLACEHOLDER_CARD_COUNT = 6;

/**
 * Stands in for the roadmap while its epics load, with the toolbar and card
 * grid sizes of `EpicList` so the page does not jump when they arrive.
 */
export const EpicListSkeleton = () => {
  const t = useTranslate();
  return (
    <div
      role="status"
      aria-label={t('Utils.Loading')}
      className="m-2 flex flex-col gap-4">
      <Skeleton className="h-9 w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: PLACEHOLDER_CARD_COUNT }, (_, index) => (
          <Skeleton
            key={index}
            className="h-48"
          />
        ))}
      </div>
    </div>
  );
};
