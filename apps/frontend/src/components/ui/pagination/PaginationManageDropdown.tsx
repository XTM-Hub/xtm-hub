import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
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
          {...analyticsId('list_settings_open')}
          priority="tertiary"
          className="h-9 w-9 rounded-none"
          aria-label={t('GenericActions.Paginate.Manage')}
          icon={<TableTuneIcon className="h-[1.125rem] w-[1.125rem]" />}
        />
      </MenuTrigger>
      <MenuContent
        align="end"
        className="layer-1">
        <MenuSub>
          <MenuSubTrigger {...analyticsId('list_page_sizes_open')}>
            {t('GenericActions.Paginate.RowsPerPage')}
          </MenuSubTrigger>
          <MenuSubContent className="layer-1">
            {[50, 100, 200, 300, 500].map((size) => (
              <MenuItem
                {...analyticsId('list_page_size_select')}
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
