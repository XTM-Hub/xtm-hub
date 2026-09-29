import { useTranslate } from '@/hooks/use-translate';
import { ArrowNextIcon, ArrowPreviousIcon } from '@filigran/icon';
import { Button } from '@filigran/ui/servers';
import { PaginationState } from '@tanstack/react-table';

interface PaginationArrowButtonsProps {
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: (state: PaginationState) => void;
}

export const PaginationArrowButtons = ({
  onPaginationChange,
  totalCount,
  pageIndex,
  pageSize,
}: PaginationArrowButtonsProps) => {
  const t = useTranslate();
  const safePageSize = pageSize > 0 ? pageSize : 1;
  const pageCount = Math.ceil(totalCount / safePageSize);
  const rangeStart = totalCount > 0 ? pageIndex * safePageSize + 1 : 0;
  const rangeEnd = Math.min((pageIndex + 1) * safePageSize, totalCount);
  const counterWidth = `${3 * String(totalCount).length + 4}ch`;

  const canGoToPreviousPage = (): boolean => {
    return pageIndex > 0;
  };

  const canGoToNextPage = (): boolean => {
    return pageIndex < pageCount - 1;
  };

  const previousPage = (): void => {
    if (!canGoToPreviousPage()) {
      return;
    }

    onPaginationChange({ pageSize: safePageSize, pageIndex: pageIndex - 1 });
  };

  const nextPage = (): void => {
    if (!canGoToNextPage()) {
      return;
    }

    onPaginationChange({ pageSize: safePageSize, pageIndex: pageIndex + 1 });
  };

  return (
    <>
      <Button
        variant="tertiary"
        size="icon"
        className="h-9 w-9 rounded-none"
        onClick={() => previousPage()}
        disabled={!canGoToPreviousPage()}
        aria-label={t('GenericActions.Paginate.PreviousPage')}>
        <ArrowPreviousIcon className="size-3" />
      </Button>
      <div
        className="leading-none text-text-secondary txt-sub-content whitespace-nowrap text-center"
        style={{ width: counterWidth }}>
        <span className="text-foreground">
          {rangeStart}
          {' - '}
          {rangeEnd}
        </span>
        {' / '}
        {totalCount}
      </div>
      <Button
        variant="tertiary"
        size="icon"
        className="h-9 w-9 rounded-none"
        onClick={() => nextPage()}
        disabled={!canGoToNextPage()}
        aria-label={t('GenericActions.Paginate.NextPage')}>
        <ArrowNextIcon className="size-3" />
      </Button>
    </>
  );
};
