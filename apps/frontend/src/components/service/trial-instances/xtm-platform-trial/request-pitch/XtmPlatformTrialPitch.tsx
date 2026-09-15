'use client';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { cn } from '@/lib/utils';
import { PlatformIdentifier } from '@graphql/generated';
import { useTranslations } from 'next-intl';

const BUNDLE_PRODUCTS = [
  PlatformIdentifier.Opencti,
  PlatformIdentifier.Openaev,
  PlatformIdentifier.Xtmone,
];

export const XtmPlatformTrialPitch = () => {
  const t = useTranslations();

  return (
    <section className="flex flex-col gap-xl">
      <div className="flex flex-col gap-xs mb-xxl">
        <h2 className="heading-2xl">
          {t('Service.Trials.XtmPlatform.Page.PitchTitle')}
        </h2>
        <p className="content-body-base text-text-default-secondary">
          {t('Service.Trials.XtmPlatform.Page.PitchDescription')}
        </p>
      </div>

      <div className="flex flex-col gap-xl pr-30">
        {BUNDLE_PRODUCTS.map((platformIdentifier) => {
          const { name, Icon, iconClassName } =
            PlatformMetadataMapping[platformIdentifier];

          return (
            <article
              key={platformIdentifier}
              className="flex flex-col gap-s">
              <div className="flex items-center gap-s">
                <Icon className={cn('size-6', iconClassName)} />
                <span className="heading-md">{name}</span>
              </div>
              <div className="flex flex-col">
                <h3 className="heading-xs">
                  {t(
                    `Service.Trials.XtmPlatform.Page.Products.${platformIdentifier}.Tagline`
                  )}
                </h3>
                <p className="content-body-compact text-text-default-secondary">
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
