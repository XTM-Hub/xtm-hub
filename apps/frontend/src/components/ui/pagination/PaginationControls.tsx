import { PaginationArrowButtons } from '@/components/ui/pagination/PaginationArrowButtons';
import { PaginationManageDropdown } from '@/components/ui/pagination/PaginationManageDropdown';
import { PaginationState } from '@tanstack/react-table';

interface PaginationControlsProps {
  pageSize: number;
  pageIndex: number;
  totalCount: number;
  onPaginationChange: (state: PaginationState) => void;
  onSetPageSize: (pageSize: number) => void;
}

export const PaginationControls = ({
  pageSize,
  totalCount,
  onPaginationChange,
  pageIndex,
  onSetPageSize,
}: PaginationControlsProps) => {
  const handleSetPageSize = (nextPageSize: number) => {
    onPaginationChange({ pageIndex: 0, pageSize: nextPageSize });
    onSetPageSize(nextPageSize);
  };

  return (
    <div className="flex-0 shrink-0 box-border flex h-9 items-center rounded border border-[var(--border-elevation-default-layer-2)]">
      <PaginationArrowButtons
        totalCount={totalCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPaginationChange={onPaginationChange}
      />
      <PaginationManageDropdown
        pageSize={pageSize}
        onSetPageSize={handleSetPageSize}
      />
    </div>
  );
};
