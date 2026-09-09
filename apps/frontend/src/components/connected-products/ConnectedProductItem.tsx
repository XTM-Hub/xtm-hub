'use client';

import { ConnectedPlatform } from '@/components/connected-products/useConnectedPlatforms';
import {
  PlatformMetadataMapping,
  ServiceDefinitionIdentifierToPlatformIdentifier,
} from '@/components/registration/PlatformIdentifierMapping';
import { UseTranslationsProps } from '@/i18n/config';
import { APP_PATH } from '@/utils/path/constant';
import { LinkIcon, TextSnippetIcon } from '@filigran/icon';
import { Badge, Button } from '@filigran/ui';
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
  const serviceInstanceId = platform.subscription?.service_instance?.id;
  const detailPath = serviceInstanceId
    ? `/${APP_PATH}/service/${platform.identifier}/${serviceInstanceId}`
    : undefined;

  return (
    <div className="hover:cursor-default flex min-h-12 w-full items-center gap-m px-m py-s">
      <div className="flex min-w-0 flex-1 items-center gap-s">
        {platformMeta?.Icon && (
          <platformMeta.Icon className="h-6 w-6 shrink-0" />
        )}
        <span className="content-body-base">
          {platform.title ?? platformMeta?.name ?? platform.identifier}
        </span>
      </div>
      {platform.contract === PlatformContract.Trial && (
        <Badge className="border-none bg-feedback-info-secondary-transparency content-body-compact-medium">
          {t('Header.ConnectedProducts.Trial')}
        </Badge>
      )}
      {platform.contract === PlatformContract.Ee && (
        <Badge className="border-none bg-filigran-tonic-primary content-body-compact-medium">
          <span className="text-text-negative-primary">
            {t('Header.ConnectedProducts.EE')}
          </span>
        </Badge>
      )}
      <div className="flex w-16 items-center justify-end gap-xs">
        {detailPath && (
          <Button
            variant="tertiary"
            size="icon"
            className="h-7 w-7 text-text-default-primary"
            asChild>
            <Link
              href={detailPath}
              aria-label={t('Header.ConnectedProducts.Details')}>
              <TextSnippetIcon className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
        )}
        {platform.url && (
          <Button
            variant="tertiary"
            size="icon"
            className="h-7 w-7 text-text-default-primary"
            asChild>
            <Link
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('Header.ConnectedProducts.GoToPlatform', {
                title:
                  platform.title ?? platformMeta?.name ?? platform.identifier,
              })}>
              <LinkIcon className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};
