'use client';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { XTM_PLATFORM_TRIAL_PRODUCTS } from '@/components/service/trial-instances/form-constants';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { PlatformIdentifier } from '@graphql/generated';

// The pitch presents XTM One last, after the products it orchestrates
const PITCH_PRODUCTS = [
  ...XTM_PLATFORM_TRIAL_PRODUCTS.filter(
    (platformIdentifier) => platformIdentifier !== PlatformIdentifier.Xtmone
  ),
  PlatformIdentifier.Xtmone,
];

export const XtmPlatformTrialPitch = () => {
  const t = useTranslate();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 mb-8">
        <h2 className="title-2xl">
          {t('Service.Trials.XtmPlatform.Page.PitchTitle')}
        </h2>
        <p className="content-base text-default-secondary">
          {t('Service.Trials.XtmPlatform.Page.PitchDescription')}
        </p>
      </div>

      <div className="flex flex-col gap-6 pr-30">
        {PITCH_PRODUCTS.map((platformIdentifier) => {
          const { name, Icon, iconClassName } =
            PlatformMetadataMapping[platformIdentifier];

          return (
            <article
              key={platformIdentifier}
              className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Icon className={cn('size-6', iconClassName)} />
                <span className="title-md">{name}</span>
              </div>
              <div className="flex flex-col">
                <h3 className="title-xs">
                  {t(
                    `Service.Trials.XtmPlatform.Page.Products.${platformIdentifier}.Tagline`
                  )}
                </h3>
                <p className="content-compact text-default-secondary">
                  {t(
                    `Service.Trials.XtmPlatform.Page.Products.${platformIdentifier}.Description`
                  )}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
