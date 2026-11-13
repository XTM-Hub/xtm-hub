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
import type { ComponentType, SVGProps } from 'react';

export interface ResourceStatusIconsProps {
  active?: boolean;
  verified?: boolean;
  deployable?: boolean;
  displayUnverifiedIcon?: boolean;
  iconClassName?: string;
}

const ICON_CLASS = 'h-6 w-6 shrink-0 text-icon-success';

interface StatusIconProps {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  className?: string;
}

// The icon is the only carrier of the status: it takes the tooltip label as its accessible name.
const StatusIcon = ({ label, icon: Icon, className }: StatusIconProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Icon
        aria-label={label}
        className={className}
      />
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

export const ResourceStatusIcons = ({
  active,
  verified,
  deployable,
  displayUnverifiedIcon = false,
  iconClassName = ICON_CLASS,
}: ResourceStatusIconsProps) => {
  const t = useTranslate();

  if (!active && !deployable && !displayUnverifiedIcon) {
    return null;
  }

  return (
    <TooltipProvider>
      {deployable && (
        <StatusIcon
          label={t('Utils.AutomaticDeploy')}
          icon={MotionPlayIcon}
          className={iconClassName}
        />
      )}
      {verified && (
        <StatusIcon
          label={t('Service.ShareableResources.Details.SupportedByFiligran')}
          icon={LogoFiligranIcon}
          // Scaled down: this logo fills its viewBox, the others are padded.
          className={cn(iconClassName, 'text-icon-highlight scale-90')}
        />
      )}
      {!verified && displayUnverifiedIcon && (
        <StatusIcon
          label={t('Service.ShareableResources.Details.SupportedByCommunity')}
          icon={ThreatActorGroupIcon}
          className={cn(iconClassName, 'text-icon-disabled')}
        />
      )}
      {active && (
        <StatusIcon
          label={t('Badge.Published')}
          icon={CampaignIcon}
          className={iconClassName}
        />
      )}
    </TooltipProvider>
  );
};
