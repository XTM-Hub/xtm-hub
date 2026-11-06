import { AppServiceContext } from '@/components/service/components/ServiceContext';
import { ServiceManageSheet } from '@/components/service/components/ServiceManageSheet';
import ShareableResourceSlug from '@/components/service/document/ShareableResourceSlug';

import DeleteShareableResourceSlug from '@/components/service/document/DeleteShareableResourceSlug';
import { useDocumentContext } from '@/components/service/document/use-document-context';
import { APP_PATH } from '@/utils/path/constant';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { DocumentItemFragment } from '@graphql/generated';

interface OpenCTIPlaybookSlugProps {
  documentData: DocumentItemFragment;
  serviceInstance: serviceInstance_fragment$data;
}

const OpenctiPlaybookSlug = ({
  documentData,
  serviceInstance,
}: OpenCTIPlaybookSlugProps) => {
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
      label: documentData.name!,
      original: true,
    },
  ];

  const context = useDocumentContext({
    serviceInstance,
    type: ShareableResourceType.OPENCTI_PLAYBOOK,
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

export default OpenctiPlaybookSlug;
