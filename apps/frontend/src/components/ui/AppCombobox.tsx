import { useTranslate } from '@/hooks/use-translate';
import {
  Combobox,
  ComboboxChangeMeta,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxControls,
  ComboboxField,
  ComboboxHelperText,
  ComboboxInput,
  ComboboxInputProps,
  ComboboxLabel,
  ComboboxLabelPosition,
  ComboboxProps,
  ComboboxTrigger,
} from '@filigran/design-system';
import { ReactNode } from 'react';

interface AppComboboxSingleProps<T> {
  multiple?: false;
  value: T | null;
  onValueChange: (value: T | null, meta: ComboboxChangeMeta) => void;
}

interface AppComboboxMultipleProps<T> {
  multiple: true;
  value: T[];
  onValueChange: (value: T[], meta: ComboboxChangeMeta) => void;
}

type AppComboboxBaseProps<T> = Omit<
  ComboboxProps<T>,
  | 'value'
  | 'onValueChange'
  | 'multiple'
  | 'children'
  | 'labelPosition'
  | 'required'
  | 'error'
> & {
  /** Accessible name of the field, shown as its label unless `labelPosition` is `none`. */
  label: string;
  labelPosition?: ComboboxLabelPosition;
  required?: boolean;
  /** Puts the field in error and shows the message below it. */
  error?: string;
  placeholder?: string;
  onBlur?: ComboboxInputProps['onBlur'];
  emptyMessage?: ReactNode;
  contentClassName?: string;
  'data-testid'?: string;
};

export type AppComboboxProps<T> = AppComboboxBaseProps<T> &
  (AppComboboxSingleProps<T> | AppComboboxMultipleProps<T>);

export const AppCombobox = <T,>({
  label,
  labelPosition = 'top',
  required,
  error,
  placeholder,
  onBlur,
  emptyMessage,
  contentClassName,
  'data-testid': testId,
  multiple,
  value,
  onValueChange,
  ...comboboxProps
}: AppComboboxProps<T>) => {
  const t = useTranslate();
  const hasVisibleLabel = labelPosition !== 'none';

  return (
    <Combobox<T>
      {...comboboxProps}
      multiple={multiple}
      labelPosition={labelPosition}
      error={Boolean(error)}
      value={value}
      // The design system hands back the shape `multiple` selects.
      onValueChange={onValueChange as ComboboxProps<T>['onValueChange']}>
      {hasVisibleLabel && (
        <ComboboxLabel required={required}>{label}</ComboboxLabel>
      )}
      <ComboboxField data-testid={testId}>
        {multiple && <ComboboxChips />}
        <ComboboxInput
          aria-label={hasVisibleLabel ? undefined : label}
          // The input links the helper text but never marks itself invalid.
          aria-invalid={error ? true : undefined}
          placeholder={placeholder}
          onBlur={onBlur}
        />
        <ComboboxControls>
          <ComboboxClear />
          <ComboboxTrigger />
        </ComboboxControls>
      </ComboboxField>
      {error && <ComboboxHelperText>{error}</ComboboxHelperText>}
      <ComboboxContent
        className={contentClassName}
        emptyMessage={emptyMessage ?? t('Utils.NotFound')}
        listAriaLabel={label}
      />
    </Combobox>
  );
};
