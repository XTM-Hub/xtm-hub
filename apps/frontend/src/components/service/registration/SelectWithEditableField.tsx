import { cn } from '@/lib/utils';
import { CheckIcon } from '@filigran/icon';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@filigran/ui';
import { Input } from '@filigran/ui/servers';
import { useRef, useState } from 'react';

type Option = { value: string; label: string };

interface SelectWithEditableFieldProps {
  value?: string;
  onChange: (value: string) => void;
  options: Option[];
  labels: {
    placeholder: string;
    editableFieldLabel: string;
    editableFieldPlaceholder: string;
  };
  editableFieldValue: string;
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
      <SelectTrigger className={cn(layerClassName)}>
        <span className={triggerText ? '' : 'text-muted-foreground'}>
          {triggerText || labels.placeholder}
        </span>
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
          className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-input-hover"
          onClick={handleOtherClick}>
          {isOtherMode && (
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
              <CheckIcon className="h-4 w-4" />
            </span>
          )}
          {labels.editableFieldLabel}
        </div>

        <div className="px-2 pb-2 pl-8">
          <Input
            ref={inputRef}
            value={currentCustomValue}
            onChange={handleCustomChange}
            onKeyDown={handleCustomKeyDown}
            placeholder={labels.editableFieldPlaceholder}
          />
        </div>
      </SelectContent>
    </Select>
  );
};
