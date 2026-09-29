import { useUserListLocalstorage } from '@/components/admin/user/user-list-localstorage';
import { UserFragment } from '@/components/admin/user/UserList';
import { useTranslate } from '@/hooks/use-translate';
import { DEBOUNCE_TIME } from '@/utils/constant';
import { CheckIcon, CloseIcon, KeyboardArrowDownIcon } from '@filigran/icon';
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
} from '@filigran/ui/clients';
import { Badge, Button } from '@filigran/ui/servers';
import { UserList_fragment$key } from '@generated/UserList_fragment.graphql';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useUsersList } from '@/hooks/use-users-list';
import { readInlineData } from 'react-relay';
import { useDebounceCallback } from 'usehooks-ts';

interface SelectUsersFormFieldProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  defaultValue?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const SelectUsersFormField = React.forwardRef<
  HTMLButtonElement,
  SelectUsersFormFieldProps
>(({ defaultValue, onValueChange, disabled, ...props }, ref) => {
  const t = useTranslate();

  const [selectedValues, setSelectedValues] = useState<string[]>([
    defaultValue ?? '',
  ]);

  const selectedValuesSet = useMemo(
    () => new Set(selectedValues),
    [selectedValues]
  );
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [visibleBadges, setVisibleBadges] = useState<number>(
    selectedValues.length
  );
  const measurementRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const badgesContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        resizeObserverRef.current?.disconnect();
        resizeObserverRef.current = null;
        return;
      }
      if (!node || !measurementRef.current) return;

      const updateVisibility = () => {
        if (!measurementRef.current) return;
        const containerWidth = node.offsetWidth - 10; // Save space for controls
        let totalWidth = 0;
        let lastVisibleIndex = 0;

        const children = Array.from(
          measurementRef.current!.children
        ) as HTMLElement[];

        for (let i = 0; i < selectedValues.length; i++) {
          const child = children[i];
          if (child) {
            const childWidth = child.offsetWidth + 4; // 4px for gap
            const overflowBadgeLength = 56;
            if (
              totalWidth + childWidth + overflowBadgeLength >
              containerWidth
            ) {
              break;
            }
            totalWidth += childWidth;
            lastVisibleIndex = i + 1;
          }
        }
        setVisibleBadges(lastVisibleIndex);
      };

      updateVisibility();

      const resizeObserver = new ResizeObserver(() => {
        updateVisibility();
      });

      resizeObserver.observe(node);
    },
    [selectedValues]
  );
  const { orderMode, orderBy } = useUserListLocalstorage();
  const filterRef = useRef({ search: '' });

  const { data, refetch } = useUsersList({
    orderBy,
    orderMode,
    pageSize: 50,
    filter: {
      search: '',
    },
  });

  const users = useMemo(
    () =>
      data?.users?.edges?.map((edge) => {
        const user = readInlineData<UserList_fragment$key>(
          UserFragment,
          edge.node
        );
        return {
          value: user.id,
          label: user.email,
        };
      }) || [],
    [data?.users?.edges]
  );

  const handleRefetch = (value: string) => {
    filterRef.current = {
      ...filterRef.current,
      search: value,
    };

    refetch({
      count: 10,
      orderMode,
      orderBy,
      searchTerm: filterRef.current.search,
    });
  };

  const handleSearchInputChange = useDebounceCallback(
    (e) => handleRefetch(e.target.value),
    DEBOUNCE_TIME
  );

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    if (event.key === 'Enter') {
      setIsPopoverOpen(true);
    } else if (event.key === 'Backspace' && !target.value) {
      if (selectedValues.length > 0) {
        const newValues = [...selectedValues];
        newValues.pop();
        setSelectedValues(newValues);
        onValueChange(newValues[0] ?? '');
      }
    }
  };

  const toggleOption = useCallback(
    (value: string) => {
      if (selectedValuesSet.has(value)) {
        setSelectedValues([]);
        onValueChange('');
      } else {
        setSelectedValues([value]);
        onValueChange(value);
        setIsPopoverOpen(false);
      }
    },
    [onValueChange, setIsPopoverOpen, selectedValuesSet]
  );

  const hiddenCount = selectedValues.length - visibleBadges;

  const renderBadges = useCallback(
    (values: string[]) =>
      values.map((value) => {
        const option = users.find((opt) => String(opt.value) === value);
        return (
          <Badge key={value}>
            {option ? String(option.label) : value}
            <span
              className="ml-s flex items-center justify-center"
              onClick={(event) => {
                event.stopPropagation();
                toggleOption(value);
              }}
              aria-label={`Remove ${option ? String(option.label) : value}`}>
              <CloseIcon className="h-3 w-3 cursor-pointer" />
            </span>
          </Badge>
        );
      }),
    [users, toggleOption]
  );

  const memoizedBadgesMeasurement = useMemo(() => {
    return renderBadges(selectedValues);
  }, [selectedValues, renderBadges]);

  const memoizedBadges = useMemo(() => {
    return renderBadges(selectedValues.slice(0, visibleBadges));
  }, [selectedValues, visibleBadges, renderBadges]);

  const memoizedBadgesTooltip = useMemo(() => {
    return renderBadges(selectedValues.slice(visibleBadges));
  }, [selectedValues, visibleBadges, renderBadges]);

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
            disabled={disabled}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            className="flex h-9 w-full items-center justify-between rounded bg-input-bg-default p-1 hover:bg-hover">
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
                      onValueChange('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedValues([]);
                        onValueChange('');
                      }
                    }}
                    aria-label={t('SelectUsers.ClearAllSelections')}>
                    <CloseIcon className="mx-s h-3 cursor-pointer text-muted-foreground" />
                  </span>
                  <Separator
                    orientation="vertical"
                    className="h-6"
                  />
                  <KeyboardArrowDownIcon className="mx-2 w-2.5 h-2.5 cursor-pointer text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between">
                <span
                  className="mx-3 text-sm text-muted-foreground normal-case"
                  role="textbox"
                  aria-readonly="true">
                  {t('InviteUserServiceForm.Email')}
                </span>
                <KeyboardArrowDownIcon
                  className="mx-2 w-2.5 h-2.5 cursor-pointer text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0 drop-shadow-sm"
          align="start"
          onEscapeKeyDown={() => setIsPopoverOpen(false)}>
          <Command
            className="bg-elevation-background-layer-3"
            shouldFilter={false}
            onChange={handleSearchInputChange}>
            <CommandInput
              placeholder={t('UserActions.SearchUser')}
              onKeyDown={handleInputKeyDown}
            />
            <CommandList
              onWheel={(e) => {
                e.currentTarget.scrollTop += e.deltaY;
                e.stopPropagation();
              }}>
              <CommandEmpty>{t('Utils.NotFound')}</CommandEmpty>
              <CommandGroup>
                {users.map((option) => {
                  const optionValue = String(option.value);
                  const isSelected = selectedValuesSet.has(optionValue);
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
                        <div className="mr-2 flex h-4 w-4 min-w-4 items-center justify-center rounded-sm border border-primary bg-primary text-primary-foreground">
                          <CheckIcon className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="mr-2 flex h-4 w-4 min-w-4 items-center justify-center rounded-sm border border-primary opacity-50"></div>
                      )}
                      <span>{String(option.label)}</span>
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
                          onValueChange('');
                        }}
                        style={{
                          pointerEvents: 'auto',
                          opacity: 1,
                        }}
                        className="flex-1 cursor-pointer justify-center capitalize">
                        {t('Utils.Clear')}
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
                    className="flex-1 cursor-pointer justify-center capitalize">
                    {t('Utils.Close')}
                  </CommandItem>
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
});
SelectUsersFormField.displayName = 'SelectUsersFormField';
export default SelectUsersFormField;
