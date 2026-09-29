import { ReactNode, useContext, useMemo, useState } from 'react';

import {
  BreadcrumbNav,
  BreadcrumbNavLink,
} from '@/components/ui/BreadcrumbNav';
import { useTranslate } from '@/hooks/use-translate';
import { DownloadIcon } from '@filigran/icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import { Button } from '@filigran/ui/servers';

import OneClickDeploy from '@/components/service/document/one-click-deploy/OneClickDeploy';
import ShareableResourceDetails from '@/components/service/document/ShareableResouceDetails';
import ShareableResourceDescription from '@/components/service/document/ShareableResourceDescription';
import ShareableResourceCarousel from '@/components/service/document/ui/ShareableResourceCarouselView';
import { getEntityTypes } from '@/components/service/document/ui/ShareableResourceEntityTypes';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import BadgeOverflowCounter, {
  BadgeOverflow,
} from '@/components/ui/BadgeOverflowCounter';
import { ShareLinkButton } from '@/components/ui/share-link/ShareLinkButton';
import useDecodedParams from '@/hooks/use-decoded-params';
import { filterDocumentImages, findDocumentLogo } from '@/utils/documents';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import { EntityTypeOrFiligranLogo } from '@/utils/shareable-resources/entity-type';
import {
  isResourceDeployable,
  isResourceDownloadable,
} from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import Image from 'next/image';

// Component interface
interface ShareableResourceSlugProps {
  documentData: documentItem_fragment$data;
  serviceInstance: serviceInstance_fragment$data;
  breadcrumbValue: BreadcrumbNavLink[];
  children?: ReactNode;
  updateActions?: ReactNode;
}

// Component
const ShareableResourceSlug = ({
  documentData,
  serviceInstance,
  breadcrumbValue,
  children,
  updateActions,
}: ShareableResourceSlugProps) => {
  const t = useTranslate();
  const { serviceInstanceId } = useDecodedParams();
  const { settings } = useContext(SettingsContext);

  const [documentDownloadNumber, setDocumentDownloadNumber] = useState(
    documentData.download_number ?? 0
  );
  const incrementDownloadNumber = () =>
    setDocumentDownloadNumber((prev) => prev + 1);

  const shouldShowOneClickDeployComponent = useMemo(
    () => isResourceDeployable(documentData),
    [documentData]
  );

  const carouselImages = useMemo(() => {
    return filterDocumentImages(documentData);
  }, [documentData]);

  const logo = useMemo(() => {
    return findDocumentLogo(documentData);
  }, [documentData]);

  return (
    <>
      <BreadcrumbNav value={breadcrumbValue} />
      <div className="flex gap-s pb-l flex-col md:flex-row">
        {logo ? (
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
        ) : (
          <div className="w-24 p-m shrink-0 flex items-center justify-center">
            <EntityTypeOrFiligranLogo
              entityTypes={getEntityTypes(documentData)}
            />
          </div>
        )}
        <div className="flex flex-col justify-center w-full">
          <div className="flex items-start ">
            <h1 className="whitespace-nowrap mb-s">{documentData.name}</h1>
            <div className="flex gap-s ml-auto">
              <ShareLinkButton
                documentId={documentData.id}
                url={`${settings!.base_url_front}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${documentData?.service_instance?.slug}/${documentData?.slug}`}
              />
              {shouldShowOneClickDeployComponent ? (
                <>
                  {isResourceDownloadable(documentData) && (
                    <TooltipProvider>
                      <Tooltip
                        delayDuration={50}
                        disableHoverableContent={true}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="tertiary"
                            size="icon"
                            onClick={() => {
                              incrementDownloadNumber();
                              window.location.href = `/document/get/${serviceInstanceId}/${documentData?.id}?attach=1`;
                            }}
                            className="z-[2] text-primary">
                            <DownloadIcon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('Service.ShareableResources.Download')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {updateActions}
                </>
              ) : (
                <>
                  {updateActions}
                  {isResourceDownloadable(documentData) && (
                    <Button
                      onClick={() => {
                        incrementDownloadNumber();
                        window.location.href = `/document/get/${serviceInstanceId}/${documentData?.id}?attach=1`;
                      }}>
                      {t('Utils.Download')}
                    </Button>
                  )}
                </>
              )}
              {shouldShowOneClickDeployComponent && (
                <OneClickDeploy documentData={documentData} />
              )}
            </div>
          </div>
          <div>
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
      />
      {children}
      <div className="flex flex-col-reverse lg:flex-row w-full mt-l gap-xl">
        <ShareableResourceDescription
          shortDescription={documentData?.short_description ?? ''}
          longDescription={documentData?.description ?? ''}
        />
        {documentData && (
          <ShareableResourceDetails
            documentData={documentData}
            downloadNumber={documentDownloadNumber}
          />
        )}
      </div>
    </>
  );
};

// Component export
export default ShareableResourceSlug;
