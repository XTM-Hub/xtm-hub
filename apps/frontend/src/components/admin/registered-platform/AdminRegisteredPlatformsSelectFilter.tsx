import { ALL_FILTER_VALUE } from '@/components/admin/registered-platform/admin-registered-platforms.utils';
import {
  analyticsId,
  type AnalyticsElementId,
} from '@/lib/analytics/analytics.ids';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';

export interface AdminRegisteredPlatformsSelectFilterOption {
  value: string;
  label: string;
}

interface AdminRegisteredPlatformsSelectFilterProps {
  label: string;
  allLabel: string;
  value: string;
  options: AdminRegisteredPlatformsSelectFilterOption[];
  onValueChange: (value: string) => void;
  triggerAnalyticsId: AnalyticsElementId;
}

// A filter of the registered platforms list: its first choice, ALL_FILTER_VALUE, keeps every platform.
export const AdminRegisteredPlatformsSelectFilter = ({
  label,
  allLabel,
  value,
  options,
  onValueChange,
  triggerAnalyticsId,
}: AdminRegisteredPlatformsSelectFilterProps) => (
  <Select
    value={value}
    onValueChange={onValueChange}>
    <SelectTrigger
      {...analyticsId(triggerAnalyticsId)}
      aria-label={label}
      className="w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="layer-1">
      <SelectItem value={ALL_FILTER_VALUE}>{allLabel}</SelectItem>
      {options.map((option) => (
        <SelectItem
          key={option.value}
          value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
