'use client';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { isValueInEnum } from '@/utils/is-value-in-enum';
import { getPlatformIdentifier } from '@/utils/platform';
import { buildSignupRedirect } from '@/utils/redirect';
import {
  isConnectorResource,
  PublicDocumentDetailsData,
  ServiceSlug,
} from '@/utils/shareable-resources/shareable-resources.types';
import {
  getServiceInfo,
  isResourceDeployable,
  isResourceDownloadable,
} from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { DownloadIcon } from '@filigran/icon';
import { SimpleTooltip } from '@filigran/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import { Button } from '@filigran/ui/servers';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface PublicResourceActionsProps {
  documentData: PublicDocumentDetailsData;
  serviceInstance: { id: string; slug: string | null | undefined };
  pageUrl: string;
  shareTooltipText?: string;
}

export const PublicResourceActions = ({
  documentData,
  serviceInstance,
  pageUrl,
  shareTooltipText,
}: PublicResourceActionsProps) => {
  const t = useTranslations();

  const privateResourceLink = isValueInEnum(serviceInstance.slug, ServiceSlug)
    ? getServiceInfo(
        { id: serviceInstance.id, slug: serviceInstance.slug },
        documentData.id
      )?.link
    : undefined;
  const signupHref = buildSignupRedirect(privateResourceLink);

  const isConnector = isConnectorResource(documentData);
  const showDeploy = isConnector || isResourceDeployable(documentData);
  const canDeploy = !isConnector || documentData.manager_supported;
  const deployLabel = t('Service.ShareableResources.Deploy.DeployPlatform', {
    platformName:
      PlatformMetadataMapping[getPlatformIdentifier(documentData.type)].name,
  });

  return (
    <div className="flex items-center gap-s ml-auto">
      <ShareLinkButton
        documentId={documentData.id}
        url={pageUrl}
        tooltipText={shareTooltipText}
      />
      {isResourceDownloadable(documentData) &&
        (showDeploy ? (
          <TooltipProvider>
            <Tooltip
              delayDuration={50}
              disableHoverableContent={true}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="tertiary"
                  size="icon"
                  className="z-[2] text-primary">
                  <Link
                    href={signupHref}
                    aria-label={t('Service.ShareableResources.Download')}>
                    <DownloadIcon className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('Service.ShareableResources.Download')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            asChild
            className="whitespace-nowrap">
            <Link href={signupHref}>{t('PublicResourcePage.Download')}</Link>
          </Button>
        ))}
      {showDeploy &&
        (canDeploy ? (
          <Button
            asChild
            className="whitespace-nowrap">
            <Link href={signupHref}>{deployLabel}</Link>
          </Button>
        ) : (
          <SimpleTooltip title={t('Service.Connectors.UnavailableDeployments')}>
            <Button disabled={true}>{deployLabel}</Button>
          </SimpleTooltip>
        ))}
    </div>
  );
};
