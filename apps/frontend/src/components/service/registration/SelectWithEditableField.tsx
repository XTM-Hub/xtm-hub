import { cn } from '@/lib/utils';
import {
  Input,
  Select,
  SelectContent,
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

export const SelectWithEditableField = ({
  value,
  onChange,
  options,
  labels,
  editableFieldValue,
  required = false,
  layerClassName = 'layer-2',
}: SelectWithEditableFieldProps) => {
  const isControlled = value !== undefined;
  const initialValueState = parseValueToLocalState(
    value,
    options,
    editableFieldValue
  );
  const [selectedValue, setSelectedValue] = useState<string>(
    initialValueState.selectedValue
  );
  const [customValue, setCustomValue] = useState(initialValueState.customValue);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const committedValueRef = useRef<string>('');

  const handleSelectChange = (v: string) => {
    if (!v && committedValueRef.current) {
      return;
    }

    if (!isControlled) {
      setSelectedValue(v);
    }
    setCustomValue('');

    if (v === OTHER_VALUE) {
      committedValueRef.current = editableFieldValue;
      onChange(editableFieldValue);
    } else {
      committedValueRef.current = '';
      onChange(v);
    }

    setOpen(false);
  };

  const handleOtherClick = () => {
    if (!isControlled) {
      setSelectedValue(OTHER_VALUE);
    }
    committedValueRef.current = editableFieldValue;
    onChange(editableFieldValue);
    setCustomValue('');

    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomValue(e.target.value);
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    if (e.key === 'Enter') {
      e.preventDefault();

      const trimmed = customValue.trim();
      const valueToCommit = trimmed
        ? `${editableFieldValue}: ${trimmed}`
        : editableFieldValue;

      committedValueRef.current = valueToCommit;
      if (!isControlled) {
        setSelectedValue(OTHER_VALUE);
      }
      setCustomValue(trimmed);
      onChange(valueToCommit);
      setOpen(false);
    }
  };

  const controlledState = parseValueToLocalState(
    value,
    options,
    editableFieldValue
  );
  const currentSelectValue = isControlled
    ? controlledState.selectedValue
    : selectedValue;
  const selectedOption = options.find((o) => o.value === currentSelectValue);
  const isOtherMode = currentSelectValue === OTHER_VALUE;
  const currentCustomValue = isControlled
    ? open
      ? customValue
      : controlledState.customValue
    : customValue;

  const triggerText = isOtherMode
    ? currentCustomValue || labels.editableFieldLabel
    : selectedOption?.label;

  return (
    <div>
      <Select
        value={currentSelectValue}
        onValueChange={handleSelectChange}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen && isControlled) {
            setCustomValue(controlledState.customValue);
          }
        }}>
        <SelectLabel required={required}>{labels.label}</SelectLabel>
        <SelectTrigger className={cn('w-full', layerClassName)}>
          <SelectValue placeholder={labels.placeholder}>
            {triggerText}
          </SelectValue>
        </SelectTrigger>

        <SelectContent className={cn(layerClassName)}>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}>
              {option.label}
            </SelectItem>
          ))}

          <div
            className={cn(
              'relative flex min-h-8 w-full cursor-pointer select-none items-center border-l-2 border-transparent pl-4 pr-2 outline-none hover:bg-input-hover hover:border-input-hover',
              'font-content-compact text-content-compact leading-content-compact tracking-content-compact text-input-placeholder',
              isOtherMode && 'bg-input-hover border-input-focus'
            )}
            onClick={handleOtherClick}>
            {labels.editableFieldLabel}
          </div>

          <div className="border-l-2 border-transparent pb-2 pl-4 pr-2">
            <Input
              ref={inputRef}
              value={currentCustomValue}
              onChange={handleCustomChange}
              onKeyDown={handleCustomKeyDown}
              placeholder={labels.editableFieldPlaceholder}
              aria-label={labels.editableFieldPlaceholder}
            />
          </div>
        </SelectContent>
      </Select>
    </div>
  );
};
