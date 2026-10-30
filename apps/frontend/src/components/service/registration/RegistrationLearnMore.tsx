'use server';
import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import PublicServiceInstanceCard from '@/components/service/PublicServiceInstanceCard';
import { getTranslate } from '@/hooks/get-translate';
import { cn } from '@/lib/utils';
import { fetchServiceInstanceLinksByTags } from '@/utils/seo-service-instance/utils/seo-service-instance.server.utils';
import { seoServiceInstanceToInstanceCardData } from '@/utils/services';
import { Icon, Paper, Text } from '@filigran/design-system';
import { PlatformIdentifier, ServiceInstanceTag } from '@graphql/generated';
import openaevEcosystem from '@public/openaev_ecosystem.png';
import openctiEcosystem from '@public/opencti_ecosystem.png';
import xtmoneEcosystem from '@public/xtmone_ecosystem.png';
import Image, { StaticImageData } from 'next/image';
import React from 'react';

interface PlatformLearnMoreConfig {
  ecosystemImage: StaticImageData;
  hasEcosystemBackground: boolean;
}

const LEARN_MORE_CONFIG: Record<PlatformIdentifier, PlatformLearnMoreConfig> = {
  [PlatformIdentifier.Xtmone]: {
    ecosystemImage: xtmoneEcosystem,
    hasEcosystemBackground: true,
  },
  [PlatformIdentifier.Opencti]: {
    ecosystemImage: openctiEcosystem,
    hasEcosystemBackground: false,
  },
  [PlatformIdentifier.Openaev]: {
    ecosystemImage: openaevEcosystem,
    hasEcosystemBackground: false,
  },
};

const platformTextKey = (
  platformIdentifier: PlatformIdentifier,
  text: 'Intro' | 'Tagline' | 'Description'
) => `Service.Trials.XTMPlatform.${platformIdentifier}.${text}`;

const XTM_PRODUCTS = [
  PlatformIdentifier.Xtmone,
  PlatformIdentifier.Opencti,
  PlatformIdentifier.Openaev,
];

const Section = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cn('flex flex-col gap-8 py-20', className)}>
    {children}
  </section>
);

interface RegistrationLearnMoreProps {
  platformIdentifier: PlatformIdentifier;
}

export const RegistrationLearnMore = async ({
  platformIdentifier,
}: RegistrationLearnMoreProps) => {
  const { ecosystemImage, hasEcosystemBackground } =
    LEARN_MORE_CONFIG[platformIdentifier];
  const { name: platformName, serviceInstanceTag } =
    PlatformMetadataMapping[platformIdentifier];
  const services = await fetchServiceInstanceLinksByTags([
    ServiceInstanceTag.Trial,
    serviceInstanceTag,
  ]);
  const t = await getTranslate();

  return (
    <>
      <Section className="bg-filigran-brand-primary-transparency-10 px-6">
        <div className="text-center w-[70%] m-auto">
          <Text
            as="h2"
            variant="title-lg"
            className="text-filigran-brand-primary mb-4">
            {t('Service.Trials.XTMPlatform.Title')}
          </Text>
          <Text variant="content-base">
            {t(platformTextKey(platformIdentifier, 'Intro'))}
          </Text>
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex flex-col gap-2 basis-full">
            {XTM_PRODUCTS.map((product) => {
              const {
                name,
                Icon: PlatformIcon,
                iconClassName,
              } = PlatformMetadataMapping[product];
              return (
                <Paper
                  key={product}
                  className="flex flex-col gap-2 basis-full">
                  <Text
                    as="h3"
                    variant="title-xs"
                    className="flex items-center gap-2">
                    <PlatformIcon className={cn('size-6', iconClassName)} />
                    {name}
                  </Text>
                  <Text variant="content-base-bold">
                    {t(platformTextKey(product, 'Tagline'))}
                  </Text>
                  <Text variant="content-base">
                    {t(platformTextKey(product, 'Description'))}
                  </Text>
                </Paper>
              );
            })}
          </div>
          <div
            className={cn(
              'relative basis-full m-auto',
              hasEcosystemBackground &&
                '@container w-full overflow-hidden rounded-sm bg-linear-to-br/srgb from-[#071729] from-30% to-[#286489] p-6'
            )}>
            {hasEcosystemBackground && (
              <Icon
                name="custom/filigran"
                // Placed in image widths from the image corner: the circle (20/24 of the icon box) starts at the top of the Remediation box of xtmone_ecosystem.png. Re-measure if the image changes.
                className="absolute top-[calc(1.5rem+0.2cqw)] left-[calc(1.5rem+48.8cqw)] size-[86.4cqw] -rotate-[23.57deg] text-(--white-1000) opacity-5"
              />
            )}
            <Image
              src={ecosystemImage}
              sizes="(min-width: 1024px) 50vw, 100vw"
              loading="lazy"
              alt={t('Service.Trials.XTMPlatform.IllustrationAlt', {
                platformName,
              })}
              className="relative rounded w-full"
            />
          </div>
        </div>
      </Section>
      <Section>
        <div className="@container flex flex-col lg:flex-row lg:items-center gap-6">
          <div
            // Cards up to 232px each, sharing the half row left by the text (half of gap-6 = 0.75rem).
            className="grid gap-4 sm:grid-flow-col sm:auto-cols-[minmax(0,232px)] lg:max-w-[calc(50cqw-0.75rem)]">
            {services.map((service) => (
              <PublicServiceInstanceCard
                key={service.id}
                serviceInstance={seoServiceInstanceToInstanceCardData(
                  service,
                  t
                )}
              />
            ))}
          </div>
          <div className="order-first lg:order-last basis-full lg:max-w-[calc(50cqw-0.75rem)]">
            <Text
              as="h2"
              variant="title-lg"
              className="text-filigran-brand-primary mb-4">
              {t('Service.Trials.QuickStart.Title')}
            </Text>
            <Text
              variant="content-base"
              className="mb-4">
              {t('Service.Trials.QuickStart.Subtitle', { platformName })}
            </Text>
            <Text variant="content-base">
              {t('Service.Trials.QuickStart.Description')}
            </Text>
          </div>
        </div>
      </Section>
    </>
  );
};
