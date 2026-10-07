'use client';
import { cn } from '@/lib/utils';
import { formatName } from '@/utils/format/name';
import { Chip } from '@filigran/design-system';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui';
import { Badge } from '@filigran/ui/servers';
import {
  type HTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

interface BadgeOverflowCounterProps {
  badges: Readonly<BadgeOverflow[]>;
  className?: string;
  badgeClassName?: string;
  formatLabel?: boolean;
  variant?: 'badge' | 'chip';
}

export interface BadgeOverflow {
  id: string;
  name: string;
  color?: string;
}

interface OverflowBadgeOptions extends HTMLAttributes<HTMLElement> {
  key: string;
  label: string;
  color?: string;
  counter?: boolean;
  truncate?: boolean;
}

const BadgeOverflowCounter = ({
  badges = [],
  className,
  badgeClassName,
  formatLabel = true,
  variant = 'badge',
}: BadgeOverflowCounterProps) => {
  const [visibleTags, setVisibleTags] = useState<number>(badges?.length ?? 0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      if (!node || !badges || badges?.length === 0) {
        return;
      }

      const updateVisibility = () => {
        const container = node;
        const counterBadgeWidth = 56;
        let totalWidth = 0;
        let lastVisibleIndex = 1;
        const children = Array.from(container.children) as HTMLElement[];

        for (let i = 0; i < badges.length; i++) {
          if (children[i]) {
            totalWidth += children[i]!.offsetWidth + 8;
            if (
              i > 0 &&
              totalWidth + counterBadgeWidth > container.offsetWidth
            ) {
              break;
            }
            lastVisibleIndex = i + 1;
          }
        }

        if (lastVisibleIndex === badges.length - 1 && badges.length > 1) {
          if (totalWidth > container.offsetWidth) {
            lastVisibleIndex = 1;
          }
        }

        setVisibleTags(lastVisibleIndex);
      };

      updateVisibility();

      resizeObserverRef.current = new ResizeObserver(() => {
        updateVisibility();
      });

      resizeObserverRef.current.observe(node);
    },
    [badges]
  );

  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, []);

  if (!badges || badges.length === 0) {
    return null;
  }
  const hiddenCount = badges.length - visibleTags;
  const firstBadge = badges[0];
  const getBadgeLabel = (name: string) =>
    formatLabel ? formatName(name) : name;

  const renderBadge = ({
    key,
    label,
    color,
    counter = false,
    truncate = false,
    className: badgeOwnClassName,
    ...props
  }: OverflowBadgeOptions) =>
    variant === 'chip' ? (
      <Chip
        key={key}
        label={label}
        severity={counter ? 'info' : 'neutral'}
        className={cn(badgeOwnClassName, badgeClassName)}
        {...props}
      />
    ) : (
      <Badge
        key={key}
        color={color}
        className={cn(badgeOwnClassName, badgeClassName)}
        {...props}>
        {truncate ? <span className="truncate block">{label}</span> : label}
      </Badge>
    );

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex gap-s overflow-hidden flex-1 items-center',
        className
      )}>
      {firstBadge &&
        renderBadge({
          key: firstBadge.id,
          label: getBadgeLabel(firstBadge.name),
          color: firstBadge.color,
          title: firstBadge.name,
          truncate: true,
          className: 'min-w-0 max-w-full',
        })}

      {badges.slice(1, visibleTags).map(({ id, name, color }, index) =>
        renderBadge({
          key: id,
          label: getBadgeLabel(name),
          color,
          'aria-hidden': index >= visibleTags,
          className:
            'whitespace-nowrap aria-hidden:invisible aria-hidden:absolute',
        })
      )}

      {badges.slice(visibleTags).map(({ id, name, color }) =>
        renderBadge({
          key: id,
          label: getBadgeLabel(name),
          color,
          'aria-hidden': true,
          className: 'whitespace-nowrap invisible absolute',
        })
      )}

      {hiddenCount > 0 && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {renderBadge({
                key: 'overflow-counter',
                label: `+${hiddenCount}`,
                counter: true,
                className: 'whitespace-nowrap cursor-pointer shrink-0',
              })}
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-wrap gap-s max-w-sm">
                {badges
                  .slice(visibleTags)
                  .map(({ id, name, color }) =>
                    renderBadge({ key: id, label: getBadgeLabel(name), color })
                  )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default BadgeOverflowCounter;
