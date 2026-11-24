import { mapRegisteredPlatformsToHomepageCards } from '@/components/homepage/Homepage.utils';
import RegisteredPlatformCard from '@/components/homepage/registered-platforms/RegisteredPlatformCard';
import { getTranslate } from '@/hooks/get-translate';
import { Paper } from '@filigran/design-system';
import { RegisteredPlatformsQuery } from '@graphql/generated';

interface RegisteredPlatformsSectionProps {
  welcomeName?: string;
  registeredPlatformsData: RegisteredPlatformsQuery;
}

export const RegisteredPlatformsSection = async ({
  welcomeName,
  registeredPlatformsData,
}: RegisteredPlatformsSectionProps) => {
  const t = await getTranslate();
  const homepageRegisteredPlatformCards = mapRegisteredPlatformsToHomepageCards(
    registeredPlatformsData.registeredPlatforms
  );

  const registeredProductsCount = homepageRegisteredPlatformCards.length;
  if (!registeredProductsCount) {
    return null;
  }

  return (
    <Paper
      as="section"
      elevation={1}
      padding={16}
      className="relative w-full xl:w-3/8 xl:max-h-96 xl:overflow-y-auto">
      <div className="flex flex-col">
        <span className="title-xs text-filigran-brand-primary">
          {welcomeName
            ? t('PublicHomePage.XtmPlatform.LabelWithName', {
                name: welcomeName,
              })
            : t('PublicHomePage.XtmPlatform.Label', {})}
        </span>
        <span className="mt-4 mb-2 text-content-base text-default-primary">
          {t('PublicHomePage.XtmPlatform.ConnectedProducts', {
            count: registeredProductsCount,
          })}
        </span>

        <div className="flex flex-row flex-wrap gap-3 xl:flex-col xl:flex-nowrap xl:gap-0">
          {homepageRegisteredPlatformCards.map((platformCard) => (
            <div
              key={platformCard.id}
              className="flex-1 min-w-64 xl:w-full xl:flex-none">
              <RegisteredPlatformCard platform={platformCard} />
            </div>
          ))}
        </div>
      </div>
    </Paper>
  );
};
