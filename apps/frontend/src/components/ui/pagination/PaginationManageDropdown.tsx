import { useTranslate } from '@/hooks/use-translate';
import {
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '@filigran/design-system';
import { TableTuneIcon } from '@filigran/icon';

interface PaginationManageDropdownProps {
  pageSize: number;
  onSetPageSize: (pageSize: number) => void;
}

export const PaginationManageDropdown = ({
  onSetPageSize,
  pageSize,
}: PaginationManageDropdownProps) => {
  const t = useTranslate();

  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton
          priority="tertiary"
          className="h-9 w-9 rounded-none"
          aria-label={t('GenericActions.Paginate.Manage')}
          icon={<TableTuneIcon className="h-[1.125rem] w-[1.125rem]" />}
        />
      </MenuTrigger>
      <MenuContent align="end">
        <MenuSub>
          <MenuSubTrigger>
            {t('GenericActions.Paginate.RowsPerPage')}
          </MenuSubTrigger>
          <MenuSubContent>
            {[50, 100, 200, 300, 500].map((size) => (
              <MenuItem
                key={size}
                selected={size === pageSize}
                onSelect={() => onSetPageSize(size)}>
                {size}
              </MenuItem>
            ))}
          </MenuSubContent>
        </MenuSub>
      </MenuContent>
    </Menu>
  );
};
