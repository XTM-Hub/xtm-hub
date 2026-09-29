'use client';

import {
  BreadcrumbNav,
  BreadcrumbNavLink,
} from '@/components/ui/BreadcrumbNav';
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
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { filterDocumentImages, findDocumentLogo } from '@/utils/documents';
import { getPlatformIdentifier } from '@/utils/platform';
import {
  InfoIcon,
  MotionPlayIcon,
  ThreatActorGroupIcon,
  VerifiedIcon,
} from '@filigran/icon';
import { SimpleTooltip } from '@filigran/ui';
import { Button } from '@filigran/ui/servers';
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

  const carouselImages = filterDocumentImages(documentData);
  const logo = findDocumentLogo(documentData);

  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <div className="flex gap-s flex-col md:flex-row">
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
          <div className="flex items-center gap-s flex-wrap">
            <h1 className="whitespace-nowrap">{documentData.name}</h1>
            {documentData.manager_supported && (
              <div className="flex items-center gap-s py-xs px-l font-semibold bg-green-100 text-alert-success-primary dark:bg-turquoise-900 rounded-lg">
                <MotionPlayIcon className="h-5 w-5 shrink-0 mr-xs" />
                {t('Utils.AutomaticDeploy')}
              </div>
            )}

            <div className="flex items-center gap-s py-xs px-l font-semibold bg-green-100 text-alert-success-primary dark:bg-turquoise-900 rounded-lg">
              {documentData.verified ? (
                <>
                  <VerifiedIcon className="h-5 w-5 shrink-0 mr-xs" />
                  {t('Service.ShareableResources.Details.SupportedByFiligran')}
                </>
              ) : (
                <>
                  <ThreatActorGroupIcon className="h-5 w-5 shrink-0 mr-xs" />
                  {t('Service.ShareableResources.Details.SupportedByCommunity')}
                </>
              )}
            </div>

            <div className="ml-auto flex gap-s">
              <ShareLinkButton
                documentId={documentData.id}
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
                <SimpleTooltip
                  title={t('Service.Connectors.UnavailableDeployments')}>
                  <Button disabled={true}>
                    {t('Service.ShareableResources.Deploy.DeployPlatform', {
                      platformName:
                        PlatformMetadataMapping[platformIdentifier].name ??
                        'OpenCTI',
                    })}
                  </Button>
                </SimpleTooltip>
              )}
            </div>
          </div>
          <div className="w-full mt-s mb-xs">
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
        <div className="border border-solid border-blue rounded flex items-center gap-xs p-s text-sm mt-4">
          <InfoIcon className="shrink-0 h-4 w-4 mr-xs text-primary" />
          {t('Service.Connectors.ImproveIntegrationPrefix')}
          <Link
            href={manifest_url}
            target="_blank"
            className="underline">
            {t('Service.Connectors.GithubRepositoryLink')}
          </Link>
        </div>
      )}
      <div className="flex flex-col-reverse lg:flex-row w-full mt-l gap-xl">
        <ShareableResourceDescription
          shortDescription={documentData?.short_description ?? ''}
          longDescription={documentData?.description ?? ''}
        />
        <ShareableResourceConnectorPrivateDetails
          connectorDetails={{ ...documentData, name: documentData.name ?? '' }}
        />
      </div>
    </>
  );
};

// Component export
export default ShareableResourceConnectorSlug;
