'use client';

import { computeTitlePaddingRight } from '@/components/homepage/resources/HomepageResourceCard.utils';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { ResourceStatusIcons } from '@/components/ui/ResourceStatusIcons';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import {
  Chip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { LogoFiligranIcon } from '@filigran/icon';
import Image from 'next/image';
import Link from 'next/link';

export interface HomepageResourceCardProps {
  name: string;
  shortDescription?: string | null;
  url: string;
  logoUrl?: string;
  published?: boolean;
  verified?: boolean;
  deployable?: boolean;
  useCases?: BadgeOverflow[];
  footerTags?: string[];
}

const HomepageResourceCard = ({
  name,
  shortDescription,
  url,
  logoUrl,
  published,
  verified,
  deployable,
  useCases = [],
  footerTags = [],
}: HomepageResourceCardProps) => {
  const iconCount = [published, verified, deployable].filter(Boolean).length;
  const titlePaddingRight = computeTitlePaddingRight(iconCount);

  const description = shortDescription ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="text-default-primary text-xs line-clamp-2">
            {shortDescription}
          </p>
        </TooltipTrigger>
        <TooltipContent>{shortDescription}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null;

  return (
    <div className="overflow-hidden flex flex-col relative rounded layer-1 bg-elevation-default hover:bg-elevation-hover has-[>a:focus-visible]:ring-2 has-[>a:focus-visible]:ring-focus">
      <div className="absolute top-3 right-3 flex gap-1 z-10">
        <ResourceStatusIcons
          published={published}
          verified={verified}
          deployable={deployable}
        />
      </div>
      <Link
        {...analyticsId('resource_open')}
        className="flex flex-col flex-1 min-h-0 overflow-hidden p-3 gap-2 focus-visible:outline-none"
        prefetch={false}
        href={url}>
        <div
          className="flex items-start sm:items-center gap-3 min-w-0"
          style={{ paddingRight: titlePaddingRight }}>
          <div className="shrink-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${name} logo`}
                width={48}
                height={48}
                className="rounded object-contain"
              />
            ) : (
              <div className="w-12 p-1 rounded">
                <LogoFiligranIcon className="size-9" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="text-base font-semibold leading-tight truncate">
                    {name}
                  </h3>
                </TooltipTrigger>
                <TooltipContent>{name}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="h-8 max-sm:hidden">
              {useCases.length > 0 && (
                <BadgeOverflowCounter
                  formatLabel={false}
                  badges={useCases}
                />
              )}
            </div>
            <div className="sm:hidden">{description}</div>
          </div>
        </div>
        <div className="min-h-10 my-2 max-sm:hidden">{description}</div>
      </Link>
      <div className="flex items-center gap-2 flex-wrap pl-3 pb-3">
        {footerTags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
          />
        ))}
      </div>
    </div>
  );
};

export default HomepageResourceCard;
