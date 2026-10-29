'use client';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { KeyboardEvent, useRef } from 'react';

export interface SegmentedControlItem<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  tooltip?: string;
}

export interface SegmentedControlProps<T extends string> {
  items: SegmentedControlItem<T>[];
  value: T;
  // Fires only when another item is picked, never for the selected one.
  onValueChange: (value: T) => void;
  'aria-label': string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

const SIZE_CLASS_NAME = {
  sm: 'h-6 px-2',
  md: 'h-9 px-4',
};

// Same keys as the design system's ButtonGroup: arrows wrap around, Home/End jump to the ends. They land on enabled
// items only, from their neighbours even when the focus sits on a disabled item, which a click still focuses.
const nextIndex = (key: string, current: number, enabledIndexes: number[]) => {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (
        enabledIndexes.find((index) => index > current) ?? enabledIndexes[0]
      );
    case 'ArrowLeft':
    case 'ArrowUp':
      return (
        enabledIndexes.findLast((index) => index < current) ??
        enabledIndexes.at(-1)
      );
    case 'Home':
      return enabledIndexes[0];
    case 'End':
      return enabledIndexes.at(-1);
    default:
      return undefined;
  }
};

// A disabled item wears the disabled ink with no hover wash; selected, it sits on the disabled input fill like the
// selected item of a disabled group.
const itemStateClassName = (isSelected: boolean, isDisabled = false) => {
  if (isDisabled) {
    return cn(
      'cursor-default text-default-disabled',
      isSelected ? 'bg-input-disabled' : 'bg-transparent'
    );
  }
  return isSelected
    ? 'bg-filigran-brand-primary text-negative-primary hover:bg-filigran-brand-tertiary disabled:bg-input-disabled'
    : 'bg-transparent text-default-primary hover:bg-filigran-brand-primary-transparency-10';
};

// The design system's ButtonGroup takes icon-only items: this is its labelled
// counterpart, with the same radiogroup semantics and roving tabindex.
export const SegmentedControl = <T extends string>({
  items,
  value,
  onValueChange,
  'aria-label': ariaLabel,
  size = 'md',
  disabled = false,
  className,
}: SegmentedControlProps<T>) => {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = items.findIndex((item) => item.value === value);
  // Like the design system's ButtonGroup, the keyboard skips disabled items.
  const enabledIndexes = items.flatMap((item, index) =>
    item.disabled ? [] : [index]
  );
  // One tab stop, entered at the selected item, or the first enabled one when none is.
  const tabbableIndex = enabledIndexes.includes(selectedIndex)
    ? selectedIndex
    : (enabledIndexes[0] ?? 0);

  const select = (item: SegmentedControlItem<T>) => {
    if (!item.disabled && item.value !== value) {
      onValueChange(item.value);
    }
  };

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    const nextItemIndex = nextIndex(event.key, index, enabledIndexes);
    const nextItem =
      nextItemIndex === undefined ? undefined : items[nextItemIndex];
    if (nextItemIndex === undefined || !nextItem) {
      return;
    }
    event.preventDefault();
    itemRefs.current[nextItemIndex]?.focus();
    select(nextItem);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={cn(
        'inline-flex rounded-sm border',
        disabled ? 'border-elevation-disabled' : 'border-elevation-default',
        className
      )}>
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        const segment = (
          <button
            key={item.value}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            // aria-disabled rather than disabled: the item still takes the hover that opens its tooltip.
            aria-disabled={item.disabled || undefined}
            tabIndex={index === tabbableIndex ? 0 : -1}
            disabled={disabled}
            onClick={() => select(item)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'm-0 box-border inline-flex cursor-pointer items-center justify-center border-0 whitespace-nowrap transition',
              'text-content-button font-content-button font-semibold leading-content-button tracking-content-button',
              'not-first:border-l not-first:border-elevation-default first:rounded-l-sm last:rounded-r-sm',
              // Same disabled recipe as the design system's isolated ButtonGroup.
              'disabled:pointer-events-none disabled:not-first:border-elevation-disabled disabled:text-default-disabled',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-focus focus-visible:ring-filigran-brand-primary focus-visible:z-10',
              SIZE_CLASS_NAME[size],
              itemStateClassName(isSelected, item.disabled)
            )}>
            {item.label}
          </button>
        );
        return item.tooltip ? (
          <TooltipProvider key={item.value}>
            <Tooltip>
              <TooltipTrigger asChild>{segment}</TooltipTrigger>
              <TooltipContent>{item.tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          segment
        );
      })}
    </div>
  );
};
