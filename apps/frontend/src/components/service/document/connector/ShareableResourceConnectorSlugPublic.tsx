import { ShareableResourceConnectorDetails } from '@/components/service/document/connector/ShareableResourceConnectorDetails';
import ShareableResourceCarousel from '@/components/service/document/ui/ShareableResourceCarouselView';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import { filterDocumentImages, findDocumentLogo } from '@/utils/documents';
import {
  ConnectorFields,
  PublicDocumentDetailsData,
} from '@/utils/shareable-resources/shareable-resources.types';
import {
  MotionPlayIcon,
  ThreatActorGroupIcon,
  VerifiedIcon,
} from '@filigran/icon';
import { MarkdownRenderer } from '@filigran/ui/clients';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface ShareableResourceConnectorSlugPublicProps {
  documentData: (documentItem_fragment$data | PublicDocumentDetailsData) &
    ConnectorFields;
  serviceInstance:
    seoServiceInstanceFragment$data | serviceInstance_fragment$data;
  pageUrl: string;
}

const ShareableResourceConnectorSlugPublic = ({
  documentData,
  pageUrl,
  serviceInstance,
}: ShareableResourceConnectorSlugPublicProps) => {
  const t = useTranslations();
  const logo = findDocumentLogo(documentData);
  const carouselImages = filterDocumentImages(documentData);

  return (
    <>
      <div className="flex gap-s pb-l flex-col md:flex-row">
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
          <div className="flex items-center gap-s flex-wrap">
            <h1 className="whitespace-nowrap">{documentData.name}</h1>
            {documentData.manager_supported && (
              <div className="flex items-center gap-s py-xs px-l font-semibold bg-green-100 text-alert-success-primary dark:bg-turquoise-900 rounded-lg">
                <MotionPlayIcon className="h-5 w-5 shrink-0 mr-xs" />
                {t('Utils.AutomaticDeploy')}
              </div>
            )}
            <div className="flex items-center gap-s py-xs px-l font-semibold bg-alert-success-primary text-alert-success-primary dark:bg-turquoise-900 rounded-lg">
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

            <div className="ml-auto">
              <ShareLinkButton
                documentId={documentData.id}
                url={pageUrl}
                tooltipText={`Service.OpenctiIntegrations.Actions.Share`}
              />
            </div>
          </div>
          <div className="w-full mt-s mb-xs">
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

      <div className="flex flex-col-reverse lg:flex-row w-full mt-l gap-xl">
        <div className="flex-[3_3_0%] min-w-0">
          <h3 className="py-s txt-container-title truncate text-muted-foreground">
            {t('PublicResourcePage.Overview')}
          </h3>
          <section className="rounded bg-elevation-background-layer-1 overflow-x-auto">
            <h2 className="p-l">{documentData?.short_description}</h2>
            <MarkdownRenderer
              source={documentData?.description ?? ''}
              colorMode="dark"
              className="p-l !bg-elevation-background-layer-1 markdown-content"
            />
          </section>
        </div>
        <ShareableResourceConnectorDetails
          connectorDetails={{ ...documentData, name: documentData.name ?? '' }}
        />
      </div>
    </>
  );
};

// Component export
export default ShareableResourceConnectorSlugPublic;
