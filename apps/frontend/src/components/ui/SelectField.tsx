import {
  analyticsId,
  type AnalyticsFieldProps,
} from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectHelperText,
  SelectItem,
  SelectLabel,
  SelectProps,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import { ReactNode } from 'react';

export interface SelectFieldOption {
  value: string;
  label: ReactNode;
}

interface SelectFieldBaseProps extends Pick<
  SelectProps,
  'value' | 'defaultValue' | 'onValueChange' | 'disabled'
> {
  label: string;
  required?: boolean;
  placeholder?: string;
  options: SelectFieldOption[];
  /** Puts the field in error and shows the message below it. */
  error?: string;
  /** Merged over the full-width trigger. */
  triggerClassName?: string;
  /**
   * Layer of the portalled panel, `layer-1` by default so it never paints the
   * input colour. A field on a layer-1 surface passes `layer-0`.
   */
  contentClassName?: string;
}

export type SelectFieldProps = SelectFieldBaseProps & AnalyticsFieldProps;

export const SelectField = ({
  label,
  required,
  placeholder,
  options,
  error,
  triggerClassName,
  contentClassName = 'layer-1',
  analyticsId: elementId,
  formField: _formField,
  ...selectProps
}: SelectFieldProps) => (
  // The root renders no element: this div keeps its parts together inside a
  // parent's gap or space-y.
  <div>
    <Select
      {...selectProps}
      error={Boolean(error)}>
      <SelectLabel required={required}>{label}</SelectLabel>
      <SelectTrigger
        {...(elementId && analyticsId(elementId))}
        className={cn('w-full', triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
      {error && <SelectHelperText>{error}</SelectHelperText>}
    </Select>
  </div>
);
