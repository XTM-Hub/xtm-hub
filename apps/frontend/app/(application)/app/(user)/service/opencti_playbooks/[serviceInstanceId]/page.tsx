import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { getTranslate } from '@/hooks/get-translate';
import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import { APP_PATH } from '@/utils/path/constant';
import ServiceByIdQuery, {
  serviceByIdQuery,
} from '@generated/serviceByIdQuery.graphql';
import { ServiceInstanceItemFragment } from '@graphql/generated';
import PageLoader from './page-loader';

interface ServicePlaybooksPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}

const Page = async ({ params }: ServicePlaybooksPageProps) => {
  const { serviceInstanceId } = await params;
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);
  const t = await getTranslate();
  const response = await serverFetchGraphQL<serviceByIdQuery>(
    ServiceByIdQuery,
    {
      service_instance_id: decodedServiceInstanceId,
    }
  );

  const breadcrumbs = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label:
        (
          response?.data
            .serviceInstanceById as unknown as ServiceInstanceItemFragment
        )?.name ?? '',
      original: true,
    },
  ];

  return (
    <>
      {response ? (
        <>
          <BreadcrumbNav value={breadcrumbs} />
          <PageLoader
            serviceInstance={
              response.data
                .serviceInstanceById as unknown as ServiceInstanceItemFragment
            }
          />
        </>
      ) : (
        <h1>{t('Utils.ServiceNotFound')}</h1>
      )}
    </>
  );
};

export default Page;
