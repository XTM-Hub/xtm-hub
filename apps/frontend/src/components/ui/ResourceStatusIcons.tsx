'use client';

import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import {
  CampaignIcon,
  LogoFiligranIcon,
  MotionPlayIcon,
  ThreatActorGroupIcon,
} from '@filigran/icon';
import type { ReactNode } from 'react';

export interface ResourceStatusIconsProps {
  published?: boolean;
  verified?: boolean;
  deployable?: boolean;
  displayUnverifiedIcon?: boolean;
  iconClassName?: string;
}

const ICON_CLASS = 'h-6 w-6 shrink-0 text-icon-success';

interface StatusIconProps {
  label: string;
  icon: ReactNode;
}

const StatusIcon = ({ label, icon }: StatusIconProps) => (
  <Tooltip>
    <TooltipTrigger asChild>{icon}</TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

export const ResourceStatusIcons = ({
  published,
  verified,
  deployable,
  displayUnverifiedIcon = false,
  iconClassName = ICON_CLASS,
}: ResourceStatusIconsProps) => {
  const t = useTranslate();

  if (!published && !deployable && !displayUnverifiedIcon) {
    return null;
  }

  return (
    <TooltipProvider>
      {deployable && (
        <StatusIcon
          label={t('Utils.AutomaticDeploy')}
          icon={<MotionPlayIcon className={iconClassName} />}
        />
      )}
      {verified && (
        <StatusIcon
          label={t('Service.ShareableResources.Details.SupportedByFiligran')}
          icon={
            // Scaled down: this logo fills its viewBox, the others are padded.
            <LogoFiligranIcon
              className={cn(iconClassName, 'text-icon-highlight scale-90')}
            />
          }
        />
      )}
      {!verified && displayUnverifiedIcon && (
        <StatusIcon
          label={t('Service.ShareableResources.Details.SupportedByCommunity')}
          icon={
            <ThreatActorGroupIcon
              className={cn(iconClassName, 'text-icon-disabled')}
            />
          }
        />
      )}
      {published && (
        <StatusIcon
          label={t('Badge.Published')}
          icon={<CampaignIcon className={iconClassName} />}
        />
      )}
    </TooltipProvider>
  );
};
