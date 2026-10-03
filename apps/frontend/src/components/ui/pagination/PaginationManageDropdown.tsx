import { IconButton } from '@filigran/design-system';
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
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

interface PaginationManageDropdownProps {
  pageSize: number;
  onSetPageSize: (pageSize: number) => void;
}

export const PaginationManageDropdown = ({
  onSetPageSize,
  pageSize,
}: PaginationManageDropdownProps) => {
  const t = useTranslations();
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
        <IconButton
          priority="tertiary"
          className="h-9 w-9 rounded-none"
          aria-label={t('GenericActions.Paginate.Manage')}
          icon={<TableTuneIcon className="h-[1.125rem] w-[1.125rem]" />}
        />
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
