import { cn } from '@/lib/utils';
import {
  Input,
  Select,
  SelectContent,
  SelectHelperText,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import { useRef, useState } from 'react';

type Option = { value: string; label: string };

interface SelectWithEditableFieldProps {
  value?: string;
  onChange: (value: string) => void;
  options: Option[];
  labels: {
    label: string;
    placeholder: string;
    editableFieldLabel: string;
    editableFieldPlaceholder: string;
  };
  editableFieldValue: string;
  required?: boolean;
  /** Puts the field in error and shows the message below it. */
  error?: string;
  layerClassName?: string;
}

const OTHER_VALUE = '__other__';

const parseValueToLocalState = (
  value: string | undefined,
  options: Option[],
  editableFieldValue: string
) => {
  if (!value) {
    return { selectedValue: '', customValue: '' };
  }

  if (options.some((option) => option.value === value)) {
    return { selectedValue: value, customValue: '' };
  }

  if (value === editableFieldValue) {
    return { selectedValue: OTHER_VALUE, customValue: '' };
  }
  const otherPrefix = `${editableFieldValue}:`;

  if (value.startsWith(otherPrefix)) {
    return {
      selectedValue: OTHER_VALUE,
      customValue: value.slice(otherPrefix.length).trim(),
    };
  }

  return { selectedValue: OTHER_VALUE, customValue: value };
};

const formatOtherValue = (editableFieldValue: string, customValue: string) => {
  const trimmed = customValue.trim();
  return trimmed ? `${editableFieldValue}: ${trimmed}` : editableFieldValue;
};

export const SelectWithEditableField = ({
  value,
  onChange,
  options,
  labels,
  editableFieldValue,
  required = false,
  error,
  layerClassName = 'layer-2',
}: SelectWithEditableFieldProps) => {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState('');
  const currentValue = isControlled ? value : uncontrolledValue;
  const { selectedValue, customValue: committedCustomValue } =
    parseValueToLocalState(currentValue, options, editableFieldValue);
  const [draftCustomValue, setDraftCustomValue] =
    useState(committedCustomValue);
  const otherInputRef = useRef<HTMLInputElement>(null);
  const focusOtherInputOnCloseRef = useRef(false);

  const isOtherSelected = selectedValue === OTHER_VALUE;
  // The written value is trimmed, so the draft keeps the spaces being typed
  // until the value changes from outside (a form reset, for instance).
  const customValue =
    draftCustomValue.trim() === committedCustomValue
      ? draftCustomValue
      : committedCustomValue;
  const selectedLabel = isOtherSelected
    ? labels.editableFieldLabel
    : options.find((option) => option.value === selectedValue)?.label;

  const commitValue = (nextValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }
    onChange(nextValue);
  };

  const handleSelectChange = (nextSelectedValue: string) => {
    if (nextSelectedValue !== OTHER_VALUE) {
      commitValue(nextSelectedValue);
      return;
    }

    focusOtherInputOnCloseRef.current = true;
    if (!isOtherSelected) {
      setDraftCustomValue('');
      commitValue(editableFieldValue);
    }
  };

  const handleCloseAutoFocus = (event: Event) => {
    if (!focusOtherInputOnCloseRef.current) {
      return;
    }
    focusOtherInputOnCloseRef.current = false;
    // Radix would otherwise send focus back to the trigger.
    event.preventDefault();
    otherInputRef.current?.focus();
  };

  const handleCustomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftCustomValue(event.target.value);
    commitValue(formatOtherValue(editableFieldValue, event.target.value));
  };

  return (
    <div className="flex flex-col gap-s">
      <div>
        <Select
          value={selectedValue}
          onValueChange={handleSelectChange}
          error={Boolean(error)}>
          <SelectLabel required={required}>{labels.label}</SelectLabel>
          <SelectTrigger className={cn('w-full', layerClassName)}>
            <SelectValue placeholder={labels.placeholder}>
              {selectedLabel}
            </SelectValue>
          </SelectTrigger>

          <SelectContent
            className={cn(layerClassName)}
            onCloseAutoFocus={handleCloseAutoFocus}>
            {/* First, so the list's five visible rows always show it. */}
            <SelectItem value={OTHER_VALUE}>
              {labels.editableFieldLabel}
            </SelectItem>
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

      {isOtherSelected && (
        <Input
          ref={otherInputRef}
          className={layerClassName}
          value={customValue}
          onChange={handleCustomChange}
          placeholder={labels.editableFieldPlaceholder}
          aria-label={labels.editableFieldPlaceholder}
        />
      )}
    </div>
  );
};
