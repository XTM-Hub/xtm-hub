'use client';

import { computeTitlePaddingRight } from '@/components/homepage/resources/HomepageResourceCard.utils';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { ResourceStatusIcons } from '@/components/ui/ResourceStatusIcons';
import { LogoFiligranIcon } from '@filigran/icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import { Badge } from '@filigran/ui/servers';
import Image from 'next/image';
import Link from 'next/link';

const BADGE_CLASS =
  'border-0 content-body-compact-medium bg-feedback-info-secondary-transparency';

export interface HomepageResourceCardProps {
  name: string;
  shortDescription?: string | null;
  url: string;
  logoUrl?: string;
  active?: boolean;
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
  active,
  verified,
  deployable,
  useCases = [],
  footerTags = [],
}: HomepageResourceCardProps) => {
  const iconCount = [active, verified, deployable].filter(Boolean).length;
  const titlePaddingRight = computeTitlePaddingRight(iconCount);

  const description = shortDescription ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="text-text-default-primary text-xs line-clamp-2">
            {shortDescription}
          </p>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-normal">
          {shortDescription}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null;

  return (
    <div className="overflow-hidden flex flex-col relative rounded bg-elevation-background-layer-1 hover:bg-hover">
      <div className="absolute top-m right-m flex gap-xs z-10">
        <ResourceStatusIcons
          active={active}
          verified={verified}
          deployable={deployable}
        />
      </div>
      <Link
        className="flex flex-col flex-1 min-h-0 overflow-hidden p-m gap-s"
        prefetch={false}
        href={url}>
        <div
          className="flex items-start sm:items-center gap-m min-w-0"
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
              <div className="w-12 p-xs rounded">
                <LogoFiligranIcon className="size-9" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-xs min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="text-base font-semibold leading-tight truncate">
                    {name}
                  </h3>
                </TooltipTrigger>
                <TooltipContent className="whitespace-nowrap">
                  {name}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="h-8 max-sm:hidden">
              {useCases.length > 0 && (
                <BadgeOverflowCounter
                  formatLabel={false}
                  badges={useCases}
                  badgeClassName={BADGE_CLASS}
                />
              )}
            </div>
            <div className="sm:hidden">{description}</div>
          </div>
        </div>
        <div className="min-h-10 my-s max-sm:hidden">{description}</div>
      </Link>
      <div className="flex items-center gap-s flex-wrap pl-m pb-m">
        {footerTags.map((tag) => (
          <Badge
            key={tag}
            className={BADGE_CLASS}>
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default HomepageResourceCard;
