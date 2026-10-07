'use client';
import { cn } from '@/lib/utils';
import { formatName } from '@/utils/format/name';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { Badge } from '@filigran/ui/servers';
import { useCallback, useEffect, useRef, useState } from 'react';

interface BadgeOverflowCounterProps {
  badges: Readonly<BadgeOverflow[]>;
  className?: string;
  badgeClassName?: string;
  formatLabel?: boolean;
}

export interface BadgeOverflow {
  id: string;
  name: string;
  color?: string;
}

const BadgeOverflowCounter = ({
  badges = [],
  className,
  badgeClassName,
  formatLabel = true,
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

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex gap-s overflow-hidden flex-1 items-center',
        className
      )}>
      {firstBadge && (
        <Badge
          className={cn('min-w-0 max-w-full', badgeClassName)}
          key={firstBadge.id}
          color={firstBadge.color}
          title={firstBadge.name}>
          <span className="truncate block">
            {getBadgeLabel(firstBadge.name)}
          </span>
        </Badge>
      )}

      {badges.slice(1, visibleTags).map(({ id, name, color }, index) => (
        <Badge
          className={cn(
            'whitespace-nowrap aria-hidden:invisible aria-hidden:absolute',
            badgeClassName
          )}
          aria-hidden={index >= visibleTags}
          key={id}
          color={color}>
          {getBadgeLabel(name)}
        </Badge>
      ))}

      {badges.slice(visibleTags).map(({ id, name, color }) => (
        <Badge
          className={cn('whitespace-nowrap invisible absolute', badgeClassName)}
          aria-hidden={true}
          key={id}
          color={color}>
          {getBadgeLabel(name)}
        </Badge>
      ))}

      {hiddenCount > 0 && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                className={cn(
                  'whitespace-nowrap cursor-pointer shrink-0',
                  badgeClassName
                )}>
                +{hiddenCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-wrap gap-s max-w-sm">
                {badges.slice(visibleTags).map(({ id, name, color }) => (
                  <Badge
                    key={id}
                    color={color}
                    className={badgeClassName}>
                    {getBadgeLabel(name)}
                  </Badge>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default BadgeOverflowCounter;
