import { cn } from '@/lib/utils';
import { ArrowDownwardIcon, ArrowUpwardIcon } from '@filigran/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/ui';
import { OrderingMode } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { IconButton } from '@filigran/design-system';

interface SortControlsProps {
  orderByOptions: { label: string; value: string }[];
  onOrderByChange: (value: string) => void;
  onOrderModeChange: (value: OrderingMode) => void;
  selectedOrderBy: string;
  selectedOrderMode: OrderingMode;
  className?: string;
}

export const SortControls = ({
  orderByOptions,
  onOrderByChange,
  onOrderModeChange,
  selectedOrderMode,
  selectedOrderBy,
  className,
}: SortControlsProps) => {
  const t = useTranslations();

  return (
    <div className={cn(className, 'flex gap-s items-center')}>
      <span className="whitespace-nowrap text-sm">
        {t('SortControls.SortBy')}
      </span>
      <Select
        onValueChange={onOrderByChange}
        defaultValue={selectedOrderBy}>
        <SelectTrigger>
          <SelectValue placeholder={t('SortControls.SortBy')} />
        </SelectTrigger>
        <SelectContent>
          {orderByOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <IconButton
        className="flex-none basis-9"
        priority="tertiary"
        aria-label={`${t('SortControls.SortBy')} ${selectedOrderMode}`}
        icon={
          selectedOrderMode === OrderingMode.Desc ? (
            <ArrowUpwardIcon className="h-4 w-4" />
          ) : (
            <ArrowDownwardIcon className="h-4 w-4" />
          )
        }
        onClick={() =>
          onOrderModeChange(
            selectedOrderMode === OrderingMode.Asc
              ? OrderingMode.Desc
              : OrderingMode.Asc
          )
        }
      />
    </div>
  );
};
