'use client';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { useTranslate } from '@/hooks/use-translate';
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
import {
  Button,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { DownloadIcon } from '@filigran/icon';
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
  const t = useTranslate();

  const privateResourceLink = isValueInEnum(serviceInstance.slug, ServiceSlug)
    ? getServiceInfo(
        { id: serviceInstance.id, slug: serviceInstance.slug },
        documentData.id
      )?.link
    : undefined;
  const signupHref = buildSignupRedirect(privateResourceLink);

  const isConnector = isConnectorResource(documentData);
  const showDeploy = isResourceDeployable(documentData);
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
                <IconButton
                  asChild
                  priority="tertiary"
                  className="z-[2] text-primary"
                  aria-label={t('Service.ShareableResources.Download')}
                  icon={<DownloadIcon className="h-4 w-4" />}>
                  <Link href={signupHref} />
                </IconButton>
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  className="inline-flex">
                  <Button disabled={true}>{deployLabel}</Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {t('Service.Connectors.UnavailableDeployments')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
    </div>
  );
};
