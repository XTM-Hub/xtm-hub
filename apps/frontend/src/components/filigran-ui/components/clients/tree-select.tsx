'use client';

import {
  CloseIcon,
  KeyboardArrowDownIcon,
  KeyboardArrowRightIcon,
  SearchIcon,
} from '@filigran/icon';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import {
  Checkbox,
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

export type TreeSelectChild = {
  id: string;
  text: string;
};

export type TreeSelectOption = {
  id: string;
  text: string;
  children?: TreeSelectChild[];
};

const treeSelectVariants = cva(
  'flex h-9 w-full items-center justify-between rounded bg-input-bg-default p-1 hover:bg-hover',
  {
    variants: {
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TreeSelectProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>,
    VariantProps<typeof treeSelectVariants> {
  options: TreeSelectOption[];
  selectedGroupIds: string[];
  selectedChildIds: string[];
  onSelectionChange: (groupIds: string[], childIds: string[]) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  placeholder?: string;
}

type SummaryItem = {
  label: string;
  groupId: string;
  childId?: string;
};

const TreeSelect = React.forwardRef<HTMLButtonElement, TreeSelectProps>(
  (
    {
      options,
      selectedGroupIds,
      selectedChildIds,
      onSelectionChange,
      searchPlaceholder = 'Search...',
      emptyMessage = 'No results found.',
      placeholder = 'Select...',
      disabled,
      className,
      variant,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [visibleBadges, setVisibleBadges] = useState<number>(0);
    const badgesContainerRef = React.useRef<HTMLDivElement>(null);
    const measurementRef = React.useRef<HTMLDivElement>(null);
    const rafId = React.useRef(0);
    const treeRef = React.useRef<HTMLDivElement>(null);

    const filteredOptions = useMemo(() => {
      if (!search.trim()) {
        return options;
      }
      const lower = search.toLowerCase();
      return options
        .map((group) => {
          const groupMatches = group.text.toLowerCase().includes(lower);
          const matchingChildren = (group.children ?? []).filter((c) =>
            c.text.toLowerCase().includes(lower)
          );
          if (groupMatches) return group;
          if (matchingChildren.length > 0)
            return { ...group, children: matchingChildren };
          return null;
        })
        .filter((g): g is TreeSelectOption => g !== null);
    }, [options, search]);

    const handleToggleGroup = useCallback(
      (groupId: string, checked: boolean) => {
        if (checked) {
          const nextGroupIds = selectedGroupIds.includes(groupId)
            ? selectedGroupIds
            : [...selectedGroupIds, groupId];
          onSelectionChange(nextGroupIds, selectedChildIds);
        } else {
          const group = options.find((g) => g.id === groupId);
          const childIdsToRemove = new Set(
            group?.children?.map((c) => c.id) ?? []
          );
          onSelectionChange(
            selectedGroupIds.filter((id) => id !== groupId),
            selectedChildIds.filter((id) => !childIdsToRemove.has(id))
          );
        }
      },
      [selectedGroupIds, selectedChildIds, options, onSelectionChange]
    );

    const handleToggleChild = useCallback(
      (childId: string, parentGroupId: string, checked: boolean) => {
        if (checked) {
          const nextGroupIds = selectedGroupIds.includes(parentGroupId)
            ? selectedGroupIds
            : [...selectedGroupIds, parentGroupId];
          const nextChildIds = selectedChildIds.includes(childId)
            ? selectedChildIds
            : [...selectedChildIds, childId];
          onSelectionChange(nextGroupIds, nextChildIds);
        } else {
          const remaining = selectedChildIds.filter((id) => id !== childId);
          const group = options.find((g) => g.id === parentGroupId);
          const siblingIds = new Set(group?.children?.map((c) => c.id) ?? []);
          const hasRemaining = remaining.some((id) => siblingIds.has(id));
          const nextGroupIds = hasRemaining
            ? selectedGroupIds
            : selectedGroupIds.filter((id) => id !== parentGroupId);
          onSelectionChange(nextGroupIds, remaining);
        }
      },
      [selectedGroupIds, selectedChildIds, options, onSelectionChange]
    );

    const handleToggleExpand = useCallback((groupId: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(groupId)) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
        return next;
      });
    }, []);

    const handleClear = useCallback(() => {
      onSelectionChange([], []);
    }, [onSelectionChange]);

    const handleRemoveBadge = useCallback(
      (item: SummaryItem) => {
        if (item.childId) {
          onSelectionChange(
            selectedGroupIds,
            selectedChildIds.filter((id) => id !== item.childId)
          );
        } else {
          const group = options.find((g) => g.id === item.groupId);
          const childIdsToRemove = new Set(
            group?.children?.map((c) => c.id) ?? []
          );
          onSelectionChange(
            selectedGroupIds.filter((id) => id !== item.groupId),
            selectedChildIds.filter((id) => !childIdsToRemove.has(id))
          );
        }
      },
      [selectedGroupIds, selectedChildIds, options, onSelectionChange]
    );

    const summaryItems = useMemo((): SummaryItem[] => {
      const items: SummaryItem[] = [];
      for (const group of options) {
        if (!selectedGroupIds.includes(group.id)) continue;
        const selectedChildren = (group.children ?? []).filter((c) =>
          selectedChildIds.includes(c.id)
        );
        if (selectedChildren.length === 0) {
          items.push({ label: group.text, groupId: group.id });
        } else {
          for (const child of selectedChildren) {
            items.push({
              label: `${group.text} — ${child.text}`,
              groupId: group.id,
              childId: child.id,
            });
          }
        }
      }
      return items;
    }, [options, selectedGroupIds, selectedChildIds]);

    const totalSelected = summaryItems.length;

    const updateBadgeVisibility = React.useCallback(() => {
      if (!badgesContainerRef.current || !measurementRef.current) {
        return;
      }

      const container = badgesContainerRef.current;
      const measurementContainer = measurementRef.current;

      const containerWidth = container.offsetWidth - 10;

      let totalWidth = 0;
      let lastVisibleIndex = 0;

      const children = Array.from(
        measurementContainer.children
      ) as HTMLElement[];

      for (let i = 0; i < summaryItems.length; i++) {
        const child = children[i];
        if (child) {
          const childWidth = child.offsetWidth + 4;
          const overflowBadgeLength = 56;

          if (totalWidth + childWidth + overflowBadgeLength > containerWidth) {
            break;
          }

          totalWidth += childWidth;
          lastVisibleIndex = i + 1;
        }
      }

      setVisibleBadges(lastVisibleIndex);
    }, [summaryItems]);

    React.useEffect(() => {
      updateBadgeVisibility();

      const handleResize = () => {
        cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(updateBadgeVisibility);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(rafId.current);
      };
    }, [summaryItems, updateBadgeVisibility]);

    const renderBadges = (items: SummaryItem[]) =>
      items.map((item) => (
        <Badge key={`${item.groupId}:${item.childId ?? 'group'}`}>
          {item.label}
          <button
            type="button"
            className="ml-s flex items-center justify-center"
            onClick={(event) => {
              event.stopPropagation();
              handleRemoveBadge(item);
            }}
            aria-label={`Remove ${item.label}`}>
            <CloseIcon className="h-3 w-3 cursor-pointer" />
          </button>
        </Badge>
      ));

    const hiddenCount = totalSelected - visibleBadges;

    const badgesMeasurement = renderBadges(summaryItems);
    const visibleBadgeElements = renderBadges(
      summaryItems.slice(0, visibleBadges)
    );
    const tooltipBadges = renderBadges(summaryItems.slice(visibleBadges));

    const visibleItems = useMemo(() => {
      const items: {
        id: string;
        type: 'group' | 'child';
        parentId?: string;
      }[] = [];
      for (const group of filteredOptions) {
        items.push({ id: group.id, type: 'group' });
        if (expandedIds.has(group.id) && group.children) {
          for (const child of group.children) {
            items.push({ id: child.id, type: 'child', parentId: group.id });
          }
        }
      }
      return items;
    }, [filteredOptions, expandedIds]);

    const handleTreeKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const tree = treeRef.current;
        if (!tree) return;

        const focusableItems =
          tree.querySelectorAll<HTMLElement>('[role="treeitem"]');
        const currentIndex = Array.from(focusableItems).findIndex(
          (el) =>
            el === document.activeElement || el.contains(document.activeElement)
        );

        let nextIndex = currentIndex;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            nextIndex = Math.min(currentIndex + 1, focusableItems.length - 1);
            break;
          case 'ArrowUp':
            e.preventDefault();
            nextIndex = Math.max(currentIndex - 1, 0);
            break;
          case 'ArrowRight': {
            e.preventDefault();
            const item = visibleItems[currentIndex];
            if (item?.type === 'group') {
              const group = filteredOptions.find((g) => g.id === item.id);
              if (group?.children?.length) {
                if (!expandedIds.has(item.id)) {
                  handleToggleExpand(item.id);
                } else {
                  nextIndex = currentIndex + 1;
                }
              }
            }
            break;
          }
          case 'ArrowLeft': {
            e.preventDefault();
            const item = visibleItems[currentIndex];
            if (item?.type === 'group' && expandedIds.has(item.id)) {
              handleToggleExpand(item.id);
            } else if (item?.type === 'child' && item.parentId) {
              const parentIndex = visibleItems.findIndex(
                (vi) => vi.id === item.parentId
              );
              if (parentIndex >= 0) nextIndex = parentIndex;
            }
            break;
          }
          case 'Home':
            e.preventDefault();
            nextIndex = 0;
            break;
          case 'End':
            e.preventDefault();
            nextIndex = focusableItems.length - 1;
            break;
          case ' ':
          case 'Enter': {
            e.preventDefault();
            const item = visibleItems[currentIndex];
            if (item) {
              if (item.type === 'group') {
                const isChecked = selectedGroupIds.includes(item.id);
                handleToggleGroup(item.id, !isChecked);
              } else if (item.parentId) {
                const isChecked = selectedChildIds.includes(item.id);
                handleToggleChild(item.id, item.parentId, !isChecked);
              }
            }
            break;
          }
          default:
            return;
        }

        if (nextIndex !== currentIndex) {
          focusableItems[nextIndex]?.focus();
        }
      },
      [
        visibleItems,
        filteredOptions,
        expandedIds,
        selectedGroupIds,
        selectedChildIds,
        handleToggleExpand,
        handleToggleGroup,
        handleToggleChild,
      ]
    );

    return (
      <TooltipProvider delayDuration={0}>
        <Popover
          open={open}
          onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              disabled={disabled}
              onClick={() => setOpen(!open)}
              className={cn(treeSelectVariants({ variant }), className)}
              {...props}>
              {totalSelected > 0 ? (
                <div className="flex w-full items-center">
                  <div
                    ref={badgesContainerRef}
                    className="flex flex-1 items-center gap-s overflow-hidden">
                    <div
                      ref={measurementRef}
                      className="absolute invisible flex items-center gap-s"
                      aria-hidden="true">
                      {badgesMeasurement}
                    </div>

                    {visibleBadgeElements}

                    {hiddenCount > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex"
                            aria-label={`${hiddenCount} more selections`}>
                            <Badge>+{hiddenCount}...</Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="flex flex-wrap gap-s p-s max-w-sm">
                            {tooltipBadges}
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
                      onClick={(event: React.MouseEvent) => {
                        event.stopPropagation();
                        handleClear();
                      }}
                      onKeyDown={(event: React.KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          handleClear();
                        }
                      }}
                      aria-label="Clear all selections">
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
                  <span className="mx-3 text-sm text-muted-foreground normal-case">
                    {placeholder}
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
            className="w-[--radix-popover-trigger-width] p-0 drop-shadow-xs"
            align="start"
            onEscapeKeyDown={() => setOpen(false)}>
            <div className="flex items-center border-b border-elevation-border-strong-layer-2 px-3">
              <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                className="flex h-11 w-full rounded bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div
              ref={treeRef}
              role="tree"
              aria-label="Options"
              className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1"
              onKeyDown={handleTreeKeyDown}
              onWheel={(e) => {
                e.currentTarget.scrollTop += e.deltaY;
                e.stopPropagation();
              }}>
              {filteredOptions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </p>
              ) : (
                filteredOptions.map((group) => {
                  const isGroupChecked = selectedGroupIds.includes(group.id);
                  const hasChildren = (group.children ?? []).length > 0;
                  const isExpanded = expandedIds.has(group.id);

                  return (
                    <div
                      key={group.id}
                      role="treeitem"
                      aria-expanded={hasChildren ? isExpanded : undefined}
                      aria-selected={isGroupChecked}
                      tabIndex={-1}>
                      <div className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-hover">
                        {hasChildren ? (
                          <button
                            type="button"
                            className="flex h-4 w-4 shrink-0 items-center justify-center"
                            onClick={() => handleToggleExpand(group.id)}
                            aria-label={
                              isExpanded
                                ? `Collapse ${group.text}`
                                : `Expand ${group.text}`
                            }
                            aria-expanded={isExpanded}
                            tabIndex={-1}>
                            {isExpanded ? (
                              <KeyboardArrowDownIcon className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <KeyboardArrowRightIcon className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        ) : (
                          <span className="h-4 w-4 shrink-0" />
                        )}
                        <Checkbox
                          checked={isGroupChecked}
                          aria-label={group.text}
                          onCheckedChange={(checked) =>
                            handleToggleGroup(group.id, checked === true)
                          }
                          tabIndex={-1}
                        />
                        <button
                          type="button"
                          className="flex-1 text-left text-sm"
                          onClick={() => {
                            if (hasChildren) {
                              handleToggleExpand(group.id);
                            } else {
                              handleToggleGroup(group.id, !isGroupChecked);
                            }
                          }}>
                          <span className="font-medium">{group.text}</span>
                          {hasChildren && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({(group.children ?? []).length})
                            </span>
                          )}
                        </button>
                      </div>
                      {hasChildren && isExpanded && (
                        <div
                          role="group"
                          className="ml-6">
                          {(group.children ?? []).map((child) => {
                            const isChildChecked = selectedChildIds.includes(
                              child.id
                            );
                            return (
                              <div
                                key={child.id}
                                role="treeitem"
                                aria-selected={isChildChecked}
                                tabIndex={-1}
                                className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-hover">
                                <span className="h-4 w-4 shrink-0" />
                                <Checkbox
                                  checked={isChildChecked}
                                  aria-label={child.text}
                                  onCheckedChange={(checked) =>
                                    handleToggleChild(
                                      child.id,
                                      group.id,
                                      checked === true
                                    )
                                  }
                                  tabIndex={-1}
                                />
                                <button
                                  type="button"
                                  className="flex-1 text-left text-sm"
                                  onClick={() =>
                                    handleToggleChild(
                                      child.id,
                                      group.id,
                                      !isChildChecked
                                    )
                                  }>
                                  {child.text}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <Separator />
            <div className="p-1">
              <div className="flex items-center justify-between">
                {totalSelected > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleClear()}
                      className="flex flex-1 cursor-pointer select-none items-center justify-center rounded-xs px-2 py-1.5 text-sm outline-none hover:bg-hover">
                      Clear
                    </button>
                    <Separator
                      orientation="vertical"
                      className="flex h-full min-h-6"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex flex-1 cursor-pointer select-none items-center justify-center rounded-xs px-2 py-1.5 text-sm outline-none hover:bg-hover">
                  Close
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    );
  }
);
TreeSelect.displayName = 'TreeSelect';

export { TreeSelect, treeSelectVariants };
