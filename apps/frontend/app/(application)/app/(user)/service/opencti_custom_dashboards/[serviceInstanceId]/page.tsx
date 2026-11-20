import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import { APP_PATH } from '@/utils/path/constant';
import ServiceByIdQuery, {
  serviceByIdQuery,
} from '@generated/serviceByIdQuery.graphql';
import { ServiceInstanceItemFragment } from '@graphql/generated';
import PageLoader from './page-loader';

interface ServiceCustomDashboardsPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}

const Page = async ({ params }: ServiceCustomDashboardsPageProps) => {
  const { serviceInstanceId } = await params;
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);
  const response = await serverFetchGraphQL<serviceByIdQuery>(
    ServiceByIdQuery,
    {
      service_instance_id: decodedServiceInstanceId,
    }
  );

  const serviceInstance = response?.data
    .serviceInstanceById as unknown as ServiceInstanceItemFragment;
  const breadcrumbs = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label: `Service.Cards.${serviceInstance?.slug}.Name`,
      fallback: serviceInstance?.name ?? '',
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
        <h1>Service not found</h1>
      )}
    </>
  );
};

export default Page;
