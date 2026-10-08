'use client';

import { useTranslate } from '@/hooks/use-translate';
import { XTM_PLATFORM_TRIAL_GUIDE_PATH } from '@/utils/path/constant';
import { Button, Card, CardContent } from '@filigran/design-system';
import Link from 'next/link';

export const BundleGuideCard = () => {
  const tGuide = useTranslate('XtmPlatformTrial.Guide');

  return (
    <Card
      padding={16}
      className="h-full w-full">
      <CardContent
        clamp={0}
        className="flex h-full items-center justify-center">
        <div className="flex w-full max-w-sm flex-col gap-l p-2">
          <div className="flex flex-col">
            <h2 className="text-header-heading-xl">{tGuide('Title')}</h2>
            <p className="text-content-body-compact text-text-default-primary">
              {tGuide('Content')}
            </p>
          </div>
          <Button
            priority="secondary"
            className="self-start"
            asChild>
            <Link href={XTM_PLATFORM_TRIAL_GUIDE_PATH}>
              {tGuide('SeeMore')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
