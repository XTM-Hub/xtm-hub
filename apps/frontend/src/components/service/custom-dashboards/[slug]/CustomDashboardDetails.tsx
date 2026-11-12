import { AppServiceContext } from '@/components/service/components/ServiceContext';
import { ServiceManageSheet } from '@/components/service/components/ServiceManageSheet';
import DeleteShareableResourceSlug from '@/components/service/document/DeleteShareableResourceSlug';
import ShareableResourceSlug from '@/components/service/document/ShareableResourceSlug';
import { useDocumentContext } from '@/components/service/document/use-document-context';
import { APP_PATH } from '@/utils/path/constant';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { DocumentItemFragment } from '@graphql/generated';

// Component interface
interface DashboardSlugProps {
  documentData: DocumentItemFragment;
  serviceInstance: serviceInstance_fragment$data;
}

// Component
const DashboardSlug = ({
  documentData,
  serviceInstance,
}: DashboardSlugProps) => {
  const breadcrumbValue = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label: `Service.Cards.${serviceInstance.slug}.Name`,
      href: `/${APP_PATH}/service/${serviceInstance.service_definition!.identifier}/${serviceInstance.id}`,
      fallback: serviceInstance.name,
    },
    {
      label: `Service.Documents.${documentData.slug}.Name`,
      fallback: documentData.name!,
    },
  ];

  const context = useDocumentContext({
    serviceInstance,
    type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
  });

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

// Component export
export default DashboardSlug;
