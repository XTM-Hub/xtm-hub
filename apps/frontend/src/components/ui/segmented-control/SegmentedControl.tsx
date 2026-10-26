'use client';

import { cn } from '@/lib/utils';
import { KeyboardEvent, useRef } from 'react';

export interface SegmentedControlItem<T extends string> {
  value: T;
  label: string;
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

// Same keys as the design system's ButtonGroup: arrows wrap around, Home/End jump to the ends.
const nextIndex = (key: string, current: number, count: number) => {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
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
  // One tab stop, entered at the selected item, or the first one when none is.
  const tabbableIndex = Math.max(selectedIndex, 0);

  const select = (item: SegmentedControlItem<T>) => {
    if (item.value !== value) {
      onValueChange(item.value);
    }
  };

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    const next = nextIndex(event.key, index, items.length);
    const nextItem = next === null ? undefined : items[next];
    if (next === null || !nextItem) {
      return;
    }
    event.preventDefault();
    itemRefs.current[next]?.focus();
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
        return (
          <button
            key={item.value}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
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
              isSelected
                ? 'bg-filigran-brand-primary text-negative-primary hover:bg-filigran-brand-tertiary disabled:bg-input-disabled'
                : 'bg-transparent text-default-primary hover:bg-filigran-brand-primary-transparency-10'
            )}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
