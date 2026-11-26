'use client';

import { ConnectedPlatform } from '@/components/connected-products/useConnectedPlatforms';
import {
  PlatformMetadataMapping,
  ServiceDefinitionIdentifierToPlatformIdentifier,
} from '@/components/registration/PlatformIdentifierMapping';
import { UseTranslationsProps } from '@/i18n/config';
import { analyticsProduct } from '@/lib/analytics/analytics.context';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { registeredPlatformDetailPath } from '@/utils/path/registered-platform-detail-path';
import { Chip, IconButton } from '@filigran/design-system';
import { LinkIcon, TextSnippetIcon } from '@filigran/icon';
import { PlatformContract } from '@graphql/generated';
import Link from 'next/link';

interface ConnectedProductItemProps {
  platform: ConnectedPlatform;
  t: UseTranslationsProps;
}

export const ConnectedProductItem = ({
  platform,
  t,
}: ConnectedProductItemProps) => {
  const platformIdentifier =
    ServiceDefinitionIdentifierToPlatformIdentifier[platform.identifier];
  const platformMeta = platformIdentifier
    ? PlatformMetadataMapping[platformIdentifier]
    : undefined;
  const detailPath = registeredPlatformDetailPath({
    identifier: platform.identifier,
    deploymentRequest: platform.deployment_request,
    serviceInstanceId: platform.subscription?.service_instance?.id,
  });

  return (
    <div
      {...(platformIdentifier && analyticsProduct(platformIdentifier))}
      className="hover:cursor-default flex min-h-12 w-full items-center gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {platformMeta?.Icon && (
          <platformMeta.Icon className="h-6 w-6 shrink-0" />
        )}
        <span className="content-base">
          {platform.title ?? platformMeta?.name ?? platform.identifier}
        </span>
      </div>
      {platform.contract === PlatformContract.Trial && (
        <Chip label={t('Header.ConnectedProducts.Trial')} />
      )}
      {platform.contract === PlatformContract.Ee && (
        <Chip
          label={t('Header.ConnectedProducts.EE')}
          severity="ee"
        />
      )}
      <div className="flex w-16 items-center justify-end gap-1">
        {detailPath && (
          <IconButton
            priority="tertiary"
            className="h-7 w-7 text-default-primary"
            aria-label={t('Header.ConnectedProducts.Details')}
            icon={<TextSnippetIcon className="h-4 w-4 shrink-0" />}
            asChild>
            <Link
              {...analyticsId('platform_details_open')}
              href={detailPath}
            />
          </IconButton>
        )}
        {platform.url && (
          <IconButton
            priority="tertiary"
            className="h-7 w-7 text-default-primary"
            aria-label={t('Header.ConnectedProducts.GoToPlatform', {
              title:
                platform.title ?? platformMeta?.name ?? platform.identifier,
            })}
            icon={<LinkIcon className="h-4 w-4 shrink-0" />}
            asChild>
            <Link
              {...analyticsId('platform_instance_open')}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
            />
          </IconButton>
        )}
      </div>
    </div>
  );
};
