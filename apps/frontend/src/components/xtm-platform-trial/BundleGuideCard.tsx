'use client';

import { XTM_PLATFORM_TRIAL_GUIDE_PATH } from '@/utils/path/constant';
import { Button, Card, CardContent } from '@filigran/ui';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export const BundleGuideCard = () => {
  const tGuide = useTranslations('XtmPlatformTrial.Guide');

  return (
    <Card className="h-full w-full bg-elevation-background-layer-1">
      <CardContent className="flex h-full items-center justify-center p-4">
        <div className="flex w-full max-w-sm flex-col gap-l p-2">
          <div className="flex flex-col">
            <h2 className="text-header-heading-xl">{tGuide('Title')}</h2>
            <p className="text-content-body-compact text-text-default-primary">
              {tGuide('Content')}
            </p>
          </div>
          <Button
            variant="secondary"
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
