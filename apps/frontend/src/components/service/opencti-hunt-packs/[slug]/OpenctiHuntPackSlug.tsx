import { AppServiceContext } from '@/components/service/components/ServiceContext';
import { ServiceManageSheet } from '@/components/service/components/ServiceManageSheet';
import DeleteShareableResourceSlug from '@/components/service/document/DeleteShareableResourceSlug';
import {
  documentItem,
  DocumentsItemQuery,
} from '@/components/service/document/document.graphql';
import ShareableResourceSlug from '@/components/service/document/ShareableResourceSlug';
import { useDocumentContext } from '@/components/service/document/use-document-context';
import { APP_PATH } from '@/utils/path/constant';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { documentItem_fragment$key } from '@generated/documentItem_fragment.graphql';
import { documentQuery } from '@generated/documentQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { PreloadedQuery, readInlineData, usePreloadedQuery } from 'react-relay';

interface OpenCTIHuntPackSlugProps {
  queryRef: PreloadedQuery<documentQuery>;
  serviceInstance: serviceInstance_fragment$data;
}

const OpenctiHuntPackSlug = ({
  queryRef,
  serviceInstance,
}: OpenCTIHuntPackSlugProps) => {
  const data = usePreloadedQuery<documentQuery>(DocumentsItemQuery, queryRef);

  const documentData = readInlineData<documentItem_fragment$key>(
    documentItem,
    data.document
  );

  const breadcrumbValue = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label: serviceInstance.name,
      href: `/${APP_PATH}/service/${serviceInstance.service_definition?.identifier}/${serviceInstance.id}`,
      original: true,
    },
    {
      label: documentData!.name!,
      original: true,
    },
  ];

  const context = useDocumentContext({
    serviceInstance,
    type: ShareableResourceType.OPENCTI_HUNT_PACK,
  });

  return (
    documentData && (
      <AppServiceContext {...context}>
        <ShareableResourceSlug
          serviceInstance={serviceInstance}
          breadcrumbValue={breadcrumbValue}
          documentData={documentData}
          updateActions={
            <>
              <DeleteShareableResourceSlug document={documentData} />
              <ServiceManageSheet
                document={documentData}
                variant={'button'}
              />
            </>
          }
        />
      </AppServiceContext>
    )
  );
};

export default OpenctiHuntPackSlug;
