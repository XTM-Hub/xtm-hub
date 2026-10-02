'use client';

import { cn } from '@/components/filigran-ui/lib/utils';
import { ArrowDropDownIcon, CheckIcon, CloseIcon } from '@filigran/icon';
import * as React from 'react';
import { Button } from '../servers';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './Command';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export interface ComboboxItem {
  value: string;
  label: string;
}

interface ComboboxProps<T> {
  dataTab: T[];
  order: string;
  placeholder: string;
  emptyCommand: string;
  onValueChange: (value: T | undefined) => void;
  onInputChange?: (value: string) => void;
  value?: T;
  className?: string;
  keyValue?: keyof T | 'value';
  keyLabel?: keyof T | 'label';
}

const Combobox = <T,>({
  dataTab,
  order,
  placeholder,
  emptyCommand,
  onValueChange,
  onInputChange,
  value,
  className,
  keyLabel = 'label',
  keyValue = 'value',
}: ComboboxProps<T>) => {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (selectedValue: string) => {
    const selectedItem =
      dataTab.find(
        (item) => String(item[keyValue as keyof typeof item]) === selectedValue
      ) || undefined;

    setOpen(false);
    onValueChange(selectedItem);
  };

  const handleSearchInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onInputChange && onInputChange(event.target.value);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(undefined);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'normal-case w-full justify-between bg-input-bg-default border-none',
            className
          )}
          onClick={() => setOpen(!open)}>
          {value ? (
            String(value[keyLabel as keyof T])
          ) : (
            <span className="text-muted-foreground">{order}</span>
          )}
          <div className="flex items-center gap-s">
            {value && (
              <CloseIcon
                className="h-2.5 w-2.5 cursor-pointer text-muted-foreground"
                onClick={handleReset}
              />
            )}
            <ArrowDropDownIcon className="size-5 cursor-pointer text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 popover-content-width-same-as-its-trigger">
        <Command onChange={handleSearchInputChange}>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyCommand}</CommandEmpty>
            <CommandGroup>
              {dataTab.map((data) => (
                <CommandItem
                  key={String(data[keyValue as keyof T])}
                  value={String(data[keyValue as keyof T])}
                  onSelect={() =>
                    handleSelect(String(data[keyValue as keyof T]))
                  }>
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      (value as ComboboxItem)?.value ===
                        data[keyValue as keyof T]
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <span className="mx-3 text-sm text-foreground">
                    {String(data[keyLabel as keyof T])}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export { Combobox };
