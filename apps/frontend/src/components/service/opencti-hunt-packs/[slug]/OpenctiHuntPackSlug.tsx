import { AppServiceContext } from '@/components/service/components/ServiceContext';
import { ServiceManageSheet } from '@/components/service/components/ServiceManageSheet';
import DeleteShareableResourceSlug from '@/components/service/document/DeleteShareableResourceSlug';
import ShareableResourceSlug from '@/components/service/document/ShareableResourceSlug';
import { useHuntPackDocumentContext } from '@/components/service/opencti-hunt-packs/hunt-pack-documents';
import { APP_PATH } from '@/utils/path/constant';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';

interface OpenCTIHuntPackSlugProps {
  documentData: documentItem_fragment$data;
  serviceInstance: serviceInstance_fragment$data;
}

const OpenctiHuntPackSlug = ({
  documentData,
  serviceInstance,
}: OpenCTIHuntPackSlugProps) => {
  const context = useHuntPackDocumentContext(serviceInstance);

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
      label: documentData.name ?? '',
      original: true,
    },
  ];

  return (
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
  );
};

export default OpenctiHuntPackSlug;
