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
  /** One-line meaning shown under the label in the option list only. */
  description?: ReactNode;
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
  /** Help line below the field; the error replaces it. */
  helperText?: ReactNode;
  /** Info bubble next to the label (`FieldInfoTip`). */
  infoTooltip?: ReactNode;
  /** Keeps the label for assistive technology only (toolbar filters). */
  hideLabel?: boolean;
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
  helperText,
  infoTooltip,
  hideLabel,
  triggerClassName,
  contentClassName = 'layer-1',
  analyticsId: elementId,
  formField: _formField,
  ...selectProps
}: SelectFieldProps) => {
  const hasDescriptions = options.some((option) => option.description);
  const selected = options.find((option) => option.value === selectProps.value);
  const helper = error ?? helperText;

  return (
    // The root renders no element: this div keeps its parts together inside a
    // parent's gap or space-y.
    <div>
      <Select
        {...selectProps}
        error={Boolean(error)}>
        {infoTooltip && !hideLabel ? (
          // The bubble sits beside the label, not inside it, so it never joins
          // the trigger's accessible name.
          <div className="mb-2 flex items-center gap-1">
            <SelectLabel
              required={required}
              className="mb-0">
              {label}
            </SelectLabel>
            {infoTooltip}
          </div>
        ) : (
          <SelectLabel
            required={required}
            className={cn(hideLabel && 'sr-only')}>
            {label}
          </SelectLabel>
        )}
        <SelectTrigger
          {...(elementId && analyticsId(elementId))}
          className={cn('w-full', triggerClassName)}>
          {/* With descriptions the item text holds them too: the trigger shows the label alone. */}
          <SelectValue placeholder={placeholder}>
            {hasDescriptions ? selected?.label : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}>
              {option.description ? (
                <span className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-sm text-default-secondary">
                    {option.description}
                  </span>
                </span>
              ) : (
                option.label
              )}
            </SelectItem>
          ))}
        </SelectContent>
        {helper && <SelectHelperText>{helper}</SelectHelperText>}
      </Select>
    </div>
  );
};
