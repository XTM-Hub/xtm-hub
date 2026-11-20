'use client';

import { useTranslate } from '@/hooks/use-translate';
import { analyticsLinkType } from '@/lib/analytics/analytics.context';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { XTM_PLATFORM_TRIAL_GUIDE_PATH } from '@/utils/path/constant';
import { Button, Paper } from '@filigran/design-system';
import Link from 'next/link';

export const BundleGuideCard = () => {
  const tGuide = useTranslate('XtmPlatformTrial.Guide');

  return (
    <div className="h-full w-full [&>div]:h-full">
      <Paper
        as="section"
        padding={16}
        className="flex flex-1 items-center justify-center"
        title={
          <h2 className="[font:inherit] tracking-[inherit]">
            {tGuide('Title')}
          </h2>
        }>
        <div className="flex w-full max-w-sm flex-col gap-4">
          <p className="text-content-compact text-default-primary">
            {tGuide('Content')}
          </p>
          <Button
            priority="secondary"
            className="self-start"
            asChild>
            <Link
              {...analyticsId('trial_guide_open')}
              {...analyticsLinkType('Guide')}
              href={XTM_PLATFORM_TRIAL_GUIDE_PATH}>
              {tGuide('SeeMore')}
            </Link>
          </Button>
        </div>
      </Paper>
    </div>
  );
};
