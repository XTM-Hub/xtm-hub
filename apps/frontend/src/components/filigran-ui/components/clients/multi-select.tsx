import { ArrowDropDownIcon, CheckIcon, CloseIcon } from '@filigran/icon';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../clients';
import { Badge, Button } from '../servers';

const multiSelectVariants = cva('', {
  variants: {
    variant: {
      default:
        'border-foreground/10 drop-shadow-md text-primary-foreground bg-primary hover:bg-primary/80',
      secondary:
        'border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive:
        'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
      inverted: 'inverted',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface MultiSelectFormFieldProps<
  T extends Record<string, any> = Record<string, any>,
>
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof multiSelectVariants> {
  asChild?: boolean;
  options: T[];
  keyLabel?: keyof T;
  keyValue?: keyof T;
  shouldFilter?: boolean;
  defaultValue?: string[];
  disabled?: boolean;
  placeholder: string;
  noResultString: string;
  popoverContentClassName?: string;
  placeholderClassName?: string;
  className?: string;
  onValueChange: (value: string[]) => void;
  onInputChange?: (value: string) => void;
}

const MultiSelectFormField = React.forwardRef<
  HTMLButtonElement,
  MultiSelectFormFieldProps
>(
  (
    {
      className,
      variant,
      asChild = false,
      options,
      keyLabel = 'label',
      keyValue = 'value',
      shouldFilter = true,
      defaultValue,
      onValueChange,
      onInputChange,
      placeholder,
      noResultString = 'No results found',
      popoverContentClassName,
      placeholderClassName,
      ...props
    },
    ref
  ) => {
    const [selectedValues, setSelectedValues] = React.useState<string[]>(
      defaultValue || []
    );

    const handleSearchInputChange = (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      onInputChange && onInputChange(event.target.value);
    };

    const selectedValuesSet = React.useRef(new Set(selectedValues));
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [visibleBadges, setVisibleBadges] = React.useState<number>(
      selectedValues.length
    );
    const badgesContainerRef = React.useRef<HTMLDivElement>(null);
    const measurementRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      setSelectedValues(defaultValue || []);
      selectedValuesSet.current = new Set(defaultValue);
    }, [defaultValue]);

    const updateBadgeVisibility = React.useCallback(() => {
      if (!badgesContainerRef.current || !measurementRef.current) {
        return;
      }

      const container = badgesContainerRef.current;
      const measurementContainer = measurementRef.current;

      const containerWidth = container.offsetWidth - 10; // Save space for controls

      let totalWidth = 0;
      let lastVisibleIndex = 0;

      const children = Array.from(
        measurementContainer.children
      ) as HTMLElement[];

      for (let i = 0; i < selectedValues.length; i++) {
        const child = children[i];
        if (child) {
          const childWidth = child.offsetWidth + 4; // 4px for gap
          const overflowBadgeLength = 56;

          if (totalWidth + childWidth + overflowBadgeLength > containerWidth) {
            break;
          }

          totalWidth += childWidth;
          lastVisibleIndex = i + 1;
        }
      }

      setVisibleBadges(lastVisibleIndex);
    }, [selectedValues, badgesContainerRef, measurementRef, setVisibleBadges]);

    React.useEffect(() => {
      updateBadgeVisibility();

      const handleResize = () => updateBadgeVisibility();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, [selectedValues, updateBadgeVisibility]);

    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>
    ) => {
      const target = event.target as HTMLInputElement;
      if (event.key === 'Enter') {
        setIsPopoverOpen(true);
      } else if (event.key === 'Backspace' && !target.value) {
        if (selectedValues.length > 0) {
          const newValues = [...selectedValues];
          const lastValue = newValues.pop() || '';
          setSelectedValues(newValues);
          selectedValuesSet.current.delete(lastValue);
          onValueChange(newValues);
        }
      }
    };

    const toggleOption = (value: string) => {
      if (selectedValuesSet.current.has(value)) {
        selectedValuesSet.current.delete(value);
        setSelectedValues(selectedValues.filter((v) => v !== value));
      } else {
        selectedValuesSet.current.add(value);
        setSelectedValues([...selectedValues, value]);
      }
      onValueChange(Array.from(selectedValuesSet.current));
    };

    const hiddenCount = selectedValues.length - visibleBadges;

    const renderBadges = (values: string[]) =>
      values.map((value) => {
        const option = options.find((opt) => String(opt[keyValue]) === value);
        return (
          <Badge key={value}>
            {option ? String(option[keyLabel]) : value}
            <span
              className="ml-s flex items-center justify-center"
              onClick={(event) => {
                event.stopPropagation();
                toggleOption(value);
              }}
              aria-label={`Remove ${option ? String(option[keyLabel]) : value}`}>
              <CloseIcon className="h-3 w-3 cursor-pointer" />
            </span>
          </Badge>
        );
      });

    const memoizedBadgesMeasurement = useMemo(() => {
      return renderBadges(selectedValues);
    }, [
      selectedValues,
      visibleBadges,
      options,
      keyLabel,
      keyValue,
      toggleOption,
    ]);

    const memoizedBadges = useMemo(() => {
      return renderBadges(selectedValues.slice(0, visibleBadges));
    }, [
      selectedValues,
      visibleBadges,
      options,
      keyLabel,
      keyValue,
      toggleOption,
    ]);

    const memoizedBadgesTooltip = useMemo(() => {
      return renderBadges(selectedValues.slice(visibleBadges));
    }, [
      selectedValues,
      visibleBadges,
      options,
      keyLabel,
      keyValue,
      toggleOption,
    ]);

    return (
      <TooltipProvider delayDuration={0}>
        <div
          className="sr-only"
          aria-hidden="true">
          <CloseIcon />
        </div>
        <Popover
          open={isPopoverOpen}
          onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              {...props}
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              className={cn(
                'flex h-9 w-full items-center justify-between rounded bg-input-bg-default p-1 hover:bg-hover',
                className
              )}>
              {selectedValues.length > 0 ? (
                <div className="flex w-full items-center">
                  <div
                    ref={badgesContainerRef}
                    className="flex flex-1 items-center gap-s overflow-hidden">
                    <div
                      ref={measurementRef}
                      className="absolute invisible flex items-center gap-s"
                      aria-hidden="true">
                      {memoizedBadgesMeasurement}
                    </div>

                    {memoizedBadges}

                    {hiddenCount > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex">
                            <Badge>+{hiddenCount}...</Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="flex flex-wrap gap-s p-s max-w-sm">
                            {memoizedBadgesTooltip}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex items-center shrink-0">
                    <span
                      role="button"
                      tabIndex={0}
                      className="flex items-center justify-center"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedValues([]);
                        selectedValuesSet.current.clear();
                        onValueChange([]);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          setSelectedValues([]);
                          selectedValuesSet.current.clear();
                          onValueChange([]);
                        }
                      }}
                      aria-label="Clear all selections">
                      <CloseIcon className="mx-s h-3 cursor-pointer text-muted-foreground" />
                    </span>
                    <Separator
                      orientation="vertical"
                      className="h-6"
                    />
                    <ArrowDropDownIcon className="ml-2 mr-1 size-5 cursor-pointer text-muted-foreground" />
                  </div>
                </div>
              ) : (
                <div className="flex w-full items-center justify-between">
                  <span
                    className={cn(
                      'mx-3 text-sm text-muted-foreground normal-case',
                      placeholderClassName
                    )}
                    role="textbox"
                    aria-readonly="true">
                    {placeholder}
                  </span>
                  <ArrowDropDownIcon
                    className="ml-2 mr-1 size-5 cursor-pointer text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn(
              'w-[300px] p-0 drop-shadow-xs',
              popoverContentClassName
            )}
            align="start"
            onEscapeKeyDown={() => setIsPopoverOpen(false)}>
            {/*ShouldFilter use to filter on client side or server side*/}
            <Command
              className={popoverContentClassName}
              onChange={handleSearchInputChange}
              shouldFilter={shouldFilter}>
              <CommandInput
                placeholder="Search..."
                onKeyDown={handleInputKeyDown}
              />
              <CommandList
                onWheel={(e) => {
                  e.currentTarget.scrollTop += e.deltaY;
                  e.stopPropagation();
                }}>
                <CommandEmpty>{noResultString}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => {
                    const optionValue = String(option[keyValue]);
                    const isSelected =
                      selectedValuesSet.current.has(optionValue);
                    return (
                      <CommandItem
                        key={optionValue}
                        onSelect={() => toggleOption(optionValue)}
                        style={{
                          pointerEvents: 'auto',
                          opacity: 1,
                        }}
                        className="cursor-pointer">
                        {isSelected ? (
                          <div className="mr-2 flex h-4 w-4 min-w-4 items-center justify-center rounded-xs border border-primary bg-primary text-primary-foreground">
                            <CheckIcon className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="mr-2 flex h-4 w-4 min-w-4 items-center justify-center rounded-xs border border-primary opacity-50"></div>
                        )}
                        <span>{String(option[keyLabel])}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <div className="flex items-center justify-between">
                    {selectedValues.length > 0 && (
                      <>
                        <CommandItem
                          onSelect={() => {
                            setSelectedValues([]);
                            selectedValuesSet.current.clear();
                            onValueChange([]);
                          }}
                          style={{
                            pointerEvents: 'auto',
                            opacity: 1,
                          }}
                          className="flex-1 cursor-pointer justify-center">
                          Clear
                        </CommandItem>
                        <Separator
                          orientation="vertical"
                          className="flex h-full min-h-6"
                        />
                      </>
                    )}
                    <CommandSeparator />
                    <CommandItem
                      onSelect={() => setIsPopoverOpen(false)}
                      style={{
                        pointerEvents: 'auto',
                        opacity: 1,
                      }}
                      className="flex-1 cursor-pointer justify-center">
                      Close
                    </CommandItem>
                  </div>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    );
  }
);

MultiSelectFormField.displayName = 'MultiSelectFormField';

export { MultiSelectFormField };
