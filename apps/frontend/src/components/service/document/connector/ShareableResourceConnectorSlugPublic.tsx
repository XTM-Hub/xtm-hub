import { ShareableResourceConnectorDetails } from '@/components/service/document/connector/ShareableResourceConnectorDetails';
import { PublicResourceActions } from '@/components/service/document/PublicResourceActions';
import ResourceMarkdownRenderer from '@/components/service/document/ResourceMarkdownRenderer';
import ShareableResourceCarousel from '@/components/service/document/ui/ShareableResourceCarouselView';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { getTranslate } from '@/hooks/get-translate';
import { cn } from '@/lib/utils';
import { filterDocumentImages, findDocumentLogo } from '@/utils/documents';
import { getResourcePageFiligranWebsiteUtm } from '@/utils/filigran-website-utm';
import {
  ConnectorFields,
  PublicDocumentDetailsData,
} from '@/utils/shareable-resources/shareable-resources.types';
import {
  LogoFiligranIcon,
  MotionPlayIcon,
  ThreatActorGroupIcon,
} from '@filigran/icon';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { SeoServiceInstanceItemFragment } from '@graphql/generated';
import Image from 'next/image';

interface ShareableResourceConnectorSlugPublicProps {
  documentData: PublicDocumentDetailsData & ConnectorFields;
  serviceInstance:
    SeoServiceInstanceItemFragment | serviceInstance_fragment$data;
  pageUrl: string;
}

const ShareableResourceConnectorSlugPublic = async ({
  documentData,
  pageUrl,
  serviceInstance,
}: ShareableResourceConnectorSlugPublicProps) => {
  const t = await getTranslate();
  const logo = findDocumentLogo(documentData);
  const carouselImages = filterDocumentImages(documentData);

  return (
    <>
      <div className="flex gap-2 pb-4 flex-col md:flex-row">
        {!!logo && (
          <div className="w-24 shrink-0 rounded overflow-hidden">
            <Image
              src={`/document/images/${serviceInstance.id}/${logo.id}`}
              alt={`${documentData.name} logo`}
              width={96}
              height={96}
              loading="lazy"
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

            <PublicResourceActions
              documentData={documentData}
              serviceInstance={serviceInstance}
              pageUrl={pageUrl}
              shareTooltipText="Service.OpenctiIntegrations.Actions.Share"
            />
          </div>
          <div className="w-full mt-2 mb-1">
            <BadgeOverflowCounter
              formatLabel={false}
              badges={documentData?.use_cases as BadgeOverflow[]}
              className="z-[2]"
            />
          </div>
        </div>
      </div>

      <ShareableResourceCarousel
        serviceInstance={serviceInstance}
        images={carouselImages}
      />

      <div className="flex flex-col-reverse lg:flex-row w-full mt-4 gap-6">
        <div className="flex-[3_3_0%] min-w-0">
          <h2 className="py-2 title-xs uppercase truncate text-default-secondary">
            {t('PublicResourcePage.Overview')}
          </h2>
          <section className="rounded layer-1 bg-elevation-default overflow-x-auto">
            <p className="p-4 content-base">
              {documentData?.short_description}
            </p>
            <ResourceMarkdownRenderer
              source={documentData?.description ?? ''}
              className="p-4"
              filigranWebsiteUtm={getResourcePageFiligranWebsiteUtm(
                serviceInstance.service_definition?.identifier
              )}
            />
          </section>
        </div>
        <ShareableResourceConnectorDetails
          connectorDetails={{ ...documentData, name: documentData.name ?? '' }}
          filigranWebsiteUtm={getResourcePageFiligranWebsiteUtm(
            serviceInstance.service_definition?.identifier
          )}
        />
      </div>
    </>
  );
};

// Component export
export default ShareableResourceConnectorSlugPublic;
