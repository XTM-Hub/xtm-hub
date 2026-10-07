'use client';

import { HomepageRegisteredPlatformCardViewModel } from '@/components/homepage/Homepage.utils';
import {
  CONTRACT_LABEL_BY_CONTRACT,
  PlatformMetadataMapping,
} from '@/components/registration/PlatformIdentifierMapping';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { useDateFormatter } from '@/utils/date';
import {
  Chip,
  type ChipSeverity,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { Card, CardContent } from '@filigran/ui';
import { PlatformContract } from '@graphql/generated';
import Link from 'next/link';

type RegisteredPlatformCardProps = {
  platform: HomepageRegisteredPlatformCardViewModel;
};

const TRIAL_DAYS_ERROR_THRESHOLD = 8;
const TRIAL_DAYS_WARNING_THRESHOLD = 22;

const resolveTrialDaysSeverity = (
  remainingTrialDays: number | undefined
): ChipSeverity => {
  if (remainingTrialDays === undefined) {
    return 'low';
  }

  if (remainingTrialDays <= TRIAL_DAYS_ERROR_THRESHOLD) {
    return 'critical';
  }

  if (remainingTrialDays <= TRIAL_DAYS_WARNING_THRESHOLD) {
    return 'medium';
  }

  return 'low';
};

const RegisteredPlatformCard = ({ platform }: RegisteredPlatformCardProps) => {
  const tRegisteredPlatformsCard = useTranslate(
    'HomePage.RegisteredPlatformsCard'
  );
  const t = useTranslate();
  const formatDate = useDateFormatter();

  const registrationDate = platform.registrationDate
    ? formatDate(platform.registrationDate, 'DATE_MEDIUM')
    : '-';

  const remainingTrialDaysSeverity = resolveTrialDaysSeverity(
    platform.remainingTrialDays
  );

  const { Icon } = PlatformMetadataMapping[platform.platformIdentifier];
  const contractLabel = CONTRACT_LABEL_BY_CONTRACT[platform.contract];

  const cardContent = (
    <Card
      className={cn(
        'border pt-s my-xs bg-elevation-background-layer-1 border-elevation-border-subtle-layer-1',
        platform.href && 'cursor-pointer hover:bg-hover'
      )}>
      <CardContent className="p-s flex flex-col gap-m">
        <div className="flex gap-s items-center justify-between">
          <div className="flex gap-s items-center min-w-0 flex-1">
            <Chip
              className="shrink-0"
              label={PlatformMetadataMapping[platform.platformIdentifier].name}
              startIcon={<Icon className="size-4" />}
            />

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-content-body-compact truncate min-w-0">
                    {platform.title}
                  </p>
                </TooltipTrigger>
                <TooltipContent>{platform.title}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-content-body-compact shrink-0">
            <span className="text-muted-foreground">
              {tRegisteredPlatformsCard('RegisteredOn')}
            </span>{' '}
            {registrationDate}
          </p>
        </div>
        <div className="text-content-body-compact-medium flex gap-l items-center">
          <Chip
            label={t(contractLabel)}
            severity={
              platform.contract === PlatformContract.Ee ? 'ee' : 'neutral'
            }
          />
          {platform.contract === PlatformContract.Trial &&
            platform.remainingTrialDays !== undefined && (
              <div className="flex gap-s items-center text-content-body-compact text-text-default-secondary">
                <p>{tRegisteredPlatformsCard('Remaining')}</p>
                <Chip
                  label={tRegisteredPlatformsCard('DaysRemaining', {
                    days: platform.remainingTrialDays,
                  })}
                  severity={remainingTrialDaysSeverity}
                />
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );

  return platform.href ? (
    <Link
      href={platform.href}
      prefetch={false}
      className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {cardContent}
    </Link>
  ) : (
    cardContent
  );
};

export default RegisteredPlatformCard;
