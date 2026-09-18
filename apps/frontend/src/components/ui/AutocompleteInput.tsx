'use client';
import { cn } from '@/lib/utils';
import { Input } from '@filigran/ui/servers';
import {
  ComponentPropsWithoutRef,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

export interface AutocompleteOption {
  label: string;
  value: string;
}

interface AutocompleteInputProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'value' | 'onChange'
> {
  options: AutocompleteOption[];
  value?: string;
  onChange: (value: string) => void;
  listLabel?: string;
}

const matches = (option: AutocompleteOption, search: string) => {
  const normalizedSearch = search.trim().toLowerCase();
  return (
    option.label.toLowerCase().includes(normalizedSearch) ||
    option.value.toLowerCase().includes(normalizedSearch)
  );
};

export const AutocompleteInput = ({
  options,
  value = '',
  onChange,
  listLabel,
  ...inputProps
}: AutocompleteInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const visibleOptions = options.filter((option) => matches(option, value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const open = () => {
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const select = (option: AutocompleteOption) => {
    onChange(option.value);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        open();
        return;
      }
      const optionCount = visibleOptions.length;
      if (optionCount === 0) {
        return;
      }
      setActiveIndex((current) => {
        if (event.key === 'ArrowUp') {
          return current <= 0 ? optionCount - 1 : current - 1;
        }
        return current >= optionCount - 1 ? 0 : current + 1;
      });
      return;
    }
    if (event.key === 'Enter' && isOpen) {
      const activeOption = visibleOptions[activeIndex];
      if (activeOption) {
        event.preventDefault();
        select(activeOption);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative">
      <Input
        {...inputProps}
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onClick={open}
        onFocus={open}
        onKeyDown={handleKeyDown}
      />
      {isOpen && visibleOptions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={listLabel}
          className="absolute z-50 mt-xs max-h-60 w-full overflow-y-auto rounded border bg-elevation-background-layer-3 py-xs drop-shadow-xs">
          {visibleOptions.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
              className={cn(
                'flex w-full cursor-pointer items-baseline gap-xs px-s py-xs text-sm hover:bg-hover',
                index === activeIndex && 'bg-hover'
              )}>
              <span className="whitespace-nowrap">{option.label}</span>
              <span className="truncate text-muted-foreground">
                - {option.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
