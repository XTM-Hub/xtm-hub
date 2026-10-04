import { BreadcrumbNav } from '@/components/ui/BreadcrumbNav';
import { serverFetchGraphQL } from '@/relay/server-portal-api-fetch';
import { APP_PATH } from '@/utils/path/constant';
import ServiceByIdQuery, {
  serviceByIdQuery,
} from '@generated/serviceByIdQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { getTranslations } from 'next-intl/server';
import PageLoader from './page-loader';

interface ServiceHuntPacksPageProps {
  params: Promise<{ serviceInstanceId: string }>;
}

const Page = async ({ params }: ServiceHuntPacksPageProps) => {
  const { serviceInstanceId } = await params;
  const decodedServiceInstanceId = decodeURIComponent(serviceInstanceId);
  const t = await getTranslations();
  const response = await serverFetchGraphQL<serviceByIdQuery>(
    ServiceByIdQuery,
    {
      service_instance_id: decodedServiceInstanceId,
    }
  );
  const serviceInstance = response?.data?.serviceInstanceById as unknown as
    serviceInstance_fragment$data | null | undefined;

  const breadcrumbs = [
    {
      label: 'MenuLinks.Home',
      href: `/${APP_PATH}`,
    },
    {
      label: serviceInstance?.name ?? '',
      original: true,
    },
  ];

  return (
    <>
      {serviceInstance ? (
        <>
          <BreadcrumbNav value={breadcrumbs} />
          <PageLoader serviceInstance={serviceInstance} />
        </>
      ) : (
        <h1>{t('Utils.ServiceNotFound')}</h1>
      )}
    </>
  );
};

export default Page;
