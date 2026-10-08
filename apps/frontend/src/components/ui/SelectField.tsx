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

export interface SelectFieldProps extends Pick<
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
  contentClassName?: string;
}

export const SelectField = ({
  label,
  required,
  placeholder,
  options,
  error,
  triggerClassName,
  contentClassName,
  ...selectProps
}: SelectFieldProps) => (
  // The root renders no element: this div keeps its parts together inside a
  // parent's gap or space-y.
  <div>
    <Select
      {...selectProps}
      error={Boolean(error)}>
      <SelectLabel required={required}>{label}</SelectLabel>
      <SelectTrigger className={cn('w-full', triggerClassName)}>
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
