'use client';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { DisabledActionTooltip } from '@/components/ui/DisabledActionTooltip';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { useTranslate } from '@/hooks/use-translate';
import { getPlatformIdentifier } from '@/utils/platform';
import {
  buildPublicCounterpartTarget,
  buildSignupRedirect,
} from '@/utils/redirect';
import {
  isConnectorResource,
  PublicDocumentDetailsData,
} from '@/utils/shareable-resources/shareable-resources.types';
import {
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
import { usePathname } from 'next/navigation';

interface PublicResourceActionsProps {
  documentData: PublicDocumentDetailsData;
  pageUrl: string;
  shareTooltipText?: string;
}

export const PublicResourceActions = ({
  documentData,
  pageUrl,
  shareTooltipText,
}: PublicResourceActionsProps) => {
  const t = useTranslate();

  const pathname = usePathname();
  const signupHref = buildSignupRedirect(
    pathname ? buildPublicCounterpartTarget(pathname) : undefined
  );

  const isConnector = isConnectorResource(documentData);
  const showDeploy = isResourceDeployable(documentData);
  const canDeploy = !isConnector || documentData.manager_supported;
  const deployLabel = t('Service.ShareableResources.Deploy.DeployPlatform', {
    platformName:
      PlatformMetadataMapping[getPlatformIdentifier(documentData.type)].name,
  });

  return (
    <div className="flex items-center gap-2 ml-auto">
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
                  className="z-[2]"
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
          <DisabledActionTooltip
            reason={t('Service.Connectors.UnavailableDeployments')}>
            <Button disabled={true}>{deployLabel}</Button>
          </DisabledActionTooltip>
        ))}
    </div>
  );
};
