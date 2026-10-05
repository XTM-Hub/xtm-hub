import { useTranslate } from '@/hooks/use-translate';
import { TableTuneIcon } from '@filigran/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@filigran/ui';
import { Button } from '@filigran/ui/servers';
import { useMemo } from 'react';

interface PaginationManageDropdownProps {
  pageSize: number;
  onSetPageSize: (pageSize: number) => void;
}

export const PaginationManageDropdown = ({
  onSetPageSize,
  pageSize,
}: PaginationManageDropdownProps) => {
  const t = useTranslate();
  const dropdownItems = useMemo(() => {
    return [50, 100, 200, 300, 500].map((size) => (
      <DropdownMenuRadioItem
        value={String(size)}
        key={size}>
        {size}
      </DropdownMenuRadioItem>
    ));
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="tertiary"
          size="icon"
          className="h-9 w-9 rounded-none"
          aria-label={t('GenericActions.Paginate.Manage')}>
          <TableTuneIcon className="h-[1.125rem] w-[1.125rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {t('GenericActions.Paginate.RowsPerPage')}
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={String(pageSize)}
                onValueChange={(pageSize) => onSetPageSize(Number(pageSize))}>
                {dropdownItems}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
