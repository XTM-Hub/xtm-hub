'use client';

import {
  BreadcrumbNav,
  BreadcrumbNavLink,
} from '@/components/ui/BreadcrumbNav';
import { useDocumentCounter } from '@/hooks/use-document-counter';
import { useTranslate } from '@/hooks/use-translate';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { ServiceManageSheet } from '@/components/service/components/ServiceManageSheet';
import { ShareableResourceConnectorPrivateDetails } from '@/components/service/document/connector/ShareableResourceConnectorPrivateDetails';
import OneClickDeploy from '@/components/service/document/one-click-deploy/OneClickDeploy';
import ShareableResourceDescription from '@/components/service/document/ShareableResourceDescription';
import ShareableResourceCarousel from '@/components/service/document/ui/ShareableResourceCarouselView';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { DisabledActionTooltip } from '@/components/ui/DisabledActionTooltip';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { cn } from '@/lib/utils';
import { filterDocumentImages, findDocumentLogo } from '@/utils/documents';
import { getResourcePageFiligranWebsiteUtm } from '@/utils/filigran-website-utm';
import { getPlatformIdentifier } from '@/utils/platform';
import { Button } from '@filigran/design-system';
import {
  InfoIcon,
  LogoFiligranIcon,
  MotionPlayIcon,
  ThreatActorGroupIcon,
} from '@filigran/icon';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import Image from 'next/image';
import Link from 'next/link';

// Component interface
interface ShareableResourceConnectorSlugProps {
  documentData: documentItem_fragment$data;
  serviceInstance: serviceInstance_fragment$data;
  breadcrumbValue: BreadcrumbNavLink[];
  shareUrl: string;
}

// Component
const ShareableResourceConnectorSlug = ({
  documentData,
  breadcrumbValue,
  shareUrl,
  serviceInstance,
}: ShareableResourceConnectorSlugProps) => {
  const t = useTranslate();
  const platformIdentifier = getPlatformIdentifier(documentData.type);
  const canClickOnDeployButton = documentData.manager_supported;

  const manifest_url = documentData.source_code
    ? `${documentData.source_code}/__metadata__/connector_manifest.json`
    : '';

  const { count: shareNumber, increment: incrementShareNumber } =
    useDocumentCounter(documentData.id, documentData.share_number);

  const carouselImages = filterDocumentImages(documentData);
  const logo = findDocumentLogo(documentData);

  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <div className="flex gap-2 flex-col md:flex-row">
        {!!logo && (
          <div className="w-24 shrink-0 rounded overflow-hidden">
            <Image
              src={`/document/images/${serviceInstance.id}/${logo.id}`}
              width={96}
              height={96}
              loading="lazy"
              alt={`${documentData.name} logo`}
              className="w-full h-full object-contain rounded"
            />
          </div>
        )}
        <div className="flex flex-col flex-1 justify-center">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="whitespace-nowrap">{documentData.name}</h1>
            {documentData.manager_supported && (
              <div className="flex items-center gap-2 py-1 px-4 font-semibold bg-feedback-success-secondary-transparency-30 text-feedback-success-primary rounded">
                <MotionPlayIcon className="h-5 w-5 shrink-0 mr-1" />
                {t('Utils.AutomaticDeploy')}
              </div>
            )}

            <div
              className={cn(
                'flex items-center gap-2 py-1 px-4 font-semibold rounded text-default-primary',
                documentData.verified
                  ? 'bg-[rgba(15,188,255,0.21)]'
                  : 'bg-feedback-neutral-secondary-transparency-30'
              )}>
              {documentData.verified ? (
                <>
                  <LogoFiligranIcon className="h-5 w-5 shrink-0 mr-1 text-icon-default" />
                  {t('Service.ShareableResources.Details.SupportedByFiligran')}
                </>
              ) : (
                <>
                  <ThreatActorGroupIcon className="h-5 w-5 shrink-0 mr-1 text-feedback-neutral-primary" />
                  {t('Service.ShareableResources.Details.SupportedByCommunity')}
                </>
              )}
            </div>

            <div className="ml-auto flex gap-2">
              <ShareLinkButton
                documentId={documentData.id}
                onShare={incrementShareNumber}
                url={shareUrl}
              />
              <ServiceManageSheet
                document={documentData}
                variant={'button'}
              />
              {canClickOnDeployButton ? (
                <OneClickDeploy
                  documentData={documentData}
                  requiredProductVersion={
                    documentData.minimum_deployable_version
                  }
                />
              ) : (
                <DisabledActionTooltip
                  reason={t('Service.Connectors.UnavailableDeployments')}>
                  <Button disabled={true}>
                    {t('Service.ShareableResources.Deploy.DeployPlatform', {
                      platformName:
                        PlatformMetadataMapping[platformIdentifier].name ??
                        'OpenCTI',
                    })}
                  </Button>
                </DisabledActionTooltip>
              )}
            </div>
          </div>
          <div className="w-full mt-2 mb-1">
            <BadgeOverflowCounter
              formatLabel={false}
              badges={documentData.use_cases as BadgeOverflow[]}
            />
          </div>
        </div>
      </div>
      <ShareableResourceCarousel
        serviceInstance={serviceInstance}
        images={carouselImages}
        className="mt-4"
      />
      {documentData.verified && (
        <div className="border border-solid border-alert-info rounded flex items-center gap-1 p-2 text-sm mt-4">
          <InfoIcon className="shrink-0 h-4 w-4 mr-1 text-icon-info" />
          {t('Service.Connectors.ImproveIntegrationPrefix')}
          <Link
            href={manifest_url}
            target="_blank"
            className="underline">
            {t('Service.Connectors.GithubRepositoryLink')}
          </Link>
        </div>
      )}
      <div className="flex flex-col-reverse lg:flex-row w-full mt-4 gap-6">
        <ShareableResourceDescription
          shortDescription={documentData?.short_description ?? ''}
          longDescription={documentData?.description ?? ''}
          serviceDefinitionIdentifier={
            serviceInstance.service_definition?.identifier
          }
        />
        <ShareableResourceConnectorPrivateDetails
          connectorDetails={{
            ...documentData,
            name: documentData.name ?? '',
            share_number: shareNumber,
          }}
          filigranWebsiteUtm={getResourcePageFiligranWebsiteUtm(
            serviceInstance.service_definition?.identifier
          )}
        />
      </div>
    </>
  );
};

// Component export
export default ShareableResourceConnectorSlug;
