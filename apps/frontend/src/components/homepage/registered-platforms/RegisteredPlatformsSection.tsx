import { mapRegisteredPlatformsToHomepageCards } from '@/components/homepage/Homepage.utils';
import RegisteredPlatformCard from '@/components/homepage/registered-platforms/RegisteredPlatformCard';
import { RegisteredPlatformsQuery } from '@graphql/generated';
import { getTranslations } from 'next-intl/server';

interface RegisteredPlatformsSectionProps {
  welcomeName?: string;
  registeredPlatformsData: RegisteredPlatformsQuery;
}

export const RegisteredPlatformsSection = async ({
  welcomeName,
  registeredPlatformsData,
}: RegisteredPlatformsSectionProps) => {
  const t = await getTranslations();
  const homepageRegisteredPlatformCards = mapRegisteredPlatformsToHomepageCards(
    registeredPlatformsData.registeredPlatforms
  );

  const registeredProductsCount = homepageRegisteredPlatformCards.length;
  if (!registeredProductsCount) {
    return null;
  }

  return (
    <section className="w-full xl:w-3/8 bg-elevation-background-layer-1 p-l rounded-lg xl:max-h-96 xl:overflow-scroll">
      <div className="flex flex-col">
        <span className="heading-xs text-filigran-brand-primary">
          {welcomeName
            ? t('PublicHomePage.XtmPlatform.LabelWithName', {
                name: welcomeName,
              })
            : t('PublicHomePage.XtmPlatform.Label', {})}
        </span>
        <span className="mt-l mb-s text-content-body-base text-text-default-primary">
          {t('PublicHomePage.XtmPlatform.ConnectedProducts', {
            count: registeredProductsCount,
          })}
        </span>

        <div className="flex flex-row flex-wrap gap-m xl:flex-col xl:flex-nowrap xl:gap-0">
          {homepageRegisteredPlatformCards.map((platformCard) => (
            <div
              key={platformCard.id}
              className="flex-1 min-w-64 xl:w-full xl:flex-none">
              <RegisteredPlatformCard platform={platformCard} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
