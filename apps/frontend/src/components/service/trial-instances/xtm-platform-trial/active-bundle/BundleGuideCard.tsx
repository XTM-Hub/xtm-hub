'use client';

import { useTranslate } from '@/hooks/use-translate';
import { analyticsLinkType } from '@/lib/analytics/analytics.context';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { XTM_PLATFORM_TRIAL_GUIDE_PATH } from '@/utils/path/constant';
import { Button, Paper } from '@filigran/design-system';
import Link from 'next/link';

export const BundleGuideCard = () => {
  const tGuide = useTranslate('XtmPlatformTrial.Guide');

  // Keeps the block as tall as its grid cell, like the former Card `h-full`:
  // `[&>div]:h-full` targets the div Paper renders around its title row and its
  // surface, and `flex-1` on the surface fills that div.
  return (
    <div className="h-full [&>div]:h-full">
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
